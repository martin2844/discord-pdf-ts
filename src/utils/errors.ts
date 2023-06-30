import { LoggerType } from "@ctypes/utils";
export class PdfError extends Error {
  bookId: number;

  constructor(message: string, bookId: number) {
    super(message);
    this.bookId = bookId;

    // This line is required to make the instanceof check work
    Object.setPrototypeOf(this, PdfError.prototype);
  }
}
