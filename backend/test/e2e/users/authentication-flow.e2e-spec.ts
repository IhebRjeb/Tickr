import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

// Infrastructure
import { ChangePasswordHandler } from '../../../src/modules/users/application/commands/change-password.handler';
import { DeactivateUserHandler } from '../../../src/modules/users/application/commands/deactivate-user.handler';
import { UpdateProfileHandler } from '../../../src/modules/users/application/commands/update-profile.handler';
import { EmailVerifiedEventHandler } from '../../../src/modules/users/application/event-handlers/email-verified.handler';
import { PasswordResetRequestedEventHandler } from '../../../src/modules/users/application/event-handlers/password-reset-requested.handler';
import { UserRegisteredEventHandler } from '../../../src/modules/users/application/event-handlers/user-registered.handler';
import { UserMapper } from '../../../src/modules/users/application/mappers/user.mapper';
import { USER_REPOSITORY } from '../../../src/modules/users/application/ports/user.repository.port';
import { GetUserByEmailHandler } from '../../../src/modules/users/application/queries/get-user-by-email.handler';
import { GetUserByIdHandler } from '../../../src/modules/users/application/queries/get-user-by-id.handler';
import { GetUsersByRoleHandler } from '../../../src/modules/users/application/queries/get-users-by-role.handler';
import { UserRole } from '../../../src/modules/users/domain/value-objects/user-role.vo';
import { AuthController } from '../../../src/modules/users/infrastructure/controllers/auth.controller';
import { UsersController } from '../../../src/modules/users/infrastructure/controllers/users.controller';
import { EmailVerifiedGuard } from '../../../src/modules/users/infrastructure/guards/email-verified.guard';
import { JwtAuthGuard } from '../../../src/modules/users/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/modules/users/infrastructure/guards/roles.guard';
import { UserPersistenceMapper } from '../../../src/modules/users/infrastructure/persistence/mappers/user-persistence.mapper';
import { VerificationTokenRepository } from '../../../src/modules/users/infrastructure/persistence/repositories/verification-token.repository';
import { JwtTokenService } from '../../../src/modules/users/infrastructure/services/jwt.service';
import { PasswordService } from '../../../src/modules/users/infrastructure/services/password.service';
import { TokenService } from '../../../src/modules/users/infrastructure/services/token.service';
import { JwtStrategy } from '../../../src/modules/users/infrastructure/strategies/jwt.strategy';
import { LocalStrategy } from '../../../src/modules/users/infrastructure/strategies/local.strategy';

// Application

// Domain

/**
 * In-memory user repository for E2E testing
 */
class InMemoryUserRepository {
  private users: Map<string, any> = new Map();
  private emailIndex: Map<string, string> = new Map();

  async findById(id: string) {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string) {
    const userId = this.emailIndex.get(email.toLowerCase());
    return userId ? this.users.get(userId) : null;
  }

  async findAll() {
    return Array.from(this.users.values());
  }

  async save(user: any) {
    const id = user.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const savedUser = { ...user, id, updatedAt: new Date() };
    if (!savedUser.createdAt) savedUser.createdAt = new Date();
    this.users.set(id, savedUser);
    this.emailIndex.set(user.email.toLowerCase(), id);
    return savedUser;
  }

  async delete(id: string) {
    const user = this.users.get(id);
    if (user) {
      this.emailIndex.delete(user.email.toLowerCase());
      this.users.delete(id);
    }
  }

  async existsByEmail(email: string) {
    return this.emailIndex.has(email.toLowerCase());
  }

  async findByRole(role: UserRole) {
    const users = Array.from(this.users.values()).filter(u => u.role === role);
    return { data: users, total: users.length, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false };
  }

  async countByRole(role: UserRole) {
    return Array.from(this.users.values()).filter(u => u.role === role).length;
  }

  async findActiveUsers() {
    const users = Array.from(this.users.values()).filter(u => u.isActive);
    return { data: users, total: users.length, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false };
  }

  async updateLastLogin(userId: string) {
    const user = this.users.get(userId);
    if (user) {
      user.lastLoginAt = new Date();
      this.users.set(userId, user);
    }
  }

  clear() {
    this.users.clear();
    this.emailIndex.clear();
  }

  async seedUser(userData: any) {
    return this.save(userData);
  }

  async findByEmailWithPassword(email: string) {
    const userId = this.emailIndex.get(email.toLowerCase());
    return userId ? this.users.get(userId) : null;
  }

  async updateEmailVerified(userId: string, verified: boolean) {
    const user = this.users.get(userId);
    if (user) {
      user.emailVerified = verified;
      this.users.set(userId, user);
    }
  }

  async updatePassword(userId: string, passwordHash: string) {
    const user = this.users.get(userId);
    if (user) {
      user.passwordHash = passwordHash;
      this.users.set(userId, user);
    }
  }
}

/**
 * Mock Verification Token Repository for E2E testing
 */
class MockVerificationTokenRepository {
  private tokens: Map<string, any> = new Map();

  async findValidToken(token: string, type: string) {
    const tokenEntity = Array.from(this.tokens.values()).find(
      t => t.token === token && t.type === type && !t.usedAt && t.expiresAt > new Date()
    );
    return tokenEntity || null;
  }

  async markAsUsed(id: string) {
    const token = this.tokens.get(id);
    if (token) {
      token.usedAt = new Date();
      this.tokens.set(id, token);
    }
  }

  async createEmailVerificationToken(userId: string, expiresInHours: number) {
    const token = `email-verify-${Date.now()}`;
    const id = `token-${Date.now()}`;
    this.tokens.set(id, {
      id, userId, token, type: 'EMAIL_VERIFICATION',
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000), usedAt: null,
    });
    return token;
  }

  async createPasswordResetToken(userId: string, expiresInHours: number) {
    const token = `password-reset-${Date.now()}`;
    const id = `token-${Date.now()}`;
    this.tokens.set(id, {
      id, userId, token, type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000), usedAt: null,
    });
    return token;
  }

  async invalidateUserTokens(userId: string, type: string) {
    for (const [id, token] of this.tokens.entries()) {
      if (token.userId === userId && token.type === type) {
        token.usedAt = new Date();
        this.tokens.set(id, token);
      }
    }
  }

  clear() {
    this.tokens.clear();
  }
}

/**
 * E2E Test Suite: Authentication Flow
 * 
 * Tests JWT-based authentication including login, token refresh,
 * protected routes, and role-based access control.
 */
describe('E2E: Authentication Flow', () => {
  let app: INestApplication<App>;
  let userRepository: InMemoryUserRepository;
  let verificationTokenRepository: MockVerificationTokenRepository;
  let jwtService: JwtTokenService;
  let _passwordService: PasswordService;

  beforeAll(async () => {
    userRepository = new InMemoryUserRepository();
    verificationTokenRepository = new MockVerificationTokenRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'e2e-test-secret-key-minimum-32-characters',
              JWT_ACCESS_EXPIRATION: '15m',
              JWT_REFRESH_EXPIRATION: '7d',
              JWT_EXPIRES_IN: '7d',
              JWT_REFRESH_EXPIRES_IN: '30d',
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'e2e-test-secret-key-minimum-32-characters',
          signOptions: { expiresIn: '15m' },
        }),
        CqrsModule,
        ThrottlerModule.forRoot([{ name: 'short', ttl: 1000, limit: 100 }]),
      ],
      controllers: [AuthController, UsersController],
      providers: [
        { provide: USER_REPOSITORY, useValue: userRepository },
        { provide: VerificationTokenRepository, useValue: verificationTokenRepository },
        UserPersistenceMapper,
        UserMapper,
        JwtTokenService,
        PasswordService,
        TokenService,
        LocalStrategy,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        EmailVerifiedGuard,
        ChangePasswordHandler,
        UpdateProfileHandler,
        DeactivateUserHandler,
        GetUserByIdHandler,
        GetUserByEmailHandler,
        GetUsersByRoleHandler,
        UserRegisteredEventHandler,
        EmailVerifiedEventHandler,
        PasswordResetRequestedEventHandler,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();

    jwtService = moduleFixture.get<JwtTokenService>(JwtTokenService);
    _passwordService = moduleFixture.get<PasswordService>(PasswordService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    userRepository.clear();
  });

  describe('JWT Token Generation and Validation', () => {
    it('should generate valid access and refresh tokens', async () => {
      const userId = 'auth-test-user';
      await userRepository.seedUser({
        id: userId,
        email: 'auth@example.com',
        firstName: 'Auth',
        lastName: 'User',
        role: UserRole.PARTICIPANT,
        isActive: true,
        emailVerified: true,
      });

      const tokens = jwtService.generateTokenPair({
        userId,
        email: 'auth@example.com',
        role: UserRole.PARTICIPANT,
      });

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBeGreaterThan(0);

      // Verify access token works
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(userId);
    });

    it('should refresh access token with valid refresh token', async () => {
      const userId = 'refresh-test-user';
      await userRepository.seedUser({
        id: userId,
        email: 'refresh@example.com',
        firstName: 'Refresh',
        lastName: 'User',
        role: UserRole.PARTICIPANT,
        isActive: true,
        emailVerified: true,
      });

      const tokens = jwtService.generateTokenPair({
        userId,
        email: 'refresh@example.com',
        role: UserRole.PARTICIPANT,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: tokens.refreshToken })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('expiresIn');

      // New access token should work
      await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${response.body.accessToken}`)
        .expect(HttpStatus.OK);
    });

    it('should reject expired access token', async () => {
      const configService = app.get(ConfigService);
      const nativeJwtService = app.get(JwtService);

      const expiredToken = nativeJwtService.sign(
        {
          userId: 'expired-user',
          email: 'expired@example.com',
          role: UserRole.PARTICIPANT,
          type: 'access',
        },
        {
          secret: configService.get('JWT_SECRET'),
          expiresIn: '1ms',
        },
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin to access admin-only endpoints', async () => {
      const adminId = 'admin-user';
      await userRepository.seedUser({
        id: adminId,
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true,
        emailVerified: true,
      });

      const tokens = jwtService.generateTokenPair({
        userId: adminId,
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
    });

    it('should deny non-admin access to admin endpoints', async () => {
      const userId = 'regular-user';
      await userRepository.seedUser({
        id: userId,
        email: 'regular@example.com',
        firstName: 'Regular',
        lastName: 'User',
        role: UserRole.PARTICIPANT,
        isActive: true,
        emailVerified: true,
      });

      const tokens = jwtService.generateTokenPair({
        userId,
        email: 'regular@example.com',
        role: UserRole.PARTICIPANT,
      });

      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should allow organizer access to organizer endpoints', async () => {
      const organizerId = 'organizer-user';
      await userRepository.seedUser({
        id: organizerId,
        email: 'organizer@example.com',
        firstName: 'Organizer',
        lastName: 'User',
        role: UserRole.ORGANIZER,
        isActive: true,
        emailVerified: true,
      });

      const tokens = jwtService.generateTokenPair({
        userId: organizerId,
        email: 'organizer@example.com',
        role: UserRole.ORGANIZER,
      });

      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.role).toBe(UserRole.ORGANIZER);
    });

    it('should handle role hierarchy correctly', async () => {
      // Admin can do what regular users can do
      const adminId = 'admin-hierarchy';
      await userRepository.seedUser({
        id: adminId,
        email: 'admin-hierarchy@example.com',
        firstName: 'Admin',
        lastName: 'Hierarchy',
        role: UserRole.ADMIN,
        isActive: true,
        emailVerified: true,
      });

      const tokens = jwtService.generateTokenPair({
        userId: adminId,
        email: 'admin-hierarchy@example.com',
        role: UserRole.ADMIN,
      });

      // Admin can access their own profile (regular user endpoint)
      const response = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.role).toBe(UserRole.ADMIN);
    });
  });

  describe('Failed Authentication Scenarios', () => {
    it('should return 401 for missing Authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/users/me')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 for malformed Authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 for tampered token', async () => {
      const userId = 'tamper-test';
      await userRepository.seedUser({
        id: userId,
        email: 'tamper@example.com',
        firstName: 'Tamper',
        lastName: 'User',
        role: UserRole.PARTICIPANT,
        isActive: true,
        emailVerified: true,
      });

      const tokens = jwtService.generateTokenPair({
        userId,
        email: 'tamper@example.com',
        role: UserRole.PARTICIPANT,
      });

      // Tamper with the token
      const tamperedToken = tokens.accessToken.slice(0, -5) + 'xxxxx';

      await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 for token with wrong secret', async () => {
      const nativeJwtService = app.get(JwtService);

      const wrongSecretToken = nativeJwtService.sign(
        {
          userId: 'wrong-secret',
          email: 'wrong@example.com',
          role: UserRole.PARTICIPANT,
          type: 'access',
        },
        {
          secret: 'completely-different-secret-key',
          expiresIn: '1h',
        },
      );

      await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${wrongSecretToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Public vs Protected Endpoints', () => {
    it('should allow access to public registration endpoint without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'public@example.com',
          password: 'SecurePassword123!',
          firstName: 'Public',
          lastName: 'User',
        })
        .expect(HttpStatus.CREATED);
    });

    it('should allow access to public password reset request without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/request-reset')
        .send({ email: 'reset@example.com' })
        .expect(HttpStatus.OK);
    });

    it('should require auth for profile endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/users/me')
        .expect(HttpStatus.UNAUTHORIZED);

      await request(app.getHttpServer())
        .put('/api/users/me')
        .send({ firstName: 'Updated' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('HTTP Login Flow (Local Strategy)', () => {
    /**
     * Helper to register and optionally verify a user for login tests
     */
    async function registerUser(
      email: string, 
      password: string, 
      options: { verify?: boolean; deactivate?: boolean } = {}
    ) {
      // Register the user
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email,
          password,
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(HttpStatus.CREATED);

      // Optionally verify email
      if (options.verify !== false) {
        const user = await userRepository.findByEmail(email);
        if (user) {
          user.emailVerified = true;
          await userRepository.save(user);
        }
      }

      // Optionally deactivate account
      if (options.deactivate) {
        const user = await userRepository.findByEmail(email);
        if (user) {
          user.isActive = false;
          await userRepository.save(user);
        }
      }
    }

    it('should login successfully with valid credentials via HTTP', async () => {
      await registerUser('httplogin@example.com', 'ValidPassword123!', { verify: true });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'httplogin@example.com',
          password: 'ValidPassword123!',
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.user).toMatchObject({
        email: 'httplogin@example.com',
        firstName: 'Test',
        lastName: 'User',
      });
    });

    it('should reject login with wrong password', async () => {
      await registerUser('wrongpass@example.com', 'CorrectPassword123!', { verify: true });

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'wrongpass@example.com',
          password: 'WrongPassword123!',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject login with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject login for unverified email', async () => {
      await registerUser('unverified@example.com', 'ValidPassword123!', { verify: false });

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'ValidPassword123!',
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject login for deactivated account', async () => {
      await registerUser('deactivated@example.com', 'ValidPassword123!', { verify: true, deactivate: true });

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'deactivated@example.com',
          password: 'ValidPassword123!',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Complete Registration to Login Flow', () => {
    it('should complete full registration → verification → login flow', async () => {
      // Step 1: Register
      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'fullflow@example.com',
          password: 'SecurePassword123!',
          firstName: 'Full',
          lastName: 'Flow',
        })
        .expect(HttpStatus.CREATED);

      expect(registerResponse.body).toHaveProperty('userId');
      expect(registerResponse.body.message).toContain('Registration successful');

      // Step 2: Login should fail (email not verified)
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'fullflow@example.com',
          password: 'SecurePassword123!',
        })
        .expect(HttpStatus.FORBIDDEN);

      // Step 3: Manually verify email (simulating email verification)
      const user = await userRepository.findByEmail('fullflow@example.com');
      user.emailVerified = true;
      await userRepository.save(user);

      // Step 4: Login should now succeed
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'fullflow@example.com',
          password: 'SecurePassword123!',
        })
        .expect(HttpStatus.OK);

      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body.user.email).toBe('fullflow@example.com');

      // Step 5: Access protected route with token
      await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .expect(HttpStatus.OK);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'ratelimit1@example.com',
          password: 'SecurePassword123!',
          firstName: 'Rate',
          lastName: 'Limit',
        });

      expect(response.status).toBe(HttpStatus.CREATED);
    });

    it('should allow sequential password reset requests for different emails', async () => {
      // Make sequential requests - all should succeed with test config
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/auth/request-reset')
          .send({ email: `ratelimit${i}@example.com` });
        
        expect(response.status).toBe(HttpStatus.OK);
      }
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple profile requests correctly', async () => {
      const userId = 'concurrent-user';
      await userRepository.seedUser({
        id: userId,
        email: 'concurrent@example.com',
        firstName: 'Concurrent',
        lastName: 'User',
        role: UserRole.PARTICIPANT,
        isActive: true,
        emailVerified: true,
      });

      const tokens = jwtService.generateTokenPair({
        userId,
        email: 'concurrent@example.com',
        role: UserRole.PARTICIPANT,
      });

      // Make sequential requests to test token reuse
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .get('/api/users/me')
          .set('Authorization', `Bearer ${tokens.accessToken}`);

        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body.id).toBe(userId);
      }
    });

    it('should handle sequential registrations correctly', async () => {
      // Sequential registrations to avoid race conditions
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            email: `sequential${i}@example.com`,
            password: 'SecurePassword123!',
            firstName: `User${i}`,
            lastName: 'Sequential',
          });
        
        expect(response.status).toBe(HttpStatus.CREATED);
        expect(response.body).toHaveProperty('userId');
      }
    });
  });
});
