import { Controller, Post, Headers, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { SeedService } from './seed.service';

@ApiTags('System')
@Controller('api/v1/seed')
export class SeedController {
  public constructor(private readonly seedService: SeedService) {}

  @Post()
  @ApiOperation({ summary: 'Initialize database with pre-defined dataset' })
  @ApiHeader({ name: 'x-seed-token', description: 'Secret token to allow seeding' })
  @ApiResponse({ status: 201, description: 'Seeded successfully' })
  @ApiResponse({ status: 401, description: 'Invalid seed token' })
  public async seed(@Headers('x-seed-token') token: string) {
    // Security Check
    if (token !== process.env.SEED_TOKEN) {
      throw new UnauthorizedException('Invalid Seed Token');
    }

    if (process.env.NODE_ENV === 'production') {
       throw new ForbiddenException('Seeding is disabled in production');
    }

    return this.seedService.runSeed();
  }
}