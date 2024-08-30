export class MessageLengthExceededError extends Error {
  length?: number;
  maxLength?: number;
  cause?: unknown;

  constructor(
    public message: string,
    options?: { length?: number; maxLength?: number; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });

    this.name = "MessageLengthExceededError";
    this.length = options?.length;
    this.maxLength = options?.maxLength;
  }
}
