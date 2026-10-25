const incidents = new Map();
const listeners = new Set();

function report(code, message, context = {}) {
  const key = `${code}:${context.bundleId || ""}`;
  const previous = incidents.get(key);
  const now = new Date().toISOString();
  const event = Object.freeze({
    id: previous?.id || crypto.randomUUID(), code, source: "storefront", severity: "error",
    message: String(message).slice(0, 1000), context: Object.freeze({ bundleId: context.bundleId || "" }),
    occurrences: (previous?.occurrences || 0) + 1, firstSeenAt: previous?.firstSeenAt || now, lastSeenAt: now,
  });
  incidents.set(key, event);
  if (incidents.size > 100) incidents.delete(incidents.keys().next().value);
  document.dispatchEvent(new CustomEvent("smartbundle:error", { detail: event }));
  listeners.forEach(notify(event));
  return event;
}

function notify(event) {
  return (listener) => { try { listener(event); } catch { return; } };
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

window.SmartBundleErrors = Object.freeze({ report, subscribe, snapshot: () => [...incidents.values()] });
