import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

// Load environment variables
config();

const configService = new ConfigService();

// Parse DATABASE_URL if provided, otherwise use individual env vars
const getDatabaseConfig = (): DataSourceOptions => {
  const databaseUrl = configService.get('DATABASE_URL');

  if (databaseUrl) {
    // Parse DATABASE_URL (format: postgresql://user:password@host:port/database)
    return {
      type: 'postgres',
      url: databaseUrl,
      entities: ['src/modules/**/infrastructure/persistence/entities/*.orm-entity.ts'],
      migrations: ['src/shared/infrastructure/database/migrations/*.ts'],
      synchronize: false,
      logging: configService.get('NODE_ENV') === 'development',
      migrationsTableName: 'migrations',
    };
  }

  // Fallback to individual environment variables
  return {
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),
    port: configService.get('DB_PORT', 5432),
    username: configService.get('DB_USERNAME', 'postgres'),
    password: configService.get('DB_PASSWORD', 'postgres'),
    database: configService.get('DB_DATABASE', 'tickr'),
    entities: ['src/modules/**/infrastructure/persistence/entities/*.orm-entity.ts'],
    migrations: ['src/shared/infrastructure/database/migrations/*.ts'],
    synchronize: false,
    logging: configService.get('NODE_ENV') === 'development',
    migrationsTableName: 'migrations',
  };
};

export const AppDataSource = new DataSource(getDatabaseConfig());
