import { Container } from 'typedi';
import { v4 as uuidv4 } from 'uuid';

import { KafkaInfrastructure } from '../kafka/kafka.infrastructure';
import { RedisInfrastructure } from '../redis/redis.infrastructure';
import { isSerializedTransaction, deserializeTransaction } from '../../application/helpers/utility-functions.helper';
import { Subjects, ClientIds, GroupIds } from '../../domain/enums/events.enum';
import { ProcessType, DistributedTransactionStatus, ProcessStepStatus } from '../../domain/enums/distributed-transaction.enum';
import {
  DistributedTransaction,
  TransactionCoordinatorOptions,
  TransactionOptions,
  TransactionEvent,
  SerializedTransaction,
  CompensationEvent
} from '../../domain/interfaces/distributed-transaction.interface';
import { LoggerTracerInfrastructure } from '../logging/logger-tracer.infrastructure';

export class TransactionCoordinatorInfrastructure {
  private readonly kafka: KafkaInfrastructure;
  private readonly redis: RedisInfrastructure;
  private readonly clientId: ClientIds;
  private readonly transactionPrefix = 'global:transaction:';
  private timeoutCheckerId?: NodeJS.Timeout;
  private isInitialized = false;

  constructor (options: TransactionCoordinatorOptions) {
    this.kafka = Container.get(KafkaInfrastructure);
    this.redis = Container.get(RedisInfrastructure);
    this.clientId = options.clientId;
  }

  async initialize (groupId: GroupIds): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const subscriptions = [
      { topic: Subjects.TRANSACTION_STEP_COMPLETED, handler: this.handleTransactionStepCompleted },
      { topic: Subjects.TRANSACTION_STEP_FAILED, handler: this.handleTransactionStepFailed },
      { topic: Subjects.TRANSACTION_COMPENSATION_START, handler: this.handleTransactionCompensationStart },
      { topic: Subjects.TRANSACTION_COMPENSATION_COMPLETED, handler: this.handleTransactionCompensationCompleted },
      { topic: Subjects.TRANSACTION_COMPLETED, handler: this.handleTransactionCompleted },
      { topic: Subjects.TRANSACTION_TIMEOUT, handler: this.handleTransactionTimeout }
    ];

    for (const { topic, handler } of subscriptions) {
      await this.kafka.subscribe({ topicName: topic, handler: handler.bind(this), options: { groupId } });
    }

    this.startTimeoutChecker();
    this.isInitialized = true;
    LoggerTracerInfrastructure.log('Transaction Coordinator initialized successfully');
  }

  async startTransaction( options: TransactionOptions): Promise<string> {
    const transactionId = uuidv4();

    const transaction: DistributedTransaction = {
      transactionId,
      processType: options.processType,
      initiatedBy: options.initiatedBy,
      payload: options.payload,
      startedAt: new Date(),
      currentStep: 0,
      steps: options.steps.map(step => ({
        ...step,
        status: ProcessStepStatus.PENDING,
      })),
      status: DistributedTransactionStatus.STARTED,
    };

    await this.storeTransactionState(transaction);
    await this.progressTransaction(transactionId);

    return transactionId;
  }

  async disconnect (options?: { clientId?: ClientIds }): Promise<void> {
    const shutdownClient = options?.clientId || this.clientId;
    
    LoggerTracerInfrastructure.log(`Shutting down Transaction Coordinator for client: ${shutdownClient}...`);
    
    if (shutdownClient === this.clientId) {
      this.stopTimeoutChecker();
      this.isInitialized = false;
    }
  }

  private async progressTransaction (transactionId: string): Promise<void> {
    const transaction = await this.getTransactionState(transactionId);

    const isTransactionMissing = !transaction;
    const isTransactionStarted = transaction?.status === DistributedTransactionStatus.STARTED;
    const isTransactionInProgress = transaction?.status === DistributedTransactionStatus.IN_PROGRESS;

    if (isTransactionMissing || (!isTransactionStarted && !isTransactionInProgress)) {
      return;
    }

    LoggerTracerInfrastructure.log(`Transaction ${transactionId} progress: step ${transaction.currentStep + 1} of ${transaction.steps.length}`);

    if (transaction.currentStep >= transaction.steps.length) {
      LoggerTracerInfrastructure.log(`Transaction ${transactionId} reached final step, completing...`);
      await this.completeTransaction(transactionId);
      return;
    }

    const currentStep = transaction.steps[transaction.currentStep];
    currentStep.startedAt = new Date();

    await this.storeTransactionState({ ...transaction, status: DistributedTransactionStatus.IN_PROGRESS });

    const topicName = this.getStepTopicName(currentStep.name);
    const message = JSON.stringify({
      transactionId: transaction.transactionId,
      ...transaction.payload,
      stepName: currentStep.name
    });

    await this.kafka.publish({
      topicName,
      message
    });

    LoggerTracerInfrastructure.log(`Successfully published message to topic: ${topicName}`);
  }

  private async handleTransactionStepCompleted (messageStr: string): Promise<void> {
    const event = JSON.parse(messageStr) as TransactionEvent;
    const transaction = await this.getTransactionState(event.transactionId);

    if (!transaction) {
      return;
    }

    const currentStep = transaction.steps[transaction.currentStep];
    LoggerTracerInfrastructure.log(`Processing step completion for transaction ${event.transactionId}: current step=${currentStep.name}, received completion for step=${event.stepName}`);

    if (currentStep.name !== event.stepName) {
      return;
    }

    currentStep.status = ProcessStepStatus.COMPLETED;
    currentStep.completedAt = new Date();

    transaction.currentStep++;

    await this.storeTransactionState(transaction);
    await this.progressTransaction(event.transactionId);
  }

  private async handleTransactionStepFailed (messageStr: string): Promise<void> {
    const event = JSON.parse(messageStr) as TransactionEvent;
    const transaction = await this.getTransactionState(event.transactionId);

    if (!transaction) {
      return;
    }

    const currentStep = transaction.steps[transaction.currentStep];

    currentStep.status = ProcessStepStatus.FAILED;
    currentStep.error = event.error;

    await this.storeTransactionState({ ...transaction, status: DistributedTransactionStatus.FAILED, error: event.error });
    await this.sendUserNotification(transaction.transactionId, event.error || 'Transaction step failed', transaction.processType);
    await this.startCompensation(event.transactionId);
  }

  private async startCompensation (transactionId: string): Promise<void> {
    const transaction = await this.getTransactionState(transactionId);

    if (!transaction) {
      return;
    }

    await this.kafka.publish({
      topicName: Subjects.TRANSACTION_COMPENSATION_START,
      message: JSON.stringify({
        transactionId: transaction.transactionId,
        processType: transaction.processType,
        failedStep: transaction.steps[transaction.currentStep].name
      })
    });
  }

  private async completeTransaction (transactionId: string): Promise<void> {
    const transaction = await this.getTransactionState(transactionId);

    if (!transaction) {
      return;
    }

    await this.storeTransactionState({ ...transaction, status: DistributedTransactionStatus.COMPLETED, completedAt: new Date() });
    await this.kafka.publish({
      topicName: Subjects.TRANSACTION_COMPLETED,
      message: JSON.stringify({
        transactionId: transaction.transactionId,
        processType: transaction.processType
      })
    });
  }

  private async handleTransactionTimeout (messageStr: string): Promise<void> {
    const { transactionId } = JSON.parse(messageStr);
    const transaction = await this.getTransactionState(transactionId);

    if (!transaction || transaction.status !== DistributedTransactionStatus.IN_PROGRESS) {
      return;
    }

    await this.storeTransactionState({ ...transaction, status: DistributedTransactionStatus.TIMED_OUT, error: 'Transaction timed out' });
    await this.sendUserNotification(transactionId, 'Transaction timed out', transaction.processType);
    await this.startCompensation(transactionId);
  }

  private handleTransactionCompensationStart (messageStr: string): Promise<void> {
    const event = JSON.parse(messageStr) as CompensationEvent;
    const { transactionId, processType, failedStep } = event;

    return this.executeCompensation(transactionId, processType as ProcessType, failedStep);
  }

  private async executeCompensation (transactionId: string, processType: ProcessType, failedStep?: string): Promise<void> {
    const transaction = await this.getTransactionState(transactionId);
    if (!transaction) {
      const minimalTransaction: DistributedTransaction = {
        transactionId,
        processType,
        status: DistributedTransactionStatus.COMPENSATING,
        startedAt: new Date(),
        currentStep: 0,
        steps: [],
        initiatedBy: this.clientId,
        payload: {}
      };

      await this.storeTransactionState(minimalTransaction);
      return;
    }

    if (transaction.status === DistributedTransactionStatus.COMPENSATING || transaction.status === DistributedTransactionStatus.COMPENSATED) {
      return;
    }

    await this.storeTransactionState({ ...transaction, status: DistributedTransactionStatus.COMPENSATING });

    if (transaction.steps?.length) {
      const completedSteps = transaction.steps
        .slice(0, transaction.currentStep)
        .filter(s => s.status === ProcessStepStatus.COMPLETED)
        .reverse();

      for (const step of completedSteps) {
        await this.kafka.publish({
          topicName: step.name,
          message: JSON.stringify({
            transactionId: transaction.transactionId,
            ...transaction.payload,
            stepName: step.name
          })
        });

        step.status = ProcessStepStatus.COMPENSATED;
      }

      await this.storeTransactionState({ ...transaction, status: DistributedTransactionStatus.COMPENSATED, completedAt: new Date() });
    }

    await this.kafka.publish({
      topicName: Subjects.TRANSACTION_COMPENSATION_COMPLETED,
      message: JSON.stringify({
        transactionId,
        processType
      })
    });
  }

  private async handleTransactionCompensationCompleted (messageStr: string): Promise<void> {
    const event = JSON.parse(messageStr) as TransactionEvent;
    const { transactionId, processType } = event;

    const transaction = await this.getTransactionState(transactionId);

    if (!transaction) {
      const minimalTransaction: DistributedTransaction = {
        transactionId,
        processType: processType as ProcessType,
        status: DistributedTransactionStatus.COMPENSATED,
        startedAt: new Date(),
        completedAt: new Date(),
        currentStep: 0,
        steps: [],
        initiatedBy: this.clientId,
        payload: {}
      };

      await this.storeTransactionState(minimalTransaction);
      return;
    }

    if (transaction.status === DistributedTransactionStatus.COMPENSATED) {
      return;
    }

    await this.storeTransactionState({ ...transaction, status: DistributedTransactionStatus.COMPENSATED, completedAt: new Date() });
  }

  private async handleTransactionCompleted (messageStr: string): Promise<void> {
    const event = JSON.parse(messageStr) as TransactionEvent;
    const { transactionId, processType } = event;

    const transaction = await this.getTransactionState(transactionId);

    if (!transaction) {
      const minimalTransaction: DistributedTransaction = {
        transactionId,
        processType: processType as ProcessType,
        status: DistributedTransactionStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
        currentStep: 0,
        steps: [],
        initiatedBy: this.clientId,
        payload: {}
      };

      await this.storeTransactionState(minimalTransaction);
      return;
    }

    if (transaction.status !== DistributedTransactionStatus.COMPLETED) {
      await this.storeTransactionState({ ...transaction, status: DistributedTransactionStatus.COMPENSATED, completedAt: new Date() });
    }
  }

  private startTimeoutChecker (): void {
    this.stopTimeoutChecker();

    const checkTimeouts = async (): Promise<void> => {
      const keys = await this.getTransactionKeys();
      const now = new Date();
      const timeoutThreshold = 5 * 60 * 1000;

      for (const key of keys) {
        const transaction = await this.getTransactionByKey(key);

        if (transaction?.status === DistributedTransactionStatus.IN_PROGRESS) {
          const currentStep = transaction.steps[transaction.currentStep];
          const startedAt = currentStep.startedAt;
          const hasTimedOut = startedAt && (new Date(startedAt).getTime() + timeoutThreshold < now.getTime());

          if (hasTimedOut) {
            await this.kafka.publish({
              topicName: Subjects.TRANSACTION_TIMEOUT,
              message: JSON.stringify({
                transactionId: transaction.transactionId
              })
            });
          }
        }
      }

      if (this.isInitialized) {
        this.timeoutCheckerId = setTimeout(checkTimeouts, 60000);
      }
    };

    this.timeoutCheckerId = setTimeout(checkTimeouts, 60000);
  }

  private stopTimeoutChecker (): void {
    if (this.timeoutCheckerId) {
      clearTimeout(this.timeoutCheckerId);
      this.timeoutCheckerId = undefined;
    }
  }

  async getTransactionState (transactionId: string): Promise<DistributedTransaction | undefined> {
    const key = `${this.transactionPrefix}${transactionId}`;
    return this.getTransactionByKey(key);
  }

  private async getTransactionByKey (key: string): Promise<DistributedTransaction | undefined> {
    const data = await this.redis.get<string>({ clientId: this.clientId, key });
    if (!data) {
      return;
    }

    try {
      if (typeof data !== 'string') {
        return;
      }

      const parsedData: unknown = JSON.parse(data);
      if (isSerializedTransaction(parsedData)) {
        return deserializeTransaction(parsedData);
      }

      return;
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error parsing transaction data: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
  }

  private async storeTransactionState (transaction: DistributedTransaction): Promise<void> {
    const key = `${this.transactionPrefix}${transaction.transactionId}`;

    try {
      const serializedTransaction: SerializedTransaction = {
        ...transaction,
        processType: transaction.processType.toString(),
        startedAt: transaction.startedAt.toISOString(),
        completedAt: transaction.completedAt?.toISOString(),
        steps: transaction.steps.map(step => ({
          ...step,
          startedAt: step.startedAt?.toISOString(),
          completedAt: step.completedAt?.toISOString()
        }))
      };

      const serializedData = JSON.stringify(serializedTransaction);

      await this.redis.set({
        clientId: this.clientId,
        key,
        value: serializedData,
        ttl: 86400
      });
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error storing transaction state: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private getStepTopicName (stepName: string): string {
    return stepName;
  }

  private async getTransactionKeys (): Promise<string[]> {
    return this.redis.getKeysByPattern({ clientId: this.clientId, pattern: `${this.transactionPrefix}*` });
  }

  private async sendUserNotification (transactionId: string, errorMessage: string, processType: ProcessType): Promise<void> {
    try {
      const transaction = await this.getTransactionState(transactionId);
      if (!transaction) {
        return;
      }

      const { payload } = transaction;
      let notification = {
        transactionId,
        userId: transaction.initiatedBy,
        processType,
        status: transaction.status,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        details: {}
      };

      if (processType === ProcessType.ORDER_APPROVAL) {
        notification.details = {
          orderId: payload.orderId,
          totalAmount: payload.totalAmount,
          failureReason: payload.failureReason || errorMessage
        };
      }

      await this.kafka.publish({
        topicName: Subjects.TRANSACTION_USER_NOTIFICATION,
        message: JSON.stringify(notification)
      });

      LoggerTracerInfrastructure.log(`Successfully sent user notification for transaction ${transactionId}`);
    } catch (error) {
      LoggerTracerInfrastructure.log(`Error sending user notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
