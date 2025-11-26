import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  accessTokenExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
  refreshTokenExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
