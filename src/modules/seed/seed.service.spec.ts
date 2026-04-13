import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../prisma/prisma.service";
import { SeedService } from "./seed.service";

describe("SeedService", () => {
    let service: SeedService;

    const mockUser = {
        id: 1,
        email: "test@example.com",
        fullName: "Test Candidate",
    };

    const mockProject = {
        id: 10,
        title: "Zenith Pay Evolution",
    };

    // Create a mock Prisma object
    const mockPrismaService = {
        user: {
            upsert: jest.fn(),
            findUnique: jest.fn(),
        },
        project: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SeedService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<SeedService>(SeedService);
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("runSeed", () => {
        it("should successfully seed data", async () => {
            // Assign mocks to local arrow-friendly variables
            const upsertMock = mockPrismaService.user.upsert;
            const createMock = mockPrismaService.project.create;

            mockPrismaService.user.upsert.mockResolvedValue(mockUser);
            mockPrismaService.project.findFirst.mockResolvedValue(null);
            mockPrismaService.project.create.mockResolvedValue(mockProject);
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

            const result = await service.runSeed();

            // Use the local variables (no 'this' context issues)
            expect(upsertMock).toHaveBeenCalled();
            expect(createMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        title: "Zenith Pay Evolution",
                    }),
                }),
            );

            expect(result.success).toBe(true);
        });

        it("should not create project if it exists", async () => {
            const createMock = mockPrismaService.project.create; // Arrow-safe reference

            mockPrismaService.user.upsert.mockResolvedValue(mockUser);
            mockPrismaService.project.findFirst.mockResolvedValue(mockProject);
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

            await service.runSeed();

            expect(createMock).not.toHaveBeenCalled();
        });
    });
});
