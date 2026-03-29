import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create Tickets Tables Migration
 *
 * Creates the tickets.tickets and tickets.check_ins tables with all required
 * columns, constraints, and indexes per the database schema.
 *
 * Schema: tickets
 * Tables:
 * - tickets: Main ticket aggregate table
 * - check_ins: Check-in audit trail table
 *
 * Note: Cross-schema references (events, users) are soft references
 * (no FK constraints) to maintain module isolation.
 */
export class CreateTicketsTables1700000000000004 implements MigrationInterface {
  name = 'CreateTicketsTables1700000000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // Create tickets schema
    // ============================================
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "tickets"`);

    // ============================================
    // Create tickets table
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "tickets"."tickets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_id" uuid NOT NULL,
        "ticket_type_id" uuid NOT NULL,
        "order_id" uuid,
        "user_id" uuid NOT NULL,

        "qr_code" character varying(100) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'RESERVED',

        "price_amount" decimal(10, 2) NOT NULL,
        "price_currency" character varying(3) NOT NULL DEFAULT 'TND',

        "holder_name" character varying(200) NOT NULL,
        "holder_email" character varying(255) NOT NULL,
        "holder_phone" character varying(20),

        "checked_in_at" timestamp,
        "checked_in_by" uuid,

        "transferred_to" uuid,
        "transferred_at" timestamp,
        "transfer_count" integer NOT NULL DEFAULT 0,

        "reserved_until" timestamp,
        "pdf_url" character varying(500),

        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),

        CONSTRAINT "PK_tickets_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tickets_qr_code" UNIQUE ("qr_code"),
        CONSTRAINT "CHK_tickets_transfer_limit" CHECK ("transfer_count" <= 3),
        CONSTRAINT "CHK_tickets_valid_status" CHECK ("status" IN ('RESERVED', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'EXPIRED'))
      )
    `);

    // ============================================
    // Create indexes for tickets table
    // ============================================

    // Index for event's tickets
    await queryRunner.query(`
      CREATE INDEX "idx_tickets_event_id" ON "tickets"."tickets" ("event_id")
    `);

    // Index for user's tickets
    await queryRunner.query(`
      CREATE INDEX "idx_tickets_user_id" ON "tickets"."tickets" ("user_id")
    `);

    // Partial index for order association
    await queryRunner.query(`
      CREATE INDEX "idx_tickets_order_id" ON "tickets"."tickets" ("order_id")
      WHERE "order_id" IS NOT NULL
    `);

    // Index for QR code lookups (already unique, but explicit for clarity)
    await queryRunner.query(`
      CREATE INDEX "idx_tickets_qr_code" ON "tickets"."tickets" ("qr_code")
    `);

    // Index for status filtering
    await queryRunner.query(`
      CREATE INDEX "idx_tickets_status" ON "tickets"."tickets" ("status")
    `);

    // Partial index for expired reservation queries (cron job optimization)
    await queryRunner.query(`
      CREATE INDEX "idx_tickets_reserved_exp" ON "tickets"."tickets" ("reserved_until")
      WHERE "status" = 'RESERVED'
    `);

    // ============================================
    // Create check_ins table
    // ============================================
    await queryRunner.query(`
      CREATE TABLE "tickets"."check_ins" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ticket_id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "staff_id" uuid NOT NULL,
        "device_id" character varying(100) NOT NULL,
        "timestamp" timestamp NOT NULL DEFAULT now(),
        "location_gate" character varying(50),
        "is_valid" boolean NOT NULL DEFAULT true,
        "failure_reason" text,
        "created_at" timestamp NOT NULL DEFAULT now(),

        CONSTRAINT "PK_check_ins_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_check_ins_ticket" FOREIGN KEY ("ticket_id")
          REFERENCES "tickets"."tickets"("id") ON DELETE CASCADE
      )
    `);

    // ============================================
    // Create indexes for check_ins table
    // ============================================

    await queryRunner.query(`
      CREATE INDEX "idx_check_ins_ticket_id" ON "tickets"."check_ins" ("ticket_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_check_ins_event_id" ON "tickets"."check_ins" ("event_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_check_ins_timestamp" ON "tickets"."check_ins" ("timestamp")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // Drop check_ins table (depends on tickets)
    // ============================================
    await queryRunner.query(`DROP TABLE IF EXISTS "tickets"."check_ins"`);

    // ============================================
    // Drop tickets table
    // ============================================
    await queryRunner.query(`DROP TABLE IF EXISTS "tickets"."tickets"`);

    // ============================================
    // Drop tickets schema
    // ============================================
    await queryRunner.query(`DROP SCHEMA IF EXISTS "tickets" CASCADE`);
  }
}
