import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    if (exception instanceof QueryFailedError) {
      this.logger.error(
        `QueryFailedError: ${exception.message}`,
        exception.stack,
      );

      const pgError = exception as QueryFailedError & { code?: string };

      if (pgError.code === '23505') {
        response.status(409).json({
          statusCode: 409,
          error: 'Conflict',
          message: 'Duplicate entry violates uniqueness constraint.',
          path: request.url,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      response.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Failed to process the database request.',
        path: request.url,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.logger.error(
      `Unhandled exception: ${(exception as Error)?.message}`,
      (exception as Error)?.stack,
    );

    const isProduction = process.env.NODE_ENV === 'production';

    response.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: isProduction
        ? 'An internal error occurred. Please try again later.'
        : ((exception as Error)?.message ?? 'Unknown error'),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
