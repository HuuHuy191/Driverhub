import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/api-client';
import { useAuth } from '../auth/auth-context';

const { Title, Text } = Typography;

interface LoginValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const submit = async ({ email, password }: LoginValues) => {
    setSubmitting(true);
    setErrorText(null);
    try {
      await login(email.trim(), password);
      messageApi.success('Đăng nhập thành công.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrorText(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      {contextHolder}
      <Card className="login-card">
        <div className="login-brand-mark">D</div>
        <Title level={2}>DriverHub Admin</Title>
        <Text type="secondary">Đăng nhập bằng tài khoản quản trị viên</Text>
        <Form<LoginValues>
          layout="vertical"
          onFinish={submit}
          requiredMark={false}
          size="large"
          className="login-form"
        >
          {errorText && <Alert type="error" showIcon message={errorText} />}
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email.' },
              { type: 'email', message: 'Email chưa đúng định dạng.' },
            ]}
          >
            <Input autoComplete="username" prefix={<MailOutlined />} placeholder="admin@example.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}
          >
            <Input.Password
              autoComplete="current-password"
              prefix={<LockOutlined />}
              placeholder="Mật khẩu"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </main>
  );
}
