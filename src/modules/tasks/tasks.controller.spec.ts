import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectAccessGuard } from '../projects/guards/project-access.guard';
import { AssigneeMembershipGuard } from './guards/assignee-membership.guard';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';


// Using the same interface defined in your controller for consistency
export interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
  };
}

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  const mockTaskResponse = {
    id: 1,
    title: 'Setup Prisma',
    status: TaskStatus.TODO,
    projectId: 10,
    assigneeId: 5,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockTaskResponse)
          },
        },
      ],
    })
    // Mock the guards to prevent dependency errors with ProjectsService/AuthService
    .overrideGuard(ProjectAccessGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(AssigneeMembershipGuard)
  .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate task creation to TasksService', async () => {
    // Arrange
    const dto = { title: 'Setup Prisma', assigneeId: 5 };
    const req: AuthenticatedRequest = {
      user: {
        userId: 1,
        email: 'bill@dev.com',
      },
    } as unknown as AuthenticatedRequest;

    const createSpy = jest.spyOn(service, 'create');

    // Act
    const result = await controller.create(10, dto, req);

    // Assert
    // Verify controller passed correct params (projectId, userId from req, and dto)
    expect(createSpy).toHaveBeenCalledWith(10, 1, dto);
    expect(result).toEqual(mockTaskResponse);
  });
});