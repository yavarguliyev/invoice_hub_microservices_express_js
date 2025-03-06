import { ExtractJwt, Strategy, StrategyOptionsWithoutRequest, VerifiedCallback } from 'passport-jwt';

import { BaseAuthStrategy } from './base-auth-strategy';
import { passportConfig } from '../../../core/configs/passport.config';
import { AuthStrategyType } from '../../../domain/enums/auth-strategies.enum';
import { JwtPayload } from '../../../domain/interfaces/express-context.interface';

export class JwtAuthStrategy extends BaseAuthStrategy {
  currentStrategy: AuthStrategyType = AuthStrategyType.JWT;

  applyStrategy (strategies: Strategy[]): void {
    strategies.push(new Strategy(this.jwtStrategyOptions(), async (payload: JwtPayload, done: VerifiedCallback) => done(null, payload)));
  }

  private jwtStrategyOptions (): StrategyOptionsWithoutRequest {
    return { jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: passportConfig.JWT_PRIVATE_KEY, algorithms: ['HS256'] };
  }
};
