import {
    Injectable,
    NotFoundException,
    ConflictException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { AddMemberResponse } from "../common/interfaces/add-member-response.interface";
import { PaginatedResponse } from "../common/interfaces/pagination.interface";
import { CreateProjectDto } from "./dto/request/create-project.dto";
import { UpdateProjectDto } from "./dto/request/update-project.dto";
import { ProjectDetailResponseDto } from "./dto/response/project-detail/project-detail-response.dto";
import { ProjectResponseDto } from "./dto/response/project-list/project-response.dto";
import { ProjectMemberDto } from "./dto/response/project-member.dto";

const projectInclude = {
    members: true,
    owner: { select: { id: true, email: true, fullName: true } },
    tasks: true,
} satisfies Prisma.ProjectInclude;

// Define the shape of the include
const projectMemberInclude = {
    owner: {
        select: { id: true, email: true, fullName: true },
    },
    members: {
        include: {
            user: {
                select: { id: true, email: true, fullName: true },
            },
        },
    },
} satisfies Prisma.ProjectInclude;

// type ProjectWithMembersAndOwner = Prisma.ProjectGetPayload<{
//     include: typeof projectMemberInclude;
// }>;

// Define the inclusion once
const projectDetailInclude = {
    owner: { select: { id: true, email: true, fullName: true } },
    members: {
        include: {
            user: { select: { id: true, email: true, fullName: true } },
        },
    },
    tasks: true,
} satisfies Prisma.ProjectInclude;

// Create the type that the helper method uses
type ProjectWithDetail = Prisma.ProjectGetPayload<{
    include: typeof projectDetailInclude;
}>;


@Injectable()
export class ProjectsService {
    public constructor(private readonly prisma: PrismaService) { }

    /**
     * Create a new project
     */
    public async create(
    createProjectDto: CreateProjectDto,
    userId: number,
): Promise<ProjectDetailResponseDto> {
    // 1. Check if project with same title already exists for this user
    const existingProject = await this.prisma.project.findFirst({
        where: {
            title: createProjectDto.title,
            ownerId: userId,
        },
    });

    if (existingProject) {
        throw new ConflictException("You already have a project with this title");
    }

    // 2. The Fix: Add the 'members' nested create
    const project = await this.prisma.project.create({
        data: {
            title: createProjectDto.title,
            description: createProjectDto.description || null,
            ownerId: userId,
            // THIS IS THE MISSING PIECE:
            members: {
                create: {
                    userId,
                },
            },
        },
        include: projectDetailInclude, // Ensures we return the member we just created
    });

    return this.mapToDetailResponse(project);
}

    /**
     * Find all projects for a user (owned + member projects)
     */
    public async findAll(
        userId: number,
        options: { page: number; limit: number; role: string },
    ): Promise<PaginatedResponse<ProjectResponseDto>> {
        const skip = (options.page - 1) * options.limit;

        // Define the where conditions
        const whereConditions: Prisma.ProjectWhereInput =
            options.role === "owner"
                ? { ownerId: userId }
                : options.role === "member"
                    ? {
                        members: {
                            some: { userId },
                        },
                    }
                    : {
                        OR: [
                            { ownerId: userId },
                            { members: { some: { userId } } },
                        ],
                    };

        // Create the type based on that include
        type ProjectWithRelations = Prisma.ProjectGetPayload<{
            include: typeof projectInclude;
        }>;

        // Execute the database queries
        const [projects, total] = await Promise.all([
            this.prisma.project.findMany({
                where: whereConditions,
                include: projectInclude,
                orderBy: { createdAt: "desc" },
                take: options.limit,
                skip,
            }),
            this.prisma.project.count({ where: whereConditions }),
        ]);

        // Map the results to your DTO
        const data = projects.map((project: ProjectWithRelations): ProjectResponseDto => ({
            id: project.id,
            title: project.title,
            description: project.description ?? '', // Use nullish coalescing for safety
            ownerId: project.ownerId,
            memberCount: project.members.length,
            taskCount: project.tasks.length,
            createdAt: project.createdAt,
        }));

        return {
            data,
            pagination: {
                page: options.page,
                limit: options.limit,
                total,
                totalPages: Math.ceil(total / options.limit),
            },
        };
    }

    /**
     * Find a single project by ID
     * Verifies user has access
     */
 public async findOne(
    projectId: number,
): Promise<ProjectDetailResponseDto> {
    const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: projectDetailInclude,
    });

    if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    return this.mapToDetailResponse(project);
}

    /**
     * Update a project
     */
    public async update(
    projectId: number,
    updateProjectDto: UpdateProjectDto,
): Promise<ProjectDetailResponseDto> {
    const project = await this.prisma.project.update({
        where: { id: projectId },
        data: {
            ...(updateProjectDto.title && {
                title: updateProjectDto.title,
            }),
            ...(updateProjectDto.description !== undefined && {
                description: updateProjectDto.description,
            }),
        },
        include: projectDetailInclude,
    });

    return this.mapToDetailResponse(project);
}

    /**
     * Delete a project and all its associated data
     */
    public async remove(projectId: number): Promise<void> {
        // Cascade delete is handled by Prisma relations
        await this.prisma.project.delete({
            where: { id: projectId },
        });
    }

    /**
     * Add a member to a project
     */
    public async addMember(projectId: number, email: string): Promise<AddMemberResponse> {
       //  Look up the user by email instead of ID
    const user = await this.prisma.user.findUnique({
        where: { email },
    });

    //  If user doesn't exist, throw 404
    if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
    }

    // Check if user is already a member using the ID we just found
    const existingMembership = await this.prisma.projectMember.findUnique({
        where: {
            userId_projectId: {
                userId: user.id,
                projectId,
            },
        },
    });

    if (existingMembership) {
        throw new ConflictException("User is already a member of this project");
    }

    //  Create the membership
    const membership = await this.prisma.projectMember.create({
        data: {
            userId: user.id,
            projectId,
        },
        include: {
            user: {
                select: { id: true, email: true, fullName: true },
            },
        },
    });

    return {
        message: "User added as project member",
        member: {
            userId: membership.userId,
            projectId: membership.projectId,
            user: {
                id: membership.user.id,
                email: membership.user.email,
                fullName: membership.user.fullName,
            },
        },
    };
    }

    /**
     * Remove a member from a project
     */
    public async removeMember(projectId: number, userId: number): Promise<void> {
        // Check if member exists
        const membership = await this.prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId,
                },
            },
        });

        if (!membership) {
            throw new NotFoundException(
                `User ${userId} is not a member of this project`,
            );
        }

        // Remove the membership
        await this.prisma.projectMember.delete({
            where: {
                userId_projectId: {
                    userId,
                    projectId,
                },
            },
        });
    }

    /**
     * Get all members of a project (including owner)
     */
   public async getMembers(projectId: number): Promise<ProjectMemberDto[]> {
    const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: projectMemberInclude,
    });

    if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    return project.members.map((m) => ({
        id: m.user.id,
        email: m.user.email,
        fullName: m.user.fullName,
        isOwner: m.user.id === project.ownerId,
    }));
}

    /**
     * Check if user is the owner of a project
     */
    public async isOwner(projectId: number, userId: number): Promise<boolean> {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            select: { ownerId: true },
        });

        return project?.ownerId === userId;
    }

    /**
     * Check if user is either the owner OR a member of the project
     */
    public async isMemberOrOwner(projectId: number, userId: number): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: {
            ownerId: true,
            members: {
                where: { userId },
                select: { userId: true },
            },
        },
    });

    if (!project) return false;

    const isOwner = project.ownerId === userId;
    const isMember = project.members.length > 0;

    return isOwner || isMember;
    }


/**
 * Helper method to map project to detail response DTO
 * * Now that the owner is stored in the ProjectMember table,
 * we simply map the members array directly.
 */
private mapToDetailResponse(project: ProjectWithDetail): ProjectDetailResponseDto {
    return {
        id: project.id,
        title: project.title,
        description: project.description ?? '',
        ownerId: project.ownerId,
        owner: {
            id: project.owner.id,
            email: project.owner.email,
            fullName: project.owner.fullName,
        },
        members: project.members.map((m) => ({
            id: m.user.id,
            email: m.user.email,
            fullName: m.user.fullName,
        })),
        taskCount: project.tasks.length,
        createdAt: project.createdAt,
    };
}
}
