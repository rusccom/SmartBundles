export type GraphqlVariables = Record<string, unknown>;

export interface AdminClient {
  graphql: (
    query: string,
    options?: { variables?: GraphqlVariables; signal?: AbortSignal; tries?: number },
  ) => Promise<Response>;
}

interface GraphqlEnvelope<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
  extensions?: CostExtensions;
}

interface CostExtensions {
  cost?: {
    requestedQueryCost?: number;
    throttleStatus?: { currentlyAvailable?: number; restoreRate?: number };
  };
}

const MAX_REQUEST_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 60_000;

export async function adminRequest<T>(
  admin: AdminClient,
  query: string,
  variables?: GraphqlVariables,
): Promise<T> {
  return requestAttempt<T>(admin, query, variables, 1);
}

async function requestAttempt<T>(
  admin: AdminClient,
  query: string,
  variables: GraphqlVariables | undefined,
  attempt: number,
): Promise<T> {
  const body = await graphqlEnvelope<T>(admin, query, variables);
  if (isThrottled(body) && attempt < MAX_REQUEST_ATTEMPTS) {
    await wait(throttleDelay(body.extensions));
    return requestAttempt(admin, query, variables, attempt + 1);
  }
  if (body.errors?.length) throw new Error(body.errors[0].message);
  if (!body.data) throw new Error("Shopify returned an empty response.");
  return body.data;
}

async function graphqlEnvelope<T>(
  admin: AdminClient,
  query: string,
  variables?: GraphqlVariables,
): Promise<GraphqlEnvelope<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await admin.graphql(query, { variables, signal: controller.signal, tries: 1 });
    return await response.json() as GraphqlEnvelope<T>;
  } finally {
    clearTimeout(timer);
  }
}

function isThrottled(body: GraphqlEnvelope<unknown>): boolean {
  return Boolean(body.errors?.some(({ extensions }) => extensions?.code === "THROTTLED"));
}

function throttleDelay(extensions?: CostExtensions): number {
  const cost = extensions?.cost;
  const available = cost?.throttleStatus?.currentlyAvailable ?? 0;
  const rate = cost?.throttleStatus?.restoreRate ?? 50;
  const missing = Math.max(1, (cost?.requestedQueryCost ?? 50) - available);
  return Math.min(2_000, Math.ceil((missing / rate) * 1_000) + 100);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function assertNoUserErrors(
  errors: Array<{ message: string }> | undefined,
  operation: string,
): void {
  if (!errors?.length) return;
  throw new Error(`${operation}: ${errors.map(({ message }) => message).join("; ")}`);
}
