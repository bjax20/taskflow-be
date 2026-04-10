import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Task, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTaskDto } from './dto/request/create-task.dto';
import { UpdateTaskStatusDto } from './dto/request/update-task-status.dto';

@Injectable()
export class TasksService {
  public constructor(private readonly prisma: PrismaService) {}

  public async create(projectId: number, userId: number, dto: CreateTaskDto): Promise<Task> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) throw new NotFoundException(`Project with ID ${projectId} not found`);

    const membership = await this.prisma.projectMember.findFirst({
      where: { projectId, userId },
    });

    if (!membership) throw new ForbiddenException('You are not a member of this project');

    // Inside create method...
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch info and VALIDATE membership for the assignee
      const [creator, assigneeInfo] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { email: true } }),
        dto.assigneeId
          ? tx.projectMember.findFirst({ 
              where: { projectId, userId: dto.assigneeId }, 
              include: { user: { select: { email: true } } } 
            })
          : Promise.resolve(null),
      ]);

      // If they provided an assigneeId but that person isn't in the project
      if (dto.assigneeId && !assigneeInfo) {
        throw new NotFoundException(`Assignee is not a member of this project`);
      }

      const task = await tx.task.create({
        data: {
          title: dto.title,
          description: dto.description,
          status: dto.status || TaskStatus.TODO,
          projectId,
          assigneeId: dto.assigneeId,
        },
      });

      const creatorEmail = creator?.email ?? 'Unknown User';
      
      // FIX: Wording must match the test expectation exactly
      const logDetails = dto.assigneeId && assigneeInfo
        ? `Task "${task.title}" was created by ${creatorEmail}. Assigned to ${assigneeInfo.user.email}.`
        : `Task "${task.title}" was created by ${creatorEmail}. Left unassigned.`; // <--- Test looks for this

      await tx.changelog.create({
        data: {
          action: 'TASK_CREATED',
          details: logDetails,
          project: { connect: { id: projectId } },
          task: { connect: { id: task.id } },
          user: { connect: { id: userId } },
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
    const [membership, task] = await Promise.all([
      this.prisma.projectMember.findFirst({
        where: { projectId, userId },
        include: { user: { select: { email: true } } }
      }),
      this.prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true, projectId: true, title: true, status: true }
      }),
    ]);

    if (!membership) throw new ForbiddenException('Not a project member');
    if (!task || task.projectId !== projectId) {
      throw new NotFoundException(`Task ${taskId} not found in this project`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: { status: dto.status },
      });

      await tx.changelog.create({
        data: {
          action: 'STATUS_UPDATED',
          details: `${membership.user.email} changed status from ${task.status} to ${dto.status} for task "${task.title}".`,
          project: { connect: { id: projectId } },
          task: { connect: { id: taskId } },
          user: { connect: { id: userId } },
        },
      });

      return updatedTask;
    });
  }

  public async update(
    projectId: number,
    taskId: number,
    userId: number,
    dto: Partial<CreateTaskDto>,
  ): Promise<Task> {
    const [membership, task] = await Promise.all([
      this.prisma.projectMember.findFirst({
        where: { projectId, userId },
        include: { user: { select: { email: true } } }
      }),
      this.prisma.task.findUnique({
        where: { id: taskId },
      }),
    ]);

    if (!membership) throw new ForbiddenException('Not a project member');
    if (!task || task.projectId !== projectId) {
      throw new NotFoundException(`Task ${taskId} not found in this project`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          title: dto.title,
          description: dto.description,
          assigneeId: dto.assigneeId,
          status: dto.status as TaskStatus,
        },
      });

      await tx.changelog.create({
        data: {
          action: 'TASK_UPDATED',
          details: `${membership.user.email} updated the task details for "${task.title}".`,
          project: { connect: { id: projectId } }, // Fix applied
          task: { connect: { id: taskId } },    // Fix applied
          user: { connect: { id: userId } },    // Fix applied
        },
      });

      return updatedTask;
    });
  }

  public async delete(projectId: number, taskId: number, userId: number): Promise<void> {
    const [membership, task] = await Promise.all([
      this.prisma.projectMember.findFirst({ where: { projectId, userId }, include: { user: { select: { email: true } } } }),
      this.prisma.task.findUnique({ where: { id: taskId } })
    ]);

    if (!membership) throw new ForbiddenException('Not a project member');
    if (!task || task.projectId !== projectId) throw new NotFoundException('Task not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { id: taskId } });

      await tx.changelog.create({
        data: {
          action: 'TASK_DELETED',
          details: `${membership.user.email} deleted task "${task.title}".`,
          project: { connect: { id: projectId } },
          user: { connect: { id: userId } },
          // Note: We don't connect 'task' here because it was just deleted
        },
      });
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