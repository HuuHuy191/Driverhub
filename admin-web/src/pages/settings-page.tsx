import { SaveOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Input, InputNumber, Select, Table, Typography, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { useState } from 'react';
import { adminApi } from '../api/admin-api';
import type { SystemSetting } from '../api/admin-api';
import { getApiErrorMessage } from '../api/api-client';
import { PageTitle } from '../components/admin-ui';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [values, setValues] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const settingsQuery = useQuery({
    queryKey: ['system-settings'],
    queryFn: adminApi.settings,
  });
  const updateSetting = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => adminApi.updateSetting(key, value),
    onSuccess: async (updated) => {
      setValues((current) => ({ ...current, [updated.key]: updated.value }));
      await queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      messageApi.success(`Đã cập nhật ${updated.key}. Giá trị mới được áp dụng theo SettingsService.`);
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const columns: TableColumnsType<SystemSetting> = [
    {
      title: 'Tham số',
      dataIndex: 'key',
      render: (key: string, setting) => <><strong>{key}</strong><br /><Typography.Text type="secondary">{setting.description || 'Không có mô tả'}</Typography.Text></>,
    },
    { title: 'Kiểu', dataIndex: 'dataType', width: 110 },
    {
      title: 'Giá trị',
      dataIndex: 'value',
      render: (value: string, setting) => {
        const currentValue = values[setting.key] ?? value;
        if (setting.dataType === 'BOOLEAN') {
          return (
            <Select
              value={currentValue}
              onChange={(next) => setValues((current) => ({ ...current, [setting.key]: next }))}
              options={[{ value: 'true', label: 'Bật' }, { value: 'false', label: 'Tắt' }]}
              className="setting-value-control"
            />
          );
        }
        if (setting.dataType === 'NUMBER') {
          return (
            <InputNumber
              value={Number(currentValue)}
              onChange={(next) => setValues((current) => ({ ...current, [setting.key]: next === null ? '' : String(next) }))}
              className="setting-value-control"
            />
          );
        }
        return (
          <Input
            value={currentValue}
            onChange={(event) => setValues((current) => ({ ...current, [setting.key]: event.target.value }))}
            className="setting-value-control"
          />
        );
      },
    },
    {
      title: 'Cập nhật',
      key: 'save',
      width: 130,
      render: (_, setting) => {
        const value = values[setting.key] ?? setting.value;
        const changed = value !== setting.value;
        return (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            disabled={!changed || value === ''}
            loading={updateSetting.isPending && updateSetting.variables?.key === setting.key}
            onClick={() => {
              setActionError(null);
              updateSetting.mutate({ key: setting.key, value });
            }}
          >
            Lưu
          </Button>
        );
      },
    },
  ];

  if (settingsQuery.isLoading) return <Card loading />;
  return (
    <>
      {contextHolder}
      <PageTitle title="Cấu hình hệ thống" description="Cập nhật tham số nghiệp vụ được backend đọc qua SettingsService." />
      <Alert
        className="page-alert"
        type="warning"
        showIcon
        message="Thay đổi tham số ảnh hưởng trực tiếp đến nghiệp vụ. Cấu hình có thể áp dụng ngay sau khi lưu."
      />
      {actionError && <Alert className="page-alert" type="error" showIcon message={actionError} closable onClose={() => setActionError(null)} />}
      {settingsQuery.isError && <Alert type="error" showIcon message={getApiErrorMessage(settingsQuery.error)} />}
      <Table
        rowKey="key"
        columns={columns}
        dataSource={settingsQuery.data ?? []}
        pagination={false}
        scroll={{ x: 800 }}
      />
      <Typography.Text type="secondary">
        Phí nền tảng được snapshot vào chuyến khi quyết toán; thay đổi cấu hình không sửa lại giao dịch lịch sử (BR-60).
      </Typography.Text>
    </>
  );
}
