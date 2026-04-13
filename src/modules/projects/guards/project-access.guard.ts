import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ProjectsService } from '../projects.service';

/**
 * Interface handles both /projects/:id and /projects/:projectId/tasks
 */
interface AuthenticatedRequest extends FastifyRequest{
  user: {
    userId: string;
  };
  params: {
    id?: string;
    projectId?: string;
  };
}

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  public constructor(private readonly projectsService: ProjectsService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // --- DEBUGGING LOGS START ---
    // console.log('--- [GUARD DEBUG] ---');
    // console.log('Path:', request.url);
    // console.log('Raw Params:', request.params);
    // console.log('User from JWT:', request.user);
    // ----------------------------

    const userId = request.user?.userId;

    // Extracts from either :id or :projectId
    const rawProjectId = request.params.projectId || request.params.id;
    const projectId = parseInt(rawProjectId ?? '', 10);

    // console.log(`Extracted IDs -> User: ${userId}, Project: ${projectId}`);

    if (!userId || isNaN(projectId)) {
      console.error('GUARD FAILED: Missing userId or ProjectId is NaN');
    return false;
    }

    const hasAccess = await this.projectsService.isMemberOrOwner(
      projectId,
      Number(userId),
    );

    // console.log(`Database Access Result: ${hasAccess}`);
    // console.log('--- [DEBUG END] ---');

    if (!hasAccess) {
      // Throwing 404 is a security best practice (hides project existence)
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    return true;
  }
}