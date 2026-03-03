import { ResponseInterceptor } from './response.interceptor';
import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;

  const mockContext = (statusCode = 200): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
      }),
    }) as unknown as ExecutionContext;

  const mockHandler = (data: unknown) => ({
    handle: () => of(data),
  });

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('should wrap response with success: true and statusCode', (done) => {
    interceptor
      .intercept(mockContext(), mockHandler({ id: '1', name: 'Test' }) as any)
      .subscribe((result) => {
        expect(result).toMatchObject({
          success: true,
          statusCode: 200,
          data: { id: '1', name: 'Test' },
        });
        done();
      });
  });

  it('should keep data intact', (done) => {
    const payload = { id: 'abc', email: 'test@test.com' };
    interceptor
      .intercept(mockContext(), mockHandler(payload) as any)
      .subscribe((result: any) => {
        expect(result.data).toEqual(payload);
        done();
      });
  });

  it('should include meta when response contains pagination data', (done) => {
    const paginatedData = {
      data: [{ id: '1' }],
      meta: { total: 1, page: 1, lastPage: 1, limit: 10 },
    };
    interceptor
      .intercept(mockContext(), mockHandler(paginatedData) as any)
      .subscribe((result: any) => {
        expect(result.meta).toEqual(paginatedData.meta);
        expect(result.data).toEqual(paginatedData.data);
        done();
      });
  });

  it('should use the correct statusCode from the HTTP response', (done) => {
    interceptor
      .intercept(mockContext(201), mockHandler({}) as any)
      .subscribe((result: any) => {
        expect(result.statusCode).toBe(201);
        done();
      });
  });
});
