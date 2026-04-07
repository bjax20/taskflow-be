import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from '../projects.service';
import { ProjectOwnerGuard } from './project-owner.guard';

describe('ProjectOwnerGuard', () => {
  let guard: ProjectOwnerGuard;
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectOwnerGuard,
        {
          provide: ProjectsService,
          useValue: { isOwner: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get<ProjectOwnerGuard>(ProjectOwnerGuard);
    service = module.get<ProjectsService>(ProjectsService);
  });

  const createMockContext = (projectId: string, userId: number): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({
        params: { id: projectId },
        user: { userId: userId.toString() },
      }),
    }),
  } as unknown as ExecutionContext);

    it('should return true if user is the owner', async () => {
    // Capture the spy in a variable to fix the 'unbound-method' error
    const isOwnerSpy = jest.spyOn(service, 'isOwner').mockResolvedValue(true);
    const context = createMockContext('1', 42);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);

    //  Assert against the spy variable directly
    expect(isOwnerSpy).toHaveBeenCalledWith(1, 42);
    });

  it('should throw ForbiddenException if user is NOT the owner', async () => {
    jest.spyOn(service, 'isOwner').mockResolvedValue(false);
    const context = createMockContext('1', 99);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});