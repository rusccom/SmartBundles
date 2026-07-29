export class BundleContentError extends Error {
  readonly status: 400 | 409 | 422 | 502;
  readonly errors: Record<string, string>;

  constructor(
    message: string,
    status: 400 | 409 | 422 | 502,
    errors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "BundleContentError";
    this.status = status;
    this.errors = errors;
  }
}
