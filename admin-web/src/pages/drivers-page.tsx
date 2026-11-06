import {
  CheckOutlined,
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Avatar,
  Button,
  Descriptions,
  Drawer,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminApi, formatDateTime, formatVnd } from "../api/admin-api";
import type { DriverDetail, DriverRow } from "../api/admin-api";
import { getApiErrorMessage } from "../api/api-client";
import { PageTitle, StatusTag } from "../components/admin-ui";

const { Text } = Typography;

export function DriversPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { driverId } = useParams();
  const [messageApi, contextHolder] = message.useMessage();
  const [status, setStatus] = useState<string>();
  const [online, setOnline] = useState<string>();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<DriverRow | null>(null);
  const [rejectForm] = Form.useForm<{ reason: string }>();
  const selected = driverId ?? null;
  const [actionError, setActionError] = useState<string | null>(null);

  const driversQuery = useQuery({
    queryKey: ["drivers", { status, online, search, page }],
    queryFn: () =>
      adminApi.drivers({
        approvalStatus: status,
        isOnline: online,
        search: search || undefined,
        page,
        limit: 10,
      }),
  });
  const detailQuery = useQuery({
    queryKey: ["driver", selected],
    queryFn: () => adminApi.driver(selected!),
    enabled: Boolean(selected),
  });

  const finishAction = async (
    label: string,
    action: () => Promise<unknown>,
  ) => {
    setActionError(null);
    try {
      await action();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["drivers"] }),
        queryClient.invalidateQueries({ queryKey: ["driver", selected] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
      messageApi.success(label);
      return true;
    } catch (error) {
      setActionError(getApiErrorMessage(error));
      return false;
    }
  };

  const columns: TableColumnsType<DriverRow> = [
    {
      title: "Tài xế",
      dataIndex: "fullName",
      render: (name: string, driver) => (
        <Space>
          <Avatar>{name?.charAt(0)?.toUpperCase()}</Avatar>
          <div>
            <strong>{name}</strong>
            <br />
            <Text type="secondary">{driver.phoneNumber}</Text>
          </div>
        </Space>
      ),
    },
    { title: "Email", dataIndex: "email", responsive: ["lg"] },
    {
      title: "Trạng thái hồ sơ",
      dataIndex: "approvalStatus",
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: "Hoạt động",
      dataIndex: "isOnline",
      render: (value: boolean) => (
        <StatusTag status={value ? "ONLINE" : "OFFLINE"} />
      ),
    },
    {
      title: "Phương tiện",
      dataIndex: "vehicle",
      render: (vehicle: DriverRow["vehicle"]) =>
        vehicle ? `${vehicle.vehicleType} · ${vehicle.licensePlate}` : "—",
      responsive: ["md"],
    },
    { title: "Số chuyến", dataIndex: "totalRides", align: "right" },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, driver) => (
        <Space>
          <Button
            aria-label="Xem hồ sơ"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/drivers/${driver.id}`)}
          />
          {driver.approvalStatus === "PENDING" && (
            <>
              <Popconfirm
                title="Duyệt hồ sơ tài xế này?"
                onConfirm={() =>
                  finishAction("Đã duyệt hồ sơ.", () =>
                    adminApi.approveDriver(driver.id),
                  )
                }
                okText="Duyệt"
                cancelText="Hủy"
              >
                <Button
                  aria-label="Duyệt hồ sơ"
                  type="primary"
                  icon={<CheckOutlined />}
                />
              </Popconfirm>
              <Button
                danger
                onClick={() => {
                  setRejecting(driver);
                  rejectForm.resetFields();
                }}
              >
                Từ chối
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <PageTitle
        title="Quản lý tài xế"
        description="Tìm kiếm, xem hồ sơ và duyệt tài xế."
      />
      {actionError && (
        <Alert
          className="page-alert"
          type="error"
          showIcon
          message={actionError}
          closable
          onClose={() => setActionError(null)}
        />
      )}
      <div className="table-filters">
        <Input.Search
          allowClear
          placeholder="Tìm tên, số điện thoại, email"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="filter-search"
        />
        <Select
          allowClear
          placeholder="Trạng thái hồ sơ"
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={[
            { value: "PENDING", label: "Chờ duyệt" },
            { value: "APPROVED", label: "Đã duyệt" },
            { value: "REJECTED", label: "Từ chối" },
          ]}
        />
        <Select
          allowClear
          placeholder="Trạng thái online"
          value={online}
          onChange={(value) => {
            setOnline(value);
            setPage(1);
          }}
          options={[
            { value: "true", label: "Online" },
            { value: "false", label: "Offline" },
          ]}
        />
      </div>
      {driversQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={getApiErrorMessage(driversQuery.error)}
        />
      )}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={driversQuery.data?.data ?? []}
        loading={driversQuery.isLoading}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize: 10,
          total: driversQuery.data?.meta.total ?? 0,
          showTotal: (total) => `${total} tài xế`,
          onChange: setPage,
        }}
      />
      <Drawer
        title="Hồ sơ tài xế"
        width={Math.min(720, window.innerWidth - 24)}
        open={Boolean(selected)}
        onClose={() => navigate("/drivers")}
        extra={
          detailQuery.data?.approvalStatus === "APPROVED" && (
            <Button
              danger={detailQuery.data.userStatus !== "ACTIVE"}
              icon={
                detailQuery.data.userStatus === "LOCKED" ? (
                  <UnlockOutlined />
                ) : (
                  <LockOutlined />
                )
              }
              onClick={() => {
                const driver = detailQuery.data!;
                void finishAction(
                  driver.userStatus === "LOCKED"
                    ? "Đã mở khóa tài khoản."
                    : "Đã khóa tài khoản.",
                  () =>
                    adminApi.setDriverLocked(
                      driver.id,
                      driver.userStatus !== "LOCKED",
                    ),
                );
              }}
            >
              {detailQuery.data.userStatus === "LOCKED"
                ? "Mở khóa"
                : "Khóa tài khoản"}
            </Button>
          )
        }
      >
        {detailQuery.isLoading && (
          <Typography.Text>Đang tải hồ sơ...</Typography.Text>
        )}
        {detailQuery.isError && (
          <Alert type="error" message={getApiErrorMessage(detailQuery.error)} />
        )}
        {detailQuery.data && <DriverProfile driver={detailQuery.data} />}
      </Drawer>
      <Modal
        title={`Từ chối hồ sơ${rejecting ? ` — ${rejecting.fullName}` : ""}`}
        open={Boolean(rejecting)}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        onCancel={() => setRejecting(null)}
        onOk={async () => {
          const driver = rejecting;
          if (!driver) return;
          try {
            const values = await rejectForm.validateFields();
            const done = await finishAction("Đã từ chối hồ sơ.", () =>
              adminApi.rejectDriver(driver.id, values.reason),
            );
            if (done) setRejecting(null);
          } catch (error) {
            if (error instanceof Error && !("errorFields" in error)) {
              messageApi.error(getApiErrorMessage(error));
            }
          }
        }}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do (tối thiểu 10 ký tự)"
            rules={[
              { required: true, message: "Hãy nhập lý do từ chối." },
              { min: 10, message: "Lý do cần tối thiểu 10 ký tự." },
            ]}
          >
            <Input.TextArea rows={4} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function DriverProfile({ driver }: { driver: DriverDetail }) {
  return (
    <Space direction="vertical" size="large" className="drawer-content">
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="Họ tên">{driver.fullName}</Descriptions.Item>
        <Descriptions.Item label="Điện thoại">
          {driver.phoneNumber}
        </Descriptions.Item>
        <Descriptions.Item label="Email">{driver.email}</Descriptions.Item>
        <Descriptions.Item label="Ngày sinh">
          {driver.dateOfBirth ?? "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Số CCCD">
          {driver.citizenIdNumber ?? "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Ngày cấp CCCD">
          {driver.citizenIdIssueDate ?? "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Mã số GPLX">
          {driver.driverLicenseNumber ?? "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Ngày cấp GPLX">
          {driver.driverLicenseIssueDate ?? "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Địa chỉ">
          {driver.temporaryAddress ?? "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Hồ sơ">
          <StatusTag status={driver.approvalStatus} />
        </Descriptions.Item>
        <Descriptions.Item label="Tài khoản">
          <StatusTag status={driver.userStatus} />
        </Descriptions.Item>
        <Descriptions.Item label="Duyệt lúc">
          {formatDateTime(driver.approvedAt)}
        </Descriptions.Item>
        <Descriptions.Item label="Số chuyến">
          {driver.totalRides} · hủy {driver.cancelCount}
        </Descriptions.Item>
        <Descriptions.Item label="Số dư ví">
          {formatVnd(driver.walletBalance)}
        </Descriptions.Item>
        {driver.rejectReason && (
          <Descriptions.Item label="Lý do từ chối">
            {driver.rejectReason}
          </Descriptions.Item>
        )}
      </Descriptions>
      <section>
        <Typography.Title level={5}>Phương tiện</Typography.Title>
        {driver.vehicles.length ? (
          driver.vehicles.map((vehicle) => (
            <div className="detail-list-item" key={vehicle.id}>
              <strong>
                {vehicle.brand} {vehicle.modelName}
              </strong>{" "}
              · {vehicle.licensePlate} · {vehicle.vehicleType}
              <StatusTag status={vehicle.verificationStatus} />
            </div>
          ))
        ) : (
          <Text type="secondary">Chưa khai báo phương tiện.</Text>
        )}
      </section>
      <section>
        <Typography.Title level={5}>Ảnh giấy tờ hồ sơ cũ</Typography.Title>
        {driver.documents.length ? (
          driver.documents.map((document) => (
            <div className="document-card" key={document.id}>
              <div className="document-card-heading">
                <strong>{document.docType}</strong>
                <StatusTag status={document.verificationStatus} />
              </div>
              <Image
                src={document.fileUrl}
                alt={document.docType}
                className="driver-document-image"
              />
              {document.rejectReason && (
                <Text type="danger">{document.rejectReason}</Text>
              )}
              <Text type="secondary">
                Tải lên: {formatDateTime(document.uploadedAt)}
              </Text>
            </div>
          ))
        ) : (
          <Text type="secondary">
            Đăng ký mới xác minh bằng thông tin CCCD/GPLX, không tải ảnh.
          </Text>
        )}
      </section>
    </Space>
  );
}
