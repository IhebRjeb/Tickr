import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create Verification Tokens Table Migration
 *
 * Creates the users.verification_tokens table for email verification
 * and password reset functionality.
 */
export class CreateVerificationTokensTable1700000000000002
  implements MigrationInterface
{
  name = 'CreateVerificationTokensTable1700000000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create verification_tokens table
    await queryRunner.query(`
      CREATE TABLE "users"."verification_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token" character varying(255) NOT NULL,
        "token_type" character varying(50) NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "used_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_verification_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_verification_tokens_token" UNIQUE ("token"),
        CONSTRAINT "FK_verification_tokens_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"."users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_verification_tokens_user_id" 
      ON "users"."verification_tokens" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_verification_tokens_token" 
      ON "users"."verification_tokens" ("token")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_verification_tokens_type" 
      ON "users"."verification_tokens" ("token_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_verification_tokens_expires" 
      ON "users"."verification_tokens" ("expires_at")
    `);

    // Add check constraint for valid token types
    await queryRunner.query(`
      ALTER TABLE "users"."verification_tokens" 
      ADD CONSTRAINT "CHK_verification_tokens_type" 
      CHECK ("token_type" IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop check constraint
    await queryRunner.query(`
      ALTER TABLE "users"."verification_tokens" 
      DROP CONSTRAINT IF EXISTS "CHK_verification_tokens_type"
    `);

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "users"."idx_verification_tokens_expires"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "users"."idx_verification_tokens_type"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "users"."idx_verification_tokens_token"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "users"."idx_verification_tokens_user_id"`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "users"."verification_tokens"`);
  }
}
