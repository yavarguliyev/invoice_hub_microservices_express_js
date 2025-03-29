import { ClientIds } from '../enums/events.enum';
import { ProcessStepStatus, ProcessType } from '../enums/distributed-transaction.enum';

export interface ProcessStep {
  name: string;
  service: ClientIds;
  status: ProcessStepStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface TransactionStep {
  name: string;
  service: string;
  status: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface SerializedTransaction {
  transactionId: string;
  processType: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  currentStep: number;
  initiatedBy: string;
  payload: Record<string, unknown>;
  steps: Array<{
    name: string;
    service: string;
    status: string;
    error?: string;
    startedAt?: string;
    completedAt?: string;
  }>;
  error?: string;
}

export interface DistributedTransaction {
  transactionId: string;
  processType: ProcessType;
  status: string;
  startedAt: Date;
  completedAt?: Date;
  currentStep: number;
  initiatedBy: string;
  payload: Record<string, unknown>;
  steps: TransactionStep[];
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
