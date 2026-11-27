import type { AdminClient } from "../shopify/admin-api.server";
import { adminRequest, assertNoUserErrors } from "../shopify/admin-api.server";
import type { StorefrontTexts } from "./storefront-text.types";

const APP_INSTALLATION_QUERY = `#graphql
  query SmartBundleAppInstallation { currentAppInstallation { id } }
`;

const SET_TEXTS = `#graphql
  mutation SmartBundleStorefrontTexts($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) { userErrors { message } }
  }
`;

interface AppInstallationQuery { currentAppInstallation: { id: string } }
interface SetTextsResult { metafieldsSet: { userErrors: Array<{ message: string }> } }

export async function writeStorefrontTexts(admin: AdminClient, texts: StorefrontTexts): Promise<void> {
  const { currentAppInstallation } = await adminRequest<AppInstallationQuery>(admin, APP_INSTALLATION_QUERY);
  const result = await adminRequest<SetTextsResult>(admin, SET_TEXTS, { metafields: [{
    ownerId: currentAppInstallation.id, namespace: "smartbundle", key: "storefront_texts",
    type: "json", value: JSON.stringify(texts),
  }] });
  assertNoUserErrors(result.metafieldsSet.userErrors, "Storefront texts update failed");
}
