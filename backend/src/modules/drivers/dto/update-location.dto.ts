import { ApiProperty } from '@nestjs/swagger';
import { IsLatitude, IsLongitude } from 'class-validator';

// TẠM THỜI: PATCH /drivers/me/location — thay thế bằng sự kiện Socket
// driver:location (BR-27) khi Socket.IO được triển khai ở chặng sau.
export class UpdateLocationDto {
  @ApiProperty({ example: 21.0285 })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 105.8542 })
  @IsLongitude()
  longitude: number;
}
