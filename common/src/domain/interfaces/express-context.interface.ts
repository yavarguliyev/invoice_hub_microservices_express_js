export interface TokenPayload {
  id: number;
  email: string;
  role: string;
};

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
};
