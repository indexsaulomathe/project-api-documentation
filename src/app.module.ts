import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './employees/employees.module';
import { DocumentTypesModule } from './document-types/document-types.module';
import { EmployeeDocumentTypesModule } from './employee-document-types/employee-document-types.module';
import { DocumentsModule } from './documents/documents.module';
import { PendenciesModule } from './pendencies/pendencies.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    EmployeesModule,
    DocumentTypesModule,
    EmployeeDocumentTypesModule,
    DocumentsModule,
    PendenciesModule,
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
    consumer.apply(LoggerMiddleware).forRoutes('*path');
  }
}
