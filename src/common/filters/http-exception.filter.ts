import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const resp = exceptionResponse as Record<string, unknown>;
      message = Array.isArray(resp['message'])
        ? (resp['message'] as string[]).join(', ')
        : (resp['message'] as string) ?? exception.message;
    } else {
      message = exception.message;
    }

    response.status(statusCode).json({
      statusCode,
      error: exception.name.replace('Exception', ''),
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
