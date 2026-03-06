import { buildLoggerConfig } from './logger.module';
import { IncomingMessage } from 'http';

describe('buildLoggerConfig', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalLogLevel = process.env.LOG_LEVEL;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }
  });

  it('genReqId returns req.correlationId when present', () => {
    const config = buildLoggerConfig();
    const { genReqId } = config.pinoHttp as {
      genReqId: (req: IncomingMessage) => string;
    };
    const mockReq = { correlationId: 'abc-123', headers: {} } as any;
    expect(genReqId(mockReq)).toBe('abc-123');
  });

  it('genReqId falls back to x-request-id header when correlationId is absent', () => {
    const config = buildLoggerConfig();
    const { genReqId } = config.pinoHttp as {
      genReqId: (req: IncomingMessage) => string;
    };
    const mockReq = { headers: { 'x-request-id': 'header-id' } } as any;
    expect(genReqId(mockReq)).toBe('header-id');
  });

  it('customProps returns object with correlationId field', () => {
    const config = buildLoggerConfig();
    const { customProps } = config.pinoHttp as {
      customProps: (req: IncomingMessage) => Record<string, unknown>;
    };
    const mockReq = { correlationId: 'xyz-456', headers: {} } as any;
    const props = customProps(mockReq);
    expect(props).toHaveProperty('correlationId', 'xyz-456');
  });

  it('redact.paths contains the 5 sensitive fields', () => {
    const config = buildLoggerConfig();
    const { redact } = config.pinoHttp as {
      redact: { paths: string[] };
    };
    expect(redact.paths).toContain('req.body.password');
    expect(redact.paths).toContain('req.body.token');
    expect(redact.paths).toContain('req.body.refreshToken');
    expect(redact.paths).toContain('req.body.cpf');
    expect(redact.paths).toContain('req.headers.authorization');
  });

  it('transport.target is pino-pretty in non-production mode', () => {
    process.env.NODE_ENV = 'development';
    const config = buildLoggerConfig();
    const { transport } = config.pinoHttp as {
      transport: { target: string } | undefined;
    };
    expect(transport).toBeDefined();
    expect(transport!.target).toBe('pino-pretty');
  });

  it('transport is undefined in production mode', () => {
    process.env.NODE_ENV = 'production';
    const config = buildLoggerConfig();
    const { transport } = config.pinoHttp as { transport: unknown };
    expect(transport).toBeUndefined();
  });
});
