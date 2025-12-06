import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create Users Table Migration
 *
 * Creates the users.users table with all required columns and indexes.
 * This is the foundational migration for the Users bounded context.
 */
export class CreateUsersTable1700000000000001 implements MigrationInterface {
  name = 'CreateUsersTable1700000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users schema if it doesn't exist
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "users"`);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users"."users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "phone" character varying(20),
        "password_hash" character varying(255),
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "role" character varying(20) NOT NULL DEFAULT 'PARTICIPANT',
        "is_organizer" boolean NOT NULL DEFAULT false,
        "email_verified" boolean NOT NULL DEFAULT false,
        "phone_verified" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_phone" UNIQUE ("phone")
      )
    `);

    // Create indexes for frequently queried columns
    await queryRunner.query(`
      CREATE INDEX "idx_users_email" ON "users"."users" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_phone" ON "users"."users" ("phone")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_role" ON "users"."users" ("role")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_is_active" ON "users"."users" ("is_active")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_created_at" ON "users"."users" ("created_at")
    `);

    // Add check constraint for valid roles
    await queryRunner.query(`
      ALTER TABLE "users"."users" 
      ADD CONSTRAINT "CHK_users_role" 
      CHECK ("role" IN ('ADMIN', 'ORGANIZER', 'PARTICIPANT'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop check constraint
    await queryRunner.query(`
      ALTER TABLE "users"."users" 
      DROP CONSTRAINT IF EXISTS "CHK_users_role"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "users"."idx_users_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "users"."idx_users_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "users"."idx_users_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "users"."idx_users_phone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "users"."idx_users_email"`);

    // Drop users table
    await queryRunner.query(`DROP TABLE IF EXISTS "users"."users"`);

    // Note: We don't drop the schema as other tables may exist in it
  }
}
