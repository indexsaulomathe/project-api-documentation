import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersTable1772700000000 implements MigrationInterface {
  name = 'AddUsersTable1772700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'employee')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'employee',
        "refreshTokenHash" character varying,
        "employeeId" uuid,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
