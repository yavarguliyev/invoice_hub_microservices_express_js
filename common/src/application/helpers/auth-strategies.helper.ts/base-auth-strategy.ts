import { Strategy } from 'passport-jwt';

import AuthStrategyType from '../../../domain/enums/auth-strategies.enum';

export interface IBaseAuthStrategy {
  isTypeOfAuthStrategy (options: AuthStrategyType): boolean;
};

export abstract class BaseAuthStrategy implements IBaseAuthStrategy {
  abstract currentStrategy: AuthStrategyType;
  abstract applyStrategy (strategies: Strategy[]): void;

  isTypeOfAuthStrategy (options: AuthStrategyType): boolean {
    return this.currentStrategy === options;
  }
};
