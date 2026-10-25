import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { editorProductCatalogResponse } from "../features/bundles/editor/editor-product-catalog.server";

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  return editorProductCatalogResponse(request, admin, session.shop);
}
