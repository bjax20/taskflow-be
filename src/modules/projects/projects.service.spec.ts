import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { createMockProject} from '../../tests/factories/user.factory';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
    let service: ProjectsService;
    const mockPrisma = {
        project: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
        projectMember: {
            findUnique: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectsService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<ProjectsService>(ProjectsService);
    });

    // --- Main Service Logic Tests ---

    describe('findOne', () => {
        it('should return project detail if found', async () => {
            const mockProject = createMockProject({ id: 101, title: 'Taskflow' });

            mockPrisma.project.findUnique.mockResolvedValue(mockProject);
            const result = await service.findOne(101);

            expect(result.id).toBe(101);
            expect(result.owner.fullName).toBeDefined();
        });
    });

    describe('create', () => {
        it('should create a new project and link the owner', async () => {
            const createMock = mockPrisma.project.create;
            mockPrisma.project.findFirst.mockResolvedValue(null);

            const mockCreatedProject = createMockProject({
                title: 'New Project',
                ownerId: 1
            });

            createMock.mockResolvedValue(mockCreatedProject);

            const result = await service.create({ title: 'New Project', description: 'Desc' }, 1);

            expect(createMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        members: { create: { userId: 1 } }
                    })
                })
            );

            expect(result.members[0].fullName).toBeDefined();
        });
    });

    describe('findAll', () => {
        it('should return a paginated list of projects', async () => {
            const findManyMock = mockPrisma.project.findMany;
            const countMock = mockPrisma.project.count;

            const mockProjects = [
                createMockProject({ id: 1, title: 'Project A' }),
                createMockProject({ id: 2, title: 'Project B' }),
            ];
            findManyMock.mockResolvedValue(mockProjects);
            countMock.mockResolvedValue(2);

            const result = await service.findAll(1, { page: 1, limit: 10, role: 'all' });

            expect(result.data).toHaveLength(2);
            expect(result.data[0].title).toBe('Project A');
        });
    });

    // --- Authorization Helper Tests ---

    describe('isMemberOrOwner', () => {
        it('should return true if user is a member', async () => {

            mockPrisma.project.findUnique.mockResolvedValue(createMockProject({
                ownerId: 99,
                members: [{ userId: 1 }]
            }));

            const result = await service.isMemberOrOwner(10, 1);
            expect(result).toBe(true);
        });
    });
});