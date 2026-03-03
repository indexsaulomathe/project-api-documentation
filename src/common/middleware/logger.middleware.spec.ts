import { LoggerMiddleware } from './logger.middleware';

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let mockRequest: { method: string; url: string; ip: string };
  let mockResponse: { on: jest.Mock; statusCode: number };
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new LoggerMiddleware();
    jest.spyOn(middleware['logger'], 'log').mockImplementation(() => undefined);

    mockRequest = { method: 'GET', url: '/api/v1/employees', ip: '127.0.0.1' };
    mockResponse = { on: jest.fn(), statusCode: 200 };
    mockNext = jest.fn();
  });

  it('should call next() to pass to the next middleware', () => {
    middleware.use(mockRequest as any, mockResponse as any, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should register a finish listener on the response', () => {
    middleware.use(mockRequest as any, mockResponse as any, mockNext);
    expect(mockResponse.on).toHaveBeenCalledWith(
      'finish',
      expect.any(Function),
    );
  });

  it('should log method and URL when finish is triggered', () => {
    middleware.use(mockRequest as any, mockResponse as any, mockNext);
    const finishCallback = mockResponse.on.mock.calls[0][1] as () => void;
    finishCallback();
    expect(middleware['logger'].log).toHaveBeenCalledWith(
      expect.stringContaining('GET'),
    );
    expect(middleware['logger'].log).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/employees'),
    );
  });

  it('should log status code and elapsed time', () => {
    middleware.use(mockRequest as any, mockResponse as any, mockNext);
    const finishCallback = mockResponse.on.mock.calls[0][1] as () => void;
    finishCallback();
    const logArg = (middleware['logger'].log as jest.Mock).mock
      .calls[0][0] as string;
    expect(logArg).toContain('200');
    expect(logArg).toMatch(/\d+ms/);
  });

  it('should not break the request flow if logger throws', () => {
    jest.spyOn(middleware['logger'], 'log').mockImplementation(() => {
      throw new Error('log error');
    });
    expect(() =>
      middleware.use(mockRequest as any, mockResponse as any, mockNext),
    ).not.toThrow();
    expect(mockNext).toHaveBeenCalled();
  });
});
