import dotenv from 'dotenv';

dotenv.config();

export const passportConfig = {
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  PASSPORT_JS_SESSION_SECRET_KEY: process.env.PASSPORT_JS_SESSION_SECRET_KEY
} as const;
