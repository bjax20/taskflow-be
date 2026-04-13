import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Task, TaskStatus } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { CreateTaskDto } from "./dto/request/create-task.dto";
import { MoveTaskDto } from "./dto/request/move-task.dto";
import { UpdateTaskStatusDto } from "./dto/request/update-task-status.dto";

@Injectable()
export class TasksService {

    public constructor(private readonly prisma: PrismaService) {}

    async create(projectId: number, userId: number, dto: CreateTaskDto) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Auth check
            const membership = await tx.projectMember.findFirst({
                where: { projectId, userId },
            });
            if (!membership) throw new ForbiddenException();

            // 2. Find the highest position in the target status column
            const lastTask = await tx.task.findFirst({
                where: { projectId, status: dto.status },
                orderBy: { position: "desc" },
                select: { position: true },
            });

            // 3. Set position (default to 1000 if column is empty)
            const position = lastTask ? lastTask.position + 1000 : 1000;

            // 4. Create task
            const task = await tx.task.create({
                data: {
                    ...dto,
                    projectId,
                    position,
                },
            });

            // 5. Log it
            await tx.changelog.create({
                data: {
                    action: "TASK_CREATED",
                    details: `Created task "${task.title}"`,
                    projectId,
                    taskId: task.id,
                    userId,
                },
            });

            return task;
        });
    }

    /**
     * Updates the vertical order of a task (Drag and Drop)
     */
    // public async updatePosition(
    //     projectId: number,
    //     taskId: number,
    //     userId: number,
    //     newPosition: number,
    // ): Promise<Task> {
    //     const membership = await this.prisma.projectMember.findFirst({
    //         where: { projectId, userId },
    //     });

    //     if (!membership) {
    //         throw new ForbiddenException("Not a project member");
    //     }

    //     const task = await this.prisma.task.findUnique({
    //         where: { id: taskId },
    //     });
    //     if (!task || task.projectId !== projectId) {
    //         throw new NotFoundException("Task not found in this project");
    //     }

    //     return this.prisma.task.update({
    //         where: { id: taskId },
    //         data: { position: newPosition },
    //     });
    // }

    public async findAllByProject(
        projectId: number,
        userId: number,
    ): Promise<Task[]> {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) {
            throw new NotFoundException(
                `Project with ID ${projectId} not found`,
            );
        }

        const membership = await this.prisma.projectMember.findFirst({
            where: { projectId, userId },
        });
        if (!membership) {
            throw new ForbiddenException(
                "You do not have access to this project",
            );
        }
        return this.prisma.task.findMany({
            where: { projectId },
            include: {
                assignee: { select: { id: true, email: true } },
            },
            orderBy: {
                position: "asc", // Changed from createdAt: 'desc' to follow user-defined order
            },
        });
    }

    // ... (updateStatus, update, delete, and log methods remain largely the same)
    // Just ensure that the update() method doesn't accidentally overwrite 'position'
    // unless you explicitly pass it in the DTO.

    public async update(
        projectId: number,
        taskId: number,
        userId: number,
        dto: Partial<CreateTaskDto>,
    ): Promise<Task> {
        const [membership, task] = await Promise.all([
            this.prisma.projectMember.findFirst({
                where: { projectId, userId },
                include: { user: { select: { email: true } } },
            }),
            this.prisma.task.findUnique({
                where: { id: taskId },
            }),
        ]);

        if (!membership) throw new ForbiddenException("Not a project member");
        if (!task || task.projectId !== projectId) {
            throw new NotFoundException(
                `Task ${taskId} not found in this project`,
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const updatedTask = await tx.task.update({
                where: { id: taskId },
                data: {
                    title: dto.title,
                    description: dto.description,
                    assigneeId: dto.assigneeId,
                    status: dto.status as TaskStatus,
                    // We do NOT update position here to keep responsibilities separate
                },
            });

            await tx.changelog.create({
                data: {
                    action: "TASK_UPDATED",
                    details: `${membership.user.email} updated the task details for "${task.title}".`,
                    project: { connect: { id: projectId } },
                    task: { connect: { id: taskId } },
                    user: { connect: { id: userId } },
                },
            });

            return updatedTask;
        });
    }

    public async move(
        projectId: number,
        taskId: number,
        userId: number,
        dto: MoveTaskDto,
    ) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Basic validation
            const [membership, task] = await Promise.all([
                tx.projectMember.findFirst({ where: { projectId, userId } }),
                tx.task.findUnique({ where: { id: taskId } }),
            ]);

            if (!membership) throw new ForbiddenException("Not a member");
            if (!task || task.projectId !== projectId)
                throw new NotFoundException("Task not found");

            const oldStatus = task.status;
            const newStatus = dto.status ?? oldStatus;
            const newPos = dto.position !== undefined ? dto.position : task.position;

            // 2. Update the task
            const updatedTask = await tx.task.update({
                where: { id: taskId },
                data: {
                    status: newStatus,
                    position: newPos, // Just save the number from the FE
                },
            });

            // 3. Simple Log
            if (oldStatus !== newStatus) {
                await tx.changelog.create({
                    data: {
                        action: "TASK_MOVED",
                        details: `Moved task to ${newStatus}`,
                        projectId,
                        taskId,
                        userId,
                    },
                });
            }

            return updatedTask;
        });
    }
    public async updateStatus(
        projectId: number,
        taskId: number,
        userId: number,
        dto: UpdateTaskStatusDto,
    ): Promise<Task> {
        const [membership, task] = await Promise.all([
            this.prisma.projectMember.findFirst({
                where: { projectId, userId },
                include: { user: { select: { email: true } } },
            }),
            this.prisma.task.findUnique({
                where: { id: taskId },
                select: {
                    id: true,
                    projectId: true,
                    title: true,
                    status: true,
                },
            }),
        ]);

        if (!membership) throw new ForbiddenException("Not a project member");
        if (!task || task.projectId !== projectId) {
            throw new NotFoundException(
                `Task ${taskId} not found in this project`,
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const updatedTask = await tx.task.update({
                where: { id: taskId },
                data: { status: dto.status },
            });

            await tx.changelog.create({
                data: {
                    action: "STATUS_UPDATED",
                    details: `${membership.user.email} changed status from ${task.status} to ${dto.status} for task "${task.title}".`,
                    project: { connect: { id: projectId } },
                    task: { connect: { id: taskId } },
                    user: { connect: { id: userId } },
                },
            });

            return updatedTask;
        });
    }

    public async delete(
        projectId: number,
        taskId: number,
        userId: number,
    ): Promise<void> {
        const [membership, task] = await Promise.all([
            this.prisma.projectMember.findFirst({
                where: { projectId, userId },
                include: { user: { select: { email: true } } },
            }),
            this.prisma.task.findUnique({ where: { id: taskId } }),
        ]);

        if (!membership) throw new ForbiddenException("Not a project member");
        if (!task || task.projectId !== projectId) {
            throw new NotFoundException("Task not found");
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.task.delete({ where: { id: taskId } });

            await tx.changelog.create({
                data: {
                    action: "TASK_DELETED",
                    details: `${membership.user.email} deleted task "${task.title}".`,
                    project: { connect: { id: projectId } },
                    user: { connect: { id: userId } },
                },
            });
        });
    }

    public async findProjectLogs(projectId: number, userId: number) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) throw new NotFoundException("Project not found");

        const membership = await this.prisma.projectMember.findFirst({
            where: { projectId, userId },
        });
        if (!membership) {
            throw new ForbiddenException("Not a member of this project");
        }

        return this.prisma.changelog.findMany({
            where: { projectId },
            include: {
                user: { select: { email: true } },
                task: { select: { title: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    public async findTaskLogs(
        projectId: number,
        taskId: number,
        userId: number,
    ) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) throw new NotFoundException("Project not found");

        const membership = await this.prisma.projectMember.findFirst({
            where: { projectId, userId },
        });
        if (!membership) throw new ForbiddenException("Access denied");

        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
        });
        if (!task || task.projectId !== projectId) {
            throw new NotFoundException("Task not found in this project");
        }

        return this.prisma.changelog.findMany({
            where: { taskId, projectId },
            include: {
                user: { select: { email: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    }
}
