import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser Decorator
 * 
 * Extracts the current user from the request
 * 
 * Usage:
 * @Get()
 * async getProfile(@CurrentUser() user: User) { ... }
 * 
 * @Get()
 * async getProfile(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
