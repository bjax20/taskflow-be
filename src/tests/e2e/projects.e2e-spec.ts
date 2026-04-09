import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppModule } from '../../modules/app.module';
import { createRegisterDto } from '../../tests/factories/auth.factory';

jest.setTimeout(30000);

describe('Projects (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let token: string;
  // let userId: number;

  const ownerData = createRegisterDto({
    email: 'project-owner@test.com',
    fullName: 'Project Owner'
  });

  const collaboratorData = createRegisterDto({
    email: 'colleague@test.com',
    fullName: 'Collaborator User'
  });

  beforeAll(async (): Promise<void> => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    app.setGlobalPrefix('/api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get<PrismaService>(PrismaService);

    await prisma.user.deleteMany({
      where: { email: { in: [ownerData.email, collaboratorData.email] } }
    }).catch(() => { /* ignore */ });

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(ownerData)
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: ownerData.email,
        password: ownerData.password
      })
      .expect(200);

    token = loginRes.body.access_token;
  });

  describe('Lifecycle: Create -> Read -> Delete', () => {
    let projectId: number;

    it('POST /api/v1/projects - Should create project', async () =>
      request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'E2E Project', description: 'Testing' })
        .expect(201)
        .then((res) => {
          projectId = res.body.id;
          expect(res.body.title).toBe('E2E Project');
        })
    );

    it('GET /api/v1/projects/:id - Should allow access to owner', async () =>
      request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
    );

    it('GET /api/v1/projects/9999 - Should return 404', async () =>
      request(app.getHttpServer())
        .get('/api/v1/projects/9999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
    );

    it('DELETE /api/v1/projects/:id - Should allow owner to delete', async () =>
      request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204)
    );
  });

  describe('Member Management', () => {
    let projectId: number;

    beforeAll(async () => {
      // Create project
      const res = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Collaboration Project' });
      projectId = res.body.id;

      // Create collaborator in DB
      await prisma.user.upsert({
        where: { email: collaboratorData.email },
        update: {},
        create: { ...collaboratorData },
      });
    });

    it('POST /api/v1/projects/:id/members - Should add member via email', async () =>
      request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: collaboratorData.email })
        .expect(201)
        .then((res) => {
          expect(res.body.member.user.email).toBe(collaboratorData.email);
        })
    );

    it('POST /api/v1/projects/:id/members - Should return 404 for ghost email', async () =>
      request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'ghost@notfound.com' })
        .expect(404)
    );

    it('POST /api/v1/projects/:id/members - Should return 409 for duplicate', async () =>
      request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: collaboratorData.email })
        .expect(409)
    );
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.user.deleteMany({
          where: {
            email: { in: [ownerData.email, collaboratorData.email] },
          },
        }).catch(() => {/* ignore */});
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