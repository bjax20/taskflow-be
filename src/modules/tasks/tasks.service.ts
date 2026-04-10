import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Task, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTaskDto } from './dto/request/create-task.dto';
import { UpdateTaskStatusDto } from './dto/request/update-task-status.dto';

@Injectable()
export class TasksService {
  public constructor(private readonly prisma: PrismaService) {}

  // Added explicit return type Task to satisfy no-unsafe-return
  public async create(projectId: number, userId: number, dto: CreateTaskDto): Promise<Task> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Check if the user is a member of the project
    const membership = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this project');
    }
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch names for a rich log
      const [creator, assignee] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { email: true } }),
        dto.assigneeId
          ? tx.user.findUnique({ where: { id: dto.assigneeId }, select: { email: true } })
          : Promise.resolve(null),
      ]);

      // 2. Create the Task
      const task = await tx.task.create({
        data: {
          title: dto.title,
          description: dto.description,
          status: dto.status || TaskStatus.TODO,
          projectId,
          assigneeId: dto.assigneeId,
        },
        // We include this to return the full task object
        include: {
          assignee: { select: { email: true } },
        }
      });

      // 3. Construct a professional audit trail
      // Use optional chaining and fallback to handle potential nulls safely
      const creatorEmail = creator?.email ?? 'Unknown User';
      let logDetails = `Task "${task.title}" was created by ${creatorEmail}.`;

      if (assignee?.email) {
        logDetails += ` Assigned to ${assignee.email}.`;
      } else {
        logDetails += ` Left unassigned.`;
      }

      // 4. Create the Log
      await tx.changelog.create({
        data: {
          action: 'TASK_CREATED',
          details: logDetails,
          projectId,
          taskId: task.id,
          userId,
        },
      });

      return task;
    });
  }

  public async updateStatus(
    projectId: number,
    taskId: number,
    userId: number,
    dto: UpdateTaskStatusDto,
  ): Promise<Task> {
    // 1. Verify Project exists
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    // 2. Verify User Membership
    const membership = await this.prisma.projectMember.findFirst({
      where: { projectId, userId },
    });
    if (!membership) throw new ForbiddenException('Not a project member');

    // 3. Find the Task and its current status
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: { select: { email: true } } },
    });

    if (!task || task.projectId !== projectId) {
      throw new NotFoundException(`Task ${taskId} not found in this project`);
    }

    const oldStatus = task.status;
    const newStatus = dto.status;

    // 4. Atomic Update & Log
    return this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: { status: newStatus },
      });

      const user = await tx.user.findUnique({ where: { id: userId } });

      await tx.changelog.create({
        data: {
          action: 'STATUS_UPDATED',
          details: `${user?.email || 'User'} changed status from ${oldStatus} to ${newStatus} for task "${task.title}".`,
          projectId,
          taskId,
          userId,
        },
      });

      return updatedTask;
    });
  }
  public async findAllByProject(projectId: number, userId: number): Promise<Task[]> {
    // 1. Validate Project Existence
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // 2. Validate Membership (Security check)
    const membership = await this.prisma.projectMember.findFirst({
      where: { projectId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this project');
    }

    // 3. Fetch Tasks
    return this.prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Show newest tasks first
      },
    });
  }

  public async delete(projectId: number, taskId: number, userId: number): Promise<void> {
    // 1. Verify Project Existence
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    // 2. Verify User Membership
    const membership = await this.prisma.projectMember.findFirst({
      where: { projectId, userId },
    });
    if (!membership) throw new ForbiddenException('Not a project member');

    // 3. Find the Task to get its name for the log
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.projectId !== projectId) {
      throw new NotFoundException(`Task ${taskId} not found in this project`);
    }

    // 4. Atomic Delete & Log
    return this.prisma.$transaction(async (tx) => {
      await tx.task.delete({
        where: { id: taskId },
      });

      const user = await tx.user.findUnique({ where: { id: userId } });

      await tx.changelog.create({
        data: {
          action: 'TASK_DELETED',
          details: `${user?.email || 'User'} deleted task "${task.title}".`,
          projectId,
          taskId,
          userId,
        },
      });
    });
  }

  public async findProjectLogs(projectId: number, userId: number) {
  // 1. Authorization (Reuse your existing pattern)
  const project = await this.prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundException('Project not found');

  const membership = await this.prisma.projectMember.findFirst({
    where: { projectId, userId },
  });
  if (!membership) throw new ForbiddenException('Not a member of this project');

  // 2. Fetch the Activity Feed
  return this.prisma.changelog.findMany({
    where: { projectId },
    include: {
      user: {
        select: { email: true },
      },
      task: {
        select: { title: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

  public async findTaskLogs(projectId: number, taskId: number, userId: number) {
    // 1. Standard Auth Checks
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const membership = await this.prisma.projectMember.findFirst({
      where: { projectId, userId },
    });
    if (!membership) throw new ForbiddenException('Access denied');

    // 2. Task-Project Integrity Check
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.projectId !== projectId) {
      throw new NotFoundException('Task not found in this project');
    }

    // 3. Fetch specific task history
    return this.prisma.changelog.findMany({
      where: {
        taskId,
        projectId
      },
      include: {
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  }