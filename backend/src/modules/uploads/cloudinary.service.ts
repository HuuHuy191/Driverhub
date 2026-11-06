import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';

// BR-16 / API.md mục 3 — ba thư mục Cloudinary theo loại ảnh.
export type CloudinaryFolder =
  | 'driverhub/documents'
  | 'driverhub/avatars'
  | 'driverhub/receipts';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.cloudName'),
      api_key: this.configService.get<string>('cloudinary.apiKey'),
      api_secret: this.configService.get<string>('cloudinary.apiSecret'),
    });
  }

  // Nhận buffer trong bộ nhớ (multer memoryStorage — không ghi file tạm ra
  // đĩa). Giới hạn 5MB + chỉ nhận jpg/jpeg/png được lọc TRƯỚC ở tầng
  // Multer (multer-image.config.ts), hàm này chỉ lo việc upload.
  async uploadImage(
    file: Express.Multer.File,
    folder: CloudinaryFolder,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error: UploadApiErrorResponse | undefined, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(error ?? new Error('Upload Cloudinary thất bại'));
            return;
          }
          resolve(result.secure_url);
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  // A3 — dọn ảnh đã upload khi transaction phía sau rollback, để không rác
  // Cloudinary. Best-effort: lỗi xóa không được phép che lỗi thật của
  // transaction đã rollback, nên chỉ log chứ không throw.
  async deleteByUrl(secureUrl: string): Promise<void> {
    const publicId = this.extractPublicId(secureUrl);
    if (!publicId) {
      return;
    }
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
      this.logger.warn(
        `Không xóa được ảnh Cloudinary "${publicId}" sau khi rollback.`,
        error,
      );
    }
  }

  // secure_url dạng: https://res.cloudinary.com/<cloud>/image/upload/v169.../
  // driverhub/documents/abc123.jpg -> publicId = "driverhub/documents/abc123"
  private extractPublicId(secureUrl: string): string | null {
    const match = secureUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
    return match ? match[1] : null;
  }
}
