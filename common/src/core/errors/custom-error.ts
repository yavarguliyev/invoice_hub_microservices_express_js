abstract class CustomError<TDetails = Record<string, unknown>> extends Error {
  abstract statusCode: number;
  abstract reason: string;

  constructor (message: string, public details?: TDetails) {
    super(message);
    Object.setPrototypeOf(this, CustomError.prototype);
  }

  abstract serializeErrors(): { message: string; field?: string; reason: string; details?: TDetails }[];
}

export { CustomError };
