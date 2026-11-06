import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';

// ARCHITECTURE.md mục 3.2 — RolesGuard kiểm tra user.role có nằm trong
// danh sách @Roles(...) hay không.
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
