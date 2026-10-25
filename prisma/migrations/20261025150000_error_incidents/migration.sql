CREATE TYPE "ErrorIncidentStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

CREATE TABLE "ErrorIncident" (
  "id" UUID NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "shopId" UUID,
  "code" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "context" JSONB NOT NULL,
  "status" "ErrorIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "occurrences" INTEGER NOT NULL DEFAULT 1,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "lastNotifiedAt" TIMESTAMP(3),
  CONSTRAINT "ErrorIncident_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ErrorIncident_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ErrorIncident_fingerprint_key" ON "ErrorIncident"("fingerprint");
CREATE INDEX "ErrorIncident_shopId_status_lastSeenAt_idx" ON "ErrorIncident"("shopId", "status", "lastSeenAt");
CREATE INDEX "ErrorIncident_status_lastSeenAt_idx" ON "ErrorIncident"("status", "lastSeenAt");
