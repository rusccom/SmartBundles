import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { renderToPipeableStream } from "react-dom/server";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import { startMaintenanceWorker } from "./features/operations/maintenance-worker.server";
import { addDocumentResponseHeaders } from "./shopify.server";

startMaintenanceWorker();

export const streamTimeout = 5_000;

interface RenderInput {
  context: EntryContext;
  headers: Headers;
  status: number;
  url: string;
  waitForAll: boolean;
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
) {
  addDocumentResponseHeaders(request, responseHeaders);
  return streamResponse({
    context: reactRouterContext,
    headers: responseHeaders,
    status: responseStatusCode,
    url: request.url,
    waitForAll: isbot(request.headers.get("user-agent") ?? ""),
  });
}

function streamResponse(input: RenderInput): Promise<Response> {
  return new Promise((resolve, reject) => {
    const callback = input.waitForAll ? "onAllReady" : "onShellReady";
    const stream = renderToPipeableStream(
      <ServerRouter context={input.context} url={input.url} />,
      {
        [callback]: () => resolveStream(stream.pipe, input, resolve),
        onShellError: reject,
        onError: (error) => recordRenderError(error, input),
      },
    );
    setTimeout(stream.abort, streamTimeout + 1_000);
  });
}

function resolveStream(
  pipe: ReturnType<typeof renderToPipeableStream>["pipe"],
  input: RenderInput,
  resolve: (response: Response) => void,
): void {
  const body = new PassThrough();
  input.headers.set("Content-Type", "text/html");
  resolve(new Response(createReadableStreamFromReadable(body), {
    headers: input.headers,
    status: input.status,
  }));
  pipe(body);
}

function recordRenderError(error: unknown, input: RenderInput): void {
  input.status = 500;
  console.error(error);
}
