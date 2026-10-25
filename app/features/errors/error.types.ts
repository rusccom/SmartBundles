export interface ErrorContext {
  bundleId?: string;
  productId?: string;
  selectorKeys?: number[];
  variantIds?: string[];
  operation?: string;
  route?: string;
  webhookId?: string;
  topic?: string;
  errorName?: string;
}

export interface ErrorReport {
  code: string;
  source: "bundle" | "webhook" | "billing" | "maintenance" | "server" | "admin" | "settings";
  severity?: "warning" | "error";
  shopId?: string;
  shopDomain?: string;
  context?: ErrorContext;
}

export interface ErrorEvent {
  id: string;
  code: string;
  source: string;
  severity: string;
  message: string;
  shopId: string | null;
  context: ErrorContext;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export type ErrorSink = (event: ErrorEvent) => void | Promise<void>;
