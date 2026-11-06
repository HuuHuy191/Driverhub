import {
  ArrowUpOutlined,
  CarOutlined,
  DollarOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Empty, Progress, Row, Skeleton, Statistic } from 'antd';
import { adminApi, formatVnd } from '../api/admin-api';
import { PageTitle } from '../components/admin-ui';

export function DashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: adminApi.dashboardSummary,
    refetchInterval: 30_000,
  });
  const dispatchQuery = useQuery({
    queryKey: ['dashboard-dispatch-stats'],
    queryFn: adminApi.dispatchStats,
    refetchInterval: 60_000,
  });

  if (summaryQuery.isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (summaryQuery.isError) {
    return <Alert type="error" showIcon message="Không tải được dashboard" description={String(summaryQuery.error)} />;
  }

  const summary = summaryQuery.data!;
  const rounds = dispatchQuery.data ?? [];
  return (
    <>
      <PageTitle title="Dashboard" description="Tổng quan hoạt động DriverHub trong ngày UTC." />
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card><Statistic title="Tài xế trực tuyến" value={summary.drivers.onlineNow} suffix={`/ ${summary.drivers.total}`} prefix={<TeamOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card><Statistic title="Chuyến tạo hôm nay" value={summary.rides.today} prefix={<CarOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card><Statistic title="Doanh thu nền tảng hôm nay" value={summary.revenue.todayPlatformFee} formatter={(value) => formatVnd(Number(value))} prefix={<DollarOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card><Statistic title="Yêu cầu nạp chờ duyệt" value={summary.topup.pendingRequests} suffix={formatVnd(summary.topup.pendingAmount)} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Tình trạng chuyến">
            <Row gutter={[12, 12]}>
              <Col span={8}><Statistic title="Đang tìm tài xế" value={summary.rides.searching} /></Col>
              <Col span={8}><Statistic title="Đang thực hiện" value={summary.rides.inProgress} /></Col>
              <Col span={8}><Statistic title="Hoàn thành hôm nay" value={summary.rides.completedToday} /></Col>
              <Col span={8}><Statistic title="Đã hủy hôm nay" value={summary.rides.cancelledToday} /></Col>
              <Col span={8}><Statistic title="Không tìm thấy tài xế" value={summary.rides.noDriverFound} /></Col>
              <Col span={8}><Statistic title="GMV hôm nay" value={summary.revenue.todayGmv} formatter={(value) => formatVnd(Number(value))} /></Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Hiệu quả điều phối theo vòng">
            {dispatchQuery.isError ? (
              <Alert type="error" message="Không tải được thống kê điều phối." />
            ) : rounds.length ? (
              <div className="dispatch-round-list">
                {rounds.map((round) => (
                  <div className="dispatch-round" key={round.round}>
                    <div className="dispatch-round-heading">
                      <strong>Vòng {round.round}</strong>
                      <span>{round.accepted}/{round.totalOffers} lời mời được nhận</span>
                    </div>
                    <Progress percent={round.acceptanceRatePercent} format={(percent) => `${percent}%`} />
                    <span className="secondary-line">
                      Bỏ qua {round.ignored} · Hết hạn {round.expired}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu điều phối" />
            )}
          </Card>
        </Col>
        <Col xs={24}>
          <Card>
            <Row gutter={[16, 8]} align="middle">
              <Col><ArrowUpOutlined className="dashboard-accent-icon" /></Col>
              <Col flex="auto">
                <strong>{summary.drivers.pending}</strong> hồ sơ tài xế đang chờ duyệt
              </Col>
              <Col><strong>{summary.drivers.approved}</strong> đã duyệt</Col>
              <Col><strong>{summary.drivers.rejected}</strong> bị từ chối</Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </>
  );
}
