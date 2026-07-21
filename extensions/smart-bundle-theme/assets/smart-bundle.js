const FORM_SELECTOR = 'form[action*="/cart/add"]';
const { activeMinor, fillTemplate, formatMinor, priceContext, selectedInput, sourceMinor, validQuantity } = window.SmartBundleCore;
class SmartBundle extends HTMLElement {
  connectedCallback() {
    if (this.initialized || !this.prepareMount() || this.initialized) return;
    this.initialized = true;
    this.components = [...this.querySelectorAll("[data-component]")];
    this.inputs = [...this.querySelectorAll("[data-selector]")];
    this.button = this.querySelector("[data-add-button]");
    this.context = priceContext(this);
    this.priceValid = this.validPriceContract();
    this.contractValid = this.validContract();
    this.state = this.contractValid ? "incomplete" : "unavailable";
    this.bindEvents();
    this.guardForm();
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
    const id = this.dataset.parentVariantId;
    return [...document.querySelectorAll(FORM_SELECTOR)]
      .find((form) => form.querySelector('[name="id"]')?.value === id) || null;
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
  validPriceContract() {
    if (this.dataset.priceMode === "fixed") return Boolean(this.dataset.fixedTotal);
    if (this.dataset.priceMode !== "dynamic" || !this.context) return false;
    const maximum = sourceMinor(this.dataset.maximumAmount, this.context.sourceScale);
    return maximum !== null && this.inputs.every((input) => this.inputPrice(input) !== null);
  }
  inputPrice(input) {
    return input && this.context ? sourceMinor(input.dataset.unitPrice, this.context.sourceScale) : null;
  }
  renderOptions() {
    this.querySelectorAll("[data-option-price]").forEach((output) => {
      if (this.dataset.priceMode === "fixed") { output.textContent = this.dataset.included; return; }
      const input = output.closest("label")?.querySelector("[data-selector]");
      const converted = activeMinor(this.inputPrice(input), this.context);
      output.textContent = formatMinor(converted, this.context) || this.dataset.priceUnavailable;
    });
  }
  render() {
    this.components.forEach((component) => this.renderComponent(component));
    const selected = this.selectionCount();
    const complete = selected === this.components.length;
    if (this.state === "incomplete" && complete) this.state = "complete";
    this.renderProgress(selected);
    this.renderFooter(complete);
    this.dataset.state = this.state;
  }
  renderComponent(component) {
    const input = selectedInput(component);
    const available = component.querySelector('[data-selector]:not(:disabled):not([value=""])');
    const fallback = available ? this.dataset.chooseVariant : this.dataset.optionUnavailable;
    component.querySelector("[data-selection-label]").textContent = input?.dataset.optionTitle || fallback;
    component.dataset.state = input ? "selected" : (available ? "required" : "unavailable");
    if (input) this.updateImage(component, input);
    component.querySelector("[data-line-price]").textContent = this.linePrice(component, input);
  }
  linePrice(component, input) {
    if (this.dataset.priceMode === "fixed") return this.dataset.included;
    if (!input || !this.context) return "—";
    const unit = this.inputPrice(input);
    const convertedUnit = activeMinor(unit, this.context);
    const lineTotal = convertedUnit === null ? null : convertedUnit * Number(component.dataset.quantity);
    const converted = Number.isSafeInteger(lineTotal) ? lineTotal : null;
    return formatMinor(converted, this.context) || this.dataset.priceUnavailable;
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
  }
  showPlaceholder(wrapper) {
    if (wrapper.querySelector("[data-image-placeholder]")) return;
    const placeholder = document.createElement("span");
    placeholder.className = "sb__image-placeholder";
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
    const total = this.totalText(complete);
    const busy = this.state === "submitting" || this.state === "success";
    const unavailable = this.state === "unavailable" || (complete && total === null);
    const disabled = busy || unavailable || !complete;
    this.querySelector("[data-total]").textContent = total || this.dataset.priceUnavailable;
    this.querySelector("[data-hint]").textContent = this.hintText(complete, unavailable, total);
    this.button.disabled = disabled;
    this.button.setAttribute("aria-disabled", String(disabled));
    this.button.textContent = this.buttonLabel();
    this.setAttribute("aria-busy", String(this.state === "submitting"));
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
  totalText(complete) {
    if (this.dataset.priceMode === "fixed") return this.dataset.fixedTotal;
    if (!complete) return "—";
    if (!this.context) return null;
    let sourceTotal = 0; let activeTotal = 0;
    for (const component of this.components) {
      const price = this.inputPrice(selectedInput(component));
      if (price === null) return null;
      const activePrice = activeMinor(price, this.context); if (activePrice === null) return null;
      const quantity = Number(component.dataset.quantity); sourceTotal += price * quantity;
      activeTotal += activePrice * quantity;
    }
    const maximum = sourceMinor(this.dataset.maximumAmount, this.context.sourceScale);
    if (maximum === null || sourceTotal > maximum || !Number.isSafeInteger(activeTotal)) return null;
    return formatMinor(activeTotal, this.context);
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
    return { rv: JSON.parse(this.dataset.revision), s: selections };
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
