import { SetMetadata } from '@nestjs/common';

import { ROLES_KEY } from '../guards/roles.guard';

/**
 * Roles Decorator
 * 
 * Specifies required roles for an endpoint
 * 
 * Usage:
 * @Roles('admin', 'organizer')
 * @Get()
 * async getProtectedResource() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
