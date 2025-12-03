# Users Module Database Documentation

## Overview

This document describes the database schema, migrations, and best practices for the Users module.

---

## Schema

### Schema Name

```sql
CREATE SCHEMA IF NOT EXISTS users;
```

### Users Table

```sql
CREATE TABLE users.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'PARTICIPANT',
    is_organizer BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users.users(email);
CREATE INDEX idx_users_phone ON users.users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_role ON users.users(role);

-- Composite indexes for common queries
CREATE INDEX idx_users_active_role ON users.users(is_active, role);
CREATE INDEX idx_users_created_at ON users.users(created_at DESC);
```

---

## Entity Mapping

### TypeORM Entity

```typescript
@Entity({ name: 'users', schema: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index('idx_users_email')
  email!: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  @Index('idx_users_phone')
  phone!: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 20, default: 'PARTICIPANT' })
  @Index('idx_users_role')
  role!: UserRole;

  @Column({ name: 'is_organizer', type: 'boolean', default: false })
  isOrganizer!: boolean;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ name: 'phone_verified', type: 'boolean', default: false })
  phoneVerified!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
```

---

## Migrations

### Initial Migration

```typescript
// migrations/1704067200000-CreateUsersTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1704067200000 implements MigrationInterface {
  name = 'CreateUsersTable1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schema
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS users`);

    // Create table
    await queryRunner.query(`
      CREATE TABLE "users"."users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL,
        "phone" varchar(20),
        "password_hash" varchar(255),
        "first_name" varchar(100) NOT NULL,
        "last_name" varchar(100) NOT NULL,
        "role" varchar(20) NOT NULL DEFAULT 'PARTICIPANT',
        "is_organizer" boolean NOT NULL DEFAULT false,
        "email_verified" boolean NOT NULL DEFAULT false,
        "phone_verified" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_phone" UNIQUE ("phone")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_users_email" ON "users"."users" ("email")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_users_phone" ON "users"."users" ("phone") 
      WHERE "phone" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_users_role" ON "users"."users" ("role")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"."users"`);
    await queryRunner.query(`DROP SCHEMA "users"`);
  }
}
```

### Running Migrations

```bash
# Generate a new migration
npm run migration:generate -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run typeorm -- migration:show
```

---

## Query Patterns

### Common Queries

```typescript
// Find by email (case-insensitive)
await repository.findOne({
  where: { email: email.toLowerCase() }
});

// Find active users by role with pagination
await repository.findAndCount({
  where: { role, isActive: true },
  skip: (page - 1) * limit,
  take: limit,
  order: { createdAt: 'DESC' }
});

// Check email existence
const count = await repository.count({
  where: { email: email.toLowerCase() }
});
```

### Soft Delete Pattern

```typescript
// Deactivate user (soft delete)
await repository.update(userId, { 
  isActive: false,
  updatedAt: new Date()
});

// Query only active users
await repository.find({
  where: { isActive: true }
});
```

---

## Data Types

### Column Type Mapping

| Column | PostgreSQL | TypeORM | TypeScript |
|--------|------------|---------|------------|
| id | uuid | uuid | string |
| email | varchar(255) | varchar | string |
| phone | varchar(20) | varchar | string \| null |
| password_hash | varchar(255) | varchar | string \| null |
| first_name | varchar(100) | varchar | string |
| last_name | varchar(100) | varchar | string |
| role | varchar(20) | varchar | UserRole enum |
| is_organizer | boolean | boolean | boolean |
| email_verified | boolean | boolean | boolean |
| phone_verified | boolean | boolean | boolean |
| is_active | boolean | boolean | boolean |
| last_login_at | timestamp | timestamp | Date \| null |
| created_at | timestamp | timestamp | Date |
| updated_at | timestamp | timestamp | Date |

---

## Constraints

### Business Rules

| Constraint | Implementation |
|------------|----------------|
| Unique email | Database UNIQUE constraint |
| Unique phone | Database UNIQUE constraint (where not null) |
| Valid role | Application-level enum validation |
| Password strength | Application-level validation |
| Required fields | NOT NULL constraints |

### Referential Integrity

```sql
-- Future: Link to events table
ALTER TABLE events.registrations
ADD CONSTRAINT fk_registrations_user
FOREIGN KEY (user_id) REFERENCES users.users(id)
ON DELETE RESTRICT;
```

---

## Performance Considerations

### Indexing Strategy

| Query Pattern | Index |
|--------------|-------|
| Login by email | `idx_users_email` |
| Phone lookup | `idx_users_phone` |
| Role-based listing | `idx_users_role` |
| Active user queries | Composite: `(is_active, role)` |

### Caching

```typescript
// Redis caching for user profiles
const cacheKey = `user:${userId}`;
const ttl = 300; // 5 minutes

// Cache-aside pattern
let user = await cache.get(cacheKey);
if (!user) {
  user = await repository.findById(userId);
  await cache.set(cacheKey, user, ttl);
}
```

### Connection Pooling

```env
# TypeORM pool configuration
DB_POOL_SIZE=20
DB_CONNECTION_TIMEOUT=10000
DB_IDLE_TIMEOUT=30000
```

---

## Backup & Recovery

### Backup Strategy

```bash
# Full backup
pg_dump -h localhost -U postgres -d tickr -n users > users_backup.sql

# Incremental with WAL
archive_command = 'cp %p /backup/wal/%f'
```

### Point-in-Time Recovery

```bash
# Restore to specific timestamp
pg_restore --target-time="2024-01-15 10:30:00" ...
```

---

## Test Database

### Test Configuration

```env
# .env.test
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=tickr_test
```

### Test Setup

```typescript
// Clean database before tests
beforeEach(async () => {
  await queryRunner.query('TRUNCATE users.users CASCADE');
});

// Drop and recreate for isolation
beforeAll(async () => {
  await queryRunner.query('DROP SCHEMA IF EXISTS users CASCADE');
  await queryRunner.query('CREATE SCHEMA users');
  await dataSource.runMigrations();
});
```

---

## Monitoring

### Key Metrics

| Metric | Query |
|--------|-------|
| Total users | `SELECT COUNT(*) FROM users.users` |
| Active users | `SELECT COUNT(*) FROM users.users WHERE is_active = true` |
| Users by role | `SELECT role, COUNT(*) FROM users.users GROUP BY role` |
| Recent signups | `SELECT COUNT(*) FROM users.users WHERE created_at > NOW() - INTERVAL '24 hours'` |

### Query Performance

```sql
-- Analyze slow queries
EXPLAIN ANALYZE
SELECT * FROM users.users 
WHERE email = 'user@example.com';

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'users';
```
