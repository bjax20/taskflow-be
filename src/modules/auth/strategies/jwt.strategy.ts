import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { FastifyRequest } from "fastify";
import { ExtractJwt, Strategy } from "passport-jwt";


interface JwtPayload {
    sub: string;
    email: string;
    iat?: number;
    exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
    public constructor(configService: ConfigService) {
        super({
            // Updated to check BOTH the Header and the Cookie
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (request: FastifyRequest) => request?.cookies?.auth_token || null, // Fastify populates cookies here after you register @fastify/cookie
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>("JWT_SECRET", "test_secret"),
        });
    }

    public validate(payload: JwtPayload) {

        return { userId: Number(payload.sub), email: payload.email };
    }
}