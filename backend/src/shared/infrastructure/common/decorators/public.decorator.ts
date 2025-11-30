import { SetMetadata } from '@nestjs/common';

import { IS_PUBLIC_KEY } from '../guards/jwt-auth.guard';

/**
 * Public Decorator
 * 
 * Marks an endpoint as publicly accessible (bypasses authentication)
 * 
 * Usage:
 * @Public()
 * @Get()
 * async getPublicResource() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
