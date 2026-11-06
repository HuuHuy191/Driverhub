import { apiClient } from "./api-client";

export interface PageResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface DriverRow {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  isOnline: boolean;
  rejectReason?: string | null;
  vehicle: { vehicleType: string; licensePlate: string } | null;
  walletBalance: number;
  totalRides: number;
  cancelCount: number;
  documentsCount: number;
  createdAt: string;
}

export interface DriverDetail {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  isOnline: boolean;
  totalRides: number;
  cancelCount: number;
  walletBalance: number | null;
  createdAt: string;
  dateOfBirth: string | null;
  citizenIdNumber: string | null;
  citizenIdIssueDate: string | null;
  driverLicenseNumber: string | null;
  driverLicenseIssueDate: string | null;
  avatarUrl: string | null;
  temporaryAddress: string | null;
  rejectReason: string | null;
  userStatus: string;
  approvedAt: string | null;
  vehicles: Array<{
    id: string;
    vehicleType: string;
    brand: string;
    modelName: string;
    licensePlate: string;
    color: string | null;
    isActive: boolean;
    verificationStatus: string;
  }>;
  documents: Array<{
    id: string;
    docType: string;
    fileUrl: string;
    verificationStatus: string;
    rejectReason: string | null;
    uploadedAt: string;
    verifiedAt: string | null;
  }>;
}

export interface CustomerRow {
  id: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl: string | null;
  note: string | null;
  createdAt: string;
}

export interface RideRow {
  id: string;
  rideCode: string;
  status: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  distanceKm: number;
  estimatedFare: number;
  finalFare: number | null;
  platformFee: number | null;
  driverEarning: number | null;
  paymentMethod: string;
  createdAt: string;
  acceptedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  dispatchRound: number;
  customer: { id: string; fullName: string; phoneNumber: string } | null;
  driver: { id: string; fullName: string; phoneNumber: string } | null;
  vehicle: { licensePlate: string; brand: string; modelName: string } | null;
}

export interface RideDetail extends RideRow {
  history: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    changedByType: string;
    changedById: string | null;
    note: string | null;
    changedAt: string;
  }>;
  offers: Array<{
    id: string;
    status: string;
    round: number;
    distanceKm: number | null;
    offeredAt: string;
    viewedAt: string | null;
    respondedAt: string | null;
    expiredAt: string;
    driver: { id: string; fullName: string; phoneNumber: string };
  }>;
}

export interface DashboardSummary {
  drivers: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    onlineNow: number;
  };
  rides: {
    today: number;
    searching: number;
    inProgress: number;
    completedToday: number;
    cancelledToday: number;
    noDriverFound: number;
  };
  revenue: { todayGmv: number; todayPlatformFee: number };
  topup: { pendingRequests: number; pendingAmount: number };
}

export interface OnlineDriver {
  id: string;
  fullName: string;
  phoneNumber: string;
  latitude: number | null;
  longitude: number | null;
  lastLocationUpdatedAt: string | null;
}

export interface TopupRow {
  id: string;
  amount: number;
  receiptUrl: string | null;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  driver: { fullName: string; phoneNumber: string };
}

export interface SystemSetting {
  key: string;
  value: string;
  dataType: "NUMBER" | "STRING" | "BOOLEAN";
  description: string | null;
  updatedAt: string;
}

export interface UpdatedSystemSetting {
  key: string;
  value: string;
  previousValue: string;
  note: string;
}

export const adminApi = {
  async dashboardSummary() {
    const response = await apiClient.get<{ data: DashboardSummary }>(
      "/admin/dashboard/summary",
    );
    return response.data.data;
  },
  async dispatchStats() {
    const response = await apiClient.get<{
      data: Array<{
        round: number;
        totalOffers: number;
        accepted: number;
        ignored: number;
        expired: number;
        acceptanceRatePercent: number;
      }>;
    }>("/admin/dashboard/dispatch-stats");
    return response.data.data;
  },
  async drivers(params: Record<string, string | number | boolean | undefined>) {
    const response = await apiClient.get<PageResult<DriverRow>>(
      "/admin/drivers",
      { params },
    );
    return response.data;
  },
  async driver(id: string) {
    const response = await apiClient.get<{ data: DriverDetail }>(
      `/admin/drivers/${id}`,
    );
    return response.data.data;
  },
  async approveDriver(id: string) {
    await apiClient.post(`/admin/drivers/${id}/approve`);
  },
  async rejectDriver(id: string, reason: string) {
    await apiClient.post(`/admin/drivers/${id}/reject`, { reason });
  },
  async setDriverLocked(id: string, locked: boolean) {
    await apiClient.patch(`/admin/drivers/${id}/lock`, { locked });
  },
  async customers(params: Record<string, string | number | undefined>) {
    const response = await apiClient.get<PageResult<CustomerRow>>(
      "/admin/customers",
      { params },
    );
    return response.data;
  },
  async createCustomer(
    data: Pick<CustomerRow, "fullName" | "phoneNumber"> &
      Partial<Pick<CustomerRow, "avatarUrl" | "note">>,
  ) {
    await apiClient.post("/admin/customers", data);
  },
  async updateCustomer(
    id: string,
    data: Partial<
      Pick<CustomerRow, "fullName" | "phoneNumber" | "avatarUrl" | "note">
    >,
  ) {
    await apiClient.patch(`/admin/customers/${id}`, data);
  },
  async deleteCustomer(id: string) {
    await apiClient.delete(`/admin/customers/${id}`);
  },
  async rides(params: Record<string, string | number | undefined>) {
    const response = await apiClient.get<PageResult<RideRow>>("/admin/rides", {
      params,
    });
    return response.data;
  },
  async ride(id: string) {
    const response = await apiClient.get<{ data: RideDetail }>(
      `/admin/rides/${id}`,
    );
    return response.data.data;
  },
  async estimateRide(data: { vehicleType: string; distanceKm: number }) {
    const response = await apiClient.post<{ data: { estimatedFare: number } }>(
      "/admin/rides/estimate",
      data,
    );
    return response.data.data;
  },
  async createRide(data: Record<string, string | number | null>) {
    const response = await apiClient.post<{
      data: { id: string; rideCode: string };
    }>("/admin/rides", data);
    return response.data.data;
  },
  async cancelRide(id: string, reason: string) {
    await apiClient.post(`/admin/rides/${id}/cancel`, { reason });
  },
  async redispatchRide(id: string) {
    await apiClient.post(`/admin/rides/${id}/redispatch`);
  },
  async onlineDrivers() {
    const response = await apiClient.get<{ data: OnlineDriver[] }>(
      "/admin/drivers/online",
    );
    return response.data.data;
  },
  async platformWallet() {
    const response = await apiClient.get<{
      data: {
        balance: number;
        revenue: Record<string, number>;
        ridesCompleted: Record<string, number>;
      };
    }>("/admin/wallet/platform");
    return response.data.data;
  },
  async topups(params: { page: number; limit: number }) {
    const response = await apiClient.get<PageResult<TopupRow>>("/admin/topup", {
      params,
    });
    return response.data;
  },
  async approveTopup(id: string) {
    await apiClient.post(`/admin/topup/${id}/approve`);
  },
  async rejectTopup(id: string, reason: string) {
    await apiClient.post(`/admin/topup/${id}/reject`, { reason });
  },
  async settings() {
    const response = await apiClient.get<{ data: SystemSetting[] }>(
      "/admin/settings",
    );
    return response.data.data;
  },
  async updateSetting(key: string, value: string) {
    const response = await apiClient.patch<{ data: UpdatedSystemSetting }>(
      `/admin/settings/${encodeURIComponent(key)}`,
      { value },
    );
    return response.data.data;
  },
};

export function formatVnd(value: number | null | undefined) {
  return `${(value ?? 0).toLocaleString("vi-VN")} đ`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
