import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { useState } from 'react';
import { adminApi, formatDateTime } from '../api/admin-api';
import type { CustomerRow } from '../api/admin-api';
import { getApiErrorMessage } from '../api/api-client';
import { PageTitle } from '../components/admin-ui';

type CustomerFormValues = Pick<CustomerRow, 'fullName' | 'phoneNumber' | 'avatarUrl' | 'note'>;

export function CustomersPage() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form] = Form.useForm<CustomerFormValues>();
  const customersQuery = useQuery({
    queryKey: ['customers', { search, page }],
    queryFn: () => adminApi.customers({ search: search || undefined, page, limit: 10 }),
  });

  const save = useMutation({
    mutationFn: (values: CustomerFormValues) => editing
      ? adminApi.updateCustomer(editing.id, values)
      : adminApi.createCustomer(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      setModalOpen(false);
      setEditing(null);
      messageApi.success('Đã lưu thông tin khách hàng.');
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: adminApi.deleteCustomer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      messageApi.success('Đã xóa khách hàng.');
    },
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    setActionError(null);
    form.resetFields();
    setModalOpen(true);
  };
  const openEdit = (customer: CustomerRow) => {
    setEditing(customer);
    setActionError(null);
    form.setFieldsValue({
      fullName: customer.fullName,
      phoneNumber: customer.phoneNumber,
      avatarUrl: customer.avatarUrl ?? '',
      note: customer.note ?? '',
    });
    setModalOpen(true);
  };

  const columns: TableColumnsType<CustomerRow> = [
    { title: 'Họ tên', dataIndex: 'fullName', render: (name: string) => <strong>{name}</strong> },
    { title: 'Số điện thoại', dataIndex: 'phoneNumber' },
    { title: 'Ghi chú', dataIndex: 'note', render: (value: string | null) => value || '—', responsive: ['md'] },
    { title: 'Ngày tạo', dataIndex: 'createdAt', render: formatDateTime, responsive: ['lg'] },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, customer) => (
        <Space>
          <Button onClick={() => openEdit(customer)}>Sửa</Button>
          <Popconfirm
            title="Xóa khách hàng này?"
            description="Chỉ khách chưa gắn chuyến mới có thể xóa."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true, loading: remove.isPending }}
            onConfirm={() => { setActionError(null); remove.mutate(customer.id); }}
          >
            <Button danger>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <PageTitle
        title="Khách hàng mô phỏng"
        description="Quản lý khách dùng để tạo các chuyến xe mô phỏng."
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm khách hàng</Button>}
      />
      {actionError && <Alert className="page-alert" type="error" showIcon message={actionError} closable onClose={() => setActionError(null)} />}
      <div className="table-filters">
        <Input.Search
          className="filter-search"
          allowClear
          placeholder="Tìm theo tên hoặc số điện thoại"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
        />
      </div>
      {customersQuery.isError && <Alert type="error" showIcon message={getApiErrorMessage(customersQuery.error)} />}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={customersQuery.data?.data ?? []}
        loading={customersQuery.isLoading}
        pagination={{
          current: page,
          pageSize: 10,
          total: customersQuery.data?.meta.total ?? 0,
          showTotal: (total) => `${total} khách hàng`,
          onChange: setPage,
        }}
      />
      <Modal
        title={editing ? 'Cập nhật khách hàng' : 'Tạo khách hàng'}
        open={modalOpen}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={save.isPending}
        onCancel={() => { setModalOpen(false); setActionError(null); }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        {actionError && <Alert className="page-alert" type="error" message={actionError} />}
        <Form<CustomerFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => {
            setActionError(null);
            save.mutate({
              ...values,
              avatarUrl: values.avatarUrl?.trim() || null,
              note: values.note?.trim() || null,
            });
          }}
        >
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, whitespace: true, message: 'Hãy nhập họ tên.' }, { max: 150 }]}>
            <Input maxLength={150} />
          </Form.Item>
          <Form.Item name="phoneNumber" label="Số điện thoại" rules={[{ required: true, message: 'Hãy nhập số điện thoại.' }, { pattern: /^\+?[0-9]{9,15}$/, message: 'Số điện thoại chưa đúng định dạng.' }]}>
            <Input maxLength={20} />
          </Form.Item>
          <Form.Item name="avatarUrl" label="URL ảnh đại diện (không bắt buộc)" rules={[{ type: 'url', warningOnly: true, message: 'URL có thể chưa đúng định dạng.' }]}>
            <Input maxLength={500} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú (không bắt buộc)">
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
