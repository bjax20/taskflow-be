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
    },
    changelog: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
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
});