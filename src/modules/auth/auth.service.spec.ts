import { UnauthorizedException } from "@nestjs/common/exceptions";
import { JwtModule } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../../prisma/prisma.service";
import { createRegisterDto } from "../../tests/factories/auth.factory";
import { cleanDatabase } from "../../tests/setup";
import { AuthService } from "./auth.service";


describe("AuthService", () => {
    let service: AuthService;
    let prisma: PrismaService;
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
                PrismaService,
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it("should hash the password before saving a user", async () => {
        const registerDto = createRegisterDto({ email: "tdd@test.com" });

        const result = await service.register(registerDto);

        const userInDb = await prisma.user.findUnique({
            where: { id: result.id },
        });

        if (userInDb) {
            const isMatch = await bcrypt.compare(registerDto.password, userInDb.password);
            expect(isMatch).toBe(true);
        }
    });

    it("should return an access_token on valid credentials", async () => {
        const rawPassword = "SecretPassword123!";
        const email = "login@test.com";

        await service.register(createRegisterDto({ email, password: rawPassword }));

        const result = await service.login(email, rawPassword);

        expect(result).toHaveProperty("access_token");
    });

    it("should throw UnauthorizedException on wrong password", async () => {
        const dto = createRegisterDto({ email: "wrong@test.com" });
        await service.register(dto);

        await expect(
            service.login(dto.email, "wrongpassword"),
        ).rejects.toThrow(UnauthorizedException);
    });
});
