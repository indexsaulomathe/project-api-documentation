import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStorageKeyToDocuments1772596719014 implements MigrationInterface {
  name = 'AddStorageKeyToDocuments1772596719014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" ADD "storageKey" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "storageKey"`);
  }
}
