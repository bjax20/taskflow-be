import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class AssigneeMembershipGuard implements CanActivate {
  public constructor(private readonly prisma: PrismaService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const params = request.params as Record<string, string>;
    const body = request.body as Record<string, unknown>;

    const projectId = parseInt(params.projectId, 10);
    const assigneeId = body.assigneeId as number | undefined;

    // If no assignee, skip check (unassigned is allowed)
    if (!assigneeId) return true;

    const membership = await this.prisma.projectMember.findFirst({
      where: {
        projectId, // Using object-shorthand (projectId: projectId)
        userId: assigneeId,
      },
    });

    if (!membership) {
      throw new NotFoundException(
        `User ${assigneeId} is not a member of project ${projectId}`
      );
    }

    return true;
  }
}