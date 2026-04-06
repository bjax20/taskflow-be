/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../modules/app.module";
import { cleanDatabase } from "../setup";

describe("Auth (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();
    });

    beforeEach(async () => {
        await cleanDatabase();
    });

    it("/auth/register (POST) - should reject invalid email", async () => {
        const res = await request(app.getHttpServer())
            .post("/auth/register")
            .send({ email: "not-an-email", password: "123" });

        expect(res.status).toBe(400);
    });
});
