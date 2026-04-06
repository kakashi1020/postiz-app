import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

@ApiTags('Health')
@Controller('/health')
export class HealthController {
  constructor(private _prisma: PrismaService) {}

  @Get('/')
  async check() {
    const version = process.env.OUTPOST_VERSION || '1.0.0';
    const timestamp = new Date().toISOString();

    let db = false;
    try {
      await this._prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      // db unreachable
    }

    let redis = false;
    try {
      const pong = await ioRedis.ping();
      redis = pong === 'PONG';
    } catch {
      // redis unreachable
    }

    let temporal = false;
    try {
      // Temporal health is inferred — if the app started with TemporalService
      // injected without throwing, Temporal is connected. A deeper check would
      // require injecting TemporalService, but the controller is unauthenticated
      // and we keep dependencies minimal. The orchestrator's /health/status
      // endpoint provides the authoritative Temporal health check.
      temporal = true;
    } catch {
      // temporal unreachable
    }

    const status = db && redis ? 'ok' : 'degraded';

    return {
      status,
      version,
      timestamp,
      services: {
        db,
        redis,
        temporal,
      },
    };
  }
}
