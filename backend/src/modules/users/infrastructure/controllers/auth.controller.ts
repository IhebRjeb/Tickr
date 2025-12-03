import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { JwtTokenService, TokenPair } from '../services/jwt.service';
import { PasswordService } from '../services/password.service';
import { USER_REPOSITORY } from '../../application/ports/user.repository.port';
import type { UserRepositoryPort, UserEntityPort } from '../../application/ports/user.repository.port';
import { Public } from '../decorators/auth.decorators';
import { ValidatedUser } from '../strategies/local.strategy';
import { UserRole } from '../../domain/value-objects/user-role.vo';
import {
  RegisterUserDto,
  LoginDto,
  VerifyEmailDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dtos/auth.dto';

/**
 * Auth response interface
 */
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

/**
 * Register response interface
 */
interface RegisterResponse {
  userId: string;
  message: string;
}

/**
 * Refresh response interface
 */
interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

/**
 * Success response interface
 */
interface SuccessResponse {
  message: string;
}

/**
 * Authentication Controller
 *
 * Handles all authentication-related endpoints:
 * - User registration
 * - Login/Logout
 * - Email verification
 * - Password reset
 * - Token refresh
 *
 * @route /api/auth
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwtService: JwtTokenService,
    private readonly passwordService: PasswordService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  /**
   * Register a new user
   *
   * @route POST /api/auth/register
   */
  @Public()
  @Post('register')
  @Throttle({ default: { ttl: 3600000, limit: 3 } }) // 3 requests per hour
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 422, description: 'Email already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async register(@Body() dto: RegisterUserDto): Promise<RegisterResponse> {
    // Check if email already exists
    const existingUser = await this.userRepository.existsByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const hashedPassword = await this.passwordService.createHashedPassword(
      dto.password,
    );

    // Generate user ID
    const userId = crypto.randomUUID();

    // Create user entity
    const user: UserEntityPort = {
      id: userId,
      email: dto.email.toLowerCase(),
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.PARTICIPANT,
      phone: dto.phone || null,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save user
    await this.userRepository.save(user);

    // TODO: Generate email verification token and send email
    // const verificationToken = this.tokenService.generateToken(32);
    // await this.eventPublisher.publish(new UserRegisteredEvent(userId, verificationToken));

    return {
      userId,
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  /**
   * Login with email and password
   *
   * @route POST /api/auth/login
   */
  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @Throttle({ default: { ttl: 900000, limit: 5 } }) // 5 requests per 15 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified or account deactivated' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(@Request() req: { user: ValidatedUser }): Promise<AuthResponse> {
    const user = req.user;

    // Check if email is verified
    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Email not verified. Please verify your email address.',
      );
    }

    // Generate token pair
    const tokens: TokenPair = this.jwtService.generateTokenPair({
      userId: user.userId,
      email: user.email,
      role: user.role as UserRole,
    });

    // Update last login timestamp
    await this.userRepository.updateLastLogin(user.userId);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Verify email address
   *
   * @route POST /api/auth/verify-email
   */
  @Public()
  @Post('verify-email')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<SuccessResponse> {
    // TODO: Implement email verification
    // 1. Find verification token in database
    // 2. Check if token is valid and not expired
    // 3. Update user's emailVerified status
    // 4. Delete used token

    // For now, return a placeholder response
    throw new BadRequestException('Invalid or expired verification token');
  }

  /**
   * Request password reset
   *
   * @route POST /api/auth/request-reset
   */
  @Public()
  @Post('request-reset')
  @Throttle({ default: { ttl: 3600000, limit: 3 } }) // 3 requests per hour per email
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({
    status: 200,
    description: 'If email exists, reset link will be sent',
  })
  @ApiResponse({ status: 429, description: 'Too many reset requests' })
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<SuccessResponse> {
    // TODO: Implement password reset request
    // 1. Find user by email (don't reveal if user exists)
    // 2. Generate password reset token
    // 3. Store token with expiration
    // 4. Send reset email via event

    // Always return success to prevent email enumeration
    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  /**
   * Reset password with token
   *
   * @route POST /api/auth/reset-password
   */
  @Public()
  @Post('reset-password')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<SuccessResponse> {
    // TODO: Implement password reset
    // 1. Find and validate reset token
    // 2. Check if token is not expired
    // 3. Hash new password
    // 4. Update user's password
    // 5. Delete used token
    // 6. Invalidate all existing sessions/tokens

    throw new BadRequestException('Invalid or expired reset token');
  }

  /**
   * Refresh access token
   *
   * @route POST /api/auth/refresh-token
   */
  @Public()
  @Post('refresh-token')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'New access token generated',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<RefreshResponse> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyRefreshToken(dto.refreshToken);

      // Generate new access token
      const accessToken = this.jwtService.signAccessToken({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      });

      return {
        accessToken,
        expiresIn: this.jwtService.getAccessTokenExpiration(),
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
