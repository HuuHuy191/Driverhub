import axios, {
  AxiosError,
} from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api/v1';
const refreshStorageKey = 'driverhub_admin_refresh_token';

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

function getRefreshToken(): string | null {
  return window.sessionStorage.getItem(refreshStorageKey);
}

function storeTokenPair(nextAccessToken: string, nextRefreshToken: string) {
  accessToken = nextAccessToken;
  window.sessionStorage.setItem(refreshStorageKey, nextRefreshToken);
}

export function clearSession() {
  accessToken = null;
  window.sessionStorage.removeItem(refreshStorageKey);
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function restoreSession(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  return rotateRefreshToken(refreshToken);
}

async function rotateRefreshToken(
  currentRefreshToken: string,
): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = axios
    .post<{ data: { accessToken: string; refreshToken: string } }>(
      `${apiBaseUrl}/auth/refresh`,
      { refreshToken: currentRefreshToken },
      { timeout: 20_000 },
    )
    .then(({ data }) => {
      storeTokenPair(data.data.accessToken, data.data.refreshToken);
      return data.data.accessToken;
    })
    .catch(() => {
      clearSession();
      return null;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ errorCode?: string; message?: string }>) => {
    const request = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;
    const isAuthRequest =
      request?.url?.includes('/auth/login') ||
      request?.url?.includes('/auth/refresh') ||
      request?.url?.includes('/auth/logout');
    if (error.response?.status !== 401 || !request || request._retried || isAuthRequest) {
      return Promise.reject(error);
    }

    request._retried = true;
    const refreshToken = getRefreshToken();
    const nextAccessToken = refreshToken
      ? await rotateRefreshToken(refreshToken)
      : null;
    if (!nextAccessToken) {
      window.dispatchEvent(new Event('driverhub:session-expired'));
      return Promise.reject(error);
    }
    request.headers.Authorization = `Bearer ${nextAccessToken}`;
    return apiClient(request);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string; errorCode?: string }>(error)) {
    const responseMessage = error.response?.data?.message;
    if (Array.isArray(responseMessage)) return responseMessage.join(', ');
    if (typeof responseMessage === 'string') return responseMessage;
    if (error.response?.data?.errorCode) return error.response.data.errorCode;
    if (!error.response) return 'Không thể kết nối máy chủ. Hãy kiểm tra backend.';
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}

export { storeTokenPair };
