import { Container } from 'typedi';
import { compare } from 'bcrypt';
import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { LoggerTracerInfrastructure, NotAuthorizedError, ResponseResults, ResultMessage } from '@invoice-hub/common';

import { SigninArgs } from 'core/inputs/signin.args';
import { LoginResponse } from 'core/types/login-response.type';
import { GenerateLoginResponse } from 'core/types/generate-login-response.type';
import { passportConfig } from 'core/configs/passport.config';
import { UserRepository } from 'domain/repositories/user.repository';

export interface IAuthService {
  initialize (): Promise<void>;
  get (): Promise<ResponseResults<any>>;
  signin (args: SigninArgs): Promise<LoginResponse>;
  signout (accesToken: string): Promise<boolean>;
}

export class AuthService implements IAuthService {
  private userRepository: UserRepository;

  constructor () {
    this.userRepository = Container.get(UserRepository);
  }

  async initialize () {}

  async get () {
    return { result: ResultMessage.SUCCEED };
  }

  async signin (args: SigninArgs) {
    const { email, password } = args;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotAuthorizedError();
    }

    const passwordMatch = await compare(password, user.password);
    if (!passwordMatch) {
      throw new NotAuthorizedError();
    }

    const role = await user.role;

    return await this.generateLoginResponse({ id: user.id, email, role: role.name });
  }

  async signout (accesToken: string) {
    const token = accesToken?.split(' ')[1] ?? '';
    const decoded = jwt.decode(token) as JwtPayload;

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

  private async generateLoginResponse ({ id, email, role }: GenerateLoginResponse) {
    const payload = { id, email, role };

    const secretKey = passportConfig.JWT_SECRET_KEY;
    const expiresIn = passportConfig.JWT_EXPIRES_IN;

    const validatedExpiresIn = !isNaN(Number(expiresIn)) ? Number(expiresIn) : (expiresIn as SignOptions['expiresIn']);

    const signOptions: SignOptions = { expiresIn: validatedExpiresIn, algorithm: 'HS256' };
    const accessToken = jwt.sign(payload, secretKey, signOptions);
    const response: LoginResponse = { accessToken, payload, results: ResultMessage.SUCCEED };

    return response;
  }
}
