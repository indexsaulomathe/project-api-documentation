import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PaginatedData<T> {
  meta: {
    page: number;
    limit: number;
    lastPage: number;
    total: number;
  };
  data: T[];
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => {
        // Skip wrapping for non-JSON responses (e.g. Prometheus text/plain)
        const contentType = String(response.getHeader('Content-Type') ?? '');
        if (contentType.startsWith('text/')) {
          return data;
        }

        const paginated = data as unknown as PaginatedData<unknown>;
        if (
          data &&
          typeof data === 'object' &&
          'data' in paginated &&
          'meta' in paginated
        ) {
          return {
            success: true,
            statusCode,
            meta: paginated.meta,
            data: paginated.data,
          };
        }

        return {
          success: true,
          statusCode,
          data,
        };
      }),
    );
  }
}
