import type { Response } from "express";
class APIResponse {
  static Ok<T>(res: Response, message: string, data: T | null = null) {
    return res.status(200).json({
      statusCode: 200,
      success: true,
      message,
      data,
    });
  }

  static Created<T>(res: Response, message: string, data: T | null = null) {
    return res.status(201).json({
      statusCode: 201,
      success: true,
      message,
      data,
    });
  }

  static Accepted<T>(res: Response, message: string, data: T | null = null) {
    return res.status(202).json({
      statusCode: 202,
      success: true,
      message,
      data,
    });
  }

  static NoContent(res: Response) {
    return res.status(204).send();
  }

  static Custom<T>(
    res: Response,
    statusCode: number = 200,
    message: string,
    data: T | null = null,
  ) {
    return res.status(statusCode).json({
      statusCode,
      success: true,
      message,
      data,
    });
  }
}

export default APIResponse;
