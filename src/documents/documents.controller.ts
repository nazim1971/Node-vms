import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../../generated/prisma';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('documents')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.EMPLOYEE, Role.SUPER_ADMIN)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * POST /documents
   * Add a document record for a vehicle with an expiry date.
   */
  @Post()
  create(@Body() dto: CreateDocumentDto, @CurrentUser() user: JwtPayload) {
    return this.documentsService.create(user.tenantId, dto);
  }

  /**
   * GET /documents/expiring?days=30
   * List documents expiring within the next N days (default: 30).
   * Must be declared before /:id to prevent route shadowing.
   */
  @Get('expiring')
  findExpiring(@CurrentUser() user: JwtPayload, @Query('days') days?: string) {
    const daysAhead = days !== undefined ? Math.max(1, parseInt(days, 10)) : 30;
    return this.documentsService.findExpiring(user.tenantId, daysAhead);
  }

  /**
   * GET /documents?vehicleId=
   * List all documents. Optionally filter by vehicle.
   */
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.documentsService.findAll(user.tenantId, vehicleId);
  }
}
