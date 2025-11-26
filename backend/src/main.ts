import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // CORS
  if (configService.get<boolean>('app.cors.enabled')) {
    app.enableCors({
      origin: configService.get<string[]>('app.cors.origins'),
      credentials: true,
    });
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Tickr API')
    .setDescription('Tickr Event Ticketing Platform - RESTful API Documentation')
    .setVersion('1.0')
    .addTag('events', 'Event management endpoints')
    .addTag('tickets', 'Ticket management endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('payments', 'Payment processing endpoints')
    .addTag('notifications', 'Notification endpoints')
    .addTag('analytics', 'Analytics and reporting endpoints')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(port);
  
  logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  logger.log(`🏗️  Environment: ${configService.get('app.nodeEnv')}`);
}

bootstrap();

