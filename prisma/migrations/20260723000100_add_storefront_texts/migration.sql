ALTER TABLE "Shop"
ADD COLUMN "storefrontTexts" JSONB,
ADD COLUMN "storefrontTextVersion" INTEGER NOT NULL DEFAULT 1;

UPDATE "Shop"
SET "storefrontTexts" = '{
  "heading": "Build your bundle",
  "buttonLabel": "Add bundle to cart",
  "progressTemplate": "__selected__ of __total__ items selected",
  "selectOneMore": "Select 1 more item to continue.",
  "selectManyMoreTemplate": "Select __count__ more items to continue.",
  "chooseVariant": "Choose a variant",
  "chooseVariantForTemplate": "Choose a variant for __product__",
  "quantityTemplate": "×__quantity__",
  "soldOut": "Sold out",
  "optionUnavailable": "No variants are currently available.",
  "bundlePrice": "Bundle price",
  "total": "Total",
  "discountBadgeTemplate": "Save __discount__%",
  "fixedPriceNote": "Fixed price — your selections won’t change the total.",
  "priceUnavailable": "Price unavailable in your selected currency.",
  "bundleUnavailable": "This bundle is temporarily unavailable.",
  "addingLabel": "Adding…",
  "addedLabel": "Added",
  "addedStatus": "Bundle added to cart.",
  "addError": "Couldn’t add the bundle. Please try again.",
  "javascriptRequired": "JavaScript is required to build this bundle."
}'::jsonb;

ALTER TABLE "Shop"
ALTER COLUMN "storefrontTexts" SET NOT NULL;

ALTER TABLE "ShopifyProjection"
ADD COLUMN "storefrontTextVersion" INTEGER;
