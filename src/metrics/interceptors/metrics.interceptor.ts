import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge, Histogram } from 'prom-client';
import { Observable, finalize } from 'rxjs';
import { Request, Response } from 'express';

export const HTTP_REQUEST_DURATION_SECONDS = 'http_request_duration_seconds';
export const HTTP_REQUESTS_TOTAL = 'http_requests_total';
export const HTTP_ACTIVE_REQUESTS = 'http_active_requests';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric(HTTP_REQUEST_DURATION_SECONDS)
    private readonly histogram: Histogram<string>,
    @InjectMetric(HTTP_REQUESTS_TOTAL)
    private readonly counter: Counter<string>,
    @InjectMetric(HTTP_ACTIVE_REQUESTS)
    private readonly gauge: Gauge<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const method = req.method;
    const route: string =
      (req.route as { path?: string } | undefined)?.path ?? req.path;
    const routeLabels = { method, route };
    const end: (labels?: Partial<Record<string, string | number>>) => number =
      this.histogram.startTimer(routeLabels);

    this.gauge.inc(routeLabels);

    return next.handle().pipe(
      finalize(() => {
        const statusCode = String(res.statusCode);
        const fullLabels = { method, route, status_code: statusCode };

        end({ status_code: statusCode });
        this.counter.inc(fullLabels);
        this.gauge.dec(routeLabels);
      }),
    );
  }
}
