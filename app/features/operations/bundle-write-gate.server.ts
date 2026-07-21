export function bundleWritesDisabled(): boolean {
  return process.env.SMART_BUNDLE_WRITES_DISABLED === "1";
}

export function assertBundleWritesEnabled(): void {
  if (bundleWritesDisabled()) {
    throw new Error("Bundle writes are temporarily disabled for maintenance.");
  }
}
