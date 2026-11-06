import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

// API.md mục 9 (#59) — PATCH /admin/settings/:key.
export class UpdateSettingDto {
  @ApiProperty({ example: '0.15' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  value: string;
}
