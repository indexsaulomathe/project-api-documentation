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
  };
}

export const AppDataSource = new DataSource(buildDataSourceOptions());
