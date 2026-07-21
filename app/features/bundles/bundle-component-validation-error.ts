import type { BundleSelectorInput } from "./bundle.types";

export class BundleComponentValidationError extends Error {
  readonly code: "INVALID" | "SOLD_OUT";
  readonly selectors?: BundleSelectorInput[];

  constructor(
    code: "INVALID" | "SOLD_OUT",
    message: string,
    selectors?: BundleSelectorInput[],
  ) {
    super(message);
    this.name = "BundleComponentValidationError";
    this.code = code;
    this.selectors = selectors;
  }
}
