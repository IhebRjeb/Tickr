import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  cors: {
    enabled: process.env.CORS_ENABLED === 'true',
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
  },
}));
