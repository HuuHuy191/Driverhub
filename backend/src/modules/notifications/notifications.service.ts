import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { RealtimeService } from '../realtime/realtime.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { PaginationMeta } from '../drivers/drivers.service';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  dataJson?: string | null;
}

// BR-74 — nguồn phát thông báo dùng chung cho mọi nơi trong hệ thống cần vừa
// LƯU LỊCH SỬ (bảng Notification, cho GET /notifications) vừa BÁO NGAY qua
// Socket.IO. Chỉ gọi SAU KHI mọi transaction liên quan đã commit (quy tắc 5).
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(params: CreateNotificationParams): Promise<Notification> {
    const notification = await this.notificationRepo.save({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      dataJson: params.dataJson ?? null,
    });

    // Chỉ tài xế mới có room riêng (driver:{driverId}) — Admin dùng chung
    // room 'admin' đã được các sự kiện chuyên biệt khác phủ (ride:created,
    // ride:no_driver_found, ...), không cần kênh notification:new riêng.
    const driver = await this.driverProfileRepo.findOne({
      where: { userId: params.userId },
    });
    if (driver) {
      this.realtimeService.emitNotificationToDriver(driver.id, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        dataJson: notification.dataJson,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  }

  // API.md mục 10 (#60) — GET /notifications.
  async list(
    userId: string,
    query: ListNotificationsDto,
  ): Promise<{ data: Notification[]; meta: PaginationMeta }> {
    const { page, limit, isRead } = query;

    const [rows, total] = await this.notificationRepo.findAndCount({
      where: { userId, ...(isRead !== undefined ? { isRead } : {}) },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // API.md mục 10 (#61) — PATCH /notifications/:id/read.
  async markRead(userId: string, id: string): Promise<{ id: string; isRead: true }> {
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('Đây không phải thông báo của bạn');
    }

    await this.notificationRepo.update(id, { isRead: true });
    return { id, isRead: true };
  }

  // API.md mục 10 (#62) — PATCH /notifications/read-all.
  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { updated: result.affected ?? 0 };
  }
}
