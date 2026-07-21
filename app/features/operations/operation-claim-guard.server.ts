import type { BundleStatus } from "@prisma/client";
import prisma from "../../db.server";
import type { AdminClient } from "../shopify/admin-api.server";
import {
  assertJobOwnership,
  rejectJobOwnership,
} from "./publication-job-lease.server";
import type { JobLeaseOwnership } from "./publication-job-lease.server";

export type OperationGuard = () => Promise<void>;

export interface BundleClaimFence {
  bundleId: string;
  lockVersion: number;
  statuses: BundleStatus[];
}

export function createBundleClaimGuard(fence: BundleClaimFence): OperationGuard {
  return async () => {
    if (!await bundleClaimCurrent(fence)) throw claimLostError();
  };
}

export function createOperationGuard(
  ownership: JobLeaseOwnership,
  fence: BundleClaimFence,
): OperationGuard {
  return () => assertOperationOwnership(ownership, fence);
}

async function assertOperationOwnership(
  ownership: JobLeaseOwnership,
  fence: BundleClaimFence,
): Promise<void> {
  await assertJobOwnership(ownership);
  if (!await bundleClaimCurrent(fence)) rejectJobOwnership(ownership);
}

async function bundleClaimCurrent(fence: BundleClaimFence): Promise<boolean> {
  const current = await prisma.bundle.count({
    where: {
      id: fence.bundleId,
      lockVersion: fence.lockVersion,
      status: { in: fence.statuses },
    },
  });
  return current === 1;
}

function claimLostError(): Error {
  const error = new Error("Bundle operation claim was lost.");
  error.name = "BUNDLE_OPERATION_CLAIM_LOST";
  return error;
}

export function guardAdminClient(
  admin: AdminClient,
  guard: OperationGuard,
): AdminClient {
  return {
    graphql: async (query, options) => {
      await guard();
      return admin.graphql(query, options);
    },
  };
}
