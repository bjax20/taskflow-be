import {
    Injectable,
    InternalServerErrorException,
    Logger,
} from "@nestjs/common";
import { TaskStatus, Project } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../../prisma/prisma.service";
import { USER_SAFE_SELECT } from "../auth/constants/user.constants";

@Injectable()
export class SeedService {
    private readonly logger = new Logger(SeedService.name);

    public constructor(private readonly prisma: PrismaService) {}

    public async runSeed() {
        try {
            this.logger.log("Initiating database seed process...");

            const hashedPassword = await bcrypt.hash("password123", 10);

            const user = await this.prisma.user.upsert({
                where: { email: "test@example.com" },
                update: {},
                create: {
                    email: "test@example.com",
                    password: hashedPassword,
                    fullName: "Test Candidate",
                },
            });

            const projectTitle = "Zenith Pay Evolution";

            const existingProject = await this.prisma.project.findFirst({
                where: { title: projectTitle, ownerId: user.id },
            });

            let project: Project;

            if (!existingProject) {
                project = await this.prisma.project.create({
                    data: {
                        title: projectTitle,
                        description:
                            "High-priority development sprint initialized via seed.",
                        owner: { connect: { id: user.id } },
                        members: {
                            create: { userId: user.id },
                        },
                        tasks: {
                            create: [
                                {
                                    title: "Setup database schema",
                                    status: TaskStatus.DONE,
                                    assigneeId: user.id,
                                    position: 1000,
                                },
                                {
                                    title: "Implement JWT Authentication",
                                    status: TaskStatus.IN_PROGRESS,
                                    assigneeId: user.id,
                                    position: 2000,
                                },
                                {
                                    title: "Integrate Seed API Endpoint",
                                    status: TaskStatus.TODO,
                                    assigneeId: user.id,
                                    position: 3000,
                                },
                            ],
                        },
                    },
                });
                this.logger.log(`Created new project: "${project.title}"`);
            } else {
                project = existingProject;
                this.logger.log(`Project "${project.title}" already exists.`);
            }

            const safeUser = await this.prisma.user.findUnique({
                where: { id: user.id },
                select: USER_SAFE_SELECT,
            });

            this.logger.log("Database seed completed successfully.");

            return {
                success: true,
                message: "Database initialized successfully.",
                data: {
                    user: safeUser,
                    project: {
                        id: project.id,
                        title: project.title,
                    },
                },
            };
        } catch (error: unknown) {
            this.logger.error(
                "Seeding failed:",
                error instanceof Error ? error.message : error,
            );
            throw new InternalServerErrorException("Failed to seed database");
        }
    }
}
