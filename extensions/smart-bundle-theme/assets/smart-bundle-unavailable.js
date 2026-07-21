const UNAVAILABLE_FORM_SELECTOR = 'form[action*="/cart/add"]';

class SmartBundleUnavailable extends HTMLElement {
  connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;
    this.formGuard = new window.SmartBundleFormGuard(this);
    this.formGuard.start();
  }

  disconnectedCallback() {
    this.formGuard?.stop();
    this.formGuard = null;
    this.initialized = false;
  }

  productForm() {
    const id = this.dataset.parentVariantId || "";
    if (!/^[1-9]\d*$/.test(id)) return null;
    return [...document.querySelectorAll(UNAVAILABLE_FORM_SELECTOR)]
      .find((form) => form.querySelector('[name="id"]')?.value === id) || null;
  }
}

if (!customElements.get("smart-bundle-unavailable")) {
  customElements.define("smart-bundle-unavailable", SmartBundleUnavailable);
}
