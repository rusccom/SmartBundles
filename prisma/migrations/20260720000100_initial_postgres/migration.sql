CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "InstallationStatus" AS ENUM ('INSTALLED', 'UNINSTALLED', 'REDACTED');

CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

CREATE TYPE "SubscriptionStatus" AS ENUM ('UNKNOWN', 'ACTIVE', 'CANCEL_AT_PERIOD_END', 'FROZEN', 'CANCELLED');

CREATE TYPE "BundleStatus" AS ENUM ('DRAFT', 'PUBLISHING', 'ACTIVE', 'UPDATING', 'PAUSING', 'PAUSED', 'NEEDS_ATTENTION', 'FAILED', 'ARCHIVED');

CREATE TYPE "BundleHealth" AS ENUM ('READY', 'SOLD_OUT', 'NEEDS_ATTENTION');

CREATE TYPE "RevisionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');

CREATE TYPE "PublicationJobType" AS ENUM ('PUBLISH', 'PAUSE', 'RECONCILE', 'DOWNGRADE');

CREATE TYPE "JobState" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TYPE "WebhookState" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Shop" (
    "id" UUID NOT NULL,
    "shopGid" TEXT,
    "domain" TEXT NOT NULL,
    "installationStatus" "InstallationStatus" NOT NULL DEFAULT 'INSTALLED',
    "eligibleForBundles" BOOLEAN NOT NULL DEFAULT false,
    "ineligibilityReason" TEXT,
    "onlineStorePublicationGid" TEXT,
    "cartTransformGid" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" TIMESTAMP(3),
    "redactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopEntitlement" (
    "shopId" UUID NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "planHandle" TEXT,
    "partnerSubscriptionId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "graceUntil" TIMESTAMP(3),
    "pendingPlan" "Plan",
    "pendingEffectiveAt" TIMESTAMP(3),
    "billingPolledAt" TIMESTAMP(3),
    "quotaEnforcedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopEntitlement_pkey" PRIMARY KEY ("shopId")
);

CREATE TABLE "Bundle" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "publicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "status" "BundleStatus" NOT NULL DEFAULT 'DRAFT',
    "health" "BundleHealth" NOT NULL DEFAULT 'READY',
    "countsTowardQuota" BOOLEAN NOT NULL DEFAULT false,
    "parentProductGid" TEXT,
    "parentVariantGid" TEXT,
    "activeRevision" INTEGER,
    "draftRevision" INTEGER,
    "activatedAt" TIMESTAMP(3),
    "quotaRank" INTEGER,
    "runtimeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publishedVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "lockVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BundleRevision" (
    "id" UUID NOT NULL,
    "bundleId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "runtimeConfig" JSONB,
    "presentationConfig" JSONB,
    "runtimeBytes" INTEGER NOT NULL DEFAULT 0,
    "runtimeHash" TEXT,
    "presentationHash" TEXT,
    "parentPrice" DECIMAL(12,2) NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundleRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BundleSelector" (
    "id" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "selectorKey" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "productGid" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,

    CONSTRAINT "BundleSelector_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BundleVariantOption" (
    "id" UUID NOT NULL,
    "selectorId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "variantGid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BundleVariantOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopifyProjection" (
    "bundleId" UUID NOT NULL,
    "runtimeMetafieldId" TEXT,
    "runtimeDigest" TEXT,
    "runtimeHash" TEXT,
    "presentationMetafieldId" TEXT,
    "presentationDigest" TEXT,
    "presentationHash" TEXT,
    "productStatus" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyProjection_pkey" PRIMARY KEY ("bundleId")
);

CREATE TABLE "PublicationJob" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "bundleId" UUID,
    "type" "PublicationJobType" NOT NULL,
    "state" "JobState" NOT NULL DEFAULT 'PENDING',
    "step" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicationJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookDelivery" (
    "id" UUID NOT NULL,
    "shopId" UUID,
    "webhookId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "state" "WebhookState" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "processingToken" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Session_shop_idx" ON "Session"("shop");

CREATE INDEX "Session_expires_idx" ON "Session"("expires");

CREATE UNIQUE INDEX "Shop_shopGid_key" ON "Shop"("shopGid");

CREATE UNIQUE INDEX "Shop_domain_key" ON "Shop"("domain");

CREATE INDEX "ShopEntitlement_plan_billingPolledAt_idx" ON "ShopEntitlement"("plan", "billingPolledAt");

CREATE INDEX "ShopEntitlement_plan_quotaEnforcedAt_idx" ON "ShopEntitlement"("plan", "quotaEnforcedAt");

CREATE INDEX "ShopEntitlement_pendingPlan_pendingEffectiveAt_idx" ON "ShopEntitlement"("pendingPlan", "pendingEffectiveAt");

CREATE INDEX "Bundle_shopId_status_idx" ON "Bundle"("shopId", "status");

CREATE INDEX "Bundle_shopId_countsTowardQuota_idx" ON "Bundle"("shopId", "countsTowardQuota");

CREATE INDEX "Bundle_shopId_updatedAt_id_idx" ON "Bundle"("shopId", "updatedAt", "id");

CREATE INDEX "Bundle_shopId_countsTowardQuota_quotaRank_activatedAt_idx" ON "Bundle"("shopId", "countsTowardQuota", "quotaRank", "activatedAt");

CREATE UNIQUE INDEX "Bundle_shopId_publicId_key" ON "Bundle"("shopId", "publicId");

CREATE UNIQUE INDEX "Bundle_shopId_parentProductGid_key" ON "Bundle"("shopId", "parentProductGid");

CREATE UNIQUE INDEX "Bundle_shopId_parentVariantGid_key" ON "Bundle"("shopId", "parentVariantGid");

CREATE INDEX "BundleRevision_bundleId_status_idx" ON "BundleRevision"("bundleId", "status");

CREATE INDEX "BundleRevision_createdAt_idx" ON "BundleRevision"("createdAt");

CREATE UNIQUE INDEX "BundleRevision_bundleId_revision_key" ON "BundleRevision"("bundleId", "revision");

CREATE UNIQUE INDEX "BundleSelector_revisionId_selectorKey_key" ON "BundleSelector"("revisionId", "selectorKey");

CREATE UNIQUE INDEX "BundleSelector_revisionId_position_key" ON "BundleSelector"("revisionId", "position");

CREATE INDEX "BundleSelector_productGid_idx" ON "BundleSelector"("productGid");

CREATE INDEX "BundleVariantOption_variantGid_idx" ON "BundleVariantOption"("variantGid");

CREATE UNIQUE INDEX "BundleVariantOption_selectorId_variantGid_key" ON "BundleVariantOption"("selectorId", "variantGid");

CREATE UNIQUE INDEX "PublicationJob_idempotencyKey_key" ON "PublicationJob"("idempotencyKey");

CREATE INDEX "PublicationJob_state_nextAttemptAt_idx" ON "PublicationJob"("state", "nextAttemptAt");

CREATE INDEX "PublicationJob_state_updatedAt_idx" ON "PublicationJob"("state", "updatedAt");

CREATE INDEX "OutboxEvent_deliveredAt_createdAt_idx" ON "OutboxEvent"("deliveredAt", "createdAt");

CREATE UNIQUE INDEX "WebhookDelivery_webhookId_key" ON "WebhookDelivery"("webhookId");

CREATE INDEX "WebhookDelivery_state_updatedAt_idx" ON "WebhookDelivery"("state", "updatedAt");

CREATE INDEX "WebhookDelivery_shopDomain_idx" ON "WebhookDelivery"("shopDomain");

ALTER TABLE "ShopEntitlement" ADD CONSTRAINT "ShopEntitlement_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BundleRevision" ADD CONSTRAINT "BundleRevision_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BundleSelector" ADD CONSTRAINT "BundleSelector_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "BundleRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BundleVariantOption" ADD CONSTRAINT "BundleVariantOption_selectorId_fkey" FOREIGN KEY ("selectorId") REFERENCES "BundleSelector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShopifyProjection" ADD CONSTRAINT "ShopifyProjection_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublicationJob" ADD CONSTRAINT "PublicationJob_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublicationJob" ADD CONSTRAINT "PublicationJob_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
