CREATE TYPE "PricingMode" AS ENUM ('FIXED', 'DYNAMIC');

ALTER TABLE "Shop"
ADD COLUMN "currencyCode" TEXT;

ALTER TABLE "Bundle" RENAME COLUMN "price" TO "fixedPrice";
ALTER TABLE "Bundle" ALTER COLUMN "fixedPrice" DROP NOT NULL;
ALTER TABLE "Bundle" ADD COLUMN "pricingMode" "PricingMode" NOT NULL DEFAULT 'FIXED';

ALTER TABLE "BundleRevision"
ADD COLUMN "pricingMode" "PricingMode" NOT NULL DEFAULT 'FIXED',
ADD COLUMN "fixedPrice" DECIMAL(12,2);

UPDATE "BundleRevision" SET "fixedPrice" = "parentPrice";

ALTER TABLE "BundleSelector"
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "BundleVariantOption"
ADD COLUMN "unitPrice" DECIMAL(12,2);
