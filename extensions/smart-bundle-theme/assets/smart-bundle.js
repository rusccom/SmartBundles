const FORM_SELECTOR = 'form[action*="/cart/add"]';
const { fillTemplate, priceContext, selectedInput, validQuantity } = window.SmartBundleCore;
const pricing = window.SmartBundlePricing;
class SmartBundle extends HTMLElement {
  connectedCallback() {
    if (this.initialized || !this.prepareMount() || this.initialized) return;
    this.initialized = true;
    this.components = [...this.querySelectorAll("[data-component]")];
    this.inputs = [...this.querySelectorAll("[data-selector]")];
    this.button = this.querySelector("[data-add-button]");
    this.context = priceContext(this);
    this.nativePrice = window.SmartBundleNativePrice.mount(this);
    this.priceValid = pricing.validContract(this, this.inputs, this.context);
    this.contractValid = this.validContract();
    this.state = this.contractValid ? "incomplete" : "unavailable";
    this.bindEvents();
    this.guardForm();
    this.bindImageErrors();
    this.renderOptions();
    this.render();
    this.hidden = false;
  }
  disconnectedCallback() {
    if (this.mounting) return;
    this.removeEventListener("change", this.onChange);
    this.removeEventListener("click", this.onClick);
    this.mountObserver?.disconnect();
    clearTimeout(this.mountTimer);
    clearTimeout(this.successTimer);
    this.restoreNativeControls();
    this.nativePrice?.destroy();
    this.nativePrice = null;
    this.initialized = false;
  }
  prepareMount() {
    if (this.dataset.autoMount !== "true" || this.dataset.mounted === "true") return true;
    const form = this.productForm();
    if (!form) { this.waitForProductForm(); return false; }
    this.mounting = true;
    this.dataset.mounted = "true";
    form.before(this);
    this.mounting = false;
    return true;
  }
  productForm() {
    const forms = this.productForms();
    return forms.find((form) => form.querySelector('[name="add"]')) || forms[0] || null;
  }
  productForms() {
    const id = this.dataset.parentVariantId;
    return [...document.querySelectorAll(FORM_SELECTOR)]
      .filter((form) => form.querySelector('[name="id"]')?.value === id);
  }
  waitForProductForm() {
    if (this.mountObserver) return;
    this.mountObserver = new MutationObserver(() => {
      if (!this.productForm()) return;
      this.mountObserver.disconnect();
      this.mountObserver = undefined;
      clearTimeout(this.mountTimer);
      this.connectedCallback();
    });
    this.mountObserver.observe(document.documentElement, { childList: true, subtree: true });
    this.mountTimer = setTimeout(() => this.showMountFailure(), 5000);
  }
  showMountFailure() {
    this.dataset.state = "unavailable";
    this.querySelector("[data-hint]").textContent = this.dataset.bundleUnavailable;
    this.querySelector("[data-add-button]").disabled = true;
    this.hidden = false;
  }
  bindEvents() {
    this.onChange = (event) => this.changeSelection(event);
    this.onClick = (event) => this.handleClick(event);
    this.addEventListener("change", this.onChange);
    this.addEventListener("click", this.onClick);
  }
  guardForm() {
    this.formGuard = new window.SmartBundleFormGuard(this);
    this.formGuard.start();
  }
  restoreNativeControls() {
    this.formGuard?.stop();
    this.formGuard = null;
  }
  handleClick(event) {
    const disclosure = event.target.closest("[data-disclosure]");
    if (disclosure) return this.togglePanel(disclosure);
    if (event.target.closest("[data-add-button]")) void this.addToCart();
  }
  togglePanel(disclosure) {
    const panel = document.getElementById(disclosure.getAttribute("aria-controls"));
    if (!panel || !this.contains(panel)) return;
    const expanded = disclosure.getAttribute("aria-expanded") === "true";
    disclosure.setAttribute("aria-expanded", String(!expanded));
    panel.hidden = expanded;
  }
  changeSelection(event) {
    if (!event.target.matches('input[type="radio"][data-selector]')) return;
    this.updateImage(event.target.closest("[data-component]"), event.target);
    this.clearMessages();
    this.state = this.contractValid ? (this.complete() ? "complete" : "incomplete") : "unavailable";
    this.render();
  }
  validContract() {
    const count = this.components.length >= 1 && this.components.length <= 150;
    return count && this.components.every(validQuantity) && this.parentId() !== null && this.priceValid;
  }
  renderOptions() {
    this.querySelectorAll("[data-option-price]").forEach((output) => {
      const input = output.closest("label")?.querySelector("[data-selector]");
      output.textContent = pricing.optionText(this, input, this.context);
    });
  }
  render() {
    this.components.forEach((component) => this.renderComponent(component));
    const selected = this.selectionCount();
    const complete = selected === this.components.length;
    if (this.state === "incomplete" && complete) this.state = "complete";
    this.renderProgress(selected);
    this.renderFooter(complete);
    this.nativePrice?.render(pricing.previewTotals(this, this.components, this.context));
    this.dataset.state = this.state;
  }
  renderComponent(component) {
    const input = selectedInput(component);
    const available = component.querySelector('[data-selector]:not(:disabled):not([value=""])');
    const fallback = available ? this.dataset.chooseVariant : this.dataset.optionUnavailable;
    const label = component.querySelector("[data-selection-label]");
    if (label) label.textContent = input?.dataset.optionTitle || fallback;
    component.dataset.state = input ? "selected" : (available ? "required" : "unavailable");
    if (input) this.updateImage(component, input);
    component.querySelector("[data-line-price]").textContent = pricing.lineText(
      this, component, input, this.context);
  }
  updateImage(component, input) {
    const wrapper = component?.querySelector("[data-image-wrap]");
    if (!wrapper) return;
    const url = input.dataset.imageUrl || component.dataset.defaultImage;
    if (!url) return this.showPlaceholder(wrapper);
    let image = wrapper.querySelector("img");
    if (!image) {
      image = document.createElement("img");
      Object.assign(image, { className: "sb__image", alt: "", width: 48, height: 48 });
      image.setAttribute("data-image", "");
      wrapper.replaceChildren(image);
    }
    image.src = url;
    this.watchImage(image);
  }
  bindImageErrors() {
    this.querySelectorAll("[data-image], .sb__option-media img")
      .forEach((image) => this.watchImage(image));
  }
  watchImage(image) {
    const wrapper = image.parentElement;
    if (!wrapper) return;
    image.onerror = () => this.showPlaceholder(wrapper);
    if (image.getAttribute("src") && image.complete && image.naturalWidth === 0) {
      this.showPlaceholder(wrapper);
    }
  }
  showPlaceholder(wrapper) {
    if (wrapper.querySelector("[data-image-placeholder]")) return;
    const placeholder = document.createElement("span");
    const option = wrapper.classList.contains("sb__option-media");
    placeholder.className = option ? "sb__option-placeholder" : "sb__image-placeholder";
    placeholder.setAttribute("data-image-placeholder", "");
    wrapper.replaceChildren(placeholder);
  }
  renderProgress(selected) {
    const progress = this.querySelector("[data-progress]");
    if (!progress) return;
    const values = { selected: String(selected), total: String(this.components.length) };
    progress.textContent = fillTemplate(this.dataset.progressTemplate, values);
  }
  renderFooter(complete) {
    const totals = pricing.totals(this, this.components, this.context, complete);
    const total = totals?.current ?? null;
    const busy = this.state === "submitting" || this.state === "success";
    const unavailable = this.state === "unavailable" || (complete && total === null);
    const disabled = busy || unavailable || !complete;
    this.renderTotals(totals);
    this.querySelector("[data-hint]").textContent = this.hintText(complete, unavailable, total);
    this.button.disabled = disabled;
    this.button.setAttribute("aria-disabled", String(disabled));
    this.button.textContent = this.buttonLabel();
    this.setAttribute("aria-busy", String(this.state === "submitting"));
  }
  renderTotals(totals) {
    this.querySelector("[data-total]").textContent = totals?.current || this.dataset.priceUnavailable;
    const original = this.querySelector("[data-original-total]");
    original.textContent = totals?.original || "";
    original.hidden = !totals?.original;
    this.querySelector("[data-discount-badge]").hidden = !totals?.globalDiscount;
  }
  hintText(complete, unavailable, total) {
    if (unavailable) return !this.priceValid || total === null ? this.dataset.priceUnavailable : this.dataset.bundleUnavailable;
    if (complete) return "";
    const remaining = this.components.length - this.selectionCount();
    return remaining === 1 ? this.dataset.selectOne : fillTemplate(this.dataset.selectMany, { count: String(remaining) });
  }
  buttonLabel() {
    if (this.state === "submitting") return this.dataset.addingLabel;
    if (this.state === "success") return this.dataset.addedLabel;
    return this.dataset.addLabel;
  }
  selectionCount() {
    return this.components.filter((component) => selectedInput(component)).length;
  }
  complete() {
    return this.selectionCount() === this.components.length;
  }
  selectionPayload() {
    const selections = this.components.map((component) => [
      JSON.parse(component.dataset.selectorKey), selectedInput(component)?.value,
    ]);
    return { s: selections };
  }
  parentId() {
    const gid = this.dataset.parentVariantGid || "";
    const id = this.dataset.parentVariantId || "";
    return /^[1-9]\d*$/.test(id) && gid === `gid://shopify/ProductVariant/${id}` ? id : null;
  }
  async addToCart() {
    const parentId = this.parentId();
    if (this.button.disabled || !parentId) return;
    this.state = "submitting";
    this.clearMessages();
    this.renderFooter(true);
    try {
      await this.sendCartRequest(parentId);
      this.handleSuccess();
    } catch (error) {
      this.state = "error";
      this.showError(error instanceof Error ? error.message : this.dataset.addError);
      this.renderFooter(true);
    }
  }
  async sendCartRequest(parentId) {
    const properties = { _sb: JSON.stringify(this.selectionPayload()) };
    const response = await fetch(`${window.Shopify?.routes?.root || "/"}cart/add.js`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ items: [{ id: parentId, quantity: 1, properties }] }),
    });
    if (!response.ok) throw new Error(await this.responseError(response));
  }
  async responseError(response) {
    try {
      const body = await response.json();
      return body.description || body.message || this.dataset.addError;
    } catch { return this.dataset.addError; }
  }
  handleSuccess() {
    if (this.dataset.redirectToCart === "true") {
      window.location.assign(`${window.Shopify?.routes?.root || "/"}cart`);
      return;
    }
    this.state = "success";
    this.querySelector("[data-status]").textContent = this.dataset.addedStatus;
    document.dispatchEvent(new CustomEvent("cart:refresh", { detail: { source: "smart-bundle" } }));
    this.renderFooter(true);
    this.successTimer = setTimeout(() => this.resetSuccess(), 2000);
  }
  resetSuccess() {
    this.state = "complete";
    this.querySelector("[data-status]").textContent = "";
    this.renderFooter(true);
  }
  clearMessages() {
    const error = this.querySelector("[data-error]");
    error.hidden = true;
    error.textContent = "";
    this.querySelector("[data-status]").textContent = "";
  }
  showError(message) {
    const error = this.querySelector("[data-error]");
    error.textContent = message;
    error.hidden = false;
  }
}

if (!customElements.get("smart-bundle")) customElements.define("smart-bundle", SmartBundle);
