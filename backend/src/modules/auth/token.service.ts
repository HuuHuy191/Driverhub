import { randomUUID } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserRole } from '../users/entities/user.entity';

const BCRYPT_COST = 10; // BR-06

export interface IssuedTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // giây
}

export interface DeviceInfo {
  deviceId?: string | null;
  deviceName?: string | null;
  fcmToken?: string | null;
}

export interface AccessJwtPayload {
  sub: string;
  role: UserRole;
}

interface RefreshJwtPayload {
  sub: string;
  role: UserRole;
  jti: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  // Cấp cặp token mới hoàn toàn — dùng khi đăng nhập.
  async issueTokenPair(
    userId: string,
    role: UserRole,
    device: DeviceInfo,
  ): Promise<IssuedTokenPair> {
    const accessToken = this.signAccessToken(userId, role);
    const refreshToken = await this.createRefreshToken(userId, role, device);
    return {
      accessToken,
      refreshToken,
      expiresIn: this.getAccessTokenTtlSeconds(accessToken),
    };
  }

  // BR-13: xoay vòng — token cũ bị thu hồi, cấp cặp mới. Nếu token đã thu
  // hồi trước đó bị dùng lại thì thu hồi TOÀN BỘ refresh token của tài khoản.
  async rotateRefreshToken(rawToken: string): Promise<IssuedTokenPair> {
    const payload = this.verifyRefreshToken(rawToken);

    const existing = await this.refreshTokenRepo.findOne({
      where: { id: payload.jti },
    });
    if (!existing || existing.userId !== payload.sub) {
      throw new UnauthorizedException();
    }

    // BR-12: refresh token chỉ được lưu dưới dạng băm -> phải bcrypt.compare
    // với bản gốc client gửi lên, không thể tra cứu ngược bằng hash.
    const matches = await bcrypt.compare(rawToken, existing.tokenHash);
    if (!matches) {
      throw new UnauthorizedException();
    }

    if (existing.revokedAt) {
      // Token đã bị thu hồi mà vẫn được dùng lại -> nghi ngờ bị đánh cắp.
      await this.revokeAllForUser(payload.sub);
      throw new UnauthorizedException();
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException();
    }

    // Thu hồi token cũ TRƯỚC khi cấp token mới (rotation).
    await this.refreshTokenRepo.update(
      { id: existing.id },
      { revokedAt: () => 'SYSUTCDATETIME()' },
    );

    const accessToken = this.signAccessToken(payload.sub, payload.role);
    const refreshToken = await this.createRefreshToken(
      payload.sub,
      payload.role,
      {
        deviceId: existing.deviceId,
        deviceName: existing.deviceName,
        fcmToken: existing.fcmToken,
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getAccessTokenTtlSeconds(accessToken),
    };
  }

  // BR-14: đăng xuất thu hồi refresh token của thiết bị hiện tại và xóa
  // fcmToken tương ứng. Token không hợp lệ/hết hạn/không thuộc về người gọi
  // thì coi như đã đăng xuất, không báo lỗi (đăng xuất là thao tác idempotent).
  async logout(rawToken: string, expectedUserId: string): Promise<void> {
    let payload: RefreshJwtPayload;
    try {
      payload = this.verifyRefreshToken(rawToken);
    } catch {
      return;
    }

    if (payload.sub !== expectedUserId) {
      return;
    }

    await this.refreshTokenRepo.update(
      { id: payload.jti, userId: payload.sub },
      { revokedAt: () => 'SYSUTCDATETIME()', fcmToken: null },
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokenRepo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: () => 'SYSUTCDATETIME()', fcmToken: null })
      .where('userId = :userId', { userId })
      .andWhere('revokedAt IS NULL')
      .execute();
  }

  private signAccessToken(userId: string, role: UserRole): string {
    const payload: AccessJwtPayload = { sub: userId, role };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpires'),
    });
  }

  private async createRefreshToken(
    userId: string,
    role: UserRole,
    device: DeviceInfo,
  ): Promise<string> {
    const jti = randomUUID();
    const payload: RefreshJwtPayload = { sub: userId, role, jti };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpires'),
    });

    const { exp } = this.jwtService.decode(token) as { exp: number };
    const tokenHash = await bcrypt.hash(token, BCRYPT_COST); // BR-12

    await this.refreshTokenRepo.save({
      id: jti,
      userId,
      tokenHash,
      deviceId: device.deviceId ?? null,
      deviceName: device.deviceName ?? null,
      fcmToken: device.fcmToken ?? null,
      expiresAt: new Date(exp * 1000),
      revokedAt: null,
    });

    return token;
  }

  private verifyRefreshToken(rawToken: string): RefreshJwtPayload {
    try {
      return this.jwtService.verify<RefreshJwtPayload>(rawToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException();
    }
  }

  // ARCHITECTURE.md mục 5.1 — RealtimeGateway.handleConnection() dùng hàm
  // này để xác thực token gửi trong Socket.IO handshake (auth.token).
  verifyAccessToken(rawToken: string): AccessJwtPayload {
    try {
      return this.jwtService.verify<AccessJwtPayload>(rawToken, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });
    } catch {
      throw new UnauthorizedException();
    }
  }

  private getAccessTokenTtlSeconds(accessToken: string): number {
    const { iat, exp } = this.jwtService.decode(accessToken) as {
      iat: number;
      exp: number;
    };
    return exp - iat;
  }
}
