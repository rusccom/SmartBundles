export function storefrontEditorUrl(domain: string): string | undefined {
  const apiKey = process.env.SHOPIFY_API_KEY?.trim();
  if (!apiKey) return undefined;
  const query = new URLSearchParams({
    context: "apps",
    template: "product",
    activateAppId: `${apiKey}/smart-bundle`,
  });
  return `https://${domain}/admin/themes/current/editor?${query.toString()}`;
}
