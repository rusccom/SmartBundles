const SMART_BUNDLE_NATIVE_SELECTOR =
  'button[type="submit"], input[type="submit"], [name="add"], .shopify-payment-button';
const SMART_BUNDLE_CONTROL_STATE = new WeakMap();

function acquireSmartBundleControl(control) {
  const current = SMART_BUNDLE_CONTROL_STATE.get(control);
  if (current) { current.count += 1; return; }
  const disabled = "disabled" in control ? control.disabled : false;
  SMART_BUNDLE_CONTROL_STATE.set(control, { count: 1, disabled });
  control.classList.add("sb-native-submit--hidden");
  if ("disabled" in control) control.disabled = true;
}

function releaseSmartBundleControl(control) {
  const current = SMART_BUNDLE_CONTROL_STATE.get(control);
  if (!current || --current.count > 0) return;
  if ("disabled" in control) control.disabled = current.disabled;
  control.classList.remove("sb-native-submit--hidden");
  SMART_BUNDLE_CONTROL_STATE.delete(control);
}

class SmartBundleFormGuard {
  constructor(owner) {
    this.owner = owner;
    this.records = new Set();
    this.blockSubmit = (event) => event.preventDefault();
    this.observer = new MutationObserver(() => this.sync());
  }

  start() {
    this.sync();
    this.observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  stop() {
    this.observer.disconnect();
    this.restoreForm();
  }

  sync() {
    const nextForm = this.owner.productForm();
    if (nextForm !== this.form) this.replaceForm(nextForm);
    this.protectControls();
  }

  replaceForm(form) {
    this.restoreForm();
    this.form = form;
    this.form?.addEventListener("submit", this.blockSubmit);
  }

  protectControls() {
    this.form?.querySelectorAll(SMART_BUNDLE_NATIVE_SELECTOR).forEach((control) => {
      if (this.records.has(control)) return;
      this.records.add(control);
      acquireSmartBundleControl(control);
    });
  }

  restoreForm() {
    this.form?.removeEventListener("submit", this.blockSubmit);
    this.records.forEach(releaseSmartBundleControl);
    this.records.clear();
    this.form = null;
  }
}

window.SmartBundleFormGuard = SmartBundleFormGuard;
