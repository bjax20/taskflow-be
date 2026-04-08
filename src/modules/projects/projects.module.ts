import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/prisma.module";
import { ProjectOwnerGuard } from "./guards/project-owner.guard";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
    imports: [PrismaModule],
    controllers: [ProjectsController],
    providers: [ProjectsService, ProjectOwnerGuard],
    exports: [ProjectsService],
})
export class ProjectsModule {}