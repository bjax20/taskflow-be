import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../../prisma/prisma.service";
import { USER_SAFE_SELECT } from "./constants/user.constants";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
    public constructor(
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
    ) {}

    public async register(dto: RegisterDto) {
        const { password, ...userData } = dto;
        const hashedPassword = await bcrypt.hash(password, 10);

        // Spread the rest of the userData automatically
        return this.prisma.user.create({
            data: {
                ...userData,
                password: hashedPassword,
            },
            select: USER_SAFE_SELECT,
        });
    }

    public async login(
        email: string,
        pass: string,
    ): Promise<{ access_token: string }> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user || !(await bcrypt.compare(pass, user.password))) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const payload = { sub: user.id, email: user.email };

        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }

    /**
     * Logic for logging out.
     * Since we use stateless JWTs with cookies, the service mainly
     * returns a success signal. In the future, you could add
     * token blacklisting here (e.g., using Redis).
     */
    public logout(): { success: boolean } {
        //  add logic here to invalidate sessions in a DB/Redis if needed.
        return { success: true };
    }
}
