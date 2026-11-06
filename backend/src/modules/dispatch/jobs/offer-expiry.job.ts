import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { RideOffer } from '../../rides/entities/ride-offer.entity';
import { RealtimeService } from '../../realtime/realtime.service';

// BR-43 — lưới an toàn độc lập với vòng lặp trong DispatchService: quét mỗi
// 5 giây các RideOffer đã hết hạn mà vẫn còn SENT/VIEWED (ví dụ khi tiến
// trình điều phối bị gián đoạn) và chuyển sang EXPIRED.
@Injectable()
export class OfferExpiryJob {
  private readonly logger = new Logger(OfferExpiryJob.name);

  constructor(
    @InjectRepository(RideOffer)
    private readonly rideOfferRepo: Repository<RideOffer>,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Cron('*/5 * * * * *')
  async expireStaleOffers(): Promise<void> {
    const staleOffers = await this.rideOfferRepo.find({
      where: { expiredAt: LessThan(new Date()), status: In(['SENT', 'VIEWED']) },
    });
    if (staleOffers.length === 0) {
      return;
    }

    await this.rideOfferRepo.update(
      { id: In(staleOffers.map((offer) => offer.id)) },
      { status: 'EXPIRED' },
    );

    for (const offer of staleOffers) {
      this.realtimeService.emitOfferExpired(offer.driverId, {
        offerId: offer.id,
        rideId: offer.rideId,
      });
    }

    this.logger.debug(`Đã hết hạn ${staleOffers.length} RideOffer (BR-43).`);
  }
}
