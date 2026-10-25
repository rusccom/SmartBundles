import { useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useEffect } from "react";
import { reportAdminError } from "../errors/error-manager.client";

export function AppErrorBoundary() {
  const error = useRouteError();
  useEffect(() => { if (error instanceof Error) reportAdminError(error); }, [error]);
  return boundary.error(error);
}
