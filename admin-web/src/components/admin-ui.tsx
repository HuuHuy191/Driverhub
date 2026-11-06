import { Alert, Space, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';

const { Title, Text } = Typography;

const statusColor: Record<string, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  ACTIVE: 'green',
  INACTIVE: 'default',
  LOCKED: 'red',
  SEARCHING: 'blue',
  ACCEPTED: 'cyan',
  ARRIVED: 'purple',
  IN_PROGRESS: 'processing',
  COMPLETED: 'green',
  CANCELLED: 'default',
  NO_DRIVER_FOUND: 'red',
  ONLINE: 'green',
  OFFLINE: 'default',
  SENT: 'blue',
  VIEWED: 'cyan',
  IGNORED: 'default',
  EXPIRED: 'orange',
};

const statusLabel: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Đã khóa',
  SEARCHING: 'Đang tìm tài xế',
  ACCEPTED: 'Đã nhận chuyến',
  ARRIVED: 'Đã đến điểm đón',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  NO_DRIVER_FOUND: 'Không tìm thấy tài xế',
  ONLINE: 'Trực tuyến',
  OFFLINE: 'Ngoại tuyến',
  SENT: 'Đã gửi',
  VIEWED: 'Đã xem',
  IGNORED: 'Bỏ qua',
  EXPIRED: 'Hết hạn',
};

export function PageTitle({
  title,
  description,
  extra,
}: {
  title: string;
  description?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <Title level={3}>{title}</Title>
        {description && <Text type="secondary">{description}</Text>}
      </div>
      {extra && <Space wrap>{extra}</Space>}
    </div>
  );
}

export function StatusTag({ status }: { status: string }) {
  return (
    <Tag color={statusColor[status] ?? 'default'}>
      {statusLabel[status] ?? status.replaceAll('_', ' ')}
    </Tag>
  );
}

export function RealtimeNotice({ connected }: { connected: boolean }) {
  return (
    <Alert
      className="realtime-notice"
      type={connected ? 'success' : 'warning'}
      showIcon
      message={connected ? 'Đang nhận cập nhật realtime' : 'Đang kết nối realtime'}
    />
  );
}
