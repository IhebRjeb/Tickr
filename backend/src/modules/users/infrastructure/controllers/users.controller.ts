import {
  Controller,
  Get,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Inject,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { ChangePasswordCommand } from '../../application/commands/change-password.command';
import { ChangePasswordHandler } from '../../application/commands/change-password.handler';
import { DeactivateUserCommand } from '../../application/commands/deactivate-user.command';
import { DeactivateUserHandler } from '../../application/commands/deactivate-user.handler';
import { UpdateProfileCommand } from '../../application/commands/update-profile.command';
import { UpdateProfileHandler } from '../../application/commands/update-profile.handler';
import { ChangePasswordDto } from '../../application/dtos/change-password.dto';
import { UpdateProfileDto } from '../../application/dtos/update-profile.dto';
import { UserProfileDto } from '../../application/dtos/user-profile.dto';
import { USER_REPOSITORY } from '../../application/ports/user.repository.port';
import type { UserRepositoryPort, UserEntityPort } from '../../application/ports/user.repository.port';
import { GetUserByIdHandler } from '../../application/queries/get-user-by-id.handler';
import { GetUserByIdQuery } from '../../application/queries/get-user-by-id.query';
import { GetUsersByRoleHandler } from '../../application/queries/get-users-by-role.handler';
import { GetUsersByRoleQuery } from '../../application/queries/get-users-by-role.query';
import { UserRole } from '../../domain/value-objects/user-role.vo';
import { Roles, CurrentUser } from '../decorators/auth.decorators';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

/**
 * Pagination query parameters
 */
interface PaginationQuery {
  page?: number;
  limit?: number;
  role?: string;
}

/**
 * Paginated response interface
 */
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Success response interface
 */
interface SuccessResponse {
  message: string;
}

/**
 * Users Controller
 *
 * Handles user profile management endpoints:
 * - Get/Update current user profile
 * - Change password
 * - Deactivate account
 * - Admin user management
 *
 * @route /api/users
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    private readonly changePasswordHandler: ChangePasswordHandler,
    private readonly updateProfileHandler: UpdateProfileHandler,
    private readonly deactivateUserHandler: DeactivateUserHandler,
    private readonly getUserByIdHandler: GetUserByIdHandler,
    private readonly getUsersByRoleHandler: GetUsersByRoleHandler,
  ) {}

  /**
   * Get current user profile
   *
   * @route GET /api/users/me
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyProfile(@CurrentUser() currentUser: { userId: string; email: string; role: string }): Promise<UserProfileDto> {
    const user = await this.userRepository.findById(currentUser.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new UserProfileDto({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  /**
   * Update current user profile
   *
   * @route PUT /api/users/me
   */
  @Put('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMyProfile(
    @CurrentUser() currentUser: { userId: string; email: string; role: string },
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    const command = new UpdateProfileCommand(
      currentUser.userId,
      dto.firstName,
      dto.lastName,
      dto.phone,
    );

    const result = await this.updateProfileHandler.execute(command);

    if (result.isFailure) {
      const error = result.error;
      switch (error.type) {
        case 'USER_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'VALIDATION_ERROR':
          throw new BadRequestException(error.message);
        default:
          throw new BadRequestException(error.message);
      }
    }

    // Fetch updated user
    const user = await this.userRepository.findById(currentUser.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new UserProfileDto({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  /**
   * Change current user password
   *
   * @route PATCH /api/users/me/password
   */
  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password or weak new password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changeMyPassword(
    @CurrentUser() currentUser: { userId: string; email: string; role: string },
    @Body() dto: ChangePasswordDto,
  ): Promise<SuccessResponse> {
    const command = new ChangePasswordCommand(
      currentUser.userId,
      dto.currentPassword,
      dto.newPassword,
    );

    const result = await this.changePasswordHandler.execute(command);

    if (result.isFailure) {
      const error = result.error;
      switch (error.type) {
        case 'USER_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'INVALID_CURRENT_PASSWORD':
          throw new BadRequestException('Current password is incorrect');
        case 'WEAK_PASSWORD':
          throw new BadRequestException(error.message);
        case 'SAME_PASSWORD':
          throw new BadRequestException('New password must be different from current password');
        default:
          throw new BadRequestException(error.message);
      }
    }

    return { message: 'Password changed successfully' };
  }

  /**
   * Deactivate current user account
   *
   * @route DELETE /api/users/me
   */
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate current user account' })
  @ApiResponse({ status: 200, description: 'Account deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deactivateMyAccount(
    @CurrentUser() currentUser: { userId: string; email: string; role: string },
  ): Promise<SuccessResponse> {
    const command = new DeactivateUserCommand(currentUser.userId);
    const result = await this.deactivateUserHandler.execute(command);

    if (result.isFailure) {
      const error = result.error;
      switch (error.type) {
        case 'USER_NOT_FOUND':
          throw new NotFoundException(error.message);
        case 'ALREADY_DEACTIVATED':
          throw new BadRequestException('Account is already deactivated');
        default:
          throw new BadRequestException(error.message);
      }
    }

    return { message: 'Account deactivated successfully' };
  }

  /**
   * Get user by ID (Admin only)
   *
   * @route GET /api/users/:id
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserProfileDto> {
    const query = new GetUserByIdQuery(id);
    const userDto = await this.getUserByIdHandler.execute(query);

    if (!userDto) {
      throw new NotFoundException('User not found');
    }

    // Fetch full user to get timestamps
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new UserProfileDto({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  /**
   * Get paginated user list (Admin only)
   *
   * @route GET /api/users
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated user list (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiResponse({
    status: 200,
    description: 'User list returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getUsers(
    @Query() query: PaginationQuery,
  ): Promise<PaginatedResponse<UserProfileDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));

    // Filter by role if specified
    if (query.role && Object.values(UserRole).includes(query.role as UserRole)) {
      const roleQuery = new GetUsersByRoleQuery(query.role as UserRole, page, limit);
      const paginatedResult = await this.getUsersByRoleHandler.execute(roleQuery);

      // Since UserDto doesn't have timestamps, we fetch from repository
      const userIds = paginatedResult.data.map((u) => u.id);
      const usersWithTimestamps = await Promise.all(
        userIds.map((id) => this.userRepository.findById(id)),
      );

      const users = usersWithTimestamps
        .filter((user): user is UserEntityPort => user !== null)
        .map(
          (user) =>
            new UserProfileDto({
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              phone: user.phone,
              isActive: user.isActive,
              lastLoginAt: user.lastLoginAt,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            }),
        );

      return {
        data: users,
        meta: {
          total: paginatedResult.total,
          page,
          limit,
          totalPages: Math.ceil(paginatedResult.total / limit),
        },
      };
    }

    // Get all active users (no specific role filter)
    const paginatedResult = await this.userRepository.findActiveUsers({ page, limit });

    const users = paginatedResult.data.map(
      (user: UserEntityPort) =>
        new UserProfileDto({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phone: user.phone,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }),
    );

    return {
      data: users,
      meta: {
        total: paginatedResult.total,
        page,
        limit,
        totalPages: Math.ceil(paginatedResult.total / limit),
      },
    };
  }
}
