CREATE TYPE "EditorSaveState" AS ENUM ('CLAIMED', 'APPLYING', 'VERIFYING', 'RECOVERED');

ALTER TABLE "Bundle"
ADD COLUMN "editorSaveToken" UUID,
ADD COLUMN "editorSaveStartedAt" TIMESTAMP(3),
ADD COLUMN "editorSaveState" "EditorSaveState",
ADD COLUMN "editorSaveSettleAt" TIMESTAMP(3),
ADD COLUMN "editorSaveObservedHash" TEXT,
ADD COLUMN "editorSaveObservedAt" TIMESTAMP(3);
