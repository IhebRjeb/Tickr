import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

/**
 * DTO for user registration
 */
export class RegisterUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  readonly email!: string;

  @ApiProperty({
    description: 'User password (8+ chars, uppercase, lowercase, number, special char)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/,
    {
      message:
        'Password must contain uppercase, lowercase, number, and special character',
    },
  )
  readonly password!: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(100, { message: 'First name too long' })
  readonly firstName!: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(100, { message: 'Last name too long' })
  readonly lastName!: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  readonly phone?: string;
}

/**
 * DTO for user login
 */
export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  readonly email!: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
  })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  readonly password!: string;
}

/**
 * DTO for email verification
 */
export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token',
    example: 'abc123def456',
  })
  @IsString()
  @MinLength(1, { message: 'Token is required' })
  readonly token!: string;
}

/**
 * DTO for requesting password reset
 */
export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Email address for password reset',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  readonly email!: string;
}

/**
 * DTO for resetting password
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token',
    example: 'abc123def456',
  })
  @IsString()
  @MinLength(1, { message: 'Token is required' })
  readonly token!: string;

  @ApiProperty({
    description: 'New password (8+ chars, uppercase, lowercase, number, special char)',
    example: 'NewSecurePass123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/,
    {
      message:
        'Password must contain uppercase, lowercase, number, and special character',
    },
  )
  readonly newPassword!: string;
}

/**
 * DTO for token refresh
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @MinLength(1, { message: 'Refresh token is required' })
  readonly refreshToken!: string;
}

/**
 * Response DTO for authentication
 */
export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  readonly accessToken: string;

  @ApiProperty({ description: 'JWT refresh token' })
  readonly refreshToken: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  readonly expiresIn: number;

  @ApiProperty({ description: 'Authenticated user data' })
  readonly user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };

  constructor(props: AuthResponseDto) {
    this.accessToken = props.accessToken;
    this.refreshToken = props.refreshToken;
    this.expiresIn = props.expiresIn;
    this.user = props.user;
  }
}

/**
 * Response DTO for registration
 */
export class RegisterResponseDto {
  @ApiProperty({ description: 'New user ID' })
  readonly userId: string;

  @ApiProperty({ description: 'Success message' })
  readonly message: string;

  constructor(userId: string, message: string) {
    this.userId = userId;
    this.message = message;
  }
}

/**
 * Response DTO for token refresh
 */
export class RefreshResponseDto {
  @ApiProperty({ description: 'New JWT access token' })
  readonly accessToken: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  readonly expiresIn: number;

  constructor(accessToken: string, expiresIn: number) {
    this.accessToken = accessToken;
    this.expiresIn = expiresIn;
  }
}

/**
 * Generic success response DTO
 */
export class SuccessResponseDto {
  @ApiProperty({ description: 'Success message' })
  readonly message: string;

  constructor(message: string) {
    this.message = message;
  }
}
