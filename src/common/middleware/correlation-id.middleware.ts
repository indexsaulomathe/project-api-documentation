import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers['x-request-id'] as string | undefined) ?? randomUUID();

    (req as Request & { correlationId: string }).correlationId = correlationId;
    res.setHeader('X-Request-ID', correlationId);

    next();
  }
}
