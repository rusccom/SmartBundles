import type { ErrorEvent, ErrorSink } from "./error.types";

const sinks = new Map<string, ErrorSink>();

export function registerErrorSink(name: string, sink: ErrorSink): () => void {
  sinks.set(name, sink);
  return () => { sinks.delete(name); };
}

export function hasErrorSinks(): boolean {
  return sinks.size > 0;
}

export async function publishError(event: ErrorEvent): Promise<void> {
  const results = await Promise.allSettled([...sinks.values()].map(async (sink) => sink(event)));
  if (results.some(({ status }) => status === "rejected")) {
    console.error(JSON.stringify({ code: "ERROR_SINK_FAILED", incidentId: event.id }));
  }
}
