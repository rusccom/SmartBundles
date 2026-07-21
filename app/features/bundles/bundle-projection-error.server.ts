const PROJECTION_INVALID = "BUNDLE_PROJECTION_INVALID";

export function bundleProjectionError(error: unknown): Error {
  if (isBundleProjectionError(error)) return error;
  const message = error instanceof Error ? error.message : "Projection validation failed.";
  return new Error(`${PROJECTION_INVALID}: ${message}`);
}

export function isBundleProjectionError(error: unknown): error is Error {
  return error instanceof Error && error.message.startsWith(PROJECTION_INVALID);
}

export function bundleProjectionErrorCode(): string {
  return PROJECTION_INVALID;
}
