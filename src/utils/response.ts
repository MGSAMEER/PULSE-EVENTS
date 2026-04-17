import { Response } from 'express';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
}

export class ApiResponseUtil {
  static success<T>(
    res: Response,
    message: string = 'Success',
    data: T | null = null,
    statusCode: number = 200
  ): Response<ApiResponse<T>> {
    return res.status(statusCode).json({
      success: true,
      message,
      data: data || {},
    });
  }

  static error(
    res: Response,
    message: string = 'Error',
    statusCode: number = 500,
    data: any = null
  ): Response<ApiResponse> {
    return res.status(statusCode).json({
      success: false,
      message,
      data: data || {},
    });
  }

  static created<T>(
    res: Response,
    message: string = 'Resource created',
    data: T | null = null
  ): Response<ApiResponse<T>> {
    return this.success(res, message, data, 201);
  }

  static noContent(res: Response, message: string = 'No content'): Response<ApiResponse> {
    return this.success(res, message, null, 204);
  }
}