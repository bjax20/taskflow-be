import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  // let prisma: PrismaService;

  // Mock Data
  const mockUser = { id: 1, email: 'bill@dev.com' };
  // const mockAssigneeUser = { id: 5, email: 'junior@dev.com' };
  const mockMembership = { 
    id: 1, 
    userId: 1, 
    projectId: 10, 
    user: { email: 'bill@dev.com' } 
  };
  const mockAssigneeMembership = { 
    id: 2, 
    userId: 5, 
    projectId: 10, 
    user: { email: 'junior@dev.com' } 
  };

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
    jest.clearAllMocks(); // Clear mocks between tests
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: async (callback: any) => callback(mockPrismaClient),
            projectMember: mockPrismaClient.projectMember,
            project: mockPrismaClient.project,
            task: mockPrismaClient.task,
            changelog: mockPrismaClient.changelog,
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    // prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should throw NotFoundException if assignee is not a project member', async () => {
      mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10 });
      // Creator is member
      mockPrismaClient.projectMember.findFirst.mockResolvedValueOnce(mockMembership);
      // Assignee is NOT member
      mockPrismaClient.projectMember.findFirst.mockResolvedValueOnce(null);

      const dto = { title: 'Broken Task', assigneeId: 99 };
      await expect(service.create(10, 1, dto)).rejects.toThrow(NotFoundException);
    });

    it('should create a task and a rich changelog entry', async () => {
      mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10 });
      mockPrismaClient.projectMember.findFirst.mockResolvedValue(mockMembership); // Initial auth check
      
      // Transactional mocks
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.projectMember.findFirst.mockResolvedValue(mockAssigneeMembership);

      const dto = { title: 'Setup Prisma', description: 'Initial schema', assigneeId: 5 };
      const result = await service.create(10, 1, dto);

      expect(result).toEqual(mockTask);
      expect(mockPrismaClient.changelog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            details: expect.stringContaining('Assigned to junior@dev.com'),
          }),
        })
      );
    });

    it('should handle unassigned tasks with correct log wording', async () => {
      mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10 });
      mockPrismaClient.projectMember.findFirst.mockResolvedValue(mockMembership);
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

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
    it('should update status and log the transition', async () => {
      const existingTask = { ...mockTask, status: TaskStatus.TODO };
      mockPrismaClient.task.findUnique.mockResolvedValue(existingTask);
      mockPrismaClient.projectMember.findFirst.mockResolvedValue(mockMembership);

      const updatedTask = { ...existingTask, status: TaskStatus.DONE };
      mockPrismaClient.task.update.mockResolvedValue(updatedTask);

      const result = await service.updateStatus(10, 101, 1, { status: TaskStatus.DONE });

      expect(result.status).toBe(TaskStatus.DONE);
      expect(mockPrismaClient.changelog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            details: expect.stringContaining('bill@dev.com changed status from TODO to DONE'),
          }),
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete a task and log the action', async () => {
      const taskToDelete = { id: 101, title: 'Old Task', projectId: 10 };
      mockPrismaClient.task.findUnique.mockResolvedValue(taskToDelete);
      mockPrismaClient.projectMember.findFirst.mockResolvedValue(mockMembership);

      await service.delete(10, 101, 1);

      expect(mockPrismaClient.task.delete).toHaveBeenCalledWith({ where: { id: 101 } });
      expect(mockPrismaClient.changelog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            details: expect.stringContaining('bill@dev.com deleted task "Old Task"'),
          }),
        })
      );
    });
  });
  
  // ... (Keep your findAllByProject and log getters as they are, they were mostly correct)
});