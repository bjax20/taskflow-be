import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    FastifyAdapter,
    NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { PrismaService } from "../../../prisma/prisma.service";
import { AppModule } from "../../modules/app.module";
import { createRegisterDto } from "../../tests/factories/auth.factory";

describe("Project System (Integration)", () => {
    let app: NestFastifyApplication;
    let prisma: PrismaService;
    let configService: ConfigService;
    let authToken: string;
    let userId: number;
    let PREFIX: string;

    beforeAll(async (): Promise<void> => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication<NestFastifyApplication>(
            new FastifyAdapter(),
        );

        configService = moduleFixture.get<ConfigService>(ConfigService);
        PREFIX = configService.get<string>("API_PREFIX", "/api/v1");

        app.setGlobalPrefix(PREFIX);
        app.useGlobalPipes(
            new ValidationPipe({ whitelist: true, transform: true }),
        );

        await app.init();
        await app.getHttpAdapter().getInstance().ready();

        prisma = moduleFixture.get<PrismaService>(PrismaService);
    });

    beforeEach(async (): Promise<void> => {
        // Clean database in order of dependency
        await prisma.projectMember.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        // Use Factory for user data
        const userData = createRegisterDto({
            email: `test-${Date.now()}@example.com`,
        });
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const user = await prisma.user.create({
            data: {
                email: userData.email,
                password: hashedPassword,
                fullName: userData.fullName,
            },
        });
        userId = user.id;

        // Login using factory credentials
        const loginRes = await app.inject({
            method: "POST",
            url: `${PREFIX}/auth/login`,
            payload: {
                email: userData.email,
                password: userData.password
            },
        });

        if (loginRes.statusCode !== 200) {
            throw new Error(`Login failed: ${loginRes.statusCode}`);
        }

        authToken = loginRes.json().access_token;
    });

    it("POST /projects should create a project (inject)", async (): Promise<void> => {
        const res = await app.inject({
            method: "POST",
            url: `${PREFIX}/projects`,
            headers: {
                authorization: `Bearer ${authToken}`,
            },
            payload: { title: "Zenith Pay Evolution" },
        });

        const body = res.json();
        expect(res.statusCode).toBe(201);
        expect(body.ownerId).toBe(userId);
    });

    it("POST /projects should create a project (supertest)", async (): Promise<void> => {
        // ✅ Explicit return for linter
        const res = await request(app.getHttpServer())
            .post(`${PREFIX}/projects`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ title: "Zenith Pay Evolution" });

        expect(res.status).toBe(201);
        expect(res.body.ownerId).toBe(userId);
    });

    afterAll(async (): Promise<void> => {
        if (prisma) {
            await prisma.$disconnect();
        }
        if (app) {
            await app.close();
        }
    });
});