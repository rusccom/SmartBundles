export function resolveCatalog(config) {
  if (!config || config.sv !== 5 || !Array.isArray(config.catalog)) return null;
  const catalog = new Map(config.catalog.map((variant) => [variant.id, variant]));
  const selectors = config.selectors?.map((selector) => resolveSelector(selector, catalog));
  if (!selectors?.length || selectors.some((selector) => !selector)) return null;
  return { ...config, selectors };
}

function resolveSelector(selector, catalog) {
  const options = selector.options.map(({ id }) => catalog.get(id));
  if (!options.length || options.some((option) => !option || option.productId !== selector.productId)) return null;
  return { ...selector, productTitle: options[0].productTitle, options };
}
