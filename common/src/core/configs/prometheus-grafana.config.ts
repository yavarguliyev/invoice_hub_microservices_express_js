import dotenv from 'dotenv';

dotenv.config();

export const counter = {
  name: process.env.METRICS_REQUEST_COUNT_NAME!,
  help: process.env.METRICS_REQUEST_COUNT_HELP!,
  labelNames: ['method', 'route', 'status']
};

export const histogram = {
  name: process.env.METRICS_DURATION_NAME!,
  help: process.env.METRICS_DURATION_HELP!,
  buckets: process.env.METRICS_DURATION_BUCKETS!.split(',').map(Number)
};
