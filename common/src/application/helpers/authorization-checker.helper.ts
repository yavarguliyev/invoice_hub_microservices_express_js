import { Action } from 'routing-controllers';
import passport from 'passport';

import { NotAuthorizedError } from '../../core/errors/not-authorized-error';
import { JwtPayload, AuthenticationInfo } from '../../domain/interfaces/express-context.interface';

export const getTokenData = (req: Request): Promise<JwtPayload> =>
  new Promise((resolve, reject) => {
    passport.authenticate('jwt', { session: false, failureFlash: false, failWithError: true }, (err: Error, payload: JwtPayload, info: AuthenticationInfo) => {
      if (err) reject(err);
      if (!payload || (payload.exp && Date.now() >= payload.exp * 1000)) return reject(new NotAuthorizedError());
      if (info) return reject(new NotAuthorizedError());

      resolve({ currentUser: payload.currentUser });
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

export const currentUserChecker = async (action: Action) => {
  const { tokenData: { currentUser } } = await generateExpressContext(action);

  if (!currentUser) {
    throw new NotAuthorizedError();
  }

  return currentUser;
};

export const authorizationChecker = async (action: Action, roles: string[]): Promise<boolean> => {
  const { tokenData } = await generateExpressContext(action);
  const { currentUser: { role } } = tokenData;

  if (!role || roles.length === 0 || !roles.includes(role.name)) {
    throw new NotAuthorizedError();
  }

  return true;
};
