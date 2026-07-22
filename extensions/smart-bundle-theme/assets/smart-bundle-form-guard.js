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
    this.restoreForms();
  }

  sync() {
    const nextForms = this.owner.productForms();
    if (!this.sameForms(nextForms)) this.replaceForms(nextForms);
    this.protectControls();
  }

  sameForms(forms) {
    return this.forms?.size === forms.length && forms.every((form) => this.forms.has(form));
  }

  replaceForms(forms) {
    this.restoreForms();
    this.forms = new Set(forms);
    this.forms.forEach((form) => form.addEventListener("submit", this.blockSubmit));
  }

  protectControls() {
    this.forms?.forEach((form) => this.protectForm(form));
  }

  protectForm(form) {
    form.querySelectorAll(SMART_BUNDLE_NATIVE_SELECTOR).forEach((control) => {
      if (!this.records.has(control)) this.protectControl(control);
    });
  }

  protectControl(control) {
    this.records.add(control);
    acquireSmartBundleControl(control);
  }

  restoreForms() {
    this.forms?.forEach((form) => form.removeEventListener("submit", this.blockSubmit));
    this.records.forEach(releaseSmartBundleControl);
    this.records.clear();
    this.forms = null;
  }
}

window.SmartBundleFormGuard = SmartBundleFormGuard;
