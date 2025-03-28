import { Container } from 'typedi';
import { v4 as uuidv4 } from 'uuid';

import { KafkaInfrastructure } from '../kafka/kafka.infrastructure';
import { RedisInfrastructure } from '../redis/redis.infrastructure';
import { Subjects, ClientIds, GroupIds } from '../../domain/enums/events.enum';
import { ProcessType, DistributedTransactionStatus, ProcessStepStatus} from '../../domain/enums/distributed-transaction.enum';
import { DistributedTransaction , TransactionCoordinatorOptions, TransactionOptions, TransactionEvent } from '../../domain/interfaces/distributed-transaction.interface';

export class TransactionCoordinatorInfrastructure {
  private readonly kafka: KafkaInfrastructure;
  private readonly redis: RedisInfrastructure;
  private readonly clientId: ClientIds;
  private readonly transactionPrefix = 'transaction:';

  constructor (options: TransactionCoordinatorOptions) {
    this.kafka = Container.get(KafkaInfrastructure);
    this.redis = Container.get(RedisInfrastructure);
    this.clientId = options.clientId;
  }

  async initialize (): Promise<void> {
    await this.kafka.subscribe({
      topicName: Subjects.TRANSACTION_STEP_COMPLETED,
      handler: this.handleTransactionStepCompleted.bind(this),
      options: { groupId: GroupIds.BASE_GROUP }
    });

    await this.kafka.subscribe({
      topicName: Subjects.TRANSACTION_STEP_FAILED,
      handler: this.handleTransactionStepFailed.bind(this),
      options: { groupId: GroupIds.BASE_GROUP }
    });

    await this.kafka.subscribe({
      topicName: Subjects.TRANSACTION_TIMEOUT,
      handler: this.handleTransactionTimeout.bind(this),
      options: { groupId: GroupIds.BASE_GROUP }
    });

    this.startTimeoutChecker();
  }

  async startTransaction (options: TransactionOptions): Promise<string> {
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

  private async progressTransaction(transactionId: string): Promise<void> {
    const transaction = await this.getTransactionState(transactionId);

    if (!transaction ||
      (transaction.status !== DistributedTransactionStatus.STARTED &&
        transaction.status !== DistributedTransactionStatus.IN_PROGRESS)) {
      return;
    }

    if (transaction.currentStep >= transaction.steps.length) {
      await this.completeTransaction(transactionId);
      return;
    }

    const currentStep = transaction.steps[transaction.currentStep];
    currentStep.startedAt = new Date();
    transaction.status = DistributedTransactionStatus.IN_PROGRESS;

    await this.storeTransactionState(transaction);

    const topicName = this.getStepTopicName(transaction.processType, currentStep.name);

    await this.kafka.publish({
      topicName,
      message: JSON.stringify({
        transactionId: transaction.transactionId,
        ...transaction.payload,
        stepName: currentStep.name
      })
    });
  }

  private async handleTransactionStepCompleted (messageStr: string): Promise<void> {
    const event = JSON.parse(messageStr) as TransactionEvent;
    const transaction = await this.getTransactionState(event.transactionId);

    if (!transaction) {
      return;
    }

    const currentStep = transaction.steps[transaction.currentStep];

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
    transaction.status = DistributedTransactionStatus.FAILED;
    transaction.error = event.error;

    await this.storeTransactionState(transaction);

    await this.startCompensation(event.transactionId);
  }

  private async startCompensation (transactionId: string): Promise<void> {
    const transaction = await this.getTransactionState(transactionId);

    if (!transaction) {
      return;
    }

    transaction.status = DistributedTransactionStatus.COMPENSATING;
    await this.storeTransactionState(transaction);

    await this.kafka.publish({
      topicName: Subjects.TRANSACTION_COMPENSATION_START,
      message: JSON.stringify({
        transactionId: transaction.transactionId,
        processType: transaction.processType,
        failedStep: transaction.steps[transaction.currentStep].name
      })
    });

    const completedSteps = transaction.steps
      .slice(0, transaction.currentStep)
      .filter(s => s.status === ProcessStepStatus.COMPLETED)
      .reverse();

    for (const step of completedSteps) {
      const compensationTopic = this.getCompensationTopicName(transaction.processType, step.name);

      await this.kafka.publish({
        topicName: compensationTopic,
        message: JSON.stringify({
          transactionId: transaction.transactionId,
          ...transaction.payload,
          stepName: step.name
        })
      });

      step.status = ProcessStepStatus.COMPENSATED;
    }

    transaction.status = DistributedTransactionStatus.COMPENSATED;
    transaction.completedAt = new Date();
    await this.storeTransactionState(transaction);

    await this.kafka.publish({
      topicName: Subjects.TRANSACTION_COMPENSATION_COMPLETED,
      message: JSON.stringify({
        transactionId: transaction.transactionId,
        processType: transaction.processType
      })
    });
  }

  private async completeTransaction (transactionId: string): Promise<void> {
    const transaction = await this.getTransactionState(transactionId);

    if (!transaction) {
      return;
    }

    transaction.status = DistributedTransactionStatus.COMPLETED;
    transaction.completedAt = new Date();
    await this.storeTransactionState(transaction);

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

    transaction.status = DistributedTransactionStatus.TIMED_OUT;
    transaction.error = 'Transaction timed out';
    await this.storeTransactionState(transaction);

    await this.startCompensation(transactionId);
  }

  private startTimeoutChecker (): void {
    const checkTimeouts = async (): Promise<void> => {
      const keys = await this.getTransactionKeys();
      const now = new Date();
      const timeoutThreshold = 5 * 60 * 1000;

      for (const key of keys) {
        const transaction = await this.getTransactionByKey(key);

        if (transaction?.status === DistributedTransactionStatus.IN_PROGRESS) {
          const currentStep = transaction.steps[transaction.currentStep];

          if (currentStep.startedAt &&
            (new Date(currentStep.startedAt).getTime() + timeoutThreshold < now.getTime())) {
            await this.kafka.publish({
              topicName: Subjects.TRANSACTION_TIMEOUT,
              message: JSON.stringify({
                transactionId: transaction.transactionId
              })
            });
          }
        }
      }

      setTimeout(checkTimeouts, 60000);
    };

    setTimeout(checkTimeouts, 60000);
  }

  async getTransactionState (transactionId: string): Promise<DistributedTransaction | undefined> {
    const key = `${this.transactionPrefix}${transactionId}`;
    return this.getTransactionByKey(key);
  }

  private async getTransactionByKey (key: string): Promise<DistributedTransaction | undefined> {
    const data = await this.redis.get<string>({
      clientId: this.clientId,
      key
    });

    if (!data) {
      return undefined;
    }

    return JSON.parse(data) as DistributedTransaction;
  }

  private async storeTransactionState (transaction: DistributedTransaction): Promise<void> {
    const key = `${this.transactionPrefix}${transaction.transactionId}`;
    await this.redis.set({
      clientId: this.clientId,
      key,
      value: JSON.stringify(transaction),
      ttl: 86400
    });
  }

  private async getTransactionKeys (): Promise<string[]> {
    return this.redis.getKeysByPattern({
      clientId: this.clientId,
      pattern: `${this.transactionPrefix}*`
    });
  }

  private getStepTopicName (processType: ProcessType, stepName: string): string {
    return `${processType.toLowerCase()}-step-${stepName.toLowerCase()}`;
  }

  private getCompensationTopicName (processType: ProcessType, stepName: string): string {
    return `${processType.toLowerCase()}-compensate-${stepName.toLowerCase()}`;
  }
} 