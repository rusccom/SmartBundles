BEGIN;

LOCK TABLE
  "Bundle",
  "BundleRevision",
  "BundleSelector",
  "BundleVariantOption",
  "PublicationJob"
IN ACCESS EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Bundle"
    WHERE "status" IN ('PUBLISHING', 'UPDATING', 'PAUSING')
      OR "editorSaveToken" IS NOT NULL
  ) OR EXISTS (
    SELECT 1
    FROM "PublicationJob"
    WHERE "state" IN ('PENDING', 'RUNNING')
  ) THEN
    RAISE EXCEPTION 'Finish pending bundle operations before simplifying bundles';
  END IF;
END
$$;

DELETE FROM "Bundle" WHERE "status" = 'ARCHIVED';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Bundle"
    WHERE "parentProductGid" IS NULL OR "parentVariantGid" IS NULL
  ) THEN
    RAISE EXCEPTION 'Every bundle must have a Shopify parent before migration';
  END IF;
END
$$;

CREATE TEMP TABLE "_bundle_revision_map" ON COMMIT DROP AS
SELECT
  bundle.id AS "bundleId",
  revision.id AS "revisionId"
FROM "Bundle" AS bundle
JOIN "BundleRevision" AS revision
  ON revision."bundleId" = bundle.id
  AND revision.revision = CASE
    WHEN bundle.status = 'ACTIVE' THEN bundle."activeRevision"
    ELSE COALESCE(bundle."draftRevision", bundle."activeRevision")
  END;

DO $$
BEGIN
  IF (
    SELECT COUNT(*) FROM "_bundle_revision_map"
  ) <> (
    SELECT COUNT(*) FROM "Bundle"
  ) THEN
    RAISE EXCEPTION 'Every bundle must reference one valid revision before migration';
  END IF;
END
$$;

DROP TABLE IF EXISTS "PublicationJob";
DROP TABLE IF EXISTS "ShopifyProjection";
DROP TABLE IF EXISTS "OutboxEvent";

ALTER TABLE "BundleVariantOption"
DROP COLUMN "title",
DROP COLUMN "imageUrl",
DROP COLUMN "available",
DROP COLUMN "unitPrice";

ALTER TABLE "BundleSelector"
ADD COLUMN "bundleId" UUID;

UPDATE "BundleSelector" AS selector
SET "bundleId" = mapping."bundleId"
FROM "_bundle_revision_map" AS mapping
WHERE selector."revisionId" = mapping."revisionId";

UPDATE "Bundle" AS bundle
SET
  "pricingMode" = revision."pricingMode",
  "discountPercent" = revision."discountPercent"
FROM "_bundle_revision_map" AS mapping
JOIN "BundleRevision" AS revision
  ON revision.id = mapping."revisionId"
WHERE bundle.id = mapping."bundleId";

DELETE FROM "BundleSelector" WHERE "bundleId" IS NULL;

DROP INDEX IF EXISTS "BundleSelector_revisionId_selectorKey_key";
DROP INDEX IF EXISTS "BundleSelector_revisionId_position_key";
ALTER TABLE "BundleSelector" DROP CONSTRAINT IF EXISTS "BundleSelector_revisionId_fkey";
ALTER TABLE "BundleSelector"
DROP COLUMN "revisionId",
DROP COLUMN "label",
DROP COLUMN "productTitle",
ALTER COLUMN "bundleId" SET NOT NULL;

ALTER TABLE "BundleSelector"
ADD CONSTRAINT "BundleSelector_bundleId_fkey"
FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "BundleSelector_bundleId_selectorKey_key" ON "BundleSelector"("bundleId", "selectorKey");
CREATE UNIQUE INDEX "BundleSelector_bundleId_position_key" ON "BundleSelector"("bundleId", "position");

DROP TABLE "BundleRevision";

UPDATE "Bundle"
SET "status" = CASE
  WHEN "status" = 'ACTIVE' THEN 'ACTIVE'::"BundleStatus"
  ELSE 'DRAFT'::"BundleStatus"
END;

CREATE TYPE "BundleStatus_new" AS ENUM ('DRAFT', 'ACTIVE');
ALTER TABLE "Bundle"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "BundleStatus_new"
USING ("status"::text::"BundleStatus_new"),
ALTER COLUMN "status" SET DEFAULT 'DRAFT';
DROP TYPE "BundleStatus";
ALTER TYPE "BundleStatus_new" RENAME TO "BundleStatus";

ALTER TABLE "Bundle"
ALTER COLUMN "parentProductGid" SET NOT NULL,
ALTER COLUMN "parentVariantGid" SET NOT NULL,
DROP COLUMN "fixedPrice",
DROP COLUMN "health",
DROP COLUMN "countsTowardQuota",
DROP COLUMN "activeRevision",
DROP COLUMN "draftRevision",
DROP COLUMN "activatedAt",
DROP COLUMN "quotaRank",
DROP COLUMN "runtimeEnabled",
DROP COLUMN "publishedVerified",
DROP COLUMN "lastErrorCode",
DROP COLUMN "lastErrorMessage",
DROP COLUMN "editorSaveToken",
DROP COLUMN "editorSaveStartedAt",
DROP COLUMN "editorSaveState",
DROP COLUMN "editorSaveSettleAt",
DROP COLUMN "editorSaveObservedHash",
DROP COLUMN "editorSaveObservedAt",
DROP COLUMN "lockVersion";

DROP TYPE IF EXISTS "BundleHealth";
DROP TYPE IF EXISTS "RevisionStatus";
DROP TYPE IF EXISTS "PublicationJobType";
DROP TYPE IF EXISTS "JobState";
DROP TYPE IF EXISTS "EditorSaveState";

DROP INDEX IF EXISTS "Bundle_shopId_countsTowardQuota_idx";
DROP INDEX IF EXISTS "Bundle_shopId_countsTowardQuota_quotaRank_activatedAt_idx";

COMMIT;
