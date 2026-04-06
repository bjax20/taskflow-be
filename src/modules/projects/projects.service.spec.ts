import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

 beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            ProjectsService,
            {
                provide: PrismaService,
                useValue: {
                    project: { findFirst: jest.fn(), create: jest.fn() },  // Mock the method
                },
            },
        ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
});

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
