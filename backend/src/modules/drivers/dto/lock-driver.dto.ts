import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

// BR-21: true = khóa tài khoản, false = mở khóa lại.
export class LockDriverDto {
  @ApiProperty({
    description: 'true: khóa tài khoản, false: mở khóa (BR-21)',
    example: true,
  })
  @IsBoolean()
  locked: boolean;
}
