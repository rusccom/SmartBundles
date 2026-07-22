ALTER TABLE "BundleSelector"
ADD COLUMN "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD CONSTRAINT "BundleSelector_discountPercent_check" CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100);
