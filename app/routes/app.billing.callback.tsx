import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { refreshBillingState } from "../features/billing/index.server";
import { ensureShopContext } from "../features/installation/shop-context.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const shop = await ensureShopContext(admin, session.shop);
  try {
    await refreshBillingState(shop.id);
    return redirect("/app/plans?verified=1");
  } catch {
    return redirect("/app/plans?verification=failed");
  }
}
