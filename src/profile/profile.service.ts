import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeNameDto } from './dto/change-name.dto';

// Fields returned for every profile response — password is never exposed
const profileSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  tenantId: true,
  branchId: true,
  isActive: true,
  updatedAt: true,
} as const;

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async findActiveUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { ...profileSelect, password: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── Change Own Password ─────────────────────────────────────────────────────
  /**
   * All roles — user must supply their current password for verification.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.findActiveUser(userId);

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const hashed = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { message: 'Password changed successfully' };
  }

  // ─── Change Own Name ─────────────────────────────────────────────────────────
  /**
   * All roles — user may only update their own display name.
   */
  async changeName(userId: string, dto: ChangeNameDto) {
    await this.findActiveUser(userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
      select: profileSelect,
    });

    return updated;
  }

  // ─── Get Own Profile ─────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: profileSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
