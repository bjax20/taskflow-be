import { Test, TestingModule } from "@nestjs/testing";
import { TaskStatus } from "@prisma/client";
import { createMockTask } from "../../tests/factories/task.factory";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ProjectAccessGuard } from "../projects/guards/project-access.guard";
import { MoveTaskDto } from "./dto/request/move-task.dto";
import { AssigneeMembershipGuard } from "./guards/assignee-membership.guard";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

export interface AuthenticatedRequest extends Request {
    user: {
        userId: number;
        email: string;
    };
}

describe("TasksController", () => {
    let controller: TasksController;
    let service: TasksService;

    // Single source of truth for the response structure
    const mockTaskResponse = createMockTask({ id: 1, title: "Setup Prisma" });
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TasksController],
            providers: [
                {
                    provide: TasksService,
                    useValue: {
                        create: jest.fn().mockResolvedValue(mockTaskResponse),
                        // Add the new method to the mock
                        move: jest.fn().mockResolvedValue({
                            ...mockTaskResponse,
                            status: TaskStatus.IN_PROGRESS,
                            position: 2,
                        }),
                    },
                },
            ],
        })
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

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    it("should delegate task creation to TasksService", async () => {
        // Arrange
        const dto = { title: "Setup Prisma", assigneeId: 5 };
        const req: AuthenticatedRequest = {
            user: {
                userId: 1,
                email: "bill@dev.com",
            },
        } as unknown as AuthenticatedRequest;

        const createSpy = jest.spyOn(service, "create");

        // Act
        const result = await controller.create(10, dto, req);

        // Assert
        // Verify controller passed correct params (projectId, userId from req, and dto)
        expect(createSpy).toHaveBeenCalledWith(10, 1, dto);
        expect(result).toEqual(mockTaskResponse);
    });

    // it("should delegate position update to TasksService", async () => {
    //     // Arrange
    //     const dto: UpdateTaskPositionDto = { position: 1500.5 };
    //     const req = {
    //         user: { userId: 1, email: "bill@dev.com" },
    //     } as unknown as AuthenticatedRequest;

    //     const updatePositionSpy = jest.spyOn(service, "updatePosition");

    //     // Act
    //     const result = await controller.updatePosition(10, 101, dto, req);

    //     // Assert
    //     // Verify parameters: projectId (10), taskId (101), userId (1), and position (1500.5)
    //     expect(updatePositionSpy).toHaveBeenCalledWith(10, 101, 1, 1500.5);
    //     expect(result.position).toBe(1500.5);
    // });

    it("should delegate task move to TasksService", async () => {
        const dto: MoveTaskDto = {
            status: TaskStatus.IN_PROGRESS,
            position: 2,
        };
        const req = {
            user: { userId: 1, email: "bill@dev.com" },
        } as unknown as AuthenticatedRequest;

        const moveSpy = jest.spyOn(service, "move");

        const result = await controller.moveTask(10, 101, dto, req);

        expect(moveSpy).toHaveBeenCalledWith(10, 101, 1, dto);
        expect(result.status).toBe(TaskStatus.IN_PROGRESS);
        expect(result.position).toBe(2);
    });
});
