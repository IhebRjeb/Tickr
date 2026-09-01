import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventCheckInStaffAssignments1788294000000
  implements MigrationInterface
{
  name = 'CreateEventCheckInStaffAssignments1788294000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "events"."event_check_in_staff_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "assigned_by" uuid NOT NULL,
        "assigned_at" timestamptz NOT NULL DEFAULT now(),
        "revoked_at" timestamptz,
        "revoked_by" uuid,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_check_in_staff_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_event_check_in_staff_event" FOREIGN KEY ("event_id")
          REFERENCES "events"."events"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_event_check_in_staff_revocation_pair" CHECK (
          ("revoked_at" IS NULL AND "revoked_by" IS NULL)
          OR ("revoked_at" IS NOT NULL AND "revoked_by" IS NOT NULL)
        )
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_event_check_in_staff_active"
      ON "events"."event_check_in_staff_assignments" ("event_id", "user_id")
      WHERE "revoked_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_event_check_in_staff_active_event"
      ON "events"."event_check_in_staff_assignments" ("event_id", "assigned_at" DESC)
      WHERE "revoked_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_event_check_in_staff_active_user"
      ON "events"."event_check_in_staff_assignments" ("user_id", "event_id")
      WHERE "revoked_at" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "tickets"."check_ins"
      ADD COLUMN "authorization_source" character varying(20),
      ADD COLUMN "assignment_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "tickets"."check_ins"
      ADD CONSTRAINT "CHK_check_ins_authorization_source"
      CHECK (
        "authorization_source" IS NULL
        OR "authorization_source" IN ('OWNER', 'ADMIN', 'ASSIGNMENT')
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "tickets"."check_ins"
      ADD CONSTRAINT "CHK_check_ins_assignment_authorization"
      CHECK (
        ("authorization_source" = 'ASSIGNMENT' AND "assignment_id" IS NOT NULL)
        OR ("authorization_source" IS DISTINCT FROM 'ASSIGNMENT' AND "assignment_id" IS NULL)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tickets_event_status"
      ON "tickets"."tickets" ("event_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "tickets"."idx_tickets_event_status"',
    );
    await queryRunner.query(`
      ALTER TABLE "tickets"."check_ins"
      DROP CONSTRAINT IF EXISTS "CHK_check_ins_assignment_authorization",
      DROP CONSTRAINT IF EXISTS "CHK_check_ins_authorization_source",
      DROP COLUMN IF EXISTS "assignment_id",
      DROP COLUMN IF EXISTS "authorization_source"
    `);
    await queryRunner.query(
      'DROP TABLE IF EXISTS "events"."event_check_in_staff_assignments"',
    );
  }
}