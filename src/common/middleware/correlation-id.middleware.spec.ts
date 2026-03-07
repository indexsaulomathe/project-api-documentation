import { CorrelationIdMiddleware } from './correlation-id.middleware';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRequest: { headers: Record<string, string> };
  let mockResponse: { setHeader: jest.Mock };
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
    mockRequest = { headers: {} };
    mockResponse = { setHeader: jest.fn() };
    mockNext = jest.fn();
  });

  it('should call next()', () => {
    middleware.use(mockRequest as any, mockResponse as any, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should set X-Request-ID response header', () => {
    middleware.use(mockRequest as any, mockResponse as any, mockNext);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      expect.any(String),
    );
  });

  it('should reuse incoming X-Request-ID when provided', () => {
    const existingId = 'test-correlation-id-123';
    mockRequest.headers['x-request-id'] = existingId;

    middleware.use(mockRequest as any, mockResponse as any, mockNext);

    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      existingId,
    );
  });

  it('should generate a UUID when X-Request-ID is not provided', () => {
    middleware.use(mockRequest as any, mockResponse as any, mockNext);

    const [, id] = mockResponse.setHeader.mock.calls[0] as [string, string];
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('should attach correlationId to the request object', () => {
    middleware.use(mockRequest as any, mockResponse as any, mockNext);

    const req = mockRequest as any;
    expect(req.correlationId).toBeDefined();
    expect(typeof req.correlationId).toBe('string');
  });
});
