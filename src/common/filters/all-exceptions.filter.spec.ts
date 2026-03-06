import { NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { PinoLogger } from 'nestjs-pino';
import { QueryFailedError } from 'typeorm';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockPinoLogger: { error: jest.Mock };
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: { url: string };
  let mockHost: {
    switchToHttp: () => {
      getResponse: () => typeof mockResponse;
      getRequest: () => typeof mockRequest;
    };
  };

  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    mockPinoLogger = { error: jest.fn() };
    filter = new AllExceptionsFilter(mockPinoLogger as unknown as PinoLogger);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = { url: '/api/v1/test' };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should return 500 for non-HTTP errors', () => {
    const error = new Error('unexpected error');
    filter.catch(error, mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });

  it('should not expose internal message in production (NODE_ENV=production)', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('internal secret');
    filter.catch(error, mockHost as any);
    const call = mockResponse.json.mock.calls[0][0];
    expect(call.message).not.toContain('internal secret');
    expect(call.message).toBe(
      'An internal error occurred. Please try again later.',
    );
  });

  it('should log the internal error for debugging', () => {
    const error = new Error('some error');
    filter.catch(error, mockHost as any);
    expect(mockPinoLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: error }),
      expect.any(String),
    );
  });

  it('should delegate to HttpException when exception is HttpException', () => {
    const exception = new NotFoundException('not found');
    filter.catch(exception, mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });

  it('should return 409 for QueryFailedError with code 23505', () => {
    const qfe = new QueryFailedError(
      'SELECT 1',
      [],
      new Error('duplicate key'),
    );
    (qfe as any).code = '23505';
    filter.catch(qfe, mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(409);
  });

  it('should return 400 for generic QueryFailedError', () => {
    const qfe = new QueryFailedError(
      'SELECT 1',
      [],
      new Error('generic db error'),
    );
    filter.catch(qfe, mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });
});
