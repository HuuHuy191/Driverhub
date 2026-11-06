import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../modules/users/entities/user.entity';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

// ARCHITECTURE.md mục 3.2 — kiểm tra user.role nằm trong danh sách @Roles(...).
// Endpoint không có @Roles() thì cho qua (không giới hạn theo vai trò).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Bạn không có quyền truy cập tài nguyên này');
    }

    return true;
  }
}
