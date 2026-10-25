import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getBundleShopId } from "../features/bundles/bundle-repository.server";
import { errorStatus, listErrorIncidents, setErrorIncidentStatus } from "../features/errors/error-repository.server";
import { ErrorsPage } from "../features/errors/ErrorsPage";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shopId = await getBundleShopId(session.shop);
  const status = errorStatus(new URL(request.url).searchParams.get("status")) ?? "OPEN";
  return { status, incidents: await listErrorIncidents(shopId, status) };
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shopId = await getBundleShopId(session.shop);
  const form = await request.formData();
  const status = errorStatus(form.get("status"));
  const id = form.get("id");
  if (!status || typeof id !== "string" || !/^[\da-f-]{36}$/i.test(id)) return data({ error: "Invalid incident." }, { status: 400 });
  const result = await setErrorIncidentStatus(shopId, id, status);
  return data({ updated: result.count === 1 }, { status: result.count ? 200 : 404 });
}

export default function ErrorsRoute() {
  return <ErrorsPage {...useLoaderData<typeof loader>()} />;
}
