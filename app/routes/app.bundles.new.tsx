import { randomUUID } from "node:crypto";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useActionData, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { bundleEditorAction } from "../features/bundles/bundle-editor-action.server";
import "../features/bundles/editor/bundle-editor.css";
import { BundleEditorPage } from "../features/bundles/editor/BundleEditorPage";
import { authenticate } from "../shopify.server";
import { signCreationToken } from "../features/bundles/content/content-token.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const creationToken = signCreationToken(session.shop, randomUUID());
  return { initial: { version: "new", title: "", descriptionHtml: "", creationToken, price: "", status: "DRAFT", selectors: [] } };
}

export function action({ request }: ActionFunctionArgs) {
  return bundleEditorAction(request, null);
}

export default function NewBundleRoute() {
  const { initial } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return <BundleEditorPage initial={initial} errors={actionData?.errors} serverMessage={actionData?.message} />;
}

export const headers: HeadersFunction = (args) => boundary.headers(args);
