import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppModule } from '../../modules/app.module';

// Increase timeout for auth tests (they may involve DB operations)
jest.setTimeout(30000);

describe('AuthController (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService | undefined;

  const testUser = {
    email: 'e2e-auth@example.com',
    password: 'Password123!',
    fullName: 'Test User'
  };

 beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );


    prisma = moduleFixture.get<PrismaService>(PrismaService);

    const globalPrefix = 'api/v1';
    app.setGlobalPrefix(globalPrefix);
    app.useGlobalPipes(new ValidationPipe({ /* config */ }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Now prisma is defined and can be used
    if (prisma) {
      await prisma.user.deleteMany({
        where: { email: testUser.email }
      });
    }
  });
  describe('Signup Validation', () => {
    it('should return 400 for invalid email', async () => request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          fullName: 'John Doe'
        })
        .expect(400));
  });

  it('/api/v1/auth/signup (POST) - Register a new user', async () => request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201)
      .then((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.email).toBe(testUser.email);
      }));

  it('/api/v1/auth/login (POST) - Get JWT token', async () => request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(testUser)
      .expect(200)
      .then((res) => {
        expect(res.body).toHaveProperty('access_token');
      }));

  afterAll(async () => {
    try {
      // Clean up test user
      if (prisma) {
        await prisma.user.deleteMany({ where: { email: testUser.email } }).catch(() => {
            /* ignore cleanup errors */
        });
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      // Close Fastify instance first
      if (app && app.getHttpAdapter()) {
        await app.getHttpAdapter().getInstance().close();
      }
      // Then close the app
      if (app) {
        await app.close();
      }
    }
  });
});