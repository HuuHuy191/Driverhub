import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Hình dạng tối thiểu của payload JWT được PassportStrategy gắn vào
// request.user. Sẽ được JwtStrategy (module auth) tuân theo khi triển khai.
export interface AuthenticatedUser {
  userId: string;
  role: string;
  [key: string]: unknown;
}

// Lấy user hiện tại từ request (do JwtAuthGuard/Passport gắn vào).
// Dùng @CurrentUser() để lấy cả object, hoặc @CurrentUser('userId') để lấy
// đúng một trường.
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
