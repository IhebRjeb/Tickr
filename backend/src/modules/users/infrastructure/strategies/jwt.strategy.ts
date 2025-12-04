import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload } from '../services/jwt.service';

/**
 * User data attached to request after JWT validation
 */
export interface JwtUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * JWT Strategy for Bearer token authentication
 *
 * Extracts JWT from Authorization header and validates it.
 * Returns decoded payload to be attached to request.
 *
 * @example
 * ```typescript
 * // In controller
 * @UseGuards(AuthGuard('jwt'))
 * @Get('profile')
 * async getProfile(@Request() req) {
 *   return req.user; // JwtUser
 * }
 * ```
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  /**
   * Validate and transform JWT payload
   *
   * Called by Passport after token is verified.
   * Return value is attached to request.user
   *
   * @param payload - Decoded JWT payload
   * @returns JwtUser to attach to request
   * @throws UnauthorizedException if payload is invalid
   */
  async validate(payload: JwtPayload): Promise<JwtUser> {
    // Verify this is an access token, not a refresh token
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Verify required fields
    if (!payload.userId || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return user data to be attached to request
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  }
}
