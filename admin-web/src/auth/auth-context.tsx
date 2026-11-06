import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';
import { apiClient, clearSession, getApiErrorMessage, restoreSession, setAccessToken, storeTokenPair } from '../api/api-client';

interface AdminUser {
  id: string;
  email: string;
  role: 'ADMIN';
  status: string;
}

interface AuthContextValue {
  user: AdminUser | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  const endSession = useCallback(() => {
    clearSession();
    setUser(null);
    setIsReady(true);
  }, []);

  useEffect(() => {
    const restore = async () => {
      try {
        const token = await restoreSession();
        if (!token) {
          endSession();
          return;
        }
        setAccessToken(token);
        const { data } = await apiClient.get<{ data: { user: AdminUser } }>('/auth/me');
        if (data.data.user.role !== 'ADMIN') {
          endSession();
          return;
        }
        setUser(data.data.user);
        setIsReady(true);
      } catch {
        endSession();
      }
    };

    const onExpired = () => endSession();
    window.addEventListener('driverhub:session-expired', onExpired);
    void restore();
    return () => window.removeEventListener('driverhub:session-expired', onExpired);
  }, [endSession]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<{
      data: {
        accessToken: string;
        refreshToken: string;
        user: AdminUser;
      };
    }>('/auth/login', { email, password });

    if (data.data.user.role !== 'ADMIN') {
      throw new Error('Tài khoản này không có quyền truy cập trang quản trị.');
    }
    storeTokenPair(data.data.accessToken, data.data.refreshToken);
    setUser(data.data.user);
    setIsReady(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = window.sessionStorage.getItem('driverhub_admin_refresh_token');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    } finally {
      endSession();
    }
  }, [endSession]);

  const value = useMemo(
    () => ({ user, isReady, login, logout }),
    [user, isReady, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được dùng trong AuthProvider.');
  return context;
}
