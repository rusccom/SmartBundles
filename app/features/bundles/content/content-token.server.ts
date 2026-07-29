import { createHmac, timingSafeEqual } from "node:crypto";
import { BundleContentError } from "./BundleContentError.server";
import type { CreationTokenPayload } from "./content.types";

type SignedPayload = CreationTokenPayload;

export function signCreationToken(shopDomain: string, publicId: string): string {
  return encode({ v: 1, kind: "create", shopDomain, publicId });
}

export function verifyCreationToken(token: string): CreationTokenPayload {
  const payload = decode(token);
  if (!isCreationPayload(payload)) throw invalidToken();
  return payload;
}

function encode(payload: SignedPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${signature(body)}`;
}

function decode(token: string): unknown {
  const [body, provided, extra] = token.split(".");
  if (!body || !provided || extra || !validSignature(body, provided)) throw invalidToken();
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as unknown;
  } catch {
    throw invalidToken();
  }
}

function validSignature(body: string, provided: string): boolean {
  const actual = Buffer.from(signature(body), "base64url");
  const candidate = Buffer.from(provided, "base64url");
  return actual.length === candidate.length && timingSafeEqual(actual, candidate);
}

function signature(body: string): string {
  return createHmac("sha256", tokenSecret()).update(body, "utf8").digest("base64url");
}

function tokenSecret(): string {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) throw new Error("SHOPIFY_API_SECRET is required for bundle content tokens.");
  return secret;
}

function isCreationPayload(value: unknown): value is CreationTokenPayload {
  return isRecord(value) && value.v === 1 && value.kind === "create"
    && strings(value, ["shopDomain", "publicId"]);
}

function strings(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => typeof value[key] === "string" && Boolean(value[key]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidToken(): BundleContentError {
  return new BundleContentError("The signed creation token is invalid. Reload and try again.", 400);
}
