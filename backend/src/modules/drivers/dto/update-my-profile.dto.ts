import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const PHONE_REGEX = /^0\d{9}$/;

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'Số điện thoại không hợp lệ' })
  phoneNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  citizenIdNumber?: string;

  @IsOptional()
  @IsDateString()
  citizenIdIssueDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  driverLicenseNumber?: string;

  @IsOptional()
  @IsDateString()
  driverLicenseIssueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  temporaryAddress?: string;
}
