export class BundleComponentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BundleComponentValidationError";
  }
}
