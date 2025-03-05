import { Action } from 'routing-controllers';
import passport from 'passport';

import { NotAuthorizedError } from '../../core';
import { AuthenticationInfo, JwtPayload } from '../../domain';

export const getTokenData = (req: Request): Promise<JwtPayload> =>
  new Promise((resolve, reject) => {
    passport.authenticate('jwt', { session: false, failureFlash: false, failWithError: true }, (err: Error, payload: JwtPayload, info: AuthenticationInfo) => {
      if (err) reject(err);
      if (!payload || (payload.exp && Date.now() >= payload.exp * 1000)) return reject(new NotAuthorizedError());
      if (info) return reject(new NotAuthorizedError());

      resolve({ id: payload.id, email: payload.email, role: payload.role });
    }
    )(req);
});

export const generateExpressContext = async (action: Action) => {
  const { request } = action;

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new NotAuthorizedError();
  }

  const token = authHeader.split(' ')[1];
  const tokenData = await getTokenData(request);

  return { request, tokenData, token };
};

export const authorizationChecker = async (action: Action, roles: string[]): Promise<boolean> => {
  const context = await generateExpressContext(action);
  const role = context.tokenData.role;

  if (!role) throw new NotAuthorizedError();
  if (!roles || roles.length === 0 || !roles.includes(role)) throw new NotAuthorizedError();

  return true;
};
