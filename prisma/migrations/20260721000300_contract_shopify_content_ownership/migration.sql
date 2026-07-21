ALTER TABLE "Bundle"
DROP COLUMN "title",
DROP COLUMN "description";

ALTER TABLE "BundleRevision"
DROP COLUMN "config";
