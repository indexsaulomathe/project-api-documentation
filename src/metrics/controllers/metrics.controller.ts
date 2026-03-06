import { Controller, Get, Res, Headers, UnauthorizedException } from '@nestjs/common';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { Response } from 'express';
import { Public } from '../../auth/decorators/public.decorator';

@Public()
@Controller()
export class MetricsController extends PrometheusController {
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
