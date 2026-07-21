export class PartnerApiError extends Error {
  readonly transport: boolean;

  constructor(message: string, transport: boolean, options?: ErrorOptions) {
    super(message, options);
    this.name = "PartnerApiError";
    this.transport = transport;
  }
}
