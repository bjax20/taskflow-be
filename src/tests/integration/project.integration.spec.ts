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

describe("Project System (Integration)", () => {
    let app: NestFastifyApplication;
    let prisma: PrismaService;
    let configService: ConfigService;
    let authToken: string;
    let userId: number;
    let PREFIX: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication<NestFastifyApplication>(
            new FastifyAdapter(),
        );

        //  Get ConfigService
        configService = moduleFixture.get<ConfigService>(ConfigService);

        // Read from env with fallback (type-safe)
        PREFIX = configService.get<string>("API_PREFIX", "/api/v1");

        app.setGlobalPrefix(PREFIX);

        app.useGlobalPipes(
            new ValidationPipe({ whitelist: true, transform: true }),
        );

        await app.init();
        await app.getHttpAdapter().getInstance().ready();

        prisma = moduleFixture.get<PrismaService>(PrismaService);
    });

    beforeEach(async () => {
        // ensure to delete the dependencies first
        await prisma.projectMember.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.project.deleteMany({});
        await prisma.user.deleteMany({});

        const email = `test-${Date.now()}@example.com`;
        const password = "Test@1234";
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: { email, password: hashedPassword },
        });
        userId = user.id;

        const loginRes = await app.inject({
            method: "POST",
            url: `${PREFIX}/auth/login`,
            payload: { email, password },
        });

        if (loginRes.statusCode !== 200) {
            console.error("DEBUG:", loginRes.payload);
            throw new Error(`Login failed: ${loginRes.statusCode}`);
        }

        authToken = loginRes.json().access_token;
    });

    it("POST /projects should create a project (inject)", async () => {
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

    it("POST /projects should create a project (supertest)", async () => {
        const res = await request(app.getHttpServer())
            .post(`${PREFIX}/projects`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ title: "Zenith Pay Evolution" });

        expect(res.status).toBe(201);
        expect(res.body.ownerId).toBe(userId);
    });

    afterAll(async () => {
        if (prisma) {
            await prisma.$disconnect();
        }
        if (app) {
            await app.close();
        }
    });
});