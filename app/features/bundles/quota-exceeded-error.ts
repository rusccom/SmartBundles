export class QuotaExceededError extends Error {
  readonly limit: number;
  readonly used: number;

  constructor(used: number, limit: number) {
    super(`The Free plan allows ${limit} active bundles.`);
    this.name = "QuotaExceededError";
    this.limit = limit;
    this.used = used;
  }
}
