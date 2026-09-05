import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL(".", import.meta.url));
const image = "rust:1.90-slim@sha256:7fa728f3678acf5980d5db70960cf8491aff9411976789086676bdf0c19db39e";
const command = "rustup target add wasm32-wasip1 && cargo build --locked --release --target wasm32-wasip1";
const result = spawnSync("docker", [
  "run", "--rm", "--mount", `type=bind,source=${directory},target=/source`,
  "--mount", "type=volume,source=smartbundle-cargo,target=/usr/local/cargo",
  "--mount", "type=volume,source=smartbundle-rustup-1-90,target=/usr/local/rustup",
  "--workdir", "/source", image, "sh", "-c", command,
], { stdio: "inherit" });
if (result.status !== 0) throw result.error || new Error("Shopify Function compilation failed.");
mkdirSync(new URL("dist/", import.meta.url), { recursive: true });
copyFileSync(new URL("target/wasm32-wasip1/release/smart-bundle-transform.wasm", import.meta.url),
  new URL("dist/function.wasm", import.meta.url));
