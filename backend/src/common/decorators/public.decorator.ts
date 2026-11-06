import { SetMetadata } from '@nestjs/common';

// ARCHITECTURE.md mục 3.2 — JwtAuthGuard áp dụng toàn cục, trừ endpoint
// đánh dấu @Public().
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
