import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// API.md mục 6 (#32) — POST /admin/customers
export class CreateCustomerDto {
  @ApiProperty({ example: 'Trần Thị Bình' })
  @IsString()
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: '0987654321' })
  @IsString()
  @MaxLength(15)
  phoneNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
