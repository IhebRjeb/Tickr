import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';

import { UserRole } from '../../domain/value-objects/user-role.vo';

/**
 * JWT Payload interface
 * Contains user identification and authorization data
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Token pair returned after authentication
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * JWT Token type enum
 */
export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

/**
 * Custom JWT Service
 *
 * Wraps NestJS JwtService to provide:
 * - Separate access and refresh token generation
 * - Configurable expiration times
 * - Token type validation
 * - Secure error handling (no info leakage)
 *
 * Configuration via environment:
 * - JWT_SECRET: Secret key for signing tokens
 * - JWT_EXPIRES_IN: Access token expiration (default: 7d)
 * - JWT_REFRESH_SECRET: Secret for refresh tokens (optional, falls back to JWT_SECRET)
 * - JWT_REFRESH_EXPIRES_IN: Refresh token expiration (default: 30d)
 *
 * @example
 * ```typescript
 * const tokens = jwtService.generateTokenPair(user);
 * const payload = await jwtService.verifyAccessToken(token);
 * ```
 */
@Injectable()
export class JwtTokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiration: string;
  private readonly refreshTokenExpiration: string;

  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    this.refreshTokenSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      this.accessTokenSecret,
    );
    this.accessTokenExpiration = this.configService.get<string>('JWT_EXPIRES_IN', '7d');
    this.refreshTokenExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');
  }

  /**
   * Sign an access token
   *
   * @param payload - User data to encode in token
   * @returns string - Signed JWT access token
   */
  signAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
    return this.jwtService.sign(
      {
        ...payload,
        type: TokenType.ACCESS,
      },
      {
        secret: this.accessTokenSecret,
        expiresIn: this.parseExpirationToSeconds(this.accessTokenExpiration),
        algorithm: 'HS256',
      },
    );
  }

  /**
   * Sign a refresh token
   *
   * @param payload - User data to encode in token
   * @returns string - Signed JWT refresh token
   */
  signRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
    return this.jwtService.sign(
      {
        ...payload,
        type: TokenType.REFRESH,
      },
      {
        secret: this.refreshTokenSecret,
        expiresIn: this.parseExpirationToSeconds(this.refreshTokenExpiration),
        algorithm: 'HS256',
      },
    );
  }

  /**
   * Generate both access and refresh tokens
   *
   * @param user - User data for token payload
   * @returns TokenPair - Access and refresh tokens with expiration
   */
  generateTokenPair(user: { userId: string; email: string; role: UserRole }): TokenPair {
    const payload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.signAccessToken(payload),
      refreshToken: this.signRefreshToken(payload),
      expiresIn: this.parseExpirationToSeconds(this.accessTokenExpiration),
    };
  }

  /**
   * Verify an access token
   *
   * @param token - JWT token to verify
   * @returns Promise<JwtPayload> - Decoded payload if valid
   * @throws UnauthorizedException if token is invalid or expired
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.accessTokenSecret,
        algorithms: ['HS256'],
      });

      if (payload.type !== TokenType.ACCESS) {
        // Don't reveal why token is invalid
        throw new UnauthorizedException('Invalid or expired token');
      }

      return payload;
    } catch {
      // Don't leak error details - generic message
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Verify a refresh token
   *
   * @param token - JWT refresh token to verify
   * @returns Promise<JwtPayload> - Decoded payload if valid
   * @throws UnauthorizedException if token is invalid or expired
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.refreshTokenSecret,
        algorithms: ['HS256'],
      });

      if (payload.type !== TokenType.REFRESH) {
        // Don't reveal why token is invalid
        throw new UnauthorizedException('Invalid or expired token');
      }

      return payload;
    } catch {
      // Don't leak error details - generic message
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Decode a token without verification
   * Useful for extracting payload from expired tokens
   *
   * @param token - JWT token to decode
   * @returns JwtPayload | null - Decoded payload or null if invalid format
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if a token is expired (without full verification)
   *
   * @param token - JWT token to check
   * @returns boolean - True if token has expired
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return true;
    }

    // exp is in seconds, Date.now() is in milliseconds
    return Date.now() >= payload.exp * 1000;
  }

  /**
   * Get token expiration date
   *
   * @param token - JWT token
   * @returns Date | null - Expiration date or null if invalid
   */
  getTokenExpiration(token: string): Date | null {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return null;
    }

    return new Date(payload.exp * 1000);
  }

  /**
   * Parse expiration string to seconds
   * Supports formats: '7d', '24h', '30m', '60s', or numeric seconds
   *
   * @param expiration - Expiration string
   * @returns number - Seconds
   */
  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])?$/);
    if (!match) {
      return 604800; // Default: 7 days in seconds
    }

    const value = parseInt(match[1], 10);
    const unit = match[2] || 's';

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return value;
    }
  }

  /**
   * Get access token expiration in seconds
   */
  getAccessTokenExpiration(): number {
    return this.parseExpirationToSeconds(this.accessTokenExpiration);
  }

  /**
   * Get refresh token expiration in seconds
   */
  getRefreshTokenExpiration(): number {
    return this.parseExpirationToSeconds(this.refreshTokenExpiration);
  }

  /**
   * Get configuration values (for testing/debugging)
   */
  getConfig(): {
    accessTokenExpiration: string;
    refreshTokenExpiration: string;
  } {
    return {
      accessTokenExpiration: this.accessTokenExpiration,
      refreshTokenExpiration: this.refreshTokenExpiration,
    };
  }
}
