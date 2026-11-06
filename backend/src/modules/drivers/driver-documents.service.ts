import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverProfile } from './entities/driver-profile.entity';
import { DriverDocument } from './entities/driver-document.entity';
import { CloudinaryService } from '../uploads/cloudinary.service';

// API.md mục 3 (#9) — POST /drivers/me/avatar.
// Mỗi thao tác chỉ ghi một dòng duy nhất (không cần QueryRunner transaction),
// nhưng vẫn theo đúng thứ tự A3: upload Cloudinary TRƯỚC, ghi CSDL SAU; nếu
// ghi CSDL lỗi thì xóa ảnh vừa upload để không rác.
@Injectable()
export class DriverDocumentsService {
  constructor(
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    @InjectRepository(DriverDocument)
    private readonly driverDocumentRepo: Repository<DriverDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async listDocuments(userId: string) {
    const driver = await this.resolveDriverProfile(userId);
    return this.driverDocumentRepo.find({
      where: { driverId: driver.id },
      order: { docType: 'ASC' },
      select: [
        'id',
        'docType',
        'fileUrl',
        'verificationStatus',
        'rejectReason',
        'uploadedAt',
        'verifiedAt',
      ],
    });
  }

  async updateAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ avatarUrl: string }> {
    const driver = await this.resolveDriverProfile(userId);
    const avatarUrl = await this.cloudinaryService.uploadImage(
      file,
      'driverhub/avatars',
    );

    try {
      await this.driverProfileRepo.update(driver.id, { avatarUrl });
    } catch (error) {
      await this.cloudinaryService.deleteByUrl(avatarUrl);
      throw error;
    }

    return { avatarUrl };
  }

  private async resolveDriverProfile(userId: string): Promise<DriverProfile> {
    const driver = await this.driverProfileRepo.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy hồ sơ tài xế');
    }
    return driver;
  }
}
