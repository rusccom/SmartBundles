export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function attributes(node, values) {
  Object.entries(values).forEach(([name, value]) => {
    if (value === undefined || value === null || value === false) return;
    node.setAttribute(name, value === true ? "" : String(value));
  });
  return node;
}

export function fillTemplate(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`__${key}__`, value),
    String(template ?? ""),
  );
}

export function placeholder(className) {
  const node = element("span", className);
  node.setAttribute("data-image-placeholder", "");
  return node;
}

export function mediaBox(spec) {
  const wrapper = element("span", spec.className);
  attributes(wrapper, { "aria-hidden": "true", "data-image-wrap": spec.wrap });
  wrapper.append(spec.url ? mediaImage(spec) : placeholder(spec.placeholderClass));
  return wrapper;
}

function mediaImage(spec) {
  const image = element("img", spec.imageClass);
  return attributes(image, {
    src: spec.url, alt: "", width: spec.size, height: spec.size,
    loading: "lazy", "data-image": spec.tagImage,
  });
}

if (typeof window !== "undefined") {
  window.SmartBundleDom = Object.freeze({
    attributes, element, fillTemplate, mediaBox, placeholder,
  });
}
