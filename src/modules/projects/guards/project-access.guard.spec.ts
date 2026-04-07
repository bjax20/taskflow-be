import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from '../projects.service';
import { ProjectAccessGuard } from './project-access.guard';

describe('ProjectAccessGuard', () => {
  let guard: ProjectAccessGuard;
  let service: ProjectsService;


  const createMockContext = (projectId: string | number | null, userId: number | null): ExecutionContext => ({
      switchToHttp: () => ({
        getRequest: () => ({
          params: { id: projectId },
          user: userId ? { userId: userId.toString() } : undefined,
        }),
      }),
      // Cast the minimal object to ExecutionContext using 'unknown' first to satisfy ESLint
    } as unknown as ExecutionContext);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectAccessGuard,
        {
          provide: ProjectsService,
          useValue: {
            isMemberOrOwner: jest.fn(), // Mock the service method
          },
        },
      ],
    }).compile();

    guard = module.get<ProjectAccessGuard>(ProjectAccessGuard);
    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
   it('should return true if user has access', async () => {
    const spy = jest.spyOn(service, 'isMemberOrOwner').mockResolvedValue(true);

    const context = createMockContext('1', 42);
    const result = await guard.canActivate(context);

    expect(result).toBe(true);

    expect(spy).toHaveBeenCalledWith(1, 42);
    });

    it('should throw NotFoundException if user has no access', async () => {
      // Arrange
      (service.isMemberOrOwner as jest.Mock).mockResolvedValue(false);
      const context = createMockContext('1', 99);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    });

    it('should return false if userId is missing from request', async () => {
      // Arrange
      const context = createMockContext('1', null);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false if projectId is not a number', async () => {
      // Arrange
      const context = createMockContext('abc', 42);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(false);
    });
  });
});