import { ArrowLeftOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Typography,
  message,
} from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin-api';
import type { CustomerRow } from '../api/admin-api';
import { getApiErrorMessage } from '../api/api-client';
import { LocationPicker } from '../components/location-picker';
import { PageTitle } from '../components/admin-ui';

type RideFormValues = {
  customerId: string;
  vehicleType: 'MOTORBIKE' | 'CAR';
  paymentMethod: 'CASH' | 'WALLET';
  pickupAddress: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  dropoffAddress: string;
  dropoffLatitude: number | null;
  dropoffLongitude: number | null;
  distanceKm: number;
  estimatedDurationMinutes?: number;
  overrideFare: boolean;
  estimatedFare?: number;
};

export function RideCreatePage() {
  const [form] = Form.useForm<RideFormValues>();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [mapPoint, setMapPoint] = useState<'pickup' | 'dropoff'>('pickup');
  const [farePreview, setFarePreview] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const customerQuery = useQuery({
    queryKey: ['customers', 'ride-select'],
    queryFn: () => adminApi.customers({ page: 1, limit: 100 }),
  });
  const estimateMutation = useMutation({
    mutationFn: (values: { vehicleType: 'MOTORBIKE' | 'CAR'; distanceKm: number }) =>
      adminApi.estimateRide(values),
    onSuccess: (estimate) => setFarePreview(estimate.estimatedFare),
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });
  const createMutation = useMutation({
    mutationFn: adminApi.createRide,
    onSuccess: (ride) => {
      messageApi.success(`Đã tạo chuyến ${ride.rideCode}. Điều phối bắt đầu nền sau khi lưu.`);
      navigate(`/rides/${ride.id}`);
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const pickupLatitude = Form.useWatch('pickupLatitude', form);
  const pickupLongitude = Form.useWatch('pickupLongitude', form);
  const dropoffLatitude = Form.useWatch('dropoffLatitude', form);
  const dropoffLongitude = Form.useWatch('dropoffLongitude', form);
  const selectedCustomer = Form.useWatch('customerId', form);
  const overrideFare = Form.useWatch('overrideFare', form);
  const customerOptions = useMemo(
    () => (customerQuery.data?.data ?? []).map((customer: CustomerRow) => ({
      value: customer.id,
      label: `${customer.fullName} · ${customer.phoneNumber}`,
    })),
    [customerQuery.data],
  );

  const setCoordinate = (point: 'pickup' | 'dropoff', latitude: number, longitude: number) => {
    if (point === 'pickup') {
      form.setFieldsValue({ pickupLatitude: latitude, pickupLongitude: longitude });
    } else {
      form.setFieldsValue({ dropoffLatitude: latitude, dropoffLongitude: longitude });
    }
  };

  const submit = (values: RideFormValues) => {
    setActionError(null);
    createMutation.mutate({
      customerId: values.customerId,
      vehicleType: values.vehicleType,
      paymentMethod: values.paymentMethod,
      pickupAddress: values.pickupAddress.trim(),
      pickupLatitude: values.pickupLatitude!,
      pickupLongitude: values.pickupLongitude!,
      dropoffAddress: values.dropoffAddress.trim(),
      dropoffLatitude: values.dropoffLatitude!,
      dropoffLongitude: values.dropoffLongitude!,
      distanceKm: values.distanceKm,
      estimatedDurationMinutes: values.estimatedDurationMinutes ?? null,
      estimatedFare: values.overrideFare ? values.estimatedFare! : null,
    });
  };

  return (
    <>
      {contextHolder}
      <PageTitle
        title="Tạo chuyến xe mô phỏng"
        description="Giá được ước tính theo cấu hình backend; sau khi commit, hệ thống tự bắt đầu điều phối."
        extra={<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/rides')}>Danh sách chuyến</Button>}
      />
      {actionError && <Alert className="page-alert" type="error" showIcon message={actionError} closable onClose={() => setActionError(null)} />}
      {customerQuery.isError && <Alert type="error" showIcon message={`Không tải được khách hàng: ${getApiErrorMessage(customerQuery.error)}`} />}
      <Form<RideFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          vehicleType: 'MOTORBIKE',
          paymentMethod: 'CASH',
          distanceKm: 1,
          overrideFare: false,
          pickupLatitude: null,
          pickupLongitude: null,
          dropoffLatitude: null,
          dropoffLongitude: null,
        }}
        onValuesChange={(changed) => {
          if ('vehicleType' in changed || 'distanceKm' in changed) setFarePreview(null);
        }}
        onFinish={submit}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={14}>
            <Card title="Thông tin chuyến">
              <Form.Item name="customerId" label="Khách hàng" rules={[{ required: true, message: 'Chọn khách hàng.' }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Chọn khách hàng mô phỏng"
                  loading={customerQuery.isLoading}
                  options={customerOptions}
                  notFoundContent={customerQuery.isLoading ? 'Đang tải...' : 'Chưa có khách hàng'}
                />
              </Form.Item>
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item name="vehicleType" label="Loại xe" rules={[{ required: true }]}>
                    <Select options={[
                      { value: 'MOTORBIKE', label: 'Xe máy' },
                      { value: 'CAR', label: 'Ô tô' },
                    ]} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="paymentMethod" label="Thanh toán" rules={[{ required: true }]}>
                    <Select options={[
                      { value: 'CASH', label: 'Tiền mặt' },
                      { value: 'WALLET', label: 'Ví tài xế' },
                    ]} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="pickupAddress" label="Địa chỉ đón" rules={[{ required: true, whitespace: true, message: 'Nhập địa chỉ đón.' }, { max: 500 }]}>
                <Input maxLength={500} prefix={<EnvironmentOutlined />} />
              </Form.Item>
              <Form.Item name="dropoffAddress" label="Địa chỉ đến" rules={[{ required: true, whitespace: true, message: 'Nhập địa chỉ đến.' }, { max: 500 }]}>
                <Input maxLength={500} prefix={<EnvironmentOutlined />} />
              </Form.Item>
              <Row gutter={12}>
                <Col xs={24} sm={8}>
                  <Form.Item name="distanceKm" label="Khoảng cách (km)" rules={[{ required: true, type: 'number', min: 0.1, message: 'Nhập khoảng cách lớn hơn 0.' }]}>
                    <InputNumber min={0.1} max={1000} step={0.1} precision={1} className="full-width" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="estimatedDurationMinutes" label="Thời gian dự kiến (phút)">
                    <InputNumber min={1} max={1440} className="full-width" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8} className="fare-estimate-control">
                  <Button
                    block
                    loading={estimateMutation.isPending}
                    onClick={async () => {
                      try {
                        const values = await form.validateFields(['vehicleType', 'distanceKm']);
                        estimateMutation.mutate({ vehicleType: values.vehicleType, distanceKm: values.distanceKm });
                      } catch {
                        // Field-level validation is displayed by Ant Design.
                      }
                    }}
                  >
                    Ước tính giá
                  </Button>
                </Col>
              </Row>
              {farePreview !== null && (
                <Alert type="success" showIcon message={`Giá hệ thống ước tính: ${farePreview.toLocaleString('vi-VN')} đ`} />
              )}
              <Form.Item name="overrideFare" valuePropName="checked" className="override-checkbox">
                <Checkbox>Nhập giá dự kiến thủ công</Checkbox>
              </Form.Item>
              {overrideFare && (
                <Form.Item
                  name="estimatedFare"
                  label="Giá dự kiến (VNĐ)"
                  rules={[
                    { required: true, message: 'Nhập giá cần ghi đè.' },
                    { type: 'number', min: 10_000, max: 5_000_000, message: 'Giá phải trong khoảng 10.000–5.000.000 đ.' },
                  ]}
                >
                  <InputNumber min={10_000} max={5_000_000} step={1000} className="full-width" />
                </Form.Item>
              )}
              <div className="ride-create-submit">
                <Button type="primary" size="large" htmlType="submit" loading={createMutation.isPending} disabled={!selectedCustomer}>
                  Tạo chuyến và bắt đầu điều phối
                </Button>
              </div>
              <Typography.Text type="secondary">
                Chọn khoảng cách theo lộ trình thực tế. Điều phối chạy nền sau khi chuyến được lưu; kết quả ban đầu không chờ lời mời tài xế.
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={24} xl={10}>
            <Card title="Chọn tọa độ trên bản đồ">
              <Radio.Group value={mapPoint} onChange={(event) => setMapPoint(event.target.value)} className="map-point-switch">
                <Radio.Button value="pickup">Điểm đón</Radio.Button>
                <Radio.Button value="dropoff">Điểm đến</Radio.Button>
              </Radio.Group>
              <LocationPicker
                latitude={mapPoint === 'pickup' ? pickupLatitude ?? null : dropoffLatitude ?? null}
                longitude={mapPoint === 'pickup' ? pickupLongitude ?? null : dropoffLongitude ?? null}
                onSelect={(latitude, longitude) => setCoordinate(mapPoint, latitude, longitude)}
              />
              {(['pickupLatitude', 'pickupLongitude', 'dropoffLatitude', 'dropoffLongitude'] as const).map((field) => (
                <Form.Item key={field} name={field} hidden rules={[{ required: true, message: 'Chọn cả điểm đón và điểm đến trên bản đồ.' }]}>
                  <Input type="hidden" />
                </Form.Item>
              ))}
            </Card>
          </Col>
        </Row>
      </Form>
    </>
  );
}
