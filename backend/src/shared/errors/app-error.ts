export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly traceId?: string;

  constructor(code: string, message: string, statusCode = 500, traceId?: string) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.traceId = traceId;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
