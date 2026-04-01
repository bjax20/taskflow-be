import { Controller, Get, UseGuards } from '@nestjs/common';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../provider';
import { HealthGuard } from '../security/health.guard';

@Controller('health')
export class HealthController {

    public constructor(
        private readonly health: HealthCheckService,
        private readonly database: PrismaHealthIndicator,
        private readonly prisma: PrismaService
    ) {}

    @Get()
    @UseGuards(HealthGuard)
    public async healthCheck() {

        return this.health.check([
            async () => this.database.pingCheck('database', this.prisma as PrismaClient),
            () => ({
                http: {
                    status: 'up',
                    uptime: process.uptime()
                }
            })
        ]);
    }

}
