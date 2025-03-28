import { ClientIds } from '../enums/events.enum';
import { ProcessStepStatus, ProcessType, DistributedTransactionStatus } from '../enums/distributed-transaction.enum';

export interface ProcessStep {
  name: string;
  service: ClientIds;
  status: ProcessStepStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface DistributedTransaction {
  transactionId: string;
  processType: ProcessType;
  initiatedBy: string;
  payload: Record<string, unknown>;
  startedAt: Date;
  currentStep: number;
  steps: ProcessStep[];
  completedAt?: Date;
  status: DistributedTransactionStatus;
  error?: string;
}

export interface TransactionEvent {
  transactionId: string;
  processType: ProcessType;
  stepName: string;
  status: ProcessStepStatus;
  payload?: Record<string, unknown>;
  error?: string;
}

export interface TransactionCoordinatorOptions {
  clientId: ClientIds;
}

export interface TransactionOptions {
  processType: ProcessType;
  steps: Array<{ name: string; service: ClientIds }>;
  payload: Record<string, unknown>;
  initiatedBy: string;
}
