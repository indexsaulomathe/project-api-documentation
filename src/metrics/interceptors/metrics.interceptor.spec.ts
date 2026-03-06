import { ExecutionContext, CallHandler } from '@nestjs/common';
import { MetricsInterceptor } from './metrics.interceptor';
import { Counter, Gauge, Histogram } from 'prom-client';
import { of, throwError } from 'rxjs';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let mockHistogram: jest.Mocked<Histogram<string>>;
  let mockCounter: jest.Mocked<Counter<string>>;
  let mockGauge: jest.Mocked<Gauge<string>>;
  let endTimerMock: jest.Mock;

  const buildContext = (path = '/api/v1/employees', method = 'GET', statusCode = 200): ExecutionContext => {
    const req = { method, path, route: { path } };
    const res = { statusCode };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;
  };

  const buildHandler = (value: unknown = {}): CallHandler =>
    ({ handle: () => of(value) } as CallHandler);

  const buildThrowingHandler = (err: Error): CallHandler =>
    ({ handle: () => throwError(() => err) } as CallHandler);

  beforeEach(() => {
    endTimerMock = jest.fn();
    mockHistogram = {
      startTimer: jest.fn().mockReturnValue(endTimerMock),
    } as unknown as jest.Mocked<Histogram<string>>;

    mockCounter = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

    mockGauge = {
      inc: jest.fn(),
      dec: jest.fn(),
    } as unknown as jest.Mocked<Gauge<string>>;

    interceptor = new MetricsInterceptor(mockHistogram, mockCounter, mockGauge);
  });

  it('gauge.inc() is called at the start of the request', () => {
    const ctx = buildContext();
    const handler = buildHandler();

    interceptor.intercept(ctx, handler).subscribe();

    expect(mockGauge.inc).toHaveBeenCalledTimes(1);
  });

  it('gauge.dec() is called in finalize (after response)', () => {
    const ctx = buildContext();
    const handler = buildHandler();

    interceptor.intercept(ctx, handler).subscribe();

    expect(mockGauge.dec).toHaveBeenCalledTimes(1);
  });

  it('histogram.observe() (startTimer end fn) is called with correct labels', () => {
    const ctx = buildContext('/api/v1/employees', 'GET', 200);
    const handler = buildHandler();

    interceptor.intercept(ctx, handler).subscribe();

    expect(endTimerMock).toHaveBeenCalledWith({ status_code: '200' });
  });

  it('counter.inc() is called with correct labels', () => {
    const ctx = buildContext('/api/v1/employees', 'POST', 201);
    const handler = buildHandler();

    interceptor.intercept(ctx, handler).subscribe();

    expect(mockCounter.inc).toHaveBeenCalledWith({
      method: 'POST',
      route: '/api/v1/employees',
      status_code: '201',
    });
  });

  it('metrics are recorded even when the handler throws an exception', () => {
    const ctx = buildContext('/api/v1/error', 'GET', 500);
    const handler = buildThrowingHandler(new Error('test error'));

    interceptor.intercept(ctx, handler).subscribe({
      error: () => undefined,
    });

    expect(mockGauge.inc).toHaveBeenCalledTimes(1);
    expect(mockGauge.dec).toHaveBeenCalledTimes(1);
    expect(endTimerMock).toHaveBeenCalledTimes(1);
    expect(mockCounter.inc).toHaveBeenCalledTimes(1);
  });
});
