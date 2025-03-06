import dotenv from 'dotenv';

dotenv.config();

export const passportConfig = {
  JWT_PRIVATE_KEY: Buffer.from(process.env.JWT_PRIVATE_KEY!, 'base64').toString('utf8'),
  JWT_PUBLIC_KEY: Buffer.from(process.env.JWT_PUBLIC_KEY!, 'base64').toString('utf8'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  PASSPORT_JS_SESSION_SECRET_KEY: process.env.PASSPORT_JS_SESSION_SECRET_KEY ?? 'session_secret'
} as const;
