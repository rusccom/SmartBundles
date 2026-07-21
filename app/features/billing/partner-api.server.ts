import { getPartnerApiConfig } from "./billing-config.server";
import type { PartnerActiveSubscription } from "./billing.types";
import { PartnerApiError } from "./partner-api-error";

const REQUEST_TIMEOUT_MS = 8_000;
const ACTIVE_SUBSCRIPTION_QUERY = `#graphql
  query ActiveSubscription($appId: ID!, $shopId: ID!) {
    activeSubscription(appId: $appId, shopId: $shopId) {
      cancelAtEndOfCycle
      currentBillingCycle { endTime }
      items { handle }
      pendingUpdate { items { handle } }
      legacySubscriptionId
    }
  }
`;

interface PartnerResponse {
  data?: { activeSubscription: PartnerActiveSubscription | null };
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

export async function fetchActiveSubscription(
  shopGid: string,
): Promise<PartnerActiveSubscription | null> {
  const response = await requestSubscription(shopGid);
  const payload = await responsePayload(response);
  assertSuccessfulResponse(response, payload);
  if (!payload.data || !("activeSubscription" in payload.data)) {
    throw new PartnerApiError(
      "Partner API returned no subscription data.",
      true,
    );
  }
  return payload.data.activeSubscription;
}

async function requestSubscription(shopGid: string): Promise<Response> {
  const config = getPartnerApiConfig();
  try {
    return await fetch(config.endpoint, requestInit(config, shopGid));
  } catch (error) {
    throw new PartnerApiError("Partner API is temporarily unavailable.", true, {
      cause: error,
    });
  }
}

function requestInit(
  config: ReturnType<typeof getPartnerApiConfig>,
  shopGid: string,
): RequestInit {
  const body = {
    query: ACTIVE_SUBSCRIPTION_QUERY,
    variables: { appId: config.appId, shopId: shopGid },
  };
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.accessToken,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };
}

async function responsePayload(response: Response): Promise<PartnerResponse> {
  try {
    return (await response.json()) as PartnerResponse;
  } catch (error) {
    const transport =
      response.ok || response.status === 429 || response.status >= 500;
    throw new PartnerApiError(
      "Partner API returned an invalid response.",
      transport,
      { cause: error },
    );
  }
}

function assertSuccessfulResponse(
  response: Response,
  payload: PartnerResponse,
): void {
  if (!response.ok) throw httpError(response.status);
  if (payload.errors?.length) throw graphQlError(payload.errors);
}

function httpError(status: number): PartnerApiError {
  const transport = status === 429 || status >= 500;
  return new PartnerApiError(
    `Partner API request failed with status ${status}.`,
    transport,
  );
}

function graphQlError(
  errors: NonNullable<PartnerResponse["errors"]>,
): PartnerApiError {
  const transport = errors.some(isTransientGraphQlError);
  return new PartnerApiError(
    errors[0]?.message || "Partner API request failed.",
    transport,
  );
}

function isTransientGraphQlError(
  error: NonNullable<PartnerResponse["errors"]>[number],
): boolean {
  const code = String(error.extensions?.code ?? "").toUpperCase();
  const message = error.message.toLowerCase();
  return (
    code === "429" ||
    code === "500" ||
    code === "THROTTLED" ||
    code === "INTERNAL_SERVER_ERROR" ||
    message.includes("too many requests") ||
    message.includes("temporarily unavailable")
  );
}
