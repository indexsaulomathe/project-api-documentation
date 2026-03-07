import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: { url: string };
  let mockHost: {
    switchToHttp: () => {
      getResponse: () => typeof mockResponse;
      getRequest: () => typeof mockRequest;
    };
  };

  beforeEach(() => {
    filter = new HttpExceptionFilter();

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

  it('should return the correct statusCode from the exception', () => {
    const exception = new NotFoundException('Not found');
    filter.catch(exception, mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });

  it('should include the request path in the response', () => {
    const exception = new NotFoundException('Not found');
    filter.catch(exception, mockHost as any);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/api/v1/test' }),
    );
  });

  it('should include timestamp in ISO format', () => {
    const exception = new NotFoundException('Not found');
    filter.catch(exception, mockHost as any);
    const call = mockResponse.json.mock.calls[0][0];
    expect(call.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should format message as string even when it comes as an array', () => {
    const exception = new BadRequestException([
      'invalid field',
      'cpf required',
    ]);
    filter.catch(exception, mockHost as any);
    const call = mockResponse.json.mock.calls[0][0];
    expect(typeof call.message).toBe('string');
    expect(call.message).toContain('invalid field');
  });

  it('should return 400 for BadRequestException', () => {
    filter.catch(new BadRequestException('bad'), mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });

  it('should return 404 for NotFoundException', () => {
    filter.catch(new NotFoundException('not found'), mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });

  it('should return 409 for ConflictException', () => {
    filter.catch(new ConflictException('conflict'), mockHost as any);
    expect(mockResponse.status).toHaveBeenCalledWith(409);
  });
});
