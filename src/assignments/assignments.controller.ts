import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('assignments')
@UseGuards(RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  /** POST /assignments — create a vehicle-driver assignment (ADMIN+) */
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(@Body() dto: CreateAssignmentDto, @CurrentUser() user: JwtPayload) {
    return this.assignmentsService.create(user.tenantId, dto);
  }

  /** GET /assignments?vehicleId=&driverId= — list assignments */
  @Get()
  findAll(
    @Query('vehicleId') vehicleId: string | undefined,
    @Query('driverId') driverId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.assignmentsService.findAll(user.tenantId, vehicleId, driverId);
  }

  /** GET /assignments/:id — get a single assignment */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.assignmentsService.findOne(user.tenantId, id);
  }

  /** PATCH /assignments/:id — update assignment dates (ADMIN+) */
  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.assignmentsService.update(user.tenantId, id, dto);
  }

  /** DELETE /assignments/:id — soft-delete (ADMIN+) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.assignmentsService.remove(user.tenantId, id);
  }
}
