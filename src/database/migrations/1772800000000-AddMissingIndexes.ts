import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingIndexes1772800000000 implements MigrationInterface {
  name = 'AddMissingIndexes1772800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index for filtering document_types by isRequired (used in pendencies and listing)
    await queryRunner.query(
      `CREATE INDEX "IDX_document_types_is_required" ON "document_types" ("isRequired")`,
    );

    // Compound index for pendencies query: employeeId + status (pending docs per employee)
    await queryRunner.query(
      `CREATE INDEX "IDX_documents_employee_status" ON "documents" ("employeeId", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_documents_employee_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_document_types_is_required"`,
    );
  }
}
