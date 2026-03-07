import { AppDataSource } from '../config/data-source';
import { seedDocumentTypes } from './document-types.seed';
import { seedEmployees } from './employees.seed';
import { seedUsers } from './users.seed';
import { seedLinks } from './links.seed';

const env = process.env.NODE_ENV ?? 'development';

if (env === 'production') {
  console.error(
    '[seed] ERROR: Seeds are not allowed in production.\n' +
      '       Use migrations for schema changes and manage production data manually.',
  );
  process.exit(1);
}

const isTest = env === 'test';
const target = isTest ? 'TEST' : 'DEVELOPMENT';
const dbName = isTest ? process.env.DB_TEST_NAME : process.env.DB_NAME;

async function runSeeds(): Promise<void> {
  console.log(`\n[seed] Target: ${target} database (${dbName})`);

  await AppDataSource.initialize();

  console.log('[seed] Ensuring uuid-ossp extension...');
  await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  console.log('[seed] Running pending migrations...');
  await AppDataSource.runMigrations();

  console.log('\n[seed] Document types...');
  await seedDocumentTypes(AppDataSource);

  if (!isTest) {
    console.log('\n[seed] Employees...');
    const employeeIds = await seedEmployees(AppDataSource);

    console.log('\n[seed] Users...');
    await seedUsers(AppDataSource, employeeIds);

    console.log('\n[seed] Links & pending documents...');
    await seedLinks(AppDataSource, employeeIds);
  }

  await AppDataSource.destroy();
  console.log(`\n[seed] Done — ${target} database ready.\n`);
}

runSeeds().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
