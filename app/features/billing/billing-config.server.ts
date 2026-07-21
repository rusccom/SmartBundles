export interface PartnerApiConfig {
  endpoint: string;
  accessToken: string;
  appId: string;
}

const PARTNER_API_VERSION = "2026-07";
const DEFAULT_PRO_PLAN_HANDLE = "pro-monthly";

export function getPartnerApiConfig(): PartnerApiConfig {
  const organizationId = requiredEnv("SHOPIFY_PARTNER_ORG_ID");
  return {
    endpoint: partnerEndpoint(organizationId),
    accessToken: requiredEnv("SHOPIFY_PARTNER_ACCESS_TOKEN"),
    appId: requiredEnv("SHOPIFY_PARTNER_APP_ID"),
  };
}

export function getProPlanHandle(): string {
  return process.env.SHOPIFY_PRO_PLAN_HANDLE?.trim() || DEFAULT_PRO_PLAN_HANDLE;
}

export function getShopifyAppHandle(): string {
  return requiredEnv("SHOPIFY_APP_HANDLE");
}

export function isShopifyPricingEnabled(): boolean {
  return process.env.SHOPIFY_PRICING_ENABLED === "1";
}

function partnerEndpoint(organizationId: string): string {
  const encodedId = encodeURIComponent(organizationId);
  return `https://partners.shopify.com/${encodedId}/api/${PARTNER_API_VERSION}/graphql.json`;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}
