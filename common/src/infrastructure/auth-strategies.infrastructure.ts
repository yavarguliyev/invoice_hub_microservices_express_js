import { Strategy } from 'passport-jwt';

import { BaseAuthStrategy, JwtAuthStrategy } from '../application';
import { AuthStrategyType } from '../domain';

export class AuthStrategiesInfrastructure {
  private static strategyInstances: Record<AuthStrategyType, BaseAuthStrategy> = {
    [AuthStrategyType.JWT]: new JwtAuthStrategy()
  };

  static buildStrategies (): Strategy[] {
    return Object.values(AuthStrategiesInfrastructure.strategyInstances).map((strategy) => {
      const strategies: Strategy[] = [];
      strategy.applyStrategy(strategies);

      return strategies;
    }).flat();
  }
}
