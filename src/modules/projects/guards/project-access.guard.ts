import {
    CanActivate,
    ExecutionContext,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ProjectsService } from '../projects.service';


// Request shape to include your JWT payload
interface AuthenticatedRequest extends Request {
    user: {
        userId: string;
    };
    params: {
        id: string;
    };
}
/**
 * ProjectAccessGuard
 * * General authorization: Allows owners OR members.
 * Used for "Read" operations where being part of the team is enough.
 */
@Injectable()
export class ProjectAccessGuard implements CanActivate {
    public constructor(private readonly projectsService: ProjectsService) {}

    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const userId = request.user?.userId;
        const projectId = parseInt(request.params.id, 10);

        if (!userId || isNaN(projectId)) {
            return false;
        }

    // Check if user is part of the prQoject at all
        const hasAccess = await this.projectsService.isMemberOrOwner(
            projectId,
            Number(userId)
        );

        if (!hasAccess) {
            // We throw NotFound (404) here instead of Forbidden (403).
            // This prevents "ID Harvesting" where a hacker guesses IDs to see
            // which projects exist. If they aren't in it, it "doesn't exist" to them.
            throw new NotFoundException(`Project with ID ${projectId} not found`);
        }

        return true;
    }
}