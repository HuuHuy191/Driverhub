import { App as AntApp, ConfigProvider, Spin } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/auth-context';
import { AdminLayout } from './layout/admin-layout';
import { LoginPage } from './pages/login-page';

const CustomersPage = lazy(() => import('./pages/customers-page').then((module) => ({ default: module.CustomersPage })));
const DashboardPage = lazy(() => import('./pages/dashboard-page').then((module) => ({ default: module.DashboardPage })));
const DriversPage = lazy(() => import('./pages/drivers-page').then((module) => ({ default: module.DriversPage })));
const MonitorPage = lazy(() => import('./pages/monitor-page').then((module) => ({ default: module.MonitorPage })));
const RideCreatePage = lazy(() => import('./pages/ride-create-page').then((module) => ({ default: module.RideCreatePage })));
const RideDetailPage = lazy(() => import('./pages/rides-page').then((module) => ({ default: module.RideDetailPage })));
const RidesPage = lazy(() => import('./pages/rides-page').then((module) => ({ default: module.RidesPage })));
const SettingsPage = lazy(() => import('./pages/settings-page').then((module) => ({ default: module.SettingsPage })));
const TopupsPage = lazy(() => import('./pages/topups-page').then((module) => ({ default: module.TopupsPage })));
const WalletPage = lazy(() => import('./pages/wallet-page').then((module) => ({ default: module.WalletPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const { isReady, user } = useAuth();

  if (!isReady) {
    return (
      <div className="app-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="app-loading"><Spin size="large" /></div>}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route element={user ? <AdminLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/drivers/:driverId" element={<DriversPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/rides/new" element={<RideCreatePage />} />
          <Route path="/rides" element={<RidesPage />} />
          <Route path="/rides/:rideId" element={<RideDetailPage />} />
          <Route path="/monitor" element={<MonitorPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/topups" element={<TopupsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
          fontFamily:
            "'Be Vietnam Pro', 'Segoe UI', sans-serif",
        },
      }}
    >
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
