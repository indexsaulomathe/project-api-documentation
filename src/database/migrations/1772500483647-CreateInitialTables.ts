import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1772500483647 implements MigrationInterface {
  name = 'CreateInitialTables1772500483647';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."documents_status_enum" AS ENUM('pending', 'submitted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "employeeId" uuid NOT NULL, "documentTypeId" uuid NOT NULL, "version" integer NOT NULL DEFAULT '1', "isActive" boolean NOT NULL DEFAULT true, "status" "public"."documents_status_enum" NOT NULL DEFAULT 'pending', "fileName" character varying, "submittedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ca6566c7ae253918ff403fac21" ON "documents" ("employeeId", "documentTypeId", "isActive") `,
    );
    await queryRunner.query(
      `CREATE TABLE "document_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "name" character varying NOT NULL, "description" character varying, "isRequired" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_803cd247b7c1c8d91b30a3eb210" UNIQUE ("name"), CONSTRAINT "PK_d467d7eeb7c8ce216e90e8494aa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "employee_document_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employeeId" uuid NOT NULL, "documentTypeId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_682c70650048df09f6ae4ca6095" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ed212afc4bd2c9341b27ad86f4" ON "employee_document_types" ("employeeId", "documentTypeId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "employees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "name" character varying(100) NOT NULL, "email" character varying NOT NULL, "cpf" character varying(11) NOT NULL, "department" character varying NOT NULL, "position" character varying, CONSTRAINT "UQ_765bc1ac8967533a04c74a9f6af" UNIQUE ("email"), CONSTRAINT "UQ_0ac9216832e4dda06946c37cb73" UNIQUE ("cpf"), CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_765bc1ac8967533a04c74a9f6a" ON "employees" ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0ac9216832e4dda06946c37cb7" ON "employees" ("cpf") `,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_8424ae83e09a5d8105c418086b3" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_6c6b9775baa0c8973bd829a8e46" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee_document_types" ADD CONSTRAINT "FK_471edfb6d0ad664e82d79257723" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee_document_types" ADD CONSTRAINT "FK_b78796f6bf392633a07906b4a8a" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employee_document_types" DROP CONSTRAINT "FK_b78796f6bf392633a07906b4a8a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee_document_types" DROP CONSTRAINT "FK_471edfb6d0ad664e82d79257723"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_6c6b9775baa0c8973bd829a8e46"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_8424ae83e09a5d8105c418086b3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0ac9216832e4dda06946c37cb7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_765bc1ac8967533a04c74a9f6a"`,
    );
    await queryRunner.query(`DROP TABLE "employees"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ed212afc4bd2c9341b27ad86f4"`,
    );
    await queryRunner.query(`DROP TABLE "employee_document_types"`);
    await queryRunner.query(`DROP TABLE "document_types"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ca6566c7ae253918ff403fac21"`,
    );
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TYPE "public"."documents_status_enum"`);
  }
}
