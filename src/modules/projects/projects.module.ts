import { Module } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ProjectOwnerGuard } from "./guards/project-owner.guard";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
    controllers: [ProjectsController],
    providers: [ProjectsService, PrismaService, ProjectOwnerGuard],
    exports: [ProjectsService],
})
export class ProjectsModule {}