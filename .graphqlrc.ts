import fs from "fs";
import { ApiVersion } from "@shopify/shopify-app-react-router/server";
import { shopifyApiProject, ApiType } from "@shopify/api-codegen-preset";
import type { IGraphQLConfig } from "graphql-config";

function getConfig() {
  const config: IGraphQLConfig = {
    projects: {
      default: shopifyApiProject({
        apiType: ApiType.Admin,
        apiVersion: ApiVersion.July26,
        documents: ["./app/**/*.{js,ts,jsx,tsx}", "./app/.server/**/*.{js,ts,jsx,tsx}"],
        outputDir: "./app/types",
      }),
    },
  };

  extensionEntries().forEach((entry) => addExtensionProject(config, entry));
  return config;
}

function extensionEntries(): string[] {
  try {
    return fs.readdirSync("./extensions");
  } catch {
    return [];
  }
}

function addExtensionProject(config: IGraphQLConfig, entry: string): void {
  const extensionPath = `./extensions/${entry}`;
  const schema = `${extensionPath}/schema.graphql`;
  if (!fs.existsSync(schema)) return;
  config.projects[entry] = {
    schema,
    documents: [`${extensionPath}/**/*.graphql`],
  };
}

const config = getConfig();

export default config;
