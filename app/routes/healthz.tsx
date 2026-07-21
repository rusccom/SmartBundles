import type { LoaderFunctionArgs } from "react-router";

export function loader({ request }: LoaderFunctionArgs): Response {
  if (!allowsProbe(request.method)) return new Response(null, { status: 405 });
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}

function allowsProbe(method: string): boolean {
  return method === "GET" || method === "HEAD";
}
