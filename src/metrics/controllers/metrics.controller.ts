import { Controller, Get, Res, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { Response } from 'express';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('metrics')
@Public()
@Controller()
export class MetricsController extends PrometheusController {
  @ApiOperation({ summary: 'Prometheus metrics scrape endpoint' })
  @ApiHeader({
    name: 'metrics-token',
    description: 'Required when METRICS_TOKEN env var is set',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Prometheus text format metrics' })
  @ApiResponse({ status: 401, description: 'Invalid or missing metrics token' })
  @Get()
  override async index(
    @Res({ passthrough: true }) response: Response,
    @Headers('metrics-token') token?: string,
  ): Promise<string> {
    const expectedToken = process.env.METRICS_TOKEN;
    if (expectedToken && token !== expectedToken) {
      throw new UnauthorizedException('Invalid metrics token');
    }
    return super.index(response);
  }
}
