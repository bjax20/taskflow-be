import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { CommonModule } from "./common/common.module";
import { ProjectsController } from "./projects/projects.controller";
import { ProjectsService } from "./projects/projects.service";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
        }),
        CommonModule,
        PrismaModule,

        AuthModule,
    ],
    controllers: [ProjectsController],
    providers: [ProjectsService],
})
export class AppModule {}
