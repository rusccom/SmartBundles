import { errorManager } from "../../errors/error-manager.server";
import type { AdminClient } from "../../shopify/admin-api.server";
import { loadEditorProductCatalog } from "./bundle-editor-variant-display.server";

const MAX_BODY_LENGTH = 12_000;

export async function editorProductCatalogResponse(request: Request, admin: AdminClient, shopDomain: string) {
  const ids = await requestedProductIds(request);
  if (!ids) return new Response(null, { status: 400 });
  try {
    const products = await loadEditorProductCatalog(admin, ids);
    return Response.json({ products }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Response) throw error;
    await errorManager.report(error, { code: "COMPONENT_CATALOG_LOAD_FAILED", source: "admin", shopDomain,
      context: { operation: "loadComponentCatalog" } });
    return Response.json({ error: "Unable to load product variants. Please try again." }, { status: 502 });
  }
}

async function requestedProductIds(request: Request): Promise<string[] | null> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_LENGTH) return null;
  const text = await request.text();
  if (text.length > MAX_BODY_LENGTH) return null;
  try {
    const ids: unknown = JSON.parse(text);
    if (!Array.isArray(ids) || ids.length > 150) return null;
    if (!ids.every((id): id is string => typeof id === "string" && /^gid:\/\/shopify\/Product\/\d+$/.test(id))) return null;
    return [...new Set(ids)];
  } catch { return null; }
}
