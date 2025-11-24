import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// Load environment variables
config();

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'postgres'),
  database: configService.get('DB_DATABASE', 'tickr'),
  entities: ['src/modules/**/infrastructure/persistence/entities/*.entity.ts'],
  migrations: ['src/shared/infrastructure/database/migrations/*.ts'],
  synchronize: false,
  logging: configService.get('NODE_ENV') === 'development',
  migrationsTableName: 'migrations',
});
