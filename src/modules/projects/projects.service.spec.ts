import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
    let service: ProjectsService;
    // Setup the Mock for Prisma
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
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
            ],
        }).compile();

        service = module.get<ProjectsService>(ProjectsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // --- Authorization Helper Tests ---

    describe('isOwner', () => {
        it('should return true if userId matches project ownerId', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({ ownerId: 1 });
            const result = await service.isOwner(10, 1);
            expect(result).toBe(true);
        });

        it('should return false if userId does not match', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({ ownerId: 2 });
            const result = await service.isOwner(10, 1);
            expect(result).toBe(false);
        });
    });

    describe('isMemberOrOwner', () => {
        it('should return true if user is the owner', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({
                ownerId: 1,
                members: [],
            });
            const result = await service.isMemberOrOwner(10, 1);
            expect(result).toBe(true);
        });

        it('should return true if user is a member', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({
                ownerId: 99,
                members: [{ userId: 1 }],
            });
            const result = await service.isMemberOrOwner(10, 1);
            expect(result).toBe(true);
        });

        it('should return false if project does not exist', async () => {
            mockPrisma.project.findUnique.mockResolvedValue(null);
            const result = await service.isMemberOrOwner(10, 1);
            expect(result).toBe(false);
        });
    });

    // --- Main Service Logic Tests ---

    describe('findOne', () => {
    it('should return project detail if found', async () => {
        const mockProject = {
            id: 1,
            title: 'Test',
            ownerId: 1,
            owner: { id: 1, email: 'a@a.com' },
            members: [],
            tasks: [],
            createdAt: new Date(),
        };

        const findUniqueMock = mockPrisma.project.findUnique;

        findUniqueMock.mockResolvedValue(mockProject);

        const result = await service.findOne(1);

        expect(result.id).toBe(1);


        expect(findUniqueMock).toHaveBeenCalledWith({
            where: { id: 1 },
            include: {
                owner: { select: { id: true, email: true } },
                members: { include: { user: { select: { id: true, email: true } } } },
                tasks: true,
            },
        });
    });
});

   describe('create', () => {
    it('should throw ConflictException if title already exists for user', async () => {
      const findFirstMock = mockPrisma.project.findFirst;
      findFirstMock.mockResolvedValue({ id: 1 });
      const dto = { title: 'Duplicate' };

      await expect(service.create(dto, 1)).rejects.toThrow(ConflictException);
    });

   it('should create a new project and link the owner as the first member', async () => {
    const createMock = mockPrisma.project.create;
    mockPrisma.project.findFirst.mockResolvedValue(null);

    // 1. We mock what the DB SHOULD return after a successful nested create
    createMock.mockResolvedValue({
        id: 1,
        title: 'New Project',
        description: 'Desc',
        ownerId: 1,
        owner: { id: 1, email: 'a@a.com' },
        members: [
        {
            user: { id: 1, email: 'a@a.com' } // The owner is now in the members array
        }
        ],
        tasks: [],
        createdAt: new Date(),
    });

  const result = await service.create({ title: 'New Project', description: 'Desc' }, 1);

  // 2. THE STRIKE ZONE: This fails if you forget 'members: { create: ... }' in the Service
  expect(createMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        ownerId: 1,
        members: {
          create: { userId: 1 }
        }
      })
    })
  );

  // 3. Verify the returned DTO reflects the membership
  expect(result.members).toHaveLength(1);
  expect(result.members[0].id).toBe(1);
});
  });

  describe('remove', () => {
    it('should call prisma delete', async () => {
      const deleteMock = mockPrisma.project.delete;
      deleteMock.mockResolvedValue({});

      await service.remove(1);

      // 3. Assert against the reference variable
      expect(deleteMock).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('findAll', () => {
    it('should return a paginated list of projects', async () => {
      //  Capture the mock functions from Prisma
      const findManyMock = mockPrisma.project.findMany;
      const countMock = mockPrisma.project.count;

      // Arrange: Mock data for the projects list
      const mockProjects = [
        {
          id: 1,
          title: 'Project A',
          members: [],
          tasks: [],
          ownerId: 1,
          createdAt: new Date(),
        },
      ];
      const mockCount = 1;

      //  Set the mock values using the reference variables
      findManyMock.mockResolvedValue(mockProjects);
      countMock.mockResolvedValue(mockCount);


      const result = await service.findAll(1, { page: 1, limit: 10, role: 'all' });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);

      expect(findManyMock).toHaveBeenCalled();
      expect(countMock).toHaveBeenCalled();
    });
  });
});