import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';
import { ERROR_CODES } from '../constants/error-codes';

interface ErrorResponseBody {
  statusCode: number;
  errorCode: string;
  message: string;
  timestamp: string;
  path: string;
}

interface ResolvedError {
  statusCode: number;
  errorCode: string;
  message: string;
}

// ARCHITECTURE.md mục 3.3 — MỌI lỗi trong ứng dụng đi qua filter duy nhất
// này và trả về đúng một định dạng, để client chỉ cần đọc errorCode.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const resolved = this.resolve(exception);

    // Chỉ ghi log chi tiết (kể cả stack trace) phía server — KHÔNG bao giờ
    // đưa vào response trả cho client.
    if (resolved.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.originalUrl ?? request.url} -> ${resolved.statusCode} ${resolved.errorCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      statusCode: resolved.statusCode,
      errorCode: resolved.errorCode,
      message: resolved.message,
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
    };

    response.status(resolved.statusCode).json(body);
  }

  private resolve(exception: unknown): ResolvedError {
    // Lỗi nghiệp vụ tự định nghĩa: đã mang sẵn errorCode chính xác.
    if (exception instanceof BusinessException) {
      return {
        statusCode: exception.getStatus(),
        errorCode: exception.errorCode,
        message: exception.message,
      };
    }

    // Lỗi khác của NestJS/framework (ValidationPipe, Guard, 404 mặc định...):
    // không có errorCode nghiệp vụ, suy ra một mã chung từ HTTP status.
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      return {
        statusCode,
        errorCode: this.mapHttpStatusToErrorCode(statusCode),
        message: this.extractMessage(exception.getResponse(), exception.message),
      };
    }

    // Lỗi không xác định (lỗi lập trình, lỗi CSDL, ...): không bao giờ lộ
    // chi tiết ra ngoài, luôn trả về đúng một mã chung.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'INTERNAL_ERROR',
      message: ERROR_CODES.INTERNAL_ERROR.message,
    };
  }

  private extractMessage(response: string | object, fallback: string): string {
    if (typeof response === 'string') {
      return response;
    }
    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message: unknown }).message;
      if (Array.isArray(message)) {
        return message.join('; ');
      }
      if (typeof message === 'string') {
        return message;
      }
    }
    return fallback;
  }

  private mapHttpStatusToErrorCode(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
