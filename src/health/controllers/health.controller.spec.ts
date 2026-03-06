import { HealthController } from './health.controller';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<HealthCheckService>;
  let db: jest.Mocked<TypeOrmHealthIndicator>;

  beforeEach(() => {
    healthService = {
      check: jest.fn(),
    } as any;

    db = {
      pingCheck: jest.fn(),
    } as any;

    controller = new HealthController(healthService, db);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call health.check with database indicator', async () => {
    const mockResult = {
      status: 'ok',
      info: { database: { status: 'up' } },
      error: {},
      details: { database: { status: 'up' } },
    };
    healthService.check.mockResolvedValue(mockResult as any);

    const result = await controller.check();

    expect(healthService.check).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockResult);
  });

  it('should pass a database ping indicator function to health.check', async () => {
    healthService.check.mockResolvedValue({} as any);
    db.pingCheck.mockResolvedValue({ database: { status: 'up' } });

    await controller.check();

    const [indicators] = healthService.check.mock.calls[0];
    expect(indicators).toHaveLength(1);

    await indicators[0]();
    expect(db.pingCheck).toHaveBeenCalledWith('database');
  });
});
