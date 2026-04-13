import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { TaskStatus } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { MoveTaskDto } from "./dto/request/move-task.dto";
import { TasksService } from "./tasks.service";

describe("TasksService", () => {
    let service: TasksService;
    // let prisma: PrismaService;

    // Mock Data
    const mockUser = { id: 1, email: "bill@dev.com" };
    // const mockAssigneeUser = { id: 5, email: 'junior@dev.com' };
    const mockMembership = {
        id: 1,
        userId: 1,
        projectId: 10,
        user: { email: "bill@dev.com" },
    };
    const mockAssigneeMembership = {
        id: 2,
        userId: 5,
        projectId: 10,
        user: { email: "junior@dev.com" },
    };

    const mockTask = {
        id: 101,
        title: "Setup Prisma",
        description: "Initial schema",
        status: TaskStatus.TODO,
        projectId: 10,
        assigneeId: 5,
        createdAt: new Date(),
    };

    interface MockPrismaClient {
        user: { findUnique: jest.Mock };
        project: { findUnique: jest.Mock };
        projectMember: { findUnique: jest.Mock; findFirst: jest.Mock };
        task: {
            create: jest.Mock;
            findUnique: jest.Mock;
            update: jest.Mock;
            updateMany: jest.Mock;
            findMany: jest.Mock;
            delete: jest.Mock;
            findFirst: jest.Mock;
        };
        changelog: { create: jest.Mock; findMany: jest.Mock };
    }

    // Define the actual object that implements the interface
    const mockPrismaClient: MockPrismaClient = {
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
            updateMany: jest.fn(),
            findMany: jest.fn(),
            delete: jest.fn(),
            findFirst: jest.fn(),
        },
        changelog: {
            create: jest.fn().mockResolvedValue({ id: 1 }),
            findMany: jest.fn(),
        },
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TasksService,
                {
                    provide: PrismaService,
                    useValue: {
                        $transaction: async <T>(
                            callback: (tx: MockPrismaClient) => Promise<T>,
                        ): Promise<T> => callback(mockPrismaClient), // This now finds the name
                        projectMember: mockPrismaClient.projectMember,
                        project: mockPrismaClient.project,
                        task: mockPrismaClient.task,
                        changelog: mockPrismaClient.changelog,
                    },
                },
            ],
        }).compile();

        service = module.get<TasksService>(TasksService);
    });

    describe("create", () => {
        it("should throw NotFoundException if assignee is not a project member", async () => {
            // Project exists
            mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10 });

            // Creator check (Success)
            mockPrismaClient.projectMember.findFirst.mockResolvedValueOnce(
                mockMembership,
            );

            // Assignee check (Fail)
            mockPrismaClient.projectMember.findFirst.mockResolvedValueOnce(
                null,
            );

            const dto = { title: "Broken Task", assigneeId: 99 };
            await expect(service.create(10, 1, dto)).rejects.toThrow(
                NotFoundException,
            );
        });

        it("should create a task and a rich changelog entry", async () => {
            mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10 });

            // Use mockResolvedValue (not Once) to ensure all membership checks pass
            mockPrismaClient.projectMember.findFirst.mockResolvedValue(
                mockAssigneeMembership,
            );
            mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaClient.task.findFirst.mockResolvedValue({
                position: 1000,
            });

            const dto = {
                title: "Setup Prisma",
                description: "Initial schema",
                assigneeId: 5,
            };

            const result = await service.create(10, 1, dto);

            expect(result).toEqual(mockTask);
            expect(mockPrismaClient.changelog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        details: expect.stringContaining(
                            "Assigned to junior@dev.com",
                        ),
                    }),
                }),
            );
        });

        it("should handle unassigned tasks with correct log wording", async () => {
            mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10 });
            // Ensure the creator check passes
            mockPrismaClient.projectMember.findFirst.mockResolvedValue(
                mockMembership,
            );
            mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
            mockPrismaClient.task.findFirst.mockResolvedValue(null); // No existing tasks

            const dto = { title: "Solo Task", assigneeId: undefined };
            await service.create(10, 1, dto);

            expect(mockPrismaClient.changelog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        details: expect.stringContaining("Left unassigned"),
                    }),
                }),
            );
        });
    });

    describe("updateStatus", () => {
        it("should update status and log the transition", async () => {
            const existingTask = { ...mockTask, status: TaskStatus.TODO };
            mockPrismaClient.task.findUnique.mockResolvedValue(existingTask);
            mockPrismaClient.projectMember.findFirst.mockResolvedValue(
                mockMembership,
            );

            const updatedTask = { ...existingTask, status: TaskStatus.DONE };
            mockPrismaClient.task.update.mockResolvedValue(updatedTask);

            const result = await service.updateStatus(10, 101, 1, {
                status: TaskStatus.DONE,
            });

            expect(result.status).toBe(TaskStatus.DONE);
            expect(mockPrismaClient.changelog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        details: expect.stringContaining(
                            "bill@dev.com changed status from TODO to DONE",
                        ),
                    }),
                }),
            );
        });
    });

    describe("move", () => {
        it("should update status and position without shifting others", async () => {
            // Arrange
            const existingTask = {
                ...mockTask,
                status: TaskStatus.TODO,
                position: 1000,
            };

            mockPrismaClient.task.findUnique.mockResolvedValue(existingTask);
            mockPrismaClient.projectMember.findFirst.mockResolvedValue(
                mockMembership,
            );

            const dto: MoveTaskDto = {
                status: TaskStatus.IN_PROGRESS,
                position: 1500.5, // Testing the new float/gap position
            };

            const movedTask = { ...existingTask, ...dto };
            mockPrismaClient.task.update.mockResolvedValue(movedTask);

            // Act
            const result = await service.move(10, 101, 1, dto);

            expect(mockPrismaClient.task.updateMany).not.toHaveBeenCalled();

            expect(mockPrismaClient.task.update).toHaveBeenCalledWith({
                where: { id: 101 },
                data: {
                    status: TaskStatus.IN_PROGRESS,
                    position: 1500.5,
                },
            });

            expect(result.position).toBe(1500.5);
        });

        it("should maintain old status if only position is provided", async () => {
            const existingTask = {
                ...mockTask,
                status: TaskStatus.TODO,
                position: 1000,
            };
            mockPrismaClient.task.findUnique.mockResolvedValue(existingTask);
            mockPrismaClient.projectMember.findFirst.mockResolvedValue(
                mockMembership,
            );

            await service.move(10, 101, 1, { position: 2000 });

            expect(mockPrismaClient.task.update).toHaveBeenCalledWith({
                where: { id: 101 },
                data: {
                    status: TaskStatus.TODO, // Kept old status
                    position: 2000,
                },
            });
        });
    });
    describe("delete", () => {
        it("should delete a task and log the action", async () => {
            const taskToDelete = { id: 101, title: "Old Task", projectId: 10 };
            mockPrismaClient.task.findUnique.mockResolvedValue(taskToDelete);
            mockPrismaClient.projectMember.findFirst.mockResolvedValue(
                mockMembership,
            );

            await service.delete(10, 101, 1);

            expect(mockPrismaClient.task.delete).toHaveBeenCalledWith({
                where: { id: 101 },
            });
            expect(mockPrismaClient.changelog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        details: expect.stringContaining(
                            'bill@dev.com deleted task "Old Task"',
                        ),
                    }),
                }),
            );
        });
    });

    describe("findAllByProject", () => {
        it("should return tasks ordered by position ascending", async () => {
            mockPrismaClient.project.findUnique.mockResolvedValue({ id: 10 });
            mockPrismaClient.projectMember.findFirst.mockResolvedValue(
                mockMembership,
            );

            const mockTasks = [
                { id: 1, position: 1000 },
                { id: 2, position: 2000 },
            ];
            mockPrismaClient.task.findMany.mockResolvedValue(mockTasks);

            await service.findAllByProject(10, 1);

            expect(mockPrismaClient.task.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { position: "asc" },
                }),
            );
        });
    });
});
