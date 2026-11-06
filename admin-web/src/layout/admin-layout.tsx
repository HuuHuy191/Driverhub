import {
  DashboardOutlined,
  EnvironmentOutlined,
  FileAddOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
  CarOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Popconfirm, Space, Typography, message } from 'antd';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/api-client';
import { useAuth } from '../auth/auth-context';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/drivers', icon: <TeamOutlined />, label: 'Tài xế' },
  { key: '/customers', icon: <UserOutlined />, label: 'Khách hàng' },
  { key: '/rides', icon: <CarOutlined />, label: 'Chuyến xe' },
  { key: '/rides/new', icon: <FileAddOutlined />, label: 'Tạo chuyến' },
  { key: '/monitor', icon: <EnvironmentOutlined />, label: 'Bản đồ tài xế' },
  { key: '/wallet', icon: <WalletOutlined />, label: 'Ví nền tảng' },
  { key: '/topups', icon: <DollarOutlined />, label: 'Duyệt nạp tiền' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Cấu hình' },
];

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const selectedKey = menuItems
    .map((item) => item.key)
    .filter((key) => location.pathname === key || location.pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      messageApi.error(getApiErrorMessage(error));
      navigate('/login', { replace: true });
    }
  };

  return (
    <Layout className="admin-layout">
      {contextHolder}
      <Sider
        breakpoint="lg"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={248}
      >
        <div className="brand">
          <div className="brand-mark">D</div>
          {!collapsed && <span>DriverHub Admin</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <Button
            type="text"
            aria-label={collapsed ? 'Mở menu' : 'Thu gọn menu'}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((value) => !value)}
          />
          <Space size="middle">
            <Text>{user?.email}</Text>
            <Popconfirm
              title="Đăng xuất khỏi DriverHub?"
              okText="Đăng xuất"
              cancelText="Ở lại"
              onConfirm={handleLogout}
            >
              <Button icon={<LogoutOutlined />}>Đăng xuất</Button>
            </Popconfirm>
          </Space>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
