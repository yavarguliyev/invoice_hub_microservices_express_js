import dotenv from 'dotenv';

dotenv.config();

export const redisConfig = {
  REDIS_PORT: Number(process.env.REDIS_PORT!),
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DEFAULT_CACHE_TTL: Number(process.env.REDIS_DEFAULT_CACHE_TTL) || 3600,
} as const;
