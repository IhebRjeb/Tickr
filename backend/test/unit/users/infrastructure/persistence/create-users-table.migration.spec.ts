import { CreateUsersTable1700000000000001 } from '../../../../../src/shared/infrastructure/database/migrations/1700000000000001-create-users-table';

describe('CreateUsersTable1700000000000001 Migration', () => {
  let migration: CreateUsersTable1700000000000001;
  let mockQueryRunner: {
    query: jest.Mock;
  };

  beforeEach(() => {
    migration = new CreateUsersTable1700000000000001();
    mockQueryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('migration metadata', () => {
    it('should have correct name', () => {
      expect(migration.name).toBe('CreateUsersTable1700000000000001');
    });
  });

  describe('up', () => {
    it('should create users schema', async () => {
      await migration.up(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      const schemaCall = calls.find((call: string[]) => 
        call[0].includes('CREATE SCHEMA IF NOT EXISTS "users"')
      );
      expect(schemaCall).toBeDefined();
    });

    it('should create users table with all columns', async () => {
      await migration.up(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      const createTableCall = calls.find((call: string[]) => 
        call[0].includes('CREATE TABLE "users"."users"')
      );
      expect(createTableCall).toBeDefined();

      const sql = createTableCall[0];
      
      // Check all columns exist
      expect(sql).toContain('"id" uuid NOT NULL DEFAULT uuid_generate_v4()');
      expect(sql).toContain('"email" character varying(255) NOT NULL');
      expect(sql).toContain('"phone" character varying(20)');
      expect(sql).toContain('"password_hash" character varying(255)');
      expect(sql).toContain('"first_name" character varying(100) NOT NULL');
      expect(sql).toContain('"last_name" character varying(100) NOT NULL');
      expect(sql).toContain('"role" character varying(20) NOT NULL DEFAULT \'PARTICIPANT\'');
      expect(sql).toContain('"is_organizer" boolean NOT NULL DEFAULT false');
      expect(sql).toContain('"email_verified" boolean NOT NULL DEFAULT false');
      expect(sql).toContain('"phone_verified" boolean NOT NULL DEFAULT false');
      expect(sql).toContain('"is_active" boolean NOT NULL DEFAULT true');
      expect(sql).toContain('"last_login_at" TIMESTAMP');
      expect(sql).toContain('"created_at" TIMESTAMP NOT NULL DEFAULT now()');
      expect(sql).toContain('"updated_at" TIMESTAMP NOT NULL DEFAULT now()');
    });

    it('should create primary key constraint', async () => {
      await migration.up(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      const createTableCall = calls.find((call: string[]) => 
        call[0].includes('CREATE TABLE "users"."users"')
      );
      expect(createTableCall[0]).toContain('CONSTRAINT "PK_users_id" PRIMARY KEY ("id")');
    });

    it('should create unique constraints', async () => {
      await migration.up(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      const createTableCall = calls.find((call: string[]) => 
        call[0].includes('CREATE TABLE "users"."users"')
      );
      expect(createTableCall[0]).toContain('CONSTRAINT "UQ_users_email" UNIQUE ("email")');
      expect(createTableCall[0]).toContain('CONSTRAINT "UQ_users_phone" UNIQUE ("phone")');
    });

    it('should create email index', async () => {
      await migration.up(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      const indexCall = calls.find((call: string[]) => 
        call[0].includes('CREATE INDEX "idx_users_email"')
      );
      expect(indexCall).toBeDefined();
      expect(indexCall[0]).toContain('ON "users"."users" ("email")');
    });

    it('should create phone index', async () => {
      await migration.up(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      const indexCall = calls.find((call: string[]) => 
        call[0].includes('CREATE INDEX "idx_users_phone"')
      );
      expect(indexCall).toBeDefined();
      expect(indexCall[0]).toContain('ON "users"."users" ("phone")');
    });

    it('should create role index', async () => {
      await migration.up(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      const indexCall = calls.find((call: string[]) => 
        call[0].includes('CREATE INDEX "idx_users_role"')
      );
      expect(indexCall).toBeDefined();
      expect(indexCall[0]).toContain('ON "users"."users" ("role")');
    });

    it('should create is_active index', async () => {
      await migration.up(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      const indexCall = calls.find((call: string[]) => 
        call[0].includes('CREATE INDEX "idx_users_is_active"')
      );
      expect(indexCall).toBeDefined();
      expect(indexCall[0]).toContain('ON "users"."users" ("is_active")');
    });

    it('should create created_at index', async () => {
      await migration.up(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      const indexCall = calls.find((call: string[]) => 
        call[0].includes('CREATE INDEX "idx_users_created_at"')
      );
      expect(indexCall).toBeDefined();
      expect(indexCall[0]).toContain('ON "users"."users" ("created_at")');
    });

    it('should create role check constraint', async () => {
      await migration.up(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      const checkCall = calls.find((call: string[]) => 
        call[0].includes('ADD CONSTRAINT "CHK_users_role"')
      );
      expect(checkCall).toBeDefined();
      expect(checkCall[0]).toContain("CHECK (\"role\" IN ('ADMIN', 'ORGANIZER', 'PARTICIPANT'))");
    });

    it('should execute queries in correct order', async () => {
      await migration.up(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      
      // Schema should be created first
      expect(calls[0][0]).toContain('CREATE SCHEMA IF NOT EXISTS "users"');
      
      // Table should be created second
      expect(calls[1][0]).toContain('CREATE TABLE "users"."users"');
    });
  });

  describe('down', () => {
    it('should drop check constraint', async () => {
      await migration.down(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      const dropCheckCall = calls.find((call: string[]) => 
        call[0].includes('DROP CONSTRAINT IF EXISTS "CHK_users_role"')
      );
      expect(dropCheckCall).toBeDefined();
    });

    it('should drop all indexes', async () => {
      await migration.down(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      
      expect(calls.some((call: string[]) => call[0].includes('DROP INDEX IF EXISTS "users"."idx_users_created_at"'))).toBe(true);
      expect(calls.some((call: string[]) => call[0].includes('DROP INDEX IF EXISTS "users"."idx_users_is_active"'))).toBe(true);
      expect(calls.some((call: string[]) => call[0].includes('DROP INDEX IF EXISTS "users"."idx_users_role"'))).toBe(true);
      expect(calls.some((call: string[]) => call[0].includes('DROP INDEX IF EXISTS "users"."idx_users_phone"'))).toBe(true);
      expect(calls.some((call: string[]) => call[0].includes('DROP INDEX IF EXISTS "users"."idx_users_email"'))).toBe(true);
    });

    it('should drop users table', async () => {
      await migration.down(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      const dropTableCall = calls.find((call: string[]) => 
        call[0].includes('DROP TABLE IF EXISTS "users"."users"')
      );
      expect(dropTableCall).toBeDefined();
    });

    it('should drop constraint before indexes', async () => {
      await migration.down(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      
      // Check constraint should be first
      expect(calls[0][0]).toContain('DROP CONSTRAINT IF EXISTS "CHK_users_role"');
    });

    it('should drop table last', async () => {
      await migration.down(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      const lastCall = calls[calls.length - 1];
      
      expect(lastCall[0]).toContain('DROP TABLE IF EXISTS "users"."users"');
    });

    it('should not drop the schema', async () => {
      await migration.down(mockQueryRunner as any);

      const calls = mockQueryRunner.query.mock.calls;
      const dropSchemaCall = calls.find((call: string[]) => 
        call[0].includes('DROP SCHEMA')
      );
      expect(dropSchemaCall).toBeUndefined();
    });
  });
});
