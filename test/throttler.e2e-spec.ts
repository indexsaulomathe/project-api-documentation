import { INestApplication, Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule, ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';

@Controller('probe')
class ProbeController {
  @Get()
  ping() {
    return 'ok';
  }

  @Throttle({ strict: { ttl: 60000, limit: 2 } })
  @Get('strict')
  strict() {
    return 'ok';
  }
}

describe('Throttler (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            { name: 'global', ttl: 60000, limit: 100 },
            { name: 'strict', ttl: 60000, limit: 2 },
          ],
        }),
      ],
      controllers: [ProbeController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('should allow requests below the global rate limit', async () => {
    const res = await request(app.getHttpServer()).get('/probe');
    expect(res.status).toBe(200);
  });

  it('should include throttle headers in response', async () => {
    const res = await request(app.getHttpServer()).get('/probe');
    expect(res.headers).toHaveProperty('x-ratelimit-limit-global');
    expect(res.headers).toHaveProperty('x-ratelimit-remaining-global');
  });

  it('should return 429 after exceeding strict limit on upload-like endpoint', async () => {
    const server = app.getHttpServer();
    const statuses: number[] = [];

    // Make 4 requests — limit is 2, so 3rd+ should be 429
    for (let i = 0; i < 4; i++) {
      const res = await request(server).get('/probe/strict');
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 2).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(2).every((s) => s === 429)).toBe(true);
  });
});
