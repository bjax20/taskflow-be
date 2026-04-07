import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
    public constructor(
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService, // ← Inject PrismaService
    ) {}

    public async register(dto: RegisterDto) {
        const { email, password } = dto;
        const hashedPassword = await bcrypt.hash(password, 10);

        return this.prisma.user.create({
            data: { email, password: hashedPassword },select: {
            id: true,
            email: true,
            createdAt: true
        }, // do not include the password
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
}
