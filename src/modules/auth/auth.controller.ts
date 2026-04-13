import {
    Controller,
    Post,
    Get,
    Body,
    ValidationPipe,
    UsePipes,
    UseGuards,
    Request,
    Res,
} from "@nestjs/common";
import { HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { FastifyReply } from "fastify/types/reply";
import { RequestWithUser } from "../common/interfaces/request-with-user.interface";
import { UserBaseDto } from "../users/dto/user-base.dto";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import "@fastify/cookie";

interface LoginResponse {
    access_token: string;
}

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
    public constructor(
        private readonly authService: AuthService,
        private readonly usersService: UsersService,
    ) {}

    @Post("register")
    @ApiOperation({ summary: "Create a new user account" })
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    public async register(
        @Body() registerDto: RegisterDto,
    ): Promise<UserBaseDto> {
        return this.authService.register(registerDto);
    }

    @Post("login")
    public async login(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) response: FastifyReply,
    ): Promise<LoginResponse> {
        const result: LoginResponse = await this.authService.login(
            loginDto.email,
            loginDto.password,
        );

        // Check if setCookie exists (provided by @fastify/cookie)
        if (typeof response.setCookie === "function") {
            void response.setCookie("auth_token", result.access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: 3600,
            });
        }

        return result;
    }

    @Post("logout")
    @HttpCode(HttpStatus.OK)
    public logout(@Res({ passthrough: true }) response: FastifyReply): {
        message: string;
    } {
        // In Fastify with @fastify/cookie, we use clearCookie
        void response.clearCookie("auth_token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
        });

        return { message: "Logged out successfully" };
    }

    @Get("me")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth("access-token")
    @ApiOperation({ summary: "Fetch current logged-in user profile" })
    public async getProfile(
        @Request() req: RequestWithUser,
    ): Promise<UserBaseDto> {
        return this.usersService.findById(Number(req.user.userId));
    }
}
