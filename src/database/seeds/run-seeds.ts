import { AppDataSource } from '../../../data-source';
import { seedDocumentTypes } from './document-types.seed';

async function runSeeds(): Promise<void> {
  await AppDataSource.initialize();
  console.log('Running seeds...');

  await seedDocumentTypes(AppDataSource);

  await AppDataSource.destroy();
  console.log('Seeds completed.');
}

runSeeds().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
