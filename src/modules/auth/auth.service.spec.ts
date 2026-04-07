import { UnauthorizedException } from "@nestjs/common/exceptions";
import { JwtModule } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../../prisma/prisma.service";
import { cleanDatabase } from "../../tests/setup";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";

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
    const registerDto: RegisterDto = {
        email: "tdd@test.com",
        password: "Password123!",
    };

    // 1. Run the service (which returns the user WITHOUT password)
    const result = await service.register(registerDto);

    // 2. Fetch the user directly from the DB to check the password field
    const userInDb = await prisma.user.findUnique({
        where: { id: result.id },
    });

    expect(result).toBeDefined();
    expect(userInDb).toBeDefined();

    // 3. Verify the hash
    if (userInDb) {
        expect(userInDb.password).not.toBe(registerDto.password);

        const isMatch = await bcrypt.compare(registerDto.password, userInDb.password);
        expect(isMatch).toBe(true);
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
