import { Controller, Post, Body, Param, UseGuards, Request, ParseIntPipe, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectAccessGuard } from '../projects/guards/project-access.guard';
import { CreateTaskDto } from './dto/request/create-task.dto';
import { UpdateTaskStatusDto } from './dto/request/update-task-status.dto';
import { AssigneeMembershipGuard } from './guards/assignee-membership.guard';
import { TasksService } from './tasks.service';


// TODO: Define the shape of Request with User attached
interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
  };
}

@ApiTags('Tasks')
@ApiBearerAuth('access-token')
@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard, ProjectAccessGuard, AssigneeMembershipGuard)
export class TasksController {
  public constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task and trigger audit log' })
  public async create(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.create(projectId, req.user.userId, createTaskDto);
  }

  @Patch(':taskId/status')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  public async updateStatus(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: UpdateTaskStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.updateStatus(projectId, taskId, req.user.userId, dto);
  }

  @Delete(':taskId')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT) // return 204 for deletes
  public async delete(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.tasksService.delete(projectId, taskId, req.user.userId);
  }
}