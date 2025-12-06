import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

// Application Layer - Command Handlers
import { ChangePasswordHandler } from '../application/commands/change-password.handler';
import { DeactivateUserHandler } from '../application/commands/deactivate-user.handler';
import { UpdateProfileHandler } from '../application/commands/update-profile.handler';
// Application Layer - Event Handlers
import { EmailVerifiedEventHandler } from '../application/event-handlers/email-verified.handler';
import { PasswordResetRequestedEventHandler } from '../application/event-handlers/password-reset-requested.handler';
import { UserRegisteredEventHandler } from '../application/event-handlers/user-registered.handler';
// Application Layer - Mappers
import { UserMapper } from '../application/mappers/user.mapper';
import { USER_REPOSITORY } from '../application/ports/user.repository.port';
import { GetUserByEmailHandler } from '../application/queries/get-user-by-email.handler';
import { GetUserByIdHandler } from '../application/queries/get-user-by-id.handler';
import { GetUsersByRoleHandler } from '../application/queries/get-users-by-role.handler';

import { AuthController } from './controllers/auth.controller';
import { UsersController } from './controllers/users.controller';
import { EmailVerifiedGuard } from './guards/email-verified.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UserEntity } from './persistence/entities/user.orm-entity';
import { VerificationTokenEntity } from './persistence/entities/verification-token.orm-entity';
import { UserPersistenceMapper } from './persistence/mappers/user-persistence.mapper';
import { UserTypeOrmRepository } from './persistence/repositories/user.typeorm-repository';
import { VerificationTokenRepository } from './persistence/repositories/verification-token.repository';
// Infrastructure Layer - Services
import { JwtTokenService } from './services/jwt.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
// Infrastructure Layer - Strategies
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

/**
 * Command Handlers for CQRS
 */
const CommandHandlers = [
  ChangePasswordHandler,
  UpdateProfileHandler,
  DeactivateUserHandler,
];

/**
 * Query Handlers for CQRS
 */
const QueryHandlers = [
  GetUserByIdHandler,
  GetUserByEmailHandler,
  GetUsersByRoleHandler,
];

/**
 * Event Handlers for domain events
 * These are prepared for integration with notification and analytics modules
 */
const EventHandlers = [
  UserRegisteredEventHandler,
  EmailVerifiedEventHandler,
  PasswordResetRequestedEventHandler,
];

/**
 * Passport Strategies
 */
const Strategies = [LocalStrategy, JwtStrategy];

/**
 * Guards for authentication and authorization
 */
const Guards = [JwtAuthGuard, RolesGuard, EmailVerifiedGuard];

/**
 * Repository Provider
 * Binds the abstract port to the concrete TypeORM implementation
 */
const repositoryProvider: Provider = {
  provide: USER_REPOSITORY,
  useClass: UserTypeOrmRepository,
};

/**
 * Users Module
 *
 * This module handles all user-related functionality including:
 * - User registration and authentication
 * - Profile management
 * - Password management
 * - Role-based access control
 *
 * Architecture:
 * - Follows Hexagonal Architecture (Ports & Adapters)
 * - Uses CQRS pattern for command/query separation
 * - Event-driven for cross-cutting concerns
 *
 * Exports:
 * - Guards for use in other modules
 * - JwtTokenService for token operations
 * - USER_REPOSITORY for user data access
 */
@Module({
  imports: [
    // TypeORM for persistence
    TypeOrmModule.forFeature([UserEntity, VerificationTokenEntity]),

    // CQRS for command/query separation
    CqrsModule,

    // Passport for authentication
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT configuration
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION', '15m'),
        },
      }),
    }),

    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,  // 1 second
        limit: 3,   // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20,  // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
  ],
  controllers: [
    AuthController,
    UsersController,
  ],
  providers: [
    // Mappers
    UserPersistenceMapper,
    UserMapper,

    // Repository
    repositoryProvider,
    VerificationTokenRepository,

    // Services
    JwtTokenService,
    PasswordService,
    TokenService,

    // Passport Strategies
    ...Strategies,

    // Guards
    ...Guards,

    // CQRS Handlers
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
  exports: [
    // Export guards for global use
    JwtAuthGuard,
    RolesGuard,
    EmailVerifiedGuard,

    // Export JWT service for other modules
    JwtTokenService,

    // Export password service for authentication
    PasswordService,

    // Export repository token for use in other modules
    USER_REPOSITORY,

    // Export Passport module for strategy inheritance
    PassportModule,

    // Export JWT module for token verification
    JwtModule,
  ],
})
export class UsersModule {}
