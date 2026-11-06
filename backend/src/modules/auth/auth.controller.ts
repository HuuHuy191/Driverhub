import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Hoàn tất đăng ký tài xế',
    description:
      'API.md mục 2.1 — BR-03, BR-04, BR-05, BR-06, BR-16, BR-22. JSON gồm thông tin cá nhân, CCCD, GPLX và phương tiện; Admin duyệt thủ công.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description:
      'Tạo User(status=PENDING) + DriverProfile(approvalStatus=PENDING)',
    schema: {
      example: {
        data: {
          userId: '8f14e45f-...',
          driverId: '3c6e0b8a-...',
          approvalStatus: 'PENDING',
          message: 'Hồ sơ đã được gửi. Vui lòng chờ quản trị viên duyệt.',
        },
        timestamp: '2026-09-18T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description:
      'EMAIL_ALREADY_EXISTS · PHONE_ALREADY_EXISTS · LICENSE_PLATE_EXISTS',
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  // API.md mục 1.6: giới hạn riêng cho /auth/login, ghi đè throttler mặc định.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập', description: 'API.md mục 2.2 — BR-11' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công',
    schema: {
      example: {
        data: {
          accessToken: 'eyJhbGciOi...',
          refreshToken: 'eyJhbGciOi...',
          expiresIn: 900,
          user: {
            id: '8f14e45f-...',
            email: 'taixe01@gmail.com',
            role: 'DRIVER',
            status: 'ACTIVE',
          },
          driver: {
            id: '3c6e0b8a-...',
            fullName: 'Nguyễn Văn An',
            approvalStatus: 'APPROVED',
            rejectReason: null,
            isOnline: false,
            avatarUrl: null,
          },
        },
        timestamp: '2026-09-18T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'INVALID_CREDENTIALS — BR-11' })
  @ApiResponse({ status: 403, description: 'ACCOUNT_LOCKED — BR-21' })
  @ApiResponse({
    status: 429,
    description: 'Vượt quá 5 lần/phút — API.md mục 1.6',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Làm mới cặp token',
    description: 'API.md mục 2.3 — BR-12, BR-13',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token cũ bị thu hồi, cấp cặp mới (rotation — BR-13)',
    schema: {
      example: {
        data: {
          accessToken: 'eyJhbGciOi...',
          refreshToken: 'eyJhbGciOi...',
          expiresIn: 900,
        },
        timestamp: '2026-09-18T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'Token không hợp lệ hoặc đã bị dùng lại (dùng lại -> thu hồi toàn bộ phiên của tài khoản — BR-13)',
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Đăng xuất thiết bị hiện tại',
    description: 'BR-14',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description:
      'Thu hồi refresh token của thiết bị hiện tại và xóa fcmToken tương ứng',
    schema: {
      example: {
        data: { message: 'Đã đăng xuất' },
        timestamp: '2026-09-18T10:30:00.000Z',
      },
    },
  })
  async logout(
    @CurrentUser('userId') userId: string,
    @Body() dto: RefreshTokenDto,
  ) {
    await this.authService.logout(userId, dto);
    return { message: 'Đã đăng xuất' };
  }

  @Patch('password/change')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Đổi mật khẩu khi đã đăng nhập',
    description: 'API.md mục 2.4 — BR-06, BR-15',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description:
      'Đổi mật khẩu thành công; mọi refresh token bị thu hồi và cần đăng nhập lại',
  })
  @ApiResponse({
    status: 401,
    description: 'CURRENT_PASSWORD_INVALID — mật khẩu hiện tại không đúng',
  })
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto);
    return { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Thông tin người dùng hiện tại',
    description: 'API.md mục 2 - #10',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin tài khoản đang đăng nhập',
    schema: {
      example: {
        data: {
          user: {
            id: '8f14e45f-...',
            email: 'taixe01@gmail.com',
            role: 'DRIVER',
            status: 'ACTIVE',
          },
          driver: {
            id: '3c6e0b8a-...',
            fullName: 'Nguyễn Văn An',
            approvalStatus: 'APPROVED',
            rejectReason: null,
            isOnline: false,
            avatarUrl: null,
          },
        },
        timestamp: '2026-09-18T10:30:00.000Z',
      },
    },
  })
  async me(@CurrentUser('userId') userId: string) {
    return this.authService.getMe(userId);
  }
}
