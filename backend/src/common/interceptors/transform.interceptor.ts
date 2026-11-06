import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface PaginatedShape<T> {
  data: T;
  meta: Record<string, unknown>;
}

export interface TransformedResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

function isPaginatedShape(value: unknown): value is PaginatedShape<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value
  );
}

// API.md mục 1.3 — mọi phản hồi thành công bọc thành { data, timestamp },
// hoặc { data, meta, timestamp } khi service trả về dạng phân trang
// { data, meta } có sẵn (meta = { page, limit, total, totalPages }).
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, TransformedResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<TransformedResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        const timestamp = new Date().toISOString();
        if (isPaginatedShape(result)) {
          return { data: result.data, meta: result.meta, timestamp } as TransformedResponse<T>;
        }
        return { data: result, timestamp } as TransformedResponse<T>;
      }),
    );
  }
}
