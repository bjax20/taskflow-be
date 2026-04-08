import {
    Controller,
    Post,
    Get,
    Body,
    ValidationPipe,
    UsePipes,
    HttpCode,
    HttpStatus,
    UseGuards,
    Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@ApiTags("Auth") // Groups these in Swagger under "Auth"
@Controller("auth")
export class AuthController {
    public constructor(private readonly authService: AuthService) {}

    @Post("register")
    @ApiOperation({ summary: "Create a new user account" })
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    public async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post("login")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Validate credentials and return JWT" })
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    public async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto.email, loginDto.password);
    }

    @Get("me")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: "Fetch current logged-in user profile" })
    public getProfile(@Request() req: RequestWithUser) {
        // req.user is populated by the JwtStrategy
        return req.user;
    }
}