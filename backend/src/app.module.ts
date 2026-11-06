import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AuthModule } from './modules/auth/auth.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { CustomersModule } from './modules/customers/customers.module';
import { RidesModule } from './modules/rides/rides.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    // Dùng cho các job định kỳ tương lai (BR-43 quét lời mời hết hạn, ...).
    ScheduleModule.forRoot(),
    // API.md mục 1.6: mặc định 100 lần/phút/IP cho các endpoint còn lại,
    // riêng /auth/login ghi đè xuống 5 lần/phút bằng @Throttle().
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mssql' as const,
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        options: {
          encrypt: configService.get<boolean>('database.encrypt'),
          trustServerCertificate: configService.get<boolean>(
            'database.trustServerCertificate',
          ),
        },
        // Không bao giờ để TypeORM tự đồng bộ schema — mọi thay đổi CSDL
        // phải đi qua migration (docs/SETUP.md mục 3.4, docs/DATABASE.md).
        synchronize: false,
        autoLoadEntities: true,
        // autoLoadEntities chỉ nạp entity đã có forFeature() ở module nào đó.
        // Một entity chỉ được @OneToMany/@ManyToOne trỏ tới (chưa có module
        // sở hữu riêng, ví dụ DriverDocument/Vehicle trước khi có
        // DriversModule/VehiclesModule) sẽ khiến build metadata quan hệ lỗi.
        // Khai báo tường minh toàn bộ glob để luôn nạp đủ đồ thị entity.
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      }),
    }),
    HealthModule,
    SettingsModule,
    AuthModule,
    DriversModule,
    VehiclesModule,
    CustomersModule,
    RidesModule,
    WalletsModule,
    RealtimeModule,
    DashboardModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Thứ tự APP_GUARD chạy như một chuỗi AND theo đúng thứ tự khai báo:
    // giới hạn tần suất trước (rẻ nhất), rồi xác thực, rồi phân quyền.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
