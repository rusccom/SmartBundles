import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  if (!allowsProbe(request.method)) return new Response(null, { status: 405 });
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ready" }, responseInit(200));
  } catch {
    return Response.json({ status: "unavailable" }, responseInit(503));
  }
}

function allowsProbe(method: string): boolean {
  return method === "GET" || method === "HEAD";
}

function responseInit(status: number): ResponseInit {
  return { status, headers: { "Cache-Control": "no-store" } };
}
