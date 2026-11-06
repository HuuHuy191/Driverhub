import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi, formatDateTime, formatVnd } from '../api/admin-api';
import type { RideRow } from '../api/admin-api';
import { getApiErrorMessage, restoreSession } from '../api/api-client';
import { PageTitle, RealtimeNotice, StatusTag } from '../components/admin-ui';

const rideStatuses = [
  'SEARCHING',
  'ACCEPTED',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_DRIVER_FOUND',
];
const today = new Date().toISOString().slice(0, 10);

export function RidesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>();
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<[string, string] | null>(null);
  const [page, setPage] = useState(1);
  const [connected, setConnected] = useState(false);
  const ridesQuery = useQuery({
    queryKey: ['rides', { status, search, range, page }],
    queryFn: () => adminApi.rides({
      status,
      search: search || undefined,
      from: range?.[0] || undefined,
      to: range?.[1] || undefined,
      page,
      limit: 10,
    }),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    let active = true;
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, {
      auth: (callback) => {
        void (async () => {
          const token = await restoreSession();
          if (!token) window.dispatchEvent(new Event('driverhub:session-expired'));
          callback({ token });
        })();
      },
    });
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['rides'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    };
    socket.on('connect', () => { if (active) setConnected(true); });
    socket.on('disconnect', () => { if (active) setConnected(false); });
    socket.on('connect_error', () => { if (active) setConnected(false); });
    socket.on('ride:created', refresh);
    socket.on('ride:status_changed', refresh);
    socket.on('ride:no_driver_found', refresh);
    socket.on('dispatch:round_started', refresh);
    return () => {
      active = false;
      socket.disconnect();
    };
  }, [queryClient]);

  const columns: TableColumnsType<RideRow> = [
    { title: 'Mã chuyến', dataIndex: 'rideCode', render: (code: string) => <strong>{code}</strong> },
    {
      title: 'Khách hàng',
      dataIndex: 'customer',
      render: (customer: RideRow['customer']) => customer ? <>{customer.fullName}<br /><Typography.Text type="secondary">{customer.phoneNumber}</Typography.Text></> : '—',
    },
    {
      title: 'Lộ trình',
      key: 'route',
      render: (_, ride) => <div className="ride-route">{ride.pickupAddress}<span>↓</span>{ride.dropoffAddress}</div>,
    },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => <StatusTag status={value} /> },
    { title: 'Cước', dataIndex: 'estimatedFare', render: formatVnd, align: 'right' },
    { title: 'Tạo lúc', dataIndex: 'createdAt', render: formatDateTime, responsive: ['lg'] },
    {
      title: 'Chi tiết',
      key: 'detail',
      render: (_, ride) => <Button aria-label="Xem chuyến" icon={<EyeOutlined />} onClick={() => navigate(`/rides/${ride.id}`)} />,
    },
  ];

  return (
    <>
      <PageTitle
        title="Quản lý chuyến"
        description="Theo dõi vòng đời chuyến, trạng thái điều phối và lịch sử."
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/rides/new')}>Tạo chuyến</Button>}
      />
      <RealtimeNotice connected={connected} />
      <div className="table-filters">
        <Input.Search className="filter-search" allowClear placeholder="Tìm mã chuyến, tên hoặc điện thoại" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        <Select allowClear placeholder="Trạng thái chuyến" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={rideStatuses.map((value) => ({ value, label: value }))} />
        <Input aria-label="Từ ngày" type="date" max={today} value={range?.[0] ?? ''} onChange={(event) => {
          setRange([event.target.value, range?.[1] ?? event.target.value]);
          setPage(1);
        }} />
        <Input aria-label="Đến ngày" type="date" max={today} value={range?.[1] ?? ''} onChange={(event) => {
          setRange([range?.[0] ?? event.target.value, event.target.value]);
          setPage(1);
        }} />
        {range && <Button onClick={() => setRange(null)}>Xóa ngày</Button>}
      </div>
      {ridesQuery.isError && <Alert type="error" showIcon message={getApiErrorMessage(ridesQuery.error)} />}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={ridesQuery.data?.data ?? []}
        loading={ridesQuery.isLoading}
        scroll={{ x: 1000 }}
        pagination={{
          current: page,
          pageSize: 10,
          total: ridesQuery.data?.meta.total ?? 0,
          showTotal: (total) => `${total} chuyến`,
          onChange: setPage,
        }}
      />
    </>
  );
}

export function RideDetailPage() {
  const { rideId = '' } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const rideQuery = useQuery({
    queryKey: ['ride', rideId],
    queryFn: () => adminApi.ride(rideId),
    enabled: Boolean(rideId),
    refetchInterval: 20_000,
  });

  useEffect(() => {
    let active = true;
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? window.location.origin, {
      auth: (callback) => {
        void (async () => {
          const token = await restoreSession();
          if (!token) window.dispatchEvent(new Event('driverhub:session-expired'));
          callback({ token });
        })();
      },
    });
    const refresh = (payload: { rideId?: string }) => {
      if (!payload?.rideId || payload.rideId === rideId) {
        void queryClient.invalidateQueries({ queryKey: ['ride', rideId] });
        void queryClient.invalidateQueries({ queryKey: ['rides'] });
      }
    };
    socket.on('connect', () => { if (active) setConnected(true); });
    socket.on('disconnect', () => { if (active) setConnected(false); });
    socket.on('connect_error', () => { if (active) setConnected(false); });
    socket.on('ride:status_changed', refresh);
    socket.on('ride:no_driver_found', refresh);
    socket.on('dispatch:round_started', refresh);
    return () => {
      active = false;
      socket.disconnect();
    };
  }, [queryClient, rideId]);
  const runAction = async (action: () => Promise<unknown>, success: string) => {
    setActionError(null);
    try {
      await action();
      messageApi.success(success);
      await queryClient.invalidateQueries({ queryKey: ['ride', rideId] });
      await queryClient.invalidateQueries({ queryKey: ['rides'] });
      setCancelOpen(false);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    }
  };

  if (rideQuery.isLoading) return <Typography.Text>Đang tải thông tin chuyến...</Typography.Text>;
  if (rideQuery.isError) return <Alert type="error" showIcon message={getApiErrorMessage(rideQuery.error)} />;
  const ride = rideQuery.data!;
  const canCancel = ['SEARCHING', 'ACCEPTED', 'ARRIVED'].includes(ride.status);

  return (
    <>
      {contextHolder}
      <PageTitle
        title={`Chuyến ${ride.rideCode}`}
        description="Thông tin chuyến, nhật ký trạng thái và lời mời tài xế."
        extra={<Button onClick={() => navigate('/rides')}>Quay lại danh sách</Button>}
      />
      <RealtimeNotice connected={connected} />
      {actionError && <Alert className="page-alert" type="error" message={actionError} closable onClose={() => setActionError(null)} />}
      <RideDetailContent ride={ride} />
      <Space wrap className="ride-actions">
        {ride.status === 'NO_DRIVER_FOUND' && (
          <Button type="primary" onClick={() => void runAction(() => adminApi.redispatchRide(ride.id), 'Đã yêu cầu điều phối lại.')}>Điều phối lại</Button>
        )}
        {canCancel && (
          <Button danger onClick={() => { setCancelReason(''); setCancelOpen(true); }}>Hủy chuyến</Button>
        )}
      </Space>
      <Modal
        title="Hủy chuyến xe"
        open={cancelOpen}
        okText="Xác nhận hủy"
        cancelText="Không hủy"
        okButtonProps={{ danger: true, disabled: cancelReason.trim().length < 5 }}
        onCancel={() => setCancelOpen(false)}
        onOk={() => void runAction(() => adminApi.cancelRide(ride.id, cancelReason.trim()), 'Đã hủy chuyến.')}
      >
        <Typography.Paragraph>Nhập lý do hủy (tối thiểu 5 ký tự). Chuyến đang thực hiện không thể hủy.</Typography.Paragraph>
        <Input.TextArea rows={3} maxLength={500} showCount value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
      </Modal>
    </>
  );
}

function RideDetailContent({ ride }: { ride: Awaited<ReturnType<typeof adminApi.ride>> }) {
  return (
    <div className="ride-detail-grid">
      <section className="ride-detail-section">
        <h3>Thông tin chuyến</h3>
        <p><strong>Trạng thái:</strong> <StatusTag status={ride.status} /></p>
        <p><strong>Khách hàng:</strong> {ride.customer?.fullName ?? '—'} · {ride.customer?.phoneNumber ?? '—'}</p>
        <p><strong>Tài xế:</strong> {ride.driver?.fullName ?? 'Chưa có'} · {ride.driver?.phoneNumber ?? ''}</p>
        <p><strong>Xe:</strong> {ride.vehicle ? `${ride.vehicle.brand} ${ride.vehicle.modelName} · ${ride.vehicle.licensePlate}` : '—'}</p>
        <p><strong>Điểm đón:</strong> {ride.pickupAddress}</p>
        <p><strong>Điểm đến:</strong> {ride.dropoffAddress}</p>
        <p><strong>Khoảng cách:</strong> {ride.distanceKm} km · <strong>Phương thức:</strong> {ride.paymentMethod}</p>
        <p><strong>Giá dự kiến:</strong> {formatVnd(ride.estimatedFare)} · <strong>Giá cuối:</strong> {formatVnd(ride.finalFare)}</p>
        <p><strong>Phí nền tảng:</strong> {formatVnd(ride.platformFee)} · <strong>Tài xế nhận:</strong> {formatVnd(ride.driverEarning)}</p>
        <p><strong>Tạo lúc:</strong> {formatDateTime(ride.createdAt)}</p>
        {ride.cancelReason && <p><strong>Lý do hủy:</strong> {ride.cancelReason}</p>}
      </section>
      <section className="ride-detail-section">
        <h3>Lịch sử trạng thái</h3>
        {ride.history.length ? (
          <div className="timeline-list">
            {ride.history.map((item) => (
              <div className="timeline-item" key={item.id}>
                <StatusTag status={item.toStatus} />
                <div>{item.note || item.changedByType}</div>
                <small>{formatDateTime(item.changedAt)}</small>
              </div>
            ))}
          </div>
        ) : <Typography.Text type="secondary">Chưa có lịch sử.</Typography.Text>}
      </section>
      <section className="ride-detail-section ride-offers-section">
        <h3>Lời mời tài xế · vòng {ride.dispatchRound}</h3>
        {ride.offers.length ? (
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={ride.offers}
            columns={[
              { title: 'Tài xế', dataIndex: 'driver', render: (driver: { fullName: string; phoneNumber: string }) => <>{driver.fullName}<br /><small>{driver.phoneNumber}</small></> },
              { title: 'Vòng', dataIndex: 'round' },
              { title: 'Trạng thái', dataIndex: 'status', render: (status: string) => <StatusTag status={status} /> },
              { title: 'Khoảng cách', dataIndex: 'distanceKm', render: (value: number | null) => value === null ? '—' : `${value} km` },
              { title: 'Đã gửi', dataIndex: 'offeredAt', render: formatDateTime },
            ]}
            scroll={{ x: 600 }}
          />
        ) : <Typography.Text type="secondary">Chưa có lời mời.</Typography.Text>}
      </section>
    </div>
  );
}
