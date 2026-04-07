import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Task } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTaskDto } from './dto/request/create-task.dto';


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
}