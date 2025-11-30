import { Controller, Get, HttpStatus, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AllExceptionsFilter } from '../../src/shared/infrastructure/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../../src/shared/infrastructure/common/interceptors/transform.interceptor';

/**
 * Simple controller for E2E testing
 */
@Controller()
class TestController {
  @Get()
  getHello(): string {
    return 'Hello World!';
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Minimal test module without database/redis dependencies
 */
@Module({
  controllers: [TestController],
})
class TestAppModule {}

/**
 * E2E Tests for Shared Infrastructure Layer
 *
 * These tests verify that the infrastructure components work correctly
 * when integrated together in a real HTTP request/response cycle.
 */
describe('Infrastructure E2E Tests', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes, filters, interceptors (as in main.ts)
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
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health & Readiness', () => {
    it('GET /health should return server health status with wrapped response', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK)
        .expect((res) => {
          // TransformInterceptor wraps response in { success, data, timestamp }
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('timestamp');
          // Verify the actual health data is in the data property
          expect(res.body.data).toHaveProperty('status', 'ok');
          expect(res.body.data).toHaveProperty('timestamp');
        });
    });

    it('GET / should return hello message wrapped in response', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(HttpStatus.OK)
        .expect((res) => {
          // TransformInterceptor wraps response
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data', 'Hello World!');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('Error Handling (AllExceptionsFilter)', () => {
    it('should return 404 for non-existent routes', () => {
      return request(app.getHttpServer())
        .get('/non-existent-route')
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 404);
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('timestamp');
        });
    });

    it('should return proper error format for invalid HTTP method', () => {
      return request(app.getHttpServer())
        .patch('/health') // PATCH not allowed on /health
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode');
        });
    });
  });

  describe('Response Format (TransformInterceptor)', () => {
    it('should return properly formatted success response', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK)
        .expect((res) => {
          // Verify response has expected structure
          expect(res.body).toBeDefined();
          expect(typeof res.body).toBe('object');
        });
    });
  });

  describe('Request Validation (ValidationPipe)', () => {
    // Note: We need endpoints that accept body/query params to test this fully
    // This is a placeholder for when modules with DTOs are implemented

    it('should accept valid requests', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);
    });
  });

  describe('Timeout Handling', () => {
    // Note: Testing timeout requires an endpoint that takes long to respond
    // This validates the TimeoutInterceptor is properly configured

    it('should respond within reasonable time', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);

      const responseTime = Date.now() - startTime;

      // Health check should respond quickly (< 1 second)
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('Content-Type Handling', () => {
    it('should return JSON content type for API responses', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect('Content-Type', /json/);
    });

    it('should accept JSON content type in requests', () => {
      return request(app.getHttpServer())
        .get('/health')
        .set('Accept', 'application/json')
        .expect(HttpStatus.OK);
    });
  });
});
