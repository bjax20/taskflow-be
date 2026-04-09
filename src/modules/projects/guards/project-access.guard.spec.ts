import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from '../projects.service';
import { ProjectAccessGuard } from './project-access.guard';

describe('ProjectAccessGuard', () => {
  let guard: ProjectAccessGuard;
  let service: ProjectsService;

  const createMockContext = (
    projectId: string | number | null,
    userId: number | null,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          params: { id: projectId },
          user: userId ? { userId: userId.toString() } : undefined,
        }),
      }),
      getType: () => 'http',
      getClass: jest.fn(),
      getHandler: jest.fn(),
    } as unknown as ExecutionContext);

  beforeEach(async (): Promise<void> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectAccessGuard,
        {
          provide: ProjectsService,
          useValue: {
            isMemberOrOwner: jest.fn(),
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
    it('should return true if user has access', async (): Promise<void> => {
      const spy = jest
        .spyOn(service, 'isMemberOrOwner')
        .mockResolvedValue(true);

      const context = createMockContext('1', 42);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith(1, 42);
    });

    it('should throw NotFoundException if user has no access', async (): Promise<void> => {
      jest.spyOn(service, 'isMemberOrOwner').mockResolvedValue(false);
      const context = createMockContext('1', 99);

      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    });

    it('should return false and log error if userId is missing', async (): Promise<void> => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {/* ignore*/});

      const context = createMockContext('1', null);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);

      consoleSpy.mockRestore(); // Restore for other tests
    });

    it('should return false and log error if projectId is not a number', async (): Promise<void> => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { /* ignore*/});

      const context = createMockContext('abc', 42);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});