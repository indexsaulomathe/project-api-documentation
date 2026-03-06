import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  PrometheusModule,
  makeHistogramProvider,
  makeCounterProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsController } from './controllers/metrics.controller';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import {
  HTTP_REQUEST_DURATION_SECONDS,
  HTTP_REQUESTS_TOTAL,
  HTTP_ACTIVE_REQUESTS,
} from './interceptors/metrics.interceptor';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      controller: MetricsController,
      defaultMetrics: { enabled: true },
      defaultLabels: { app: 'employee-docs-api' },
    }),
  ],
  providers: [
    makeHistogramProvider({
      name: HTTP_REQUEST_DURATION_SECONDS,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    }),
    makeCounterProvider({
      name: HTTP_REQUESTS_TOTAL,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeGaugeProvider({
      name: HTTP_ACTIVE_REQUESTS,
      help: 'Number of currently active HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class MetricsModule {}
