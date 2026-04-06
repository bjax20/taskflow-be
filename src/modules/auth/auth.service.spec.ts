import { UnauthorizedException } from "@nestjs/common/exceptions";
import { JwtModule } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../prisma/prisma.service";
import { cleanDatabase } from "../../tests/setup";

import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";

describe("AuthService", () => {
    let service: AuthService;

    beforeEach(async () => {
        // Clear the database before each test to ensure isolation
        await cleanDatabase();

        const module: TestingModule = await Test.createTestingModule({
            imports: [
                JwtModule.register({
                    secret: "test_secret",
                    signOptions: { expiresIn: "1h" },
                }),
            ],
            providers: [
                AuthService,
                PrismaService, // 2. Add this here to fix the "Nest can't resolve dependencies" error
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    it("should hash the password before saving a user", async () => {
        const registerDto: RegisterDto = {
            email: "tdd@test.com",
            password: "Password123!",
        };

        const user = await service.register(registerDto);

        expect(user).toBeDefined();
        if (user) {
            expect(user.password).not.toBe(registerDto.password);
            expect(user.password.length).toBeGreaterThan(20);
        }
    });

    it("should return an access_token on valid credentials", async () => {
        const rawPassword = "SecretPassword123!";
        await service.register({
            email: "login@test.com",
            password: rawPassword,
        });

        const result = await service.login("login@test.com", rawPassword);

        expect(result).toHaveProperty("access_token");
        expect(typeof result.access_token).toBe("string");
    });

    it("should throw UnauthorizedException on wrong password", async () => {
        await service.register({
            email: "wrong@test.com",
            password: "password123",
        });

        await expect(
            service.login("wrong@test.com", "wrongpassword"),
        ).rejects.toThrow(UnauthorizedException);
    });
});
