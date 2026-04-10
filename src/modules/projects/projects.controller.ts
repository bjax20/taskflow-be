import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    UseGuards,
    Request,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    ParseIntPipe,
} from "@nestjs/common";
import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBody,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiNoContentResponse,
    ApiConflictResponse,
} from "@nestjs/swagger";

import { RequestWithUser } from "../../../src/modules/common/interfaces/request-with-user.interface";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AddMemberResponse } from "../common/interfaces/add-member-response.interface";
import { PaginatedResponse } from "../common/interfaces/pagination.interface";
import { AddMemberDto } from "./dto/request/add-member.dto";
import { CreateProjectDto } from "./dto/request/create-project.dto";
import { UpdateProjectDto } from "./dto/request/update-project.dto";
import { ProjectDetailResponseDto } from "./dto/response/project-detail/project-detail-response.dto";
import { ProjectResponseDto } from "./dto/response/project-list/project-response.dto";
import { ProjectMemberDto } from "./dto/response/project-member.dto";
import { ProjectAccessGuard } from "./guards/project-access.guard";
import { ProjectOwnerGuard } from './guards/project-owner.guard';
import { ProjectsService } from "./projects.service";
/**
 * Projects Management Controller
 *
 * Handles all project-related operations including:
 * - CRUD operations on projects
 * - Team member management
 * - Project discovery and filtering
 * - Access control and authorization
 */
@ApiTags("Projects")
@ApiBearerAuth("access-token")
@Controller("projects")
@UseGuards(JwtAuthGuard)
export class ProjectsController {
    public constructor(private readonly projectsService: ProjectsService) {}

    /**
     * Create a new project
     *
     * The authenticated user becomes the project owner.
     * Projects can have multiple team members added later.
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: "Create a new project",
        description:
            "Creates a new project with the authenticated user as the owner. " +
            "The owner has full control over the project including member management and deletion.",
    })
    @ApiBody({
        type: CreateProjectDto,
        examples: {
            basic: {
                summary: "Basic project creation",
                value: {
                    title: "Q4 Product Launch",
                    description: "Platform overhaul and feature expansion",
                },
            },
            minimal: {
                summary: "Minimal project (description optional)",
                value: {
                    title: "Bug Fixes Sprint",
                },
            },
        },
    })
    @ApiCreatedResponse({
        type: ProjectDetailResponseDto,
        description: "Project successfully created with owner details",
        example: {
            id: 1,
            title: "Q4 Product Launch",
            description: "Platform overhaul and feature expansion",
            ownerId: 42,
            owner: {
                id: 42,
                email: "alice@company.com",
            },
            members: [],
            taskCount: 0,
            createdAt: "2024-01-15T10:30:00Z",
        },
    })
    @ApiConflictResponse({
        description: "Project title already exists for this user",
    })
    public async create(
        @Body() createProjectDto: CreateProjectDto,
        @Request() req: RequestWithUser,
    ): Promise<ProjectDetailResponseDto> {
        return this.projectsService.create(
            createProjectDto,
            Number(req.user.userId),
        );
    }

    /**
     * Get all projects for the authenticated user
     *
     * Returns both owned and member projects with pagination support.
     * Useful for displaying user's project dashboard.
     */
    @Get()
    @ApiOperation({
        summary: "List all projects",
        description:
            "Retrieves all projects where the authenticated user is either the owner or a member. " +
            "Supports pagination and filtering by role.",
    })
    @ApiQuery({
        name: "page",
        required: false,
        type: Number,
        example: 1,
        description: "Page number for pagination (1-indexed)",
    })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        example: 10,
        description: "Items per page (max 50)",
    })
    @ApiQuery({
        name: "role",
        required: false,
        enum: ["owner", "member", "all"],
        example: "all",
        description: "Filter by user's role in the project",
    })
    @ApiOkResponse({
        type: [ProjectResponseDto],
        description: "List of projects with pagination metadata",
        schema: {
            example: {
                data: [
                    {
                        id: 1,
                        title: "Q4 Product Launch",
                        description: "Platform overhaul",
                        ownerId: 42,
                        memberCount: 5,
                        taskCount: 23,
                        createdAt: "2024-01-15T10:30:00Z",
                    },
                    {
                        id: 2,
                        title: "Website Redesign",
                        description: "New modern design",
                        ownerId: 99,
                        memberCount: 3,
                        taskCount: 12,
                        createdAt: "2024-02-01T14:20:00Z",
                    },
                ],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 2,
                    totalPages: 1,
                },
            },
        },
    })
    public async findAll(
        @Request() req: RequestWithUser,
        @Query("page") page: number = 1,
        @Query("limit") limit: number = 10,
        @Query("role") role: "owner" | "member" | "all" = "all",
    ): Promise<PaginatedResponse<ProjectResponseDto>> {
        const pageNumber = Number(page) || 1;
        const limitNumber = Number(limit) || 10;
        return this.projectsService.findAll(Number(req.user.userId), {
            page: pageNumber,
            limit: Math.min(limitNumber, 50),
            role,
        });
    }

    /**
     * Get detailed project information by ID
     *
     * Returns full project details including members, tasks, and owner info.
     * User must be the owner or a member to access.
     */
    @Get(":id")
    @ApiParam({
        name: "id",
        type: Number,
        example: 1,
        description: "The project ID",
    })
    @ApiOperation({
        summary: "Get project details",
        description:
            "Retrieves detailed information about a specific project. " +
            "The user must be the project owner or a member. " +
            "Includes owner info, members list, and basic task statistics.",
    })
    @ApiOkResponse({
        type: ProjectDetailResponseDto,
        description: "Complete project details",
        example: {
            id: 1,
            title: "Q4 Product Launch",
            description: "Platform overhaul and feature expansion",
            ownerId: 42,
            owner: {
                id: 42,
                email: "alice@company.com",
            },
            members: [
                { id: 2, email: "bob@company.com" },
                { id: 3, email: "carol@company.com" },
            ],
            taskCount: 23,
            createdAt: "2024-01-15T10:30:00Z",
        },
    })
    @ApiResponse({
        status: 404,
        description: "Project not found or access denied",
    })
    @UseGuards(ProjectAccessGuard)
    public async findOne(
        @Param("id", ParseIntPipe) id: number
    ): Promise<ProjectDetailResponseDto> {
        // We removed req.user.userId because the Service doesn't need to double-check anymore
        return this.projectsService.findOne(id);
    }

    /**
     * Update project information
     *
     * Only the project owner can update project details.
     * Title and description can be modified.
     */
    @Patch(":id")
    @ApiParam({
        name: "id",
        type: Number,
        example: 1,
    })
    @ApiOperation({
        summary: "Update project",
        description:
            "Updates project title and/or description. " +
            "Only the project owner can perform this action.",
    })
    @ApiBody({
        type: UpdateProjectDto,
        examples: {
            titleOnly: {
                summary: "Update title only",
                value: { title: "Q4 Launch - Updated" },
            },
            descriptionOnly: {
                summary: "Update description only",
                value: {
                    description: "Refocused scope for Q4 execution",
                },
            },
            both: {
                summary: "Update both fields",
                value: {
                    title: "Q4 Product Launch",
                    description: "New scope and timeline",
                },
            },
        },
    })
    @ApiOkResponse({
        type: ProjectDetailResponseDto,
        description: "Updated project details",
    })
    @ApiResponse({
        status: 403,
        description: "Only the project owner can update",
    })
    @ApiResponse({
        status: 404,
        description: "Project not found",
    })
    @UseGuards(ProjectOwnerGuard)
    public async update(
        @Param("id", ParseIntPipe) id: number,
        @Body() updateProjectDto: UpdateProjectDto
    ): Promise<ProjectDetailResponseDto> {
        return this.projectsService.update(id, updateProjectDto);
    }

    /**
     * Delete a project
     *
     * Only the project owner can delete.
     * Deletes all associated tasks and logs.
     */
    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiParam({
        name: "id",
        type: Number,
        example: 1,
    })
    @ApiOperation({
        summary: "Delete project",
        description:
            "Permanently deletes a project and all its associated tasks, " +
            "logs, and member relationships. Only the project owner can perform this action. " +
            "This action cannot be undone.",
    })
    @ApiNoContentResponse({
        description: "Project successfully deleted",
    })
    @ApiResponse({
        status: 403,
        description: "Only the project owner can delete",
    })
    @ApiResponse({
        status: 404,
        description: "Project not found",
    })
    @UseGuards(ProjectOwnerGuard)
    public async remove(
        @Param("id", ParseIntPipe) id: number
    ): Promise<void> {
        await this.projectsService.remove(id);
    }

   /**
     * Add a team member to a project
     *
     * Only the project owner can add members.
     * User cannot be added twice to the same project.
     */
    @Post(":id/members")
    @HttpCode(HttpStatus.CREATED)
    @ApiParam({
        name: "id",
        type: Number,
        example: 1,
    })
    @ApiOperation({
        summary: "Add team member to project",
        description:
            "Adds an existing user to a project as a member via their email address. " +
            "Only the project owner can add members. " +
            "A user cannot be a member multiple times.",
    })
    @ApiBody({
        type: AddMemberDto,
        examples: {
            standard: {
                summary: "Add a user by email",
                value: { email: "colleague@company.com" }, // Updated example
            },
        },
    })
    @ApiCreatedResponse({
        description: "Member successfully added",
        schema: {
            example: {
                message: "User added as project member",
                member: {
                    userId: 42,
                    projectId: 1,
                    user: {
                        id: 42,
                        email: "colleague@company.com", // Updated example
                    },
                },
            },
        },
    })
    @ApiConflictResponse({
        description: "User is already a member of this project",
    })
    @ApiResponse({
        status: 403,
        description: "Only the project owner can add members",
    })
    @ApiResponse({
        status: 404,
        description: "Project or user email not found", // Updated description
    })
    @UseGuards(ProjectOwnerGuard)
    public async addMember(
        @Param("id", ParseIntPipe) id: number,
        @Body() addMemberDto: AddMemberDto
    ): Promise<AddMemberResponse> {
        // We pass email instead of userId now
        return this.projectsService.addMember(id, addMemberDto.email);
    }

    /**
     * Remove a team member from a project
     *
     * Only the project owner can remove members.
     * Cannot remove the owner.
     */
    @Delete(":id/members/:userId")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiParam({
        name: "id",
        type: Number,
        example: 1,
        description: "The project ID",
    })
    @ApiParam({
        name: "userId",
        type: Number,
        example: 42,
        description: "The user ID to remove",
    })
    @ApiOperation({
        summary: "Remove team member from project",
        description:
            "Removes a user from the project. " +
            "Only the project owner can remove members. " +
            "Cannot remove the project owner.",
    })
    @ApiNoContentResponse({
        description: "Member successfully removed",
    })
    @ApiResponse({
        status: 403,
        description: "Only the project owner can remove members",
    })
    @ApiResponse({
        status: 404,
        description: "Project or member not found",
    })
    @UseGuards(ProjectOwnerGuard)
    public async removeMember(
        @Param("id", ParseIntPipe) id: number,
        @Param("userId", ParseIntPipe) userId: number
    ): Promise<void> {
        await this.projectsService.removeMember(id, userId);
    }

    /**
     * Get all members of a project
     *
     * User must be the owner or a member to view members.
     */
    @Get(":id/members")
    @ApiParam({
        name: "id",
        type: Number,
        example: 1,
    })
    @ApiOperation({
        summary: "Get project members",
        description:
            "Retrieves all members of a project including the owner. " +
            "The requesting user must be the owner or a member.",
    })
    @ApiOkResponse({
        type: [ProjectMemberDto],
        description: "List of project members",
        example: [
            {
                id: 42,
                email: "alice@company.com",
                isOwner: true,
            },
            {
                id: 2,
                email: "bob@company.com",
                isOwner: false,
            },
            {
                id: 3,
                email: "carol@company.com",
                isOwner: false,
            },
        ],
    })
    @ApiResponse({
        status: 404,
        description: "Project not found or access denied",
    })
    @UseGuards(ProjectAccessGuard)
    public async getMembers(
        @Param("id", ParseIntPipe) id: number
    ): Promise<ProjectMemberDto[]> {
        return this.projectsService.getMembers(id);
    }
}
