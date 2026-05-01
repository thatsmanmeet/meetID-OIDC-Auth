class APIError extends Error {
  public readonly success = false;

  constructor(
    public readonly statusCode: number = 500,
    message: string,
  ) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }

  static NotFound(message = "Resource not found") {
    return new APIError(404, message);
  }

  static UnAuthorized(message = "Unauthorized Access Denied") {
    return new APIError(401, message);
  }

  static Conflict(message = "Conflict") {
    return new APIError(409, message);
  }

  static BadRequest(message = "Bad Request") {
    return new APIError(400, message);
  }

  static Forbidden(message = "Forbidden") {
    return new APIError(403, message);
  }

  static InternalError(message = "Internal Server Error") {
    return new APIError(500, message);
  }

  static CustomError(
    statusCode: number = 500,
    message = "Something went wrong",
  ) {
    return new APIError(statusCode, message);
  }
}

export default APIError;
