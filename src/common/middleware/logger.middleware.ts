import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, url, ip } = req;
    const start = Date.now();

    res.on('finish', () => {
      const elapsed = Date.now() - start;
      const { statusCode } = res;
      const timestamp = new Date().toISOString();
      this.logger.log(
        `[${timestamp}] ${method} ${url} ${statusCode} ${elapsed}ms ${ip}`,
      );
    });

    next();
  }
}
