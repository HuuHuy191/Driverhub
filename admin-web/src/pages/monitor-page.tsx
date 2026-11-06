import { EnvironmentOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, List, Space, Spin, Typography } from 'antd';
import { divIcon } from 'leaflet';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { io } from 'socket.io-client';
import { adminApi, formatDateTime } from '../api/admin-api';
import type { OnlineDriver } from '../api/admin-api';
import { getApiErrorMessage, restoreSession } from '../api/api-client';
import { PageTitle, RealtimeNotice } from '../components/admin-ui';

const defaultCenter: [number, number] = [21.0285, 105.8542];
const driverIcon = divIcon({
  className: 'driver-map-marker',
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export function MonitorPage() {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const driversQuery = useQuery({
    queryKey: ['online-drivers'],
    queryFn: adminApi.onlineDrivers,
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
      void queryClient.invalidateQueries({ queryKey: ['online-drivers'] });
    };
    socket.on('connect', () => { if (active) setConnected(true); });
    socket.on('disconnect', () => { if (active) setConnected(false); });
    socket.on('connect_error', () => { if (active) setConnected(false); });
    socket.on('driver:location_updated', refresh);
    socket.on('driver:status_changed', refresh);
    return () => {
      active = false;
      socket.disconnect();
    };
  }, [queryClient]);

  const drivers = driversQuery.data ?? [];
  const positionedDrivers = drivers.filter(
    (driver): driver is OnlineDriver & { latitude: number; longitude: number } =>
      driver.latitude !== null && driver.longitude !== null,
  );
  const center = positionedDrivers.length
    ? ([positionedDrivers[0].latitude, positionedDrivers[0].longitude] as [number, number])
    : defaultCenter;

  return (
    <>
      <PageTitle
        title="Bản đồ tài xế"
        description="Vị trí tài xế online; vị trí được cập nhật theo dữ liệu backend."
        extra={<Button icon={<ReloadOutlined />} onClick={() => void driversQuery.refetch()}>Làm mới</Button>}
      />
      <RealtimeNotice connected={connected} />
      {driversQuery.isError && <Alert type="error" showIcon message={getApiErrorMessage(driversQuery.error)} />}
      <div className="monitor-grid">
        <Card className="monitor-map-card">
          {driversQuery.isLoading ? (
            <div className="map-loading"><Spin /></div>
          ) : (
            <MapContainer center={center} zoom={12} scrollWheelZoom className="monitor-map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {positionedDrivers.map((driver) => (
                <Marker key={driver.id} position={[driver.latitude, driver.longitude]} icon={driverIcon}>
                  <Popup>
                    <strong>{driver.fullName}</strong><br />
                    {driver.phoneNumber}<br />
                    Vị trí cập nhật: {formatDateTime(driver.lastLocationUpdatedAt)}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </Card>
        <Card title={<Space><EnvironmentOutlined /> Tài xế online ({drivers.length})</Space>} className="monitor-list-card">
          <List
            dataSource={drivers}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Hiện không có tài xế online" /> }}
            renderItem={(driver) => (
              <List.Item>
                <List.Item.Meta
                  title={driver.fullName}
                  description={
                    <Space direction="vertical" size={0}>
                      <Typography.Text>{driver.phoneNumber}</Typography.Text>
                      <Typography.Text type="secondary">
                        {driver.latitude === null || driver.longitude === null
                          ? 'Chưa có tọa độ'
                          : `${driver.latitude.toFixed(5)}, ${driver.longitude.toFixed(5)}`}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        Cập nhật: {formatDateTime(driver.lastLocationUpdatedAt)}
                      </Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </div>
    </>
  );
}
