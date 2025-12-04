import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { USER_REPOSITORY } from '../../../src/modules/users/application/ports/user.repository.port';
import { EmailVerifiedGuard } from '../../../src/modules/users/infrastructure/guards/email-verified.guard';
import { JwtAuthGuard } from '../../../src/modules/users/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/modules/users/infrastructure/guards/roles.guard';
import { UserEntity } from '../../../src/modules/users/infrastructure/persistence/entities/user.orm-entity';
import { JwtTokenService } from '../../../src/modules/users/infrastructure/services/jwt.service';
import { PasswordService } from '../../../src/modules/users/infrastructure/services/password.service';
import { UsersModule } from '../../../src/modules/users/infrastructure/users.module';

// Mock repository
const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
};

describe('UsersModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret-key-for-testing-purposes-only',
              JWT_ACCESS_EXPIRATION: '15m',
              JWT_REFRESH_EXPIRATION: '7d',
              JWT_EXPIRES_IN: '7d',
              JWT_REFRESH_EXPIRES_IN: '30d',
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '15m' },
        }),
        CqrsModule,
      ],
    })
      .overrideProvider(getRepositoryToken(UserEntity))
      .useValue(mockRepository)
      .compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    jest.clearAllMocks();
  });

  describe('Module Definition', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });
  });

  describe('Module Exports', () => {
    it('should define exported providers correctly', () => {
      // UsersModule exports these providers for use by other modules
      const exports = Reflect.getMetadata('exports', UsersModule);

      // Verify the module structure includes expected exports
      expect(UsersModule).toBeDefined();
      expect(exports).toBeDefined();
      expect(exports.length).toBeGreaterThan(0);
    });
  });

  describe('Module Metadata', () => {
    it('should have controllers registered', () => {
      // Controllers are registered in the module
      const moduleRef = Reflect.getMetadata('controllers', UsersModule);
      
      expect(moduleRef).toBeDefined();
      expect(moduleRef.length).toBeGreaterThanOrEqual(2); // AuthController and UsersController
    });

    it('should have providers registered', () => {
      const moduleRef = Reflect.getMetadata('providers', UsersModule);
      
      expect(moduleRef).toBeDefined();
      expect(moduleRef.length).toBeGreaterThan(0);
    });

    it('should have exports registered', () => {
      const moduleRef = Reflect.getMetadata('exports', UsersModule);
      
      expect(moduleRef).toBeDefined();
      expect(moduleRef.length).toBeGreaterThan(0);
    });

    it('should have imports registered', () => {
      const moduleRef = Reflect.getMetadata('imports', UsersModule);
      
      expect(moduleRef).toBeDefined();
      // Should include TypeOrmModule, CqrsModule, PassportModule, JwtModule, ThrottlerModule
      expect(moduleRef.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Provider Configuration', () => {
    it('should include repository provider with custom token', () => {
      const providers = Reflect.getMetadata('providers', UsersModule);
      
      const hasRepositoryProvider = providers.find(
        (p: any) => p.provide === USER_REPOSITORY || p === USER_REPOSITORY,
      );
      
      // Repository should be configured with custom injection token
      expect(hasRepositoryProvider).toBeDefined();
      expect(providers.some(
        (p: any) => typeof p === 'object' && p.provide === USER_REPOSITORY,
      )).toBe(true);
    });

    it('should include command handlers', () => {
      const providers = Reflect.getMetadata('providers', UsersModule);
      const providerNames = providers.map(
        (p: any) => (typeof p === 'function' ? p.name : p.provide?.toString?.() || 'unknown'),
      );

      expect(providerNames).toContain('ChangePasswordHandler');
      expect(providerNames).toContain('UpdateProfileHandler');
      expect(providerNames).toContain('DeactivateUserHandler');
    });

    it('should include query handlers', () => {
      const providers = Reflect.getMetadata('providers', UsersModule);
      const providerNames = providers.map(
        (p: any) => (typeof p === 'function' ? p.name : p.provide?.toString?.() || 'unknown'),
      );

      expect(providerNames).toContain('GetUserByIdHandler');
      expect(providerNames).toContain('GetUserByEmailHandler');
      expect(providerNames).toContain('GetUsersByRoleHandler');
    });

    it('should include event handlers', () => {
      const providers = Reflect.getMetadata('providers', UsersModule);
      const providerNames = providers.map(
        (p: any) => (typeof p === 'function' ? p.name : p.provide?.toString?.() || 'unknown'),
      );

      expect(providerNames).toContain('UserRegisteredEventHandler');
      expect(providerNames).toContain('EmailVerifiedEventHandler');
      expect(providerNames).toContain('PasswordResetRequestedEventHandler');
    });

    it('should include Passport strategies', () => {
      const providers = Reflect.getMetadata('providers', UsersModule);
      const providerNames = providers.map(
        (p: any) => (typeof p === 'function' ? p.name : p.provide?.toString?.() || 'unknown'),
      );

      expect(providerNames).toContain('LocalStrategy');
      expect(providerNames).toContain('JwtStrategy');
    });

    it('should include guards', () => {
      const providers = Reflect.getMetadata('providers', UsersModule);
      const providerNames = providers.map(
        (p: any) => (typeof p === 'function' ? p.name : p.provide?.toString?.() || 'unknown'),
      );

      expect(providerNames).toContain('JwtAuthGuard');
      expect(providerNames).toContain('RolesGuard');
      expect(providerNames).toContain('EmailVerifiedGuard');
    });

    it('should include services', () => {
      const providers = Reflect.getMetadata('providers', UsersModule);
      const providerNames = providers.map(
        (p: any) => (typeof p === 'function' ? p.name : p.provide?.toString?.() || 'unknown'),
      );

      expect(providerNames).toContain('JwtTokenService');
      expect(providerNames).toContain('PasswordService');
      expect(providerNames).toContain('TokenService');
    });

    it('should include mappers', () => {
      const providers = Reflect.getMetadata('providers', UsersModule);
      const providerNames = providers.map(
        (p: any) => (typeof p === 'function' ? p.name : p.provide?.toString?.() || 'unknown'),
      );

      expect(providerNames).toContain('UserPersistenceMapper');
      expect(providerNames).toContain('UserMapper');
    });
  });

  describe('Controller Configuration', () => {
    it('should register AuthController', () => {
      const controllers = Reflect.getMetadata('controllers', UsersModule);
      const controllerNames = controllers.map((c: any) => c.name);

      expect(controllerNames).toContain('AuthController');
    });

    it('should register UsersController', () => {
      const controllers = Reflect.getMetadata('controllers', UsersModule);
      const controllerNames = controllers.map((c: any) => c.name);

      expect(controllerNames).toContain('UsersController');
    });
  });

  describe('Export Configuration', () => {
    it('should export JwtAuthGuard', () => {
      const exports = Reflect.getMetadata('exports', UsersModule);
      
      expect(exports).toContain(JwtAuthGuard);
    });

    it('should export RolesGuard', () => {
      const exports = Reflect.getMetadata('exports', UsersModule);
      
      expect(exports).toContain(RolesGuard);
    });

    it('should export EmailVerifiedGuard', () => {
      const exports = Reflect.getMetadata('exports', UsersModule);
      
      expect(exports).toContain(EmailVerifiedGuard);
    });

    it('should export JwtTokenService', () => {
      const exports = Reflect.getMetadata('exports', UsersModule);
      
      expect(exports).toContain(JwtTokenService);
    });

    it('should export PasswordService', () => {
      const exports = Reflect.getMetadata('exports', UsersModule);
      
      expect(exports).toContain(PasswordService);
    });

    it('should export USER_REPOSITORY token', () => {
      const exports = Reflect.getMetadata('exports', UsersModule);
      
      expect(exports).toContain(USER_REPOSITORY);
    });

    it('should export PassportModule', () => {
      const exports = Reflect.getMetadata('exports', UsersModule);
      
      expect(exports).toContain(PassportModule);
    });

    it('should export JwtModule', () => {
      const exports = Reflect.getMetadata('exports', UsersModule);
      
      expect(exports).toContain(JwtModule);
    });
  });
});
