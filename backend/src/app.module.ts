import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import * as Joi from 'joi';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import { UsersModule } from './modules/users/infrastructure/users.module';
import { CacheModule } from './shared/infrastructure/cache/cache.module';
import { AllExceptionsFilter } from './shared/infrastructure/common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './shared/infrastructure/common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './shared/infrastructure/common/interceptors/timeout.interceptor';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { EventBusModule } from './shared/infrastructure/events/event-bus.module';

@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        
        // Database
        DB_HOST: Joi.string().default('localhost'),
        DB_PORT: Joi.number().default(5432),
        DB_USERNAME: Joi.string().default('postgres'),
        DB_PASSWORD: Joi.string().default('postgres'),
        DB_DATABASE: Joi.string().default('tickr'),
        
        // Redis
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_TTL: Joi.number().default(300),
        
        // JWT
        JWT_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Shared Infrastructure
    DatabaseModule,
    CacheModule,
    EventBusModule,

    // Feature Modules
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    
    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
  ],
})
export class AppModule {}
