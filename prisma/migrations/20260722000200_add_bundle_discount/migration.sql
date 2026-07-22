ALTER TABLE "Bundle"
ADD COLUMN "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD CONSTRAINT "Bundle_discountPercent_check" CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100);

ALTER TABLE "BundleRevision"
ADD COLUMN "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD CONSTRAINT "BundleRevision_discountPercent_check" CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100);
