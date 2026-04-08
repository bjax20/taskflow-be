import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TasksService } from './tasks.service';


describe('TasksService', () => {
  let service: TasksService;
  let prisma: PrismaService;

  // Mock Data
  const mockUser = { id: 1, email: 'bill@dev.com' };
  const mockAssignee = { id: 5, email: 'junior@dev.com' };

  const mockTask = {
    id: 101,
    title: 'Setup Prisma',
    description: 'Initial schema',
    status: TaskStatus.TODO,
    projectId: 10,
    assigneeId: 5,
    createdAt: new Date(),
  };

  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    task: {
      create: jest.fn().mockResolvedValue(mockTask),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    changelog: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findMany: jest.fn(),
    },
  };

 beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: {
            // This handles this.prisma.$transaction
            $transaction: async (
              callback: (client: typeof mockPrismaClient) => Promise<unknown>
            ) => callback(mockPrismaClient),

            // This handles this.prisma.projectMember outside transactions
            projectMember: mockPrismaClient.projectMember,

            project: mockPrismaClient.project,
            task: mockPrismaClient.task,
            changelog: mockPrismaClient.changelog,
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should throw NotFoundException if assignee is not a project member', async () => {
      jest.spyOn(prisma.projectMember, 'findUnique').mockResolvedValue(null);

      const dto = { title: 'Broken Task', assigneeId: 99 };
      await expect(service.create(10, 1, dto)).rejects.toThrow(NotFoundException);
    });

    it('should create a task and a rich changelog entry', async () => {
    // Project exists
    mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10, name: 'Taskflow Project' });

    // Creator is a member (The check on line 22)
    mockPrismaClient.projectMember.findFirst.mockResolvedValue({ userId: 1, projectId: 10 });

    // Setup the user mocks for the changelog
    mockPrismaClient.user.findUnique
        .mockResolvedValueOnce(mockUser) // Creator
        .mockResolvedValueOnce(mockAssignee); // Assignee

    const dto = { title: 'Setup Prisma', description: 'Initial schema', assigneeId: 5 };

    const result = await service.create(10, 1, dto);

    expect(result).toEqual(mockTask);
    });

    it('should handle unassigned tasks with correct log wording', async () => {
    // Mock project existence
    mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10 });
    // Mock creator membership check
    mockPrismaClient.projectMember.findFirst.mockResolvedValue({ userId: 1, projectId: 10 });

    mockPrismaClient.user.findUnique.mockResolvedValueOnce(mockUser);

    const dto = { title: 'Solo Task' };
    await service.create(10, 1, dto);

    expect(mockPrismaClient.changelog.create).toHaveBeenCalledWith(
        expect.objectContaining({
        data: expect.objectContaining({
            details: expect.stringContaining('Left unassigned'),
        }),
        })
    );
});
  });

  describe('updateStatus', () => {
  it('should throw NotFoundException if task does not exist', async () => {
    // 1. Mock: Project exists, but Task does not
    mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10 });
    mockPrismaClient.task.findUnique.mockResolvedValue(null);

    await expect(service.updateStatus(10, 101, 1, { status: TaskStatus.DONE }))
      .rejects.toThrow(NotFoundException);
  });

  it('should update status and log the transition', async () => {
    // 1. Setup existing state
    const existingTask = { ...mockTask, status: TaskStatus.TODO };
    mockPrismaClient.task.findUnique.mockResolvedValue(existingTask);
    mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10 });
    mockPrismaClient.projectMember.findFirst.mockResolvedValue({ userId: 1 });
    mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

    // 2. Mock the update action
    const updatedTask = { ...existingTask, status: TaskStatus.DONE };
    mockPrismaClient.task.update.mockResolvedValue(updatedTask);

    // 3. Execute
    const result = await service.updateStatus(10, 101, 1, { status: TaskStatus.DONE });

    // 4. Assertions
    expect(result.status).toBe(TaskStatus.DONE);
    expect(mockPrismaClient.changelog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          details: expect.stringContaining('changed status from TODO to DONE'),
        }),
      })
    );
  });
});

    describe('findAllByProject', () => {
    it('should return all tasks for a specific project', async () => {
    const mockTasks = [
    { id: 1, title: 'Task 1', projectId: 10 },
    { id: 2, title: 'Task 2', projectId: 10 },
    ];
    mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10 });
    mockPrismaClient.projectMember.findFirst.mockResolvedValue({ userId: 1 });
    mockPrismaClient.task.findMany.mockResolvedValue(mockTasks);

    const result = await service.findAllByProject(10, 1);

    expect(result).toHaveLength(2);

    // Update this block to match your high-quality implementation
    expect(mockPrismaClient.task.findMany).toHaveBeenCalledWith({
    where: { projectId: 10 },
    include: {
        assignee: {
        select: {
            id: true,
            email: true,
        },
        },
    },
    orderBy: {
        createdAt: 'desc',
    },
    });
    });
    });

 describe('delete', () => {
  it('should delete a task and log the action', async () => {
    // 1. Mock existing state
    const taskToDelete = { id: 101, title: 'Old Task', projectId: 10 };
    mockPrismaClient.task.findUnique.mockResolvedValue(taskToDelete);
    mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10 });
    mockPrismaClient.projectMember.findFirst.mockResolvedValue({ userId: 1 });
    mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

    // 2. Execute
    await service.delete(10, 101, 1);

    // 3. Assertions
    expect(mockPrismaClient.task.delete).toHaveBeenCalledWith({
      where: { id: 101 },
    });

    expect(mockPrismaClient.changelog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'TASK_DELETED',
          details: expect.stringContaining('Old Task'),
        }),
      })
    );
  });
});

describe('findProjectLogs', () => {
  it('should return all logs for a project, newest first', async () => {
    const mockLogs = [
      { id: 1, action: 'TASK_CREATED', details: 'Task A created', createdAt: new Date() },
      { id: 2, action: 'STATUS_UPDATED', details: 'Task A moved to DONE', createdAt: new Date() },
    ];

    // 1. Mock Project & Member Checks
    mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10 });
    mockPrismaClient.projectMember.findFirst.mockResolvedValue({ userId: 1 });

    // 2. Mock the changelog query
    mockPrismaClient.changelog.findMany.mockResolvedValue(mockLogs);

    // 3. Execute
    const result = await service.findProjectLogs(10, 1);

    // 4. Assert
    expect(result).toHaveLength(2);
    expect(mockPrismaClient.changelog.findMany).toHaveBeenCalledWith({
      where: { projectId: 10 },
      include: {
        user: { select: { email: true } },
        task: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});
describe('findTaskLogs', () => {
  it('should return logs specific to a single task', async () => {
    const mockTaskLogs = [
      { id: 1, taskId: 101, details: 'Created' },
      { id: 2, taskId: 101, details: 'Moved to DONE' },
    ];

    // 1. Mock Project/Member checks
    mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10 });
    mockPrismaClient.projectMember.findFirst.mockResolvedValue({ userId: 1 });

    // 2. Mock Task existence (to ensure the task belongs to the project)
    mockPrismaClient.task.findUnique.mockResolvedValue({ id: 101, projectId: 10 });

    // 3. Mock the changelog query
    mockPrismaClient.changelog.findMany.mockResolvedValue(mockTaskLogs);

    // 4. Execute
    const result = await service.findTaskLogs(10, 101, 1);

    // 5. Assert
    expect(result).toHaveLength(2);
    expect(mockPrismaClient.changelog.findMany).toHaveBeenCalledWith({
      where: { taskId: 101, projectId: 10 },
      include: expect.any(Object),
      orderBy: { createdAt: 'desc' },
    });
  });
});
});