const REMOVE_SELECTOR = "cart-remove-button, a[href*='/cart/change']";
const BUNDLE_LINK_SELECTOR = 'a[href*="/products/smartbundle-"]';
const FALLBACK_ERROR = "Could not remove this bundle. Open /cart/clear to clear the cart.";

if (!window.smartBundleCartRecoveryLoaded) {
  window.smartBundleCartRecoveryLoaded = true;
  document.addEventListener("click", handleBundleRemoval, true);
}

function handleBundleRemoval(event) {
  const target = event.target instanceof Element ? event.target : null;
  const control = target?.closest(REMOVE_SELECTOR);
  const row = control?.closest(".cart-item");
  const line = cartLineIndex(control, row);
  if (!control || !row || !line || !row.querySelector(BUNDLE_LINK_SELECTOR)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (control.dataset.smartBundleBusy === "true") return;
  void removeBundleLine(control, row, line);
}

function cartLineIndex(control, row) {
  if (!control || !row) return null;
  const indexed = control.dataset.index || row.querySelector("[data-index]")?.dataset.index;
  const raw = indexed || row.id.match(/(\d+)$/)?.[1];
  const line = Number(raw);
  return Number.isSafeInteger(line) && line > 0 ? line : null;
}

async function removeBundleLine(control, row, line) {
  setBusy(control, true);
  let cart;
  try {
    cart = await cartRequest("cart.js");
    const item = cart.items?.[line - 1];
    if (!isBundleItem(item)) throw new Error(FALLBACK_ERROR);
    await removeByKey(item.key);
    reloadPage();
  } catch (error) {
    if (await clearSingleItemCart(cart, line)) return reloadPage();
    showError(row, error);
    setBusy(control, false);
  }
}

function isBundleItem(item) {
  return typeof item?.key === "string" && typeof item.properties?._sb === "string";
}

async function removeByKey(key) {
  const updates = { [key]: 0 };
  const cart = await cartRequest("cart/update.js", postJson({ updates }));
  if (cart.items?.some((item) => item.key === key)) throw new Error(FALLBACK_ERROR);
}

async function clearSingleItemCart(cart, line) {
  const onlyItem = Array.isArray(cart?.items) && cart.items.length === 1 ? cart.items[0] : null;
  if (line !== 1 || !isBundleItem(onlyItem)) return false;
  try {
    await cartRequest("cart/clear.js", postJson({}));
    return true;
  } catch {
    return false;
  }
}

async function cartRequest(path, options) {
  const response = await fetch(cartUrl(path), options);
  const body = await responseBody(response);
  if (!response.ok || body.errors) throw new Error(responseMessage(body));
  return body;
}

async function responseBody(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function responseMessage(body) {
  if (typeof body.description === "string") return body.description;
  if (typeof body.message === "string") return body.message;
  if (typeof body.errors === "string") return body.errors;
  return FALLBACK_ERROR;
}

function postJson(body) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  };
}

function cartUrl(path) {
  return `${window.Shopify?.routes?.root || "/"}${path}`;
}

function setBusy(control, busy) {
  const action = control.matches("button, a") ? control : control.querySelector("button, a");
  control.dataset.smartBundleBusy = String(busy);
  if (!action) return;
  action.setAttribute("aria-disabled", String(busy));
  if ("disabled" in action) action.disabled = busy;
}

function showError(row, error) {
  const message = error instanceof Error ? error.message : FALLBACK_ERROR;
  const output = row.querySelector(".cart-item__error-text");
  if (output) output.textContent = message;
}

function reloadPage() {
  window.location.reload();
}
