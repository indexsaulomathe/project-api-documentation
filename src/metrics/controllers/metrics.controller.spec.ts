import { UnauthorizedException } from '@nestjs/common';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { MetricsController } from './metrics.controller';
import { Response } from 'express';

describe('MetricsController', () => {
  let controller: MetricsController;
  let mockResponse: Partial<Response>;
  const originalToken = process.env.METRICS_TOKEN;

  beforeEach(() => {
    jest
      .spyOn(PrometheusController.prototype, 'index')
      .mockResolvedValue('# HELP nodejs_version_info...');
    controller = new MetricsController();
    mockResponse = { header: jest.fn() } as unknown as Partial<Response>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalToken === undefined) {
      delete process.env.METRICS_TOKEN;
    } else {
      process.env.METRICS_TOKEN = originalToken;
    }
  });

  it('returns metrics when METRICS_TOKEN env var is not set', async () => {
    delete process.env.METRICS_TOKEN;

    const result = await controller.index(mockResponse as Response, undefined);

    expect(result).toContain('# HELP');
    expect(PrometheusController.prototype.index).toHaveBeenCalled();
  });

  it('returns metrics when correct METRICS_TOKEN is provided', async () => {
    process.env.METRICS_TOKEN = 'secret-token';

    const result = await controller.index(
      mockResponse as Response,
      'secret-token',
    );

    expect(result).toContain('# HELP');
  });

  it('throws UnauthorizedException when METRICS_TOKEN is set and wrong token provided', async () => {
    process.env.METRICS_TOKEN = 'secret-token';

    await expect(
      controller.index(mockResponse as Response, 'wrong-token'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when METRICS_TOKEN is set and no token provided', async () => {
    process.env.METRICS_TOKEN = 'secret-token';

    await expect(
      controller.index(mockResponse as Response, undefined),
    ).rejects.toThrow(UnauthorizedException);
  });
});
