import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export class ChangePasswordDto {
  @ApiProperty({ example: 'MatKhauCu123' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'MatKhauMoi123' })
  @IsString()
  @Matches(PASSWORD_REGEX, {
    message: 'Mật khẩu tối thiểu 8 ký tự, có ít nhất một chữ cái và một chữ số',
  })
  newPassword: string;
}
