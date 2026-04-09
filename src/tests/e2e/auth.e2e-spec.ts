import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppModule } from '../../modules/app.module';
import { createRegisterDto } from '../../tests/factories/auth.factory';
// Increase timeout for auth tests (they may involve DB operations)
jest.setTimeout(30000);

describe('AuthController (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService | undefined;

  const validUser = createRegisterDto({ email: 'e2e-auth@example.com' });

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
        where: { email: validUser.email }
      });
    }
  });
  describe('Signup Validation', () => {
    it('should return 400 for invalid email', async () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(createRegisterDto({ email: 'invalid-email' }))
        .expect(400)
    );
  });

  it('/api/v1/auth/register (POST) - Register a new user', async () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(validUser)
      .expect(201)
      .then((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.email).toBe(validUser.email);
      })
  );

  it('/api/v1/auth/login (POST) - Get JWT token', async () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password })
      .expect(200)
      .then((res) => {
        expect(res.body).toHaveProperty('access_token');
      })
  );

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.user.deleteMany({ where: { email: validUser.email } }).catch(() => {
            /* ignore cleanup errors */
        });
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      if (app && app.getHttpAdapter()) {
        await app.getHttpAdapter().getInstance().close();
      }
      if (app) {
        await app.close();
      }
    }
  });

});