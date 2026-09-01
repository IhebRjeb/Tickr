import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventCommissionRateOverride1788199200000
  implements MigrationInterface
{
  name = 'AddEventCommissionRateOverride1788199200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"."events"
      ADD COLUMN "commission_rate_override" decimal(5, 4)
    `);
    await queryRunner.query(`
      ALTER TABLE "events"."events"
      ADD CONSTRAINT "CHK_events_commission_rate_override"
      CHECK (
        "commission_rate_override" IS NULL
        OR "commission_rate_override" BETWEEN 0 AND 0.2
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"."events"
      DROP CONSTRAINT "CHK_events_commission_rate_override"
    `);
    await queryRunner.query(`
      ALTER TABLE "events"."events"
      DROP COLUMN "commission_rate_override"
    `);
  }
}