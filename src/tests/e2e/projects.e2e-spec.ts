import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppModule } from '../../modules/app.module';

jest.setTimeout(30000);

describe('Projects (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  let userId: number;

  const testUserCredentials = {
    email: 'project-owner@test.com',
    password: 'Password123!',
    fullName: 'Project Owner'
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Use FastifyAdapter (matches auth and app specs)
    const fastifyAdapter = new FastifyAdapter();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      fastifyAdapter,
    );

    // Set global prefix BEFORE init
    app.setGlobalPrefix('/api/v1');

    // Add validation pipes
    app.useGlobalPipes(new ValidationPipe());

    // Initialize the app
    await app.init();

    // CRITICAL: Wait for Fastify to be ready
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up any existing test user
    await prisma.user.deleteMany({ where: { email: testUserCredentials.email } }).catch(() => {
        /* ignore cleanup errors */
    });

    // Setup: Create a test user and get token
    // Use global prefix-aware path
    const signupRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUserCredentials)
      .expect(201);

    userId = signupRes.body.id;

    // Login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(testUserCredentials)
      .expect(200);

    token = loginRes.body.access_token;
  });

  describe('Lifecycle: Create -> Read -> Delete', () => {
    let projectId: number;

    it('POST /api/v1/projects - Should create project', async () => request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'E2E Project', description: 'Testing' })
        .expect(201)
        .then((res) => {
          projectId = res.body.id;
          expect(res.body.title).toBe('E2E Project');
        }));

    it('GET /api/v1/projects/:id - Should allow access to owner', async () => request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200));

    it('GET /api/v1/projects/9999 - Should return 404 for non-existent/unauthorized', async () => request(app.getHttpServer())
        .get('/api/v1/projects/9999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404));

    it('DELETE /api/v1/projects/:id - Should allow owner to delete', async () => request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204));
  });

  describe('Member Management', () => {
    let projectId: number;
    const collaboratorEmail = 'colleague@test.com';

    beforeAll(async () => {
      // Create a project to add members to
      const res = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Collaboration Project' });
      projectId = res.body.id;

      // Create the collaborator user in the DB directly so they "exist"
      await prisma.user.upsert({
        where: { email: collaboratorEmail },
        update: {},
        create: {
          email: collaboratorEmail,
          password: 'Password123!',
          fullName: 'Collaborator User',
        },
      });
    });

    it('POST /api/v1/projects/:id/members - Should add member via email', async () => request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: collaboratorEmail }) // THE NEW CONTRACT
        .expect(201)
        .then((res) => {
          expect(res.body.member.user.email).toBe(collaboratorEmail);
        }));

    it('POST /api/v1/projects/:id/members - Should return 404 for non-existent email', async () => request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'ghost@notfound.com' })
        .expect(404));

    it('POST /api/v1/projects/:id/members - Should return 409 for duplicate member', async () =>
      // Try to add the same person again
       request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: collaboratorEmail })
        .expect(409)
    );
  });
 afterAll(async () => {
    try {
      if (prisma) {
        // Clean up both the owner and the collaborator in one go
        await prisma.user.deleteMany({
          where: {
            OR: [
              { id: userId },
              { email: 'colleague@test.com' } // The collaboratorEmail variable
            ],
          },
        }).catch(() => {/* ignore cleanup errors */});
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