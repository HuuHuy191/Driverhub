import { CheckOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { useState } from 'react';
import { adminApi, formatDateTime, formatVnd } from '../api/admin-api';
import type { TopupRow } from '../api/admin-api';
import { getApiErrorMessage } from '../api/api-client';
import { PageTitle } from '../components/admin-ui';

export function TopupsPage() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<TopupRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form] = Form.useForm<{ reason: string }>();
  const topupsQuery = useQuery({
    queryKey: ['topups', page],
    queryFn: () => adminApi.topups({ page, limit: 10 }),
    refetchInterval: 30_000,
  });

  const finishAction = async (label: string, action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['topups'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ]);
      messageApi.success(label);
      return true;
    } catch (error) {
      setActionError(getApiErrorMessage(error));
      return false;
    }
  };

  const columns: TableColumnsType<TopupRow> = [
    {
      title: 'Tài xế',
      dataIndex: 'driver',
      render: (driver: TopupRow['driver']) => <>{driver.fullName}<br /><Typography.Text type="secondary">{driver.phoneNumber}</Typography.Text></>,
    },
    { title: 'Số tiền', dataIndex: 'amount', render: formatVnd, align: 'right' },
    { title: 'Biên lai', dataIndex: 'receiptUrl', render: (url: string | null) => url ? <Image width={68} src={url} alt="Biên lai nạp tiền" /> : 'Không đính kèm' },
    { title: 'Yêu cầu lúc', dataIndex: 'createdAt', render: formatDateTime },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, topup) => (
        <Space>
          {topup.receiptUrl && <Button icon={<EyeOutlined />} onClick={() => window.open(topup.receiptUrl!, '_blank', 'noopener,noreferrer')}>Xem ảnh</Button>}
          <Popconfirm
            title="Duyệt yêu cầu nạp tiền này?"
            description={`${formatVnd(topup.amount)} sẽ được cộng vào ví tài xế.`}
            okText="Duyệt"
            cancelText="Hủy"
            onConfirm={() => finishAction('Đã duyệt yêu cầu nạp tiền.', () => adminApi.approveTopup(topup.id))}
          >
            <Button type="primary" icon={<CheckOutlined />}>Duyệt</Button>
          </Popconfirm>
          <Button danger onClick={() => { setRejecting(topup); form.resetFields(); }}>Từ chối</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <PageTitle title="Duyệt nạp tiền" description="Chỉ các yêu cầu đang PENDING mới xuất hiện tại đây." />
      {actionError && <Alert className="page-alert" type="error" showIcon message={actionError} closable onClose={() => setActionError(null)} />}
      {topupsQuery.isError && <Alert type="error" showIcon message={getApiErrorMessage(topupsQuery.error)} />}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={topupsQuery.data?.data ?? []}
        loading={topupsQuery.isLoading}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize: 10,
          total: topupsQuery.data?.meta.total ?? 0,
          showTotal: (total) => `${total} yêu cầu chờ duyệt`,
          onChange: setPage,
        }}
      />
      <Modal
        title={`Từ chối yêu cầu nạp${rejecting ? ` · ${rejecting.driver.fullName}` : ''}`}
        open={Boolean(rejecting)}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        onCancel={() => setRejecting(null)}
        onOk={async () => {
          if (!rejecting) return;
          try {
            const values = await form.validateFields();
            const done = await finishAction(
              'Đã từ chối yêu cầu nạp tiền.',
              () => adminApi.rejectTopup(rejecting.id, values.reason),
            );
            if (done) setRejecting(null);
          } catch (error) {
            if (error instanceof Error && !('errorFields' in error)) {
              messageApi.error(getApiErrorMessage(error));
            }
          }
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="reason" label="Lý do (tối thiểu 5 ký tự)" rules={[
            { required: true, message: 'Hãy nhập lý do từ chối.' },
            { min: 5, message: 'Lý do cần tối thiểu 5 ký tự.' },
          ]}>
            <Input.TextArea rows={4} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
