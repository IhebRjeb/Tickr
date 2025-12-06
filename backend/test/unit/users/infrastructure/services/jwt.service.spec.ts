import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { UserRole } from '../../../../../src/modules/users/domain/value-objects/user-role.vo';
import {
  JwtTokenService,
  JwtPayload,
  TokenType,
} from '../../../../../src/modules/users/infrastructure/services/jwt.service';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  let nestJwtService: jest.Mocked<NestJwtService>;
  let _configService: jest.Mocked<ConfigService>;

  const mockPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: UserRole.PARTICIPANT,
  };

  beforeEach(async () => {
    const mockNestJwtService = {
      sign: jest.fn(),
      signAsync: jest.fn(),
      verify: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          JWT_SECRET: 'test-secret-key',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_EXPIRES_IN: '7d',
          JWT_REFRESH_EXPIRES_IN: '30d',
        };
        return config[key] ?? defaultValue;
      }),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret-key';
        throw new Error(`Missing config: ${key}`);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtTokenService,
        { provide: NestJwtService, useValue: mockNestJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<JwtTokenService>(JwtTokenService);
    nestJwtService = module.get(NestJwtService);
    _configService = module.get(ConfigService);
  });

  describe('signAccessToken', () => {
    it('should sign access token with correct options', () => {
      nestJwtService.sign.mockReturnValue('access-token-123');

      const result = service.signAccessToken(mockPayload);

      expect(nestJwtService.sign).toHaveBeenCalledWith(
        {
          ...mockPayload,
          type: TokenType.ACCESS,
        },
        {
          secret: 'test-secret-key',
          expiresIn: 604800, // 7 days in seconds
          algorithm: 'HS256',
        },
      );
      expect(result).toBe('access-token-123');
    });

    it('should include all payload fields', () => {
      nestJwtService.sign.mockReturnValue('token');

      service.signAccessToken({
        userId: 'user-id',
        email: 'user@test.com',
        role: UserRole.ADMIN,
      });

      expect(nestJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          email: 'user@test.com',
          role: UserRole.ADMIN,
          type: TokenType.ACCESS,
        }),
        expect.any(Object),
      );
    });
  });

  describe('signRefreshToken', () => {
    it('should sign refresh token with correct options', () => {
      nestJwtService.sign.mockReturnValue('refresh-token-123');

      const result = service.signRefreshToken(mockPayload);

      expect(nestJwtService.sign).toHaveBeenCalledWith(
        {
          ...mockPayload,
          type: TokenType.REFRESH,
        },
        {
          secret: 'test-refresh-secret',
          expiresIn: 2592000, // 30 days in seconds
          algorithm: 'HS256',
        },
      );
      expect(result).toBe('refresh-token-123');
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      nestJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = service.generateTokenPair({
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.ORGANIZER,
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 604800, // 7 days
      });

      expect(nestJwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('should use same payload for both tokens', () => {
      nestJwtService.sign.mockReturnValue('token');

      const user = {
        userId: 'user-456',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
      };

      service.generateTokenPair(user);

      // First call: access token
      expect(nestJwtService.sign.mock.calls[0][0]).toMatchObject({
        userId: 'user-456',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        type: TokenType.ACCESS,
      });

      // Second call: refresh token
      expect(nestJwtService.sign.mock.calls[1][0]).toMatchObject({
        userId: 'user-456',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        type: TokenType.REFRESH,
      });
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      const payload: JwtPayload = {
        ...mockPayload,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      nestJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await service.verifyAccessToken('valid-token');

      expect(nestJwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret-key',
        algorithms: ['HS256'],
      });
      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      nestJwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

      await expect(service.verifyAccessToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyAccessToken('invalid-token')).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should throw UnauthorizedException for refresh token type', async () => {
      const payload: JwtPayload = {
        ...mockPayload,
        type: 'refresh', // Wrong type
      };
      nestJwtService.verifyAsync.mockResolvedValue(payload);

      await expect(service.verifyAccessToken('token')).rejects.toThrow(
        UnauthorizedException,
      );
      // Error message is generic for security - doesn't reveal token type mismatch
      await expect(service.verifyAccessToken('token')).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      nestJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.verifyAccessToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should not leak error details in exception message', async () => {
      nestJwtService.verifyAsync.mockRejectedValue(
        new Error('detailed internal error with sensitive info'),
      );

      try {
        await service.verifyAccessToken('token');
        fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toBe('Invalid or expired token');
        expect((error as Error).message).not.toContain('detailed');
        expect((error as Error).message).not.toContain('internal');
      }
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', async () => {
      const payload: JwtPayload = {
        ...mockPayload,
        type: 'refresh',
      };
      nestJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await service.verifyRefreshToken('valid-refresh-token');

      expect(nestJwtService.verifyAsync).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-refresh-secret',
        algorithms: ['HS256'],
      });
      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException for access token type', async () => {
      const payload: JwtPayload = {
        ...mockPayload,
        type: 'access', // Wrong type
      };
      nestJwtService.verifyAsync.mockResolvedValue(payload);

      await expect(service.verifyRefreshToken('token')).rejects.toThrow(
        UnauthorizedException,
      );
      // Error message is generic for security
      await expect(service.verifyRefreshToken('token')).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      nestJwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(service.verifyRefreshToken('invalid')).rejects.toThrow(
        'Invalid or expired token',
      );
    });
  });

  describe('decodeToken', () => {
    it('should decode valid token without verification', () => {
      const payload: JwtPayload = {
        ...mockPayload,
        type: 'access',
        iat: 1234567890,
        exp: 1234567890 + 3600,
      };
      nestJwtService.decode.mockReturnValue(payload);

      const result = service.decodeToken('some-token');

      expect(nestJwtService.decode).toHaveBeenCalledWith('some-token');
      expect(result).toEqual(payload);
    });

    it('should return null for invalid token format', () => {
      nestJwtService.decode.mockImplementation(() => {
        throw new Error('invalid format');
      });

      const result = service.decodeToken('invalid');

      expect(result).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for non-expired token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      nestJwtService.decode.mockReturnValue({
        ...mockPayload,
        type: 'access',
        exp: futureExp,
      });

      expect(service.isTokenExpired('token')).toBe(false);
    });

    it('should return true for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      nestJwtService.decode.mockReturnValue({
        ...mockPayload,
        type: 'access',
        exp: pastExp,
      });

      expect(service.isTokenExpired('token')).toBe(true);
    });

    it('should return true for invalid token', () => {
      nestJwtService.decode.mockImplementation(() => {
        throw new Error();
      });

      expect(service.isTokenExpired('invalid')).toBe(true);
    });

    it('should return true for token without exp claim', () => {
      nestJwtService.decode.mockReturnValue({
        ...mockPayload,
        type: 'access',
        // no exp field
      });

      expect(service.isTokenExpired('token')).toBe(true);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      nestJwtService.decode.mockReturnValue({
        ...mockPayload,
        type: 'access',
        exp,
      });

      const result = service.getTokenExpiration('token');

      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(exp * 1000);
    });

    it('should return null for invalid token', () => {
      nestJwtService.decode.mockImplementation(() => {
        throw new Error();
      });

      expect(service.getTokenExpiration('invalid')).toBeNull();
    });

    it('should return null for token without exp', () => {
      nestJwtService.decode.mockReturnValue({ ...mockPayload, type: 'access' });

      expect(service.getTokenExpiration('token')).toBeNull();
    });
  });

  describe('getConfig', () => {
    it('should return configuration values', () => {
      const config = service.getConfig();

      expect(config).toEqual({
        accessTokenExpiration: '7d',
        refreshTokenExpiration: '30d',
      });
    });
  });

  describe('expiration parsing', () => {
    it('should parse days correctly', () => {
      nestJwtService.sign.mockReturnValue('token');

      service.signAccessToken(mockPayload);

      expect(nestJwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          expiresIn: 604800, // 7 days = 7 * 86400
        }),
      );
    });
  });
});

describe('JwtTokenService Configuration', () => {
  it('should throw if JWT_SECRET is not configured', async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue(undefined),
      getOrThrow: jest.fn().mockImplementation(() => {
        throw new Error('JWT_SECRET is required');
      }),
    };

    await expect(
      Test.createTestingModule({
        providers: [
          JwtTokenService,
          { provide: NestJwtService, useValue: {} },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile(),
    ).rejects.toThrow();
  });

  it('should use JWT_SECRET as fallback for refresh secret', async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'JWT_REFRESH_SECRET') return defaultValue; // Return default (JWT_SECRET)
        if (key === 'JWT_EXPIRES_IN') return '7d';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
        return defaultValue;
      }),
      getOrThrow: jest.fn().mockReturnValue('shared-secret'),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('token'),
    };

    const module = await Test.createTestingModule({
      providers: [
        JwtTokenService,
        { provide: NestJwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    const service = module.get<JwtTokenService>(JwtTokenService);

    // The refresh token should use the same secret as access token
    service.signRefreshToken({
      userId: 'user',
      email: 'test@test.com',
      role: UserRole.PARTICIPANT,
    });

    expect(mockJwtService.sign).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        secret: 'shared-secret', // Falls back to JWT_SECRET
      }),
    );
  });
});
