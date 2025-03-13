import { Container } from 'typedi';
import { plainToInstance } from 'class-transformer';
import { compare } from 'bcrypt';
import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { LoggerTracerInfrastructure, NotAuthorizedError, ResultMessage, RoleDto, UserDto, passportConfig } from '@invoice-hub/common';

import { SigninArgs } from 'core/inputs/signin.args';
import { LoginResponse } from 'core/types/login-response.type';
import { GenerateLoginResponse } from 'core/types/generate-login-response.type';
import { UserRepository } from 'domain/repositories/user.repository';

export interface IAuthService {
  signin (args: SigninArgs): Promise<LoginResponse>;
  signout (accesToken: string): Promise<boolean>;
}

export class AuthService implements IAuthService {
  private _userRepository?: UserRepository;

  private get userRepository () {
    if (!this._userRepository) {
      this._userRepository = Container.get(UserRepository);
    }

    return this._userRepository;
  }

  async signin (args: SigninArgs) {
    const { email, password } = args;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user || !(await compare(password, user.password))) {
      throw new NotAuthorizedError();
    }

    const currentUser = plainToInstance(UserDto, user, { excludeExtraneousValues: true });
    currentUser.role = plainToInstance(RoleDto, await user.role, { excludeExtraneousValues: true });

    return await this.generateLoginResponse({ currentUser });
  }

  async signout (accesToken: string) {
    const token = accesToken?.split(' ')[1] ?? '';
    const decoded = jwt.verify(token, passportConfig.JWT_PRIVATE_KEY, { algorithms: ['HS256'] }) as JwtPayload;

    if (!decoded?.exp) {
      LoggerTracerInfrastructure.log('Signout failed: Invalid or malformed token', 'error');
      return false;
    }

    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    LoggerTracerInfrastructure.log(`User signed out. Token expires in ${expiresIn} seconds`, 'info');

    // Note: This does not actually invalidate the access token.
    // JWTs are stateless, meaning they remain valid until they expire.
    // In the future, we could use Redis or a database to store a list of revoked tokens
    // and check against it during authentication to enforce logout.

    return true;
  }

  private async generateLoginResponse ({ currentUser }: GenerateLoginResponse) {
    const payload = { currentUser };

    const privateKey = passportConfig.JWT_PRIVATE_KEY;
    const expiresIn = passportConfig.JWT_EXPIRES_IN;

    const validatedExpiresIn = !isNaN(Number(expiresIn)) ? Number(expiresIn) : (expiresIn as SignOptions['expiresIn']);

    const signOptions: SignOptions = { expiresIn: validatedExpiresIn, algorithm: 'HS256' };
    const accessToken = jwt.sign(payload, privateKey, signOptions);
    const response: LoginResponse = { accessToken, payload, results: ResultMessage.SUCCESS };

    return response;
  }
}
