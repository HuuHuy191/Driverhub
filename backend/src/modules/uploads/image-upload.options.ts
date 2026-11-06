import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

// Dùng chung cho mọi endpoint upload ảnh (avatar, giấy tờ, biên lai nạp
// tiền): giữ file trong bộ nhớ (không ghi ra đĩa) để CloudinaryService stream
// thẳng lên Cloudinary, giới hạn 5MB, chỉ nhận jpg/jpeg/png.
export const IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new BadRequestException('Chỉ nhận ảnh định dạng jpg, jpeg hoặc png'),
        false,
      );
      return;
    }
    callback(null, true);
  },
};
