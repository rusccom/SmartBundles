import { useCallback, useEffect, useRef, useState } from "react";

const IGNORED_FIELDS = new Set([
  "bundleVersion",
  "contentVersionToken",
  "creationToken",
  "descriptionDirty",
]);

export function useBundleFormDirty(formRef: React.RefObject<HTMLFormElement>, reactFingerprint: string) {
  const baselineRef = useRef<string>(), checkFrameRef = useRef<number>();
  const [dirty, setDirty] = useState(false);
  const check = useCallback(() => {
    const current = formFingerprint(formRef.current);
    if (current !== undefined && baselineRef.current !== undefined) {
      setDirty(current !== baselineRef.current);
    }
  }, [formRef]);
  const scheduleCheck = useCallback(() => {
    if (checkFrameRef.current) cancelAnimationFrame(checkFrameRef.current);
    checkFrameRef.current = requestAnimationFrame(check);
  }, [check]);
  useEffect(() => setBaseline(formRef, baselineRef), [formRef]);
  useEffect(() => scheduleCheck(), [reactFingerprint, scheduleCheck]);
  useEffect(() => () => cancelFrame(checkFrameRef.current), []);
  return { dirty, scheduleCheck };
}

function setBaseline(
  formRef: React.RefObject<HTMLFormElement>,
  baselineRef: React.MutableRefObject<string | undefined>,
): () => void {
  const frame = requestAnimationFrame(() => {
    baselineRef.current = formFingerprint(formRef.current);
  });
  return () => cancelFrame(frame);
}

function formFingerprint(form: HTMLFormElement | null): string | undefined {
  if (!form) return undefined;
  const entries = Array.from(new FormData(form).entries())
    .filter(([name]) => !IGNORED_FIELDS.has(name))
    .map(([name, value]) => [name, typeof value === "string" ? value : value.name]);
  return JSON.stringify(entries);
}

function cancelFrame(frame: number | undefined): void {
  if (frame) cancelAnimationFrame(frame);
}
