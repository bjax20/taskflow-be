import { Test, TestingModule } from '@nestjs/testing';
import { UpdateProjectDto } from './dto/request/update-project.dto';
import { ProjectDetailResponseDto } from './dto/response/project-detail/project-detail-response.dto';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';


describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getMembers: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    service = module.get<ProjectsService>(ProjectsService);
  });
  describe('findOne', () => {
  it('should call service.findOne with the correct ID', async () => {
    const mockResult = {
      id: 1,
      title: 'Test Project',
      description: 'Test description',
      ownerId: 42,
      owner: { id: 42, email: 'owner@tapos.com' },
      members: [],
      taskCount: 0,
      createdAt: new Date()
    } as ProjectDetailResponseDto;
    const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue(mockResult);

    const result = await controller.findOne(1);

    expect(findOneSpy).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockResult);
  });
});
  describe('update', () => {
  it('should call service.update with ID and DTO', async () => {
    const dto: UpdateProjectDto = { title: 'New Title' };
    const mockResult = {
      id: 1,
      title: dto.title,
      description: 'Updated description',
      ownerId: 42,
      owner: { id: 42, email: 'owner@tapos.com' },
      members: [],
      taskCount: 5,
      createdAt: new Date()
    } as ProjectDetailResponseDto;

    const updateSpy = jest.spyOn(service, 'update').mockResolvedValue(mockResult);

    const result = await controller.update(1, dto);

    expect(updateSpy).toHaveBeenCalledWith(1, dto);
    expect(result).toEqual(mockResult);
  });
});
});