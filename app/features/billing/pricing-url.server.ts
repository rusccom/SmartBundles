import {
  getShopifyAppHandle,
  isShopifyPricingEnabled,
} from "./billing-config.server";
import { isComplimentaryProShop } from "./complimentary-entitlement.server";

const SHOP_SUFFIX = ".myshopify.com";
const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function getPricingUrl(shopDomain: string): string {
  if (isComplimentaryProShop(shopDomain))
    throw new Error("This shop has complimentary Pro access.");
  if (!isShopifyPricingEnabled())
    throw new Error("Shopify App Pricing is not configured.");
  const storeHandle = storeHandleFromDomain(shopDomain);
  const appHandle = getShopifyAppHandle();
  if (!HANDLE_PATTERN.test(appHandle))
    throw new Error("SHOPIFY_APP_HANDLE is invalid.");
  return `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
}

function storeHandleFromDomain(shopDomain: string): string {
  const host = hostname(shopDomain);
  if (!host.endsWith(SHOP_SUFFIX))
    throw new Error("A myshopify.com domain is required.");
  const handle = host.slice(0, -SHOP_SUFFIX.length);
  if (!HANDLE_PATTERN.test(handle)) throw new Error("Shop domain is invalid.");
  return handle;
}

function hostname(value: string): string {
  const candidate = value.includes("://") ? value : `https://${value}`;
  try {
    return new URL(candidate).hostname.toLowerCase();
  } catch {
    throw new Error("Shop domain is invalid.");
  }
}
