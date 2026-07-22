const PRICE_CONTAINER = '[id^="price-"], [data-product-price], .product__price';

function productRoot(element) {
  return element.closest("product-info")
    || element.closest(".product__info-container")
    || element.parentElement;
}

function currentPrice(container) {
  const sale = container.querySelector(".price--on-sale .price-item--sale");
  const regular = container.querySelector(".price__regular .price-item--regular");
  const generic = container.querySelector("[data-product-price], [data-price], .money");
  return sale || regular || generic || fallbackContainer(container);
}

function fallbackContainer(container) {
  if (container.matches("[data-product-price], [data-price]")) return container;
  return container.matches(".product__price") && !container.children.length ? container : null;
}

function originalPrice(container) {
  return container.querySelector(".price--on-sale .price__sale .price-item--regular");
}

class SmartBundleNativePrice {
  static mount(element) {
    const container = productRoot(element)?.querySelector(PRICE_CONTAINER);
    return container ? new SmartBundleNativePrice(container) : null;
  }

  constructor(container) {
    this.current = currentPrice(container);
    this.original = originalPrice(container);
    this.currentText = this.current?.textContent;
    this.originalText = this.original?.textContent;
  }

  render(totals) {
    if (this.current && totals?.current) this.current.textContent = totals.current;
    if (this.original && totals?.original) this.original.textContent = totals.original;
  }

  destroy() {
    if (this.current && this.currentText !== undefined) this.current.textContent = this.currentText;
    if (this.original && this.originalText !== undefined) this.original.textContent = this.originalText;
  }
}

window.SmartBundleNativePrice = SmartBundleNativePrice;
