import { ExecutionContext } from '@nestjs/common';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../provider';
import { HealthGuard } from '../security/health.guard';
import { HealthController } from './health.controller';


describe('HealthController', () => {
  let controller: HealthController;

  // Mocking the dependencies so we don't need a real DB for unit tests
  const mockHealthCheckService = { check: jest.fn() };
  const mockPrismaHealthIndicator = { pingCheck: jest.fn() };
  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: PrismaHealthIndicator, useValue: mockPrismaHealthIndicator },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    })
      .overrideGuard(HealthGuard) // We bypass the guard in unit tests
      .useValue({ canActivate: (_context: ExecutionContext) => true })
      .compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health check result', async () => {
    const result = { status: 'ok', info: { database: { status: 'up' } } };
    mockHealthCheckService.check.mockResolvedValue(result);

    expect(await controller.healthCheck()).toBe(result);
  });
});