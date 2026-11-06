import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import type { VehicleType } from '../vehicles/entities/vehicle.entity';

// BR-36 — làm tròn LÊN bội số 1.000đ.
const ROUNDING_STEP = 1000;

export interface FareBreakdown {
  baseFare: number;
  baseDistanceKm: number;
  extraDistanceKm: number;
  pricePerKm: number;
  extraFare: number;
}

// API.md mục 7.1 — hình dạng phản hồi POST /admin/rides/estimate.
export interface FareEstimate {
  estimatedFare: number;
  breakdown: FareBreakdown;
}

// BR-36: tính giá dự kiến. Toàn bộ tham số đọc qua SettingsService (BR-01),
// không hardcode.
@Injectable()
export class FareCalculatorService {
  constructor(private readonly settingsService: SettingsService) {}

  estimate(vehicleType: VehicleType, distanceKm: number): FareEstimate {
    const baseDistanceKm = this.settingsService.getNumber(
      'FARE_BASE_DISTANCE_KM',
    );
    const { baseFare, pricePerKm } = this.getFareParams(vehicleType);

    const extraDistanceKm =
      distanceKm > baseDistanceKm ? distanceKm - baseDistanceKm : 0;
    const extraFare = extraDistanceKm * pricePerKm;
    const estimatedFare = this.roundUpToStep(baseFare + extraFare);

    return {
      estimatedFare,
      breakdown: {
        baseFare,
        baseDistanceKm,
        extraDistanceKm,
        pricePerKm,
        extraFare,
      },
    };
  }

  private getFareParams(vehicleType: VehicleType): {
    baseFare: number;
    pricePerKm: number;
  } {
    if (vehicleType === 'MOTORBIKE') {
      return {
        baseFare: this.settingsService.getNumber('FARE_BASE_MOTORBIKE'),
        pricePerKm: this.settingsService.getNumber('FARE_PER_KM_MOTORBIKE'),
      };
    }
    return {
      baseFare: this.settingsService.getNumber('FARE_BASE_CAR'),
      pricePerKm: this.settingsService.getNumber('FARE_PER_KM_CAR'),
    };
  }

  private roundUpToStep(value: number): number {
    return Math.ceil(value / ROUNDING_STEP) * ROUNDING_STEP;
  }
}
