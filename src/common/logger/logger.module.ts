import { Module } from '@nestjs/common';
import { LoggerModule, Params } from 'nestjs-pino';
import { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';

type RequestWithCorrelationId = IncomingMessage & { correlationId?: string };

export function buildLoggerConfig(): Params {
  const isProduction = process.env.NODE_ENV === 'production';
  const level = process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug');

  return {
    pinoHttp: {
      level,
      genReqId: (req: IncomingMessage) => {
        const r = req as RequestWithCorrelationId;
        return (
          r.correlationId ??
          (r.headers['x-request-id'] as string | undefined) ??
          randomUUID()
        );
      },
      customProps: (req: IncomingMessage) => ({
        correlationId: (req as RequestWithCorrelationId).correlationId,
      }),
      redact: {
        paths: [
          'req.body.password',
          'req.body.token',
          'req.body.refreshToken',
          'req.body.cpf',
          'req.headers.authorization',
        ],
        censor: '[REDACTED]',
      },
      transport: isProduction
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true } },
    },
  };
}

@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: () => buildLoggerConfig(),
    }),
  ],
  exports: [LoggerModule],
})
export class AppLoggerModule {}
