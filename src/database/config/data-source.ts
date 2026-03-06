import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

export function buildDataSourceOptions(): DataSourceOptions {
  const isTest = process.env.NODE_ENV === 'test';
  const isDev = process.env.NODE_ENV === 'development';

  const host = process.env[isTest ? 'DB_TEST_HOST' : 'DB_HOST'];
  const port = process.env[isTest ? 'DB_TEST_PORT' : 'DB_PORT'];
  const database = process.env[isTest ? 'DB_TEST_NAME' : 'DB_NAME'];
  const logger = isDev ?? false;

  return {
    type: 'postgres',
    host: host,
    port: parseInt(port ?? '5432', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: database,
    entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
    synchronize: false,
    logging: logger,
    extra: {
      // Pool sizing
      max: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
      min: parseInt(process.env.DB_POOL_MIN ?? '2', 10),
      // Idle connections are released after 30s to free DB-side resources
      idleTimeoutMillis: parseInt(
        process.env.DB_POOL_IDLE_TIMEOUT ?? '30000',
        10,
      ),
      // Fail fast if all connections are busy (avoids unbounded queue)
      connectionTimeoutMillis: parseInt(
        process.env.DB_POOL_CONN_TIMEOUT ?? '5000',
        10,
      ),
      // Kill slow queries server-side (prevents lock storms)
      statement_timeout: parseInt(
        process.env.DB_STATEMENT_TIMEOUT ?? '10000',
        10,
      ),
      // Keep connections alive with OS-level TCP keepalives
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    },
  };
}

export const AppDataSource = new DataSource(buildDataSourceOptions());
