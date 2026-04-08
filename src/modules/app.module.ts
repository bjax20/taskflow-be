import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { CommonModule } from "./common/common.module";
import { ProjectsModule } from "./projects/projects.module";
import { TasksModule } from "./tasks/tasks.module";


@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
        }),
        CommonModule,
        PrismaModule,
        AuthModule,
        ProjectsModule,
        TasksModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}