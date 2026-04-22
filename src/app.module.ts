import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { SensitiveFieldsInterceptor } from './common/interceptors/sensitive-fields.interceptor';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { SharedModule } from './shared/shared.module';
import { GatewaysModule } from './gateways/gateways.module';
import { JobsModule } from './jobs/jobs.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { FeatureAccessModule } from './feature-access/feature-access.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DriversModule } from './drivers/drivers.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { BookingsModule } from './bookings/bookings.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { ContractsModule } from './contracts/contracts.module';
import { TripsModule } from './trips/trips.module';
import { FuelModule } from './fuel/fuel.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { DocumentsModule } from './documents/documents.module';
import { ExpensesModule } from './expenses/expenses.module';
import { IncomeModule } from './income/income.module';
import { AccountingModule } from './accounting/accounting.module';
import { TrackingModule } from './tracking/tracking.module';
import { AlertsModule } from './alerts/alerts.module';
import { ReportsModule } from './reports/reports.module';
import { WorkshopModule } from './workshop/workshop.module';
import { AuditModule } from './audit/audit.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { FeatureGuard } from './common/guards/feature.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    RedisModule,
    SharedModule,
    GatewaysModule,
    JobsModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    SubscriptionsModule,
    FeatureAccessModule,
    VehiclesModule,
    DriversModule,
    AssignmentsModule,
    BookingsModule,
    SchedulingModule,
    ContractsModule,
    TripsModule,
    FuelModule,
    MaintenanceModule,
    DocumentsModule,
    ExpensesModule,
    IncomeModule,
    AccountingModule,
    TrackingModule,
    AlertsModule,
    ReportsModule,
    WorkshopModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: FeatureGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SensitiveFieldsInterceptor },
  ],
})
export class AppModule {}
