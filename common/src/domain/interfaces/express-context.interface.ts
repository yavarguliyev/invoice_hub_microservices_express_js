import { Request, Response } from 'express';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
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
