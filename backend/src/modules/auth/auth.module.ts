import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApprovedDriverGuard } from '../../common/guards/approved-driver.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // Giá trị mặc định dùng khi gọi jwtService.sign()/verify() không truyền
      // secret riêng. TokenService luôn truyền secret tường minh cho
      // access/refresh token nên giá trị này chỉ là phòng hờ.
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpires'),
        },
      }),
    }),
    TypeOrmModule.forFeature([User, DriverProfile, RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, JwtStrategy, ApprovedDriverGuard],
  // ApprovedDriverGuard cần Repository<DriverProfile> — modules áp dụng
  // @UseGuards(ApprovedDriverGuard) trên các endpoint 🚗 sẽ import AuthModule.
  // TokenService export để RealtimeGateway xác thực token Socket.IO handshake.
  exports: [ApprovedDriverGuard, TokenService],
})
export class AuthModule {}
