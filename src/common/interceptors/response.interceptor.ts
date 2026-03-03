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
  data: T[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
    limit: number;
  };
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
            data: paginated.data,
            meta: paginated.meta,
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
