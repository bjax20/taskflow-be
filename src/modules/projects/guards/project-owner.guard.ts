import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException
} from '@nestjs/common';
import { ProjectsService } from '../projects.service';

interface AuthenticatedRequest extends Request {
    user: { userId: string };
    params: { id: string | string[] };
}

@Injectable()
export class ProjectOwnerGuard implements CanActivate {
    public constructor(private readonly projectsService: ProjectsService) {}

    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const user = request.user; // Populated by JwtAuthGuard
        const rawId = request.params.id;
        const projectId = Array.isArray(rawId)
            ? parseInt(rawId[0], 10)
            : parseInt(rawId, 10);

        if (!user || !projectId) {
            return false;
        }

        const isOwner = await this.projectsService.isOwner(projectId, Number(user.userId));

        if (!isOwner) {
            throw new ForbiddenException('You do not have permission to modify this project');
        }

        return true;
    }
}