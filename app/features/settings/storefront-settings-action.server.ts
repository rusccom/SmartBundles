import { data, redirect } from "react-router";
import { authenticate } from "../../shopify.server";
import { ensureShopContext } from "../installation/shop-context.server";
import { bundleWritesDisabled } from "../operations/bundle-write-gate.server";
import { StorefrontSettingsConflictError } from "./StorefrontSettingsConflictError.server";
import { saveShopStorefrontTexts } from "./storefront-settings-repository.server";
import { parseStorefrontTextsForm } from "./storefront-text-validation.server";

export interface StorefrontSettingsActionData {
  errors: Record<string, string>;
  message?: string;
}

export async function storefrontSettingsAction(request: Request) {
  const { admin, session } = await authenticate.admin(request);
  const shop = await ensureShopContext(admin, session.shop);
  if (bundleWritesDisabled()) return failure(503, "Bundle changes are temporarily unavailable.", {});
  const form = await request.formData();
  const parsed = parseStorefrontTextsForm(form);
  const expectedTextVersion = integerValue(form, "expectedTextVersion");
  if (expectedTextVersion === undefined) parsed.errors.form = "Reload the settings and try again.";
  if (!parsed.data || Object.keys(parsed.errors).length) return failure(400, undefined, parsed.errors);
  return saveSettings(shop.id, expectedTextVersion!, parsed.data);
}

async function saveSettings(
  shopId: string,
  expectedTextVersion: number,
  texts: NonNullable<ReturnType<typeof parseStorefrontTextsForm>["data"]>,
) {
  try {
    const result = await saveShopStorefrontTexts({ shopId, expectedTextVersion, texts });
    return redirect(`/app/settings?saved=${result.queued}`);
  } catch (error) {
    if (error instanceof StorefrontSettingsConflictError) {
      return failure(409, "Storefront texts changed in another tab. Reload before saving.", {});
    }
    throw error;
  }
}

function integerValue(form: FormData, key: string): number | undefined {
  const value = form.get(key);
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : undefined;
}

function failure(status: number, message: string | undefined, errors: Record<string, string>) {
  return data<StorefrontSettingsActionData>({ errors, message }, { status });
}
