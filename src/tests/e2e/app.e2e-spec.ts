import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../modules/app.module';

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Create FastifyAdapter with proper configuration
    const fastifyAdapter = new FastifyAdapter();

    // Initialize with Fastify
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      fastifyAdapter,
    );

    // Set the Global Prefix BEFORE init
    app.setGlobalPrefix('api/v1');

    // Initialize the app
    await app.init();

    // Wait for Fastify to be ready (CRITICAL for Fastify)
    await app.getHttpAdapter().getInstance().ready();
  });

 it('/api/v1/health (GET) - Health Check', async () => request(app.getHttpServer())
    .get('/api/v1/health')
    .set('x-health-token', process.env.HEALTH_TOKEN || 'devhealth')
    .expect(200));

  afterAll(async () => {
    // Close Fastify instance first
    await app.getHttpAdapter().getInstance().close();
    // Then close the app
    await app.close();
  });
});