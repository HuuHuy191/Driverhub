import {
  AccountBookOutlined,
  CalendarOutlined,
  DollarOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Row, Skeleton, Statistic } from 'antd';
import { adminApi, formatVnd } from '../api/admin-api';
import { getApiErrorMessage } from '../api/api-client';
import { PageTitle } from '../components/admin-ui';

export function WalletPage() {
  const walletQuery = useQuery({
    queryKey: ['platform-wallet'],
    queryFn: adminApi.platformWallet,
    refetchInterval: 60_000,
  });
  if (walletQuery.isLoading) return <Skeleton active paragraph={{ rows: 5 }} />;
  if (walletQuery.isError) {
    return <Alert type="error" showIcon message={getApiErrorMessage(walletQuery.error)} />;
  }
  const wallet = walletQuery.data!;
  return (
    <>
      <PageTitle title="Ví nền tảng" description="Số dư và doanh thu được tổng hợp từ giao dịch ví." />
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card><Statistic title="Số dư ví nền tảng" value={wallet.balance} formatter={(value) => formatVnd(Number(value))} prefix={<AccountBookOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card><Statistic title="Doanh thu hôm nay" value={wallet.revenue.today} formatter={(value) => formatVnd(Number(value))} prefix={<DollarOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} xl={8}>
          <Card><Statistic title="Doanh thu tuần này" value={wallet.revenue.thisWeek} formatter={(value) => formatVnd(Number(value))} prefix={<CalendarOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} xl={8}>
          <Card><Statistic title="Doanh thu tháng này" value={wallet.revenue.thisMonth} formatter={(value) => formatVnd(Number(value))} prefix={<RiseOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} xl={8}>
          <Card><Statistic title="Doanh thu toàn thời gian" value={wallet.revenue.allTime} formatter={(value) => formatVnd(Number(value))} prefix={<DollarOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card><Statistic title="Chuyến hoàn thành hôm nay" value={wallet.ridesCompleted.today} /></Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card><Statistic title="Chuyến hoàn thành tháng này" value={wallet.ridesCompleted.thisMonth} /></Card>
        </Col>
      </Row>
      <Alert className="wallet-note" type="info" showIcon message="Báo cáo doanh thu dùng phí nền tảng đã snapshot trên chuyến hoàn thành (BR-60)." />
    </>
  );
}
