import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import all entities explicitly for reliability
import { UserEntity } from '../../../modules/users/infrastructure/persistence/entities/user.orm-entity';
import { VerificationTokenEntity } from '../../../modules/users/infrastructure/persistence/entities/verification-token.orm-entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'tickr'),
        entities: [UserEntity, VerificationTokenEntity],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<string>('NODE_ENV') === 'development',
        migrationsTableName: 'migrations',
        extra: {
          min: configService.get<number>('DB_POOL_MIN', 5),
          max: configService.get<number>('DB_POOL_MAX', 20),
          idleTimeoutMillis: 30000,
        },
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
