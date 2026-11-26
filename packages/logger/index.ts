import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const redactOptions = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    '*.password',
    '*.currentPassword',
    '*.newPassword',
    '*.token',
    '*.refreshToken',
    '*.verificationToken',
    '*.resetPasswordToken',
  ],
  censor: '[REDACTED]',
};

export const logger = pino(
  isProduction
    ? {
        level: process.env.LOG_LEVEL || 'info',
        redact: redactOptions,
      }
    : {
        level: process.env.LOG_LEVEL || 'info',
        redact: redactOptions,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }
);

export default logger;
