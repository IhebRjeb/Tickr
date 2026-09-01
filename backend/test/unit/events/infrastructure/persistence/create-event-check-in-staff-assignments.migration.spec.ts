import { CreateEventCheckInStaffAssignments1788294000000 } from '@shared/infrastructure/database/migrations/1788294000000-create-event-check-in-staff-assignments';
import type { QueryRunner } from 'typeorm';

describe('CreateEventCheckInStaffAssignments1788294000000', () => {
  let migration: CreateEventCheckInStaffAssignments1788294000000;
  let query: jest.Mock;

  beforeEach(() => {
    migration = new CreateEventCheckInStaffAssignments1788294000000();
    query = jest.fn().mockResolvedValue(undefined);
  });

  it('creates the assignment table with event cascade and revocation pairing', async () => {
    await migration.up({ query } as unknown as QueryRunner);

    const sql = query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain(
      'CREATE TABLE "events"."event_check_in_staff_assignments"',
    );
    expect(sql).toContain('REFERENCES "events"."events"("id") ON DELETE CASCADE');
    expect(sql).toContain('"CHK_event_check_in_staff_revocation_pair"');
  });

  it('enforces one active assignment and indexes both lookup directions', async () => {
    await migration.up({ query } as unknown as QueryRunner);

    const sql = query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain('CREATE UNIQUE INDEX "uq_event_check_in_staff_active"');
    expect(sql).toContain('"event_id", "user_id"');
    expect(sql).toContain('CREATE INDEX "idx_event_check_in_staff_active_event"');
    expect(sql).toContain('CREATE INDEX "idx_event_check_in_staff_active_user"');
    expect(sql).toContain('WHERE "revoked_at" IS NULL');
  });

  it('adds authorization provenance and the event-status ticket index', async () => {
    await migration.up({ query } as unknown as QueryRunner);

    const sql = query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain('ADD COLUMN "authorization_source"');
    expect(sql).toContain('ADD COLUMN "assignment_id"');
    expect(sql).toContain('"CHK_check_ins_assignment_authorization"');
    expect(sql).toContain('CREATE INDEX "idx_tickets_event_status"');
  });

  it('removes all added schema in reverse migration', async () => {
    await migration.down({ query } as unknown as QueryRunner);

    const sql = query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain('DROP INDEX IF EXISTS "tickets"."idx_tickets_event_status"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "assignment_id"');
    expect(sql).toContain('DROP COLUMN IF EXISTS "authorization_source"');
    expect(sql).toContain(
      'DROP TABLE IF EXISTS "events"."event_check_in_staff_assignments"',
    );
  });
});