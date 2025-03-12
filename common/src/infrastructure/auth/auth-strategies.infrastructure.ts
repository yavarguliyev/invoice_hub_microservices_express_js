import { Strategy } from 'passport-jwt';

import { BaseAuthStrategy } from '../../application/helpers/auth-strategies.helper/base-auth-strategy';
import { JwtAuthStrategy } from '../../application/helpers/auth-strategies.helper/jwt-auth-strategy';
import { AuthStrategyType } from '../../domain';

export class AuthStrategiesInfrastructure {
  private static strategyInstances: Record<AuthStrategyType, BaseAuthStrategy> = {
    [AuthStrategyType.JWT]: new JwtAuthStrategy()
  };

  static buildStrategies () {
    return Object.values(AuthStrategiesInfrastructure.strategyInstances).map((strategy) => {
      const strategies: Strategy[] = [];
      strategy.applyStrategy(strategies);

      return strategies;
    }).flat();
  }
}
