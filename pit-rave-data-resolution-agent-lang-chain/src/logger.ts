import pino from 'pino';
import os from 'os';

const level = process.env.LOG_LEVEL || 'info';
const isDevelopment = process.env.NODE_ENV === 'development';

const transport = isDevelopment
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss.l',
        ignore: 'pid,hostname',
        singleLine: false
      }
    }
  : process.env.DATADOG_API_KEY
  ? {
      target: 'pino-datadog-transport',
      options: {
        apiKey: process.env.DATADOG_API_KEY,
        service: process.env.SERVICE_NAME || 'pit-rave-resolution-agent',
        ddsource: 'nodejs',
        ddtags: `env:${process.env.NODE_ENV || 'development'},instance:${process.env.NODE_APP_INSTANCE || '0'}`,
        hostname: os.hostname(),
        sendIntervalMs: 3000,
        retries: 5,
        onError: (err: Error) => {
          console.error('Datadog transport error:', err);
        },
        onDebug: (msg: string) => {
          if (process.env.LOG_LEVEL === 'debug') {
            console.debug('Datadog transport debug:', msg);
          }
        }
      }
    }
  : undefined;

const logger = pino(
  {
    level,
    base: {
      service: process.env.SERVICE_NAME || 'pit-rave-resolution-agent',
      environment: process.env.NODE_ENV || 'development'
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label };
      }
    },
    ...(transport && { transport })
  }
);

export default logger;
