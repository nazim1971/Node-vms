import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { AppGateway } from '../gateways/app.gateway';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { PrismaService } from '../database/prisma.service';
import type { SaveLocationDto } from './dto/save-location.dto';

// Redis TTL for latest location cache (1 hour)
const LOCATION_CACHE_TTL = 3600;
// Rate limit: 1 GPS update per vehicle per 5 seconds
const RATE_LIMIT_TTL = 5;

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AppGateway,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // ─── Save GPS Location ────────────────────────────────────────────────
  /**
   * 1. Rate-limit: max 1 update per vehicle per 5 seconds (per tenant)
   * 2. Validate vehicle belongs to tenant
   * 3. Persist to GpsLocation table
   * 4. Cache latest location in Redis (key: gps:{tenantId}:{vehicleId})
   * 5. Emit 'locationUpdate' event to tenant room via WebSocket
   */
  async saveLocation(tenantId: string, dto: SaveLocationDto) {
    // ── Rate limit check ──
    const rateLimitKey = `tracking:ratelimit:${tenantId}:${dto.vehicleId}`;
    const limited = await this.redis.get(rateLimitKey).catch(() => null);
    if (limited) {
      throw new HttpException(
        'Rate limit: max 1 GPS update per vehicle per 5 seconds',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    // Set rate limit flag (expires in 5s)
    await this.redis
      .set(rateLimitKey, '1', 'EX', RATE_LIMIT_TTL)
      .catch(() => null);

    // ── Validate vehicle ──
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, tenantId, deletedAt: null },
      select: { id: true, registrationNo: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const now = new Date();

    // ── Persist to DB ──
    await this.prisma.gpsLocation.create({
      data: {
        tenantId,
        vehicleId: dto.vehicleId,
        lat: dto.lat,
        lng: dto.lng,
        speed: dto.speed ?? 0,
        timestamp: now,
      },
    });

    const locationData = {
      vehicleId: dto.vehicleId,
      registrationNo: vehicle.registrationNo,
      lat: dto.lat,
      lng: dto.lng,
      speed: dto.speed ?? 0,
      timestamp: now.toISOString(),
    };

    // ── Cache latest location in Redis ──
    const cacheKey = `gps:${tenantId}:${dto.vehicleId}`;
    await this.redis
      .set(cacheKey, JSON.stringify(locationData), 'EX', LOCATION_CACHE_TTL)
      .catch(() => null);

    // ── Emit via WebSocket to tenant room ──
    this.gateway.emitLocation(tenantId, locationData);

    return locationData;
  }

  // ─── Get Latest Location (from Redis cache) ─────────────────────────────
  async getLatest(tenantId: string, vehicleId: string) {
    // Verify vehicle belongs to tenant
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const cacheKey = `gps:${tenantId}:${vehicleId}`;
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) {
      return JSON.parse(cached) as Record<string, unknown>;
    }

    // Fall back to DB if not in cache
    return this.prisma.gpsLocation.findFirst({
      where: { vehicleId, tenantId },
      orderBy: { timestamp: 'desc' },
      select: {
        vehicleId: true,
        lat: true,
        lng: true,
        speed: true,
        timestamp: true,
      },
    });
  }

  // ─── Get Location History (from DB) ─────────────────────────────────
  async getHistory(tenantId: string, vehicleId: string, limit: number = 100) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    return this.prisma.gpsLocation.findMany({
      where: { vehicleId, tenantId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        vehicleId: true,
        lat: true,
        lng: true,
        speed: true,
        timestamp: true,
      },
    });
  }
}
