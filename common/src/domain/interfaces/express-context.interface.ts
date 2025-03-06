import { Request, Response } from 'express';

import { UserDto } from '../dto/user.dto';

export interface JwtPayload {
  currentUser: UserDto
  iat?: number;
  exp?: number;
};

export interface AuthenticationInfo {
  info?: object | string | Array<string | undefined>
};

export interface ExpressContext {
  request: Request;
  response?: Response;
  tokenData: JwtPayload;
  token: string;
};
