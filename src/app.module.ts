import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppLoggerModule } from './common/logger/logger.module';
import { MetricsModule } from './metrics/metrics.module';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './employees/employees.module';
import { DocumentTypesModule } from './document-types/document-types.module';
import { EmployeeDocumentTypesModule } from './employee-document-types/employee-document-types.module';
import { DocumentsModule } from './documents/documents.module';
import { PendenciesModule } from './pendencies/pendencies.module';
import { StatisticsModule } from './statistics/statistics.module';
import { StorageModule } from './storage/storage.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    AppLoggerModule,
    MetricsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'global',
          ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
          limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
        },
        {
          name: 'upload',
          ttl: parseInt(process.env.THROTTLE_UPLOAD_TTL ?? '60000', 10),
          limit: parseInt(process.env.THROTTLE_UPLOAD_LIMIT ?? '10', 10),
        },
        {
          name: 'auth',
          ttl: parseInt(process.env.THROTTLE_AUTH_TTL ?? '60000', 10),
          limit: parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '5', 10),
        },
      ],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    DatabaseModule,
    EmployeesModule,
    DocumentTypesModule,
    EmployeeDocumentTypesModule,
    DocumentsModule,
    PendenciesModule,
    StatisticsModule,
    StorageModule,
    HealthModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*path');
  }
}
