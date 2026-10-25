import type { Config } from "@react-router/dev/config";

const appUrl = process.env.SHOPIFY_APP_URL || "https://smartbundle-production.up.railway.app";

export default {
  allowedActionOrigins: [new URL(appUrl).host],
} satisfies Config;
