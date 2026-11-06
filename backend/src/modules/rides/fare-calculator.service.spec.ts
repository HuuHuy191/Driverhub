import { FareCalculatorService } from './fare-calculator.service';
import { SettingsService } from '../settings/settings.service';

// BUSINESS-RULES.md mục 1 — giá trị mặc định của 5 tham số BR-36 cần.
const DEFAULT_CONFIG: Record<string, number> = {
  FARE_BASE_MOTORBIKE: 12000,
  FARE_PER_KM_MOTORBIKE: 4000,
  FARE_BASE_CAR: 25000,
  FARE_PER_KM_CAR: 9000,
  FARE_BASE_DISTANCE_KM: 2,
};

// SettingsService có field private (cache, configRepo) nên không thể mock
// bằng object literal cấu trúc thẳng — ép kiểu qua unknown như thường lệ khi
// test đơn vị một service phụ thuộc class có thành viên private.
function buildSettingsServiceStub(
  overrides: Partial<Record<string, number>> = {},
): SettingsService {
  const values = { ...DEFAULT_CONFIG, ...overrides };
  const getNumber = jest.fn((key: string) => {
    if (!(key in values)) {
      throw new Error(`SystemConfig["${key}"] không có trong mock test.`);
    }
    return values[key];
  });
  return { getNumber } as unknown as SettingsService;
}

describe('FareCalculatorService — BUSINESS-RULES.md mục 7 (BR-36 đến BR-39)', () => {
  let settingsService: SettingsService;
  let service: FareCalculatorService;

  beforeEach(() => {
    settingsService = buildSettingsServiceStub();
    service = new FareCalculatorService(settingsService);
  });

  it('xe máy 7,5km = 34.000đ (ví dụ trong BR-36)', () => {
    const result = service.estimate('MOTORBIKE', 7.5);
    expect(result.estimatedFare).toBe(34000);
    expect(result.breakdown).toEqual({
      baseFare: 12000,
      baseDistanceKm: 2,
      extraDistanceKm: 5.5,
      pricePerKm: 4000,
      extraFare: 22000,
    });
  });

  it('xe máy 1,5km = 12.000đ (dưới mức km cơ bản -> không phát sinh thêm)', () => {
    const result = service.estimate('MOTORBIKE', 1.5);
    expect(result.estimatedFare).toBe(12000);
    expect(result.breakdown).toEqual({
      baseFare: 12000,
      baseDistanceKm: 2,
      extraDistanceKm: 0,
      pricePerKm: 4000,
      extraFare: 0,
    });
  });

  it('xe máy đúng bằng km cơ bản (2km) vẫn chỉ tính giá mở cửa (biên <=)', () => {
    const result = service.estimate('MOTORBIKE', 2);
    expect(result.estimatedFare).toBe(12000);
    expect(result.breakdown.extraDistanceKm).toBe(0);
    expect(result.breakdown.extraFare).toBe(0);
  });

  it('ô tô 10km = 97.000đ', () => {
    const result = service.estimate('CAR', 10);
    expect(result.estimatedFare).toBe(97000);
    expect(result.breakdown).toEqual({
      baseFare: 25000,
      baseDistanceKm: 2,
      extraDistanceKm: 8,
      pricePerKm: 9000,
      extraFare: 72000,
    });
  });

  it('làm tròn LÊN bội số 1.000đ khi giá thô không tròn nghìn', () => {
    // 4,125km vượt mức cơ bản x 4.000đ/km = 16.500đ -> tổng thô 28.500đ
    // -> phải làm tròn lên 29.000đ, không được làm tròn xuống hay tròn gần nhất.
    const result = service.estimate('MOTORBIKE', 6.125);
    expect(result.breakdown.extraFare).toBe(16500);
    expect(result.estimatedFare).toBe(29000);
  });

  it('không làm tròn thêm khi giá thô đã là bội số 1.000đ', () => {
    const result = service.estimate('CAR', 10);
    expect(result.estimatedFare % 1000).toBe(0);
    expect(result.estimatedFare).toBe(97000);
  });

  it('đọc tham số MOTORBIKE + km cơ bản qua SettingsService, không hardcode (BR-01)', () => {
    const getNumberSpy = settingsService.getNumber as jest.Mock;
    service.estimate('MOTORBIKE', 7.5);
    expect(getNumberSpy).toHaveBeenCalledWith('FARE_BASE_DISTANCE_KM');
    expect(getNumberSpy).toHaveBeenCalledWith('FARE_BASE_MOTORBIKE');
    expect(getNumberSpy).toHaveBeenCalledWith('FARE_PER_KM_MOTORBIKE');
  });

  it('dùng đúng tham số CAR khi vehicleType = CAR, không lẫn với MOTORBIKE', () => {
    const getNumberSpy = settingsService.getNumber as jest.Mock;
    service.estimate('CAR', 10);
    expect(getNumberSpy).toHaveBeenCalledWith('FARE_BASE_CAR');
    expect(getNumberSpy).toHaveBeenCalledWith('FARE_PER_KM_CAR');
    expect(getNumberSpy).not.toHaveBeenCalledWith('FARE_BASE_MOTORBIKE');
    expect(getNumberSpy).not.toHaveBeenCalledWith('FARE_PER_KM_MOTORBIKE');
  });

  it('đọc động từ SettingsService — đổi cấu hình thì kết quả đổi theo (BR-02)', () => {
    settingsService = buildSettingsServiceStub({ FARE_BASE_MOTORBIKE: 15000 });
    service = new FareCalculatorService(settingsService);
    const result = service.estimate('MOTORBIKE', 1);
    expect(result.estimatedFare).toBe(15000);
  });
});
