import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

interface AccessJwtPayload {
  sub: string;
  role: string;
}

// ARCHITECTURE.md mục 3.2 — JwtAuthGuard dùng strategy 'jwt' này để xác
// thực access token (BR-12: sống 15 phút, ký bằng JWT_ACCESS_SECRET).
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: AccessJwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });

    // Token có chữ ký hợp lệ nhưng tài khoản không còn tồn tại hoặc đã bị
    // khóa (BR-21) thì vẫn phải từ chối truy cập.
    if (!user || user.status === 'LOCKED') {
      throw new UnauthorizedException();
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  }
}
