export function resolveCatalog(config) {
  if (!config || config.sv !== 5 || !Array.isArray(config.catalog) || !Array.isArray(config.selectors)) return null;
  const catalog = new Map(config.catalog.map((variant) => [variant.id, variant]));
  const selectors = config.selectors.map((selector) => resolveSelector(selector, catalog, config.texts));
  if (!selectors.length) return null;
  return { ...config, selectors };
}

function resolveSelector(selector, catalog, texts) {
  const options = selector.options.map(({ id }) => catalog.get(id))
    .filter((option) => option && option.productId === selector.productId);
  const productTitle = options[0]?.productTitle || selector.productTitle || texts?.optionUnavailable || "Unavailable component";
  return { ...selector, productTitle, options, unavailable: !options.length };
}
