import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileSizeAndContentTypeToDocuments1772700001000 implements MigrationInterface {
  name = 'AddFileSizeAndContentTypeToDocuments1772700001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" ADD COLUMN "fileSize" bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD COLUMN "contentType" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" DROP COLUMN "contentType"`,
    );
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "fileSize"`);
  }
}
