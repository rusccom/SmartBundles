export class BundleVersionConflictError extends Error {
  constructor(message = "The bundle draft changed in another session.") {
    super(message);
    this.name = "BundleVersionConflictError";
  }
}
