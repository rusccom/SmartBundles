import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

export function AppErrorBoundary() {
  return boundary.error(useRouteError());
}
