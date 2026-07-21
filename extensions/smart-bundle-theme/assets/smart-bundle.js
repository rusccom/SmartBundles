class SmartBundle extends HTMLElement {
  connectedCallback() {
    if (this.initialized) return;
    if (!this.prepareMount() || this.initialized) return;
    this.initialized = true;
    this.selectors = [...this.querySelectorAll("[data-selector]")];
    this.button = this.querySelector("[data-add-button]");
    this.nativeRecords = [];
    this.onChange = this.handleChange.bind(this);
    this.onClick = this.addToCart.bind(this);
    this.blockSubmit = (event) => event.preventDefault();
    this.selectors.forEach((select) => select.addEventListener("change", this.onChange));
    this.button?.addEventListener("click", this.onClick);
    this.activateNativeGuard();
    this.updateState();
  }

  disconnectedCallback() {
    if (this.mounting) return;
    this.selectors?.forEach((select) => select.removeEventListener("change", this.onChange));
    this.button?.removeEventListener("click", this.onClick);
    this.observer?.disconnect();
    this.mountObserver?.disconnect();
    this.restoreNativeControls();
    this.initialized = false;
  }

  prepareMount() {
    if (this.dataset.autoMount !== "true" || this.dataset.mounted === "true") return true;
    const form = this.productForm();
    if (!form) {
      this.waitForProductForm();
      return false;
    }
    this.mounting = true;
    this.dataset.mounted = "true";
    form.before(this);
    this.hidden = false;
    this.mounting = false;
    return true;
  }

  productForm() {
    const forms = [...document.querySelectorAll('form[action*="/cart/add"]')];
    const variantId = this.dataset.parentVariantId;
    return forms.find((form) => form.querySelector('[name="id"]')?.value === variantId)
      || forms.find((form) => form.closest("main, [role='main']"))
      || forms[0];
  }

  waitForProductForm() {
    if (this.mountObserver) return;
    this.mountObserver = new MutationObserver(() => {
      if (!this.productForm()) return;
      this.mountObserver.disconnect();
      this.mountObserver = undefined;
      this.connectedCallback();
    });
    this.mountObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  activateNativeGuard() {
    this.nativeScope = this.closest(".shopify-section") || this.parentElement;
    this.guardNativeControls();
    this.observer = new MutationObserver(() => this.guardNativeControls());
    this.observer.observe(this.nativeScope, { childList: true, subtree: true });
  }

  guardNativeControls() {
    const forms = this.nativeScope.querySelectorAll('form[action*="/cart/add"]');
    forms.forEach((form) => this.guardForm(form));
    this.nativeScope.querySelectorAll(".shopify-payment-button").forEach((control) => this.guardControl(control));
  }

  guardForm(form) {
    if (!form.dataset.smartBundleGuarded) {
      form.dataset.smartBundleGuarded = "true";
      form.addEventListener("submit", this.blockSubmit);
      this.nativeRecords.push({ element: form, form: true });
    }
    form.querySelectorAll('button[type="submit"], input[type="submit"], [name="add"]').forEach((control) => this.guardControl(control));
  }

  guardControl(control) {
    if (control.dataset.smartBundleGuarded) return;
    const disabled = "disabled" in control ? control.disabled : false;
    control.dataset.smartBundleGuarded = "true";
    control.classList.add("sb-native-submit--hidden");
    if ("disabled" in control) control.disabled = true;
    this.nativeRecords.push({ element: control, disabled });
  }

  restoreNativeControls() {
    this.nativeRecords?.forEach(({ element, disabled, form }) => {
      if (form) element.removeEventListener("submit", this.blockSubmit);
      if (!form && "disabled" in element) element.disabled = disabled;
      element.classList?.remove("sb-native-submit--hidden");
      delete element.dataset.smartBundleGuarded;
    });
    this.nativeRecords = [];
  }

  handleChange(event) {
    const option = event.target.selectedOptions[0];
    const image = event.target.closest("[data-component]")?.querySelector("[data-image]");
    if (image && option?.dataset.imageUrl) image.src = option.dataset.imageUrl;
    this.clearMessage();
    this.updateState();
  }

  updateState() {
    const selected = this.selectors.filter(({ value }) => value).length;
    const complete = selected === this.selectors.length && this.validSelectorCount() && this.parentId() !== null;
    const progress = this.querySelector("[data-progress]");
    if (progress) progress.textContent = `${selected} / ${this.selectors.length} selected`;
    if (!this.busy && this.button) this.setButtonDisabled(!complete);
  }

  selectionPayload() {
    const rv = JSON.parse(this.dataset.revision);
    const selections = this.selectors.map((select) => [JSON.parse(select.dataset.selectorKey), select.value]);
    return { rv, s: selections };
  }

  parentId() {
    const gid = this.dataset.parentVariantGid || "";
    if (!/^gid:\/\/shopify\/ProductVariant\/[1-9]\d*$/.test(gid)) return null;
    const id = this.dataset.parentVariantId || "";
    const expected = `gid://shopify/ProductVariant/${id}`;
    return /^[1-9]\d*$/.test(id) && gid === expected ? id : null;
  }

  validSelectorCount() {
    return this.selectors.length >= 1 && this.selectors.length <= 150;
  }

  async addToCart() {
    const parentId = this.parentId();
    if (this.busy || this.button.disabled || parentId === null) return;
    this.setBusy(true);
    try {
      await this.sendCartRequest(parentId);
      this.handleSuccess();
    } catch (error) {
      this.showError(error instanceof Error ? error.message : "Could not add this bundle.");
    } finally {
      this.setBusy(false);
    }
  }

  async sendCartRequest(parentId) {
    const item = { id: parentId, quantity: 1, properties: { _sb: JSON.stringify(this.selectionPayload()) } };
    const response = await fetch(`${window.Shopify?.routes?.root || "/"}cart/add.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ items: [item] }),
    });
    if (!response.ok) throw new Error(await this.responseError(response));
  }

  async responseError(response) {
    const fallback = "Could not add this bundle. Please try again.";
    try {
      const body = await response.json();
      return body.description || body.message || fallback;
    } catch {
      return fallback;
    }
  }

  handleSuccess() {
    if (this.dataset.redirectToCart === "true") {
      window.location.assign(`${window.Shopify?.routes?.root || "/"}cart`);
      return;
    }
    this.querySelector("[data-status]").textContent = "Bundle added to cart.";
    document.dispatchEvent(new CustomEvent("cart:refresh", { detail: { source: "smart-bundle" } }));
  }

  setBusy(busy) {
    this.busy = busy;
    this.setAttribute("aria-busy", String(busy));
    const invalid = !this.parentId() || !this.validSelectorCount() || !this.selectors.every(({ value }) => value);
    if (this.button) this.setButtonDisabled(busy || invalid);
    const status = this.querySelector("[data-status]");
    if (status) status.textContent = busy ? "Adding bundle..." : "";
  }

  setButtonDisabled(disabled) {
    this.button.disabled = disabled;
    this.button.setAttribute("aria-disabled", String(disabled));
  }

  clearMessage() {
    const error = this.querySelector("[data-error]");
    if (error) error.hidden = true;
    const status = this.querySelector("[data-status]");
    if (status) status.textContent = "";
  }

  showError(message) {
    const error = this.querySelector("[data-error]");
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  }
}

if (!customElements.get("smart-bundle")) customElements.define("smart-bundle", SmartBundle);
