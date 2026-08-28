import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor } from "@tiptap/react";
import type { DescriptionEditorProps } from "./DescriptionEditor";
import type { DescriptionEditorInstance } from "./description-editor.types";
import { descriptionExtensions } from "./description-extensions";
import { sanitizeDescriptionClient } from "./description-sanitize.client";

interface DescriptionSync {
  ready: boolean;
  running: boolean;
  value: string;
  onChange: DescriptionEditorProps["onChange"];
}

export function useDescriptionEditor(input: DescriptionEditorProps) {
  const [htmlMode, setHtmlMode] = useState(false);
  const sync = useDescriptionSync(input.onChange);
  const editor = useDescriptionTiptap(input, sync);
  useEffect(() => syncExternalValue(editor, input.value, htmlMode, sync),
    [editor, htmlMode, input.value, sync]);
  useEffect(() => editor?.setEditable(!input.disabled), [editor, input.disabled]);
  const toggleMode = useCallback(() =>
    toggleDescriptionMode(editor, input, htmlMode, setHtmlMode), [editor, htmlMode, input]);
  const setRawValue = useCallback((value: string) => input.onChange(value), [input]);
  return { editor, htmlMode, toggleMode, setRawValue };
}

function useDescriptionSync(onChange: DescriptionEditorProps["onChange"]) {
  const sync = useRef<DescriptionSync>({
    ready: false, running: false, value: "", onChange,
  });
  useEffect(() => { sync.current.onChange = onChange; }, [onChange, sync]);
  return sync;
}

function useDescriptionTiptap(
  input: DescriptionEditorProps,
  sync: React.MutableRefObject<DescriptionSync>,
) {
  return useEditor({
    immediatelyRender: false,
    extensions: descriptionExtensions,
    content: "",
    editorProps: { attributes: editorAttributes(Boolean(input.error)) },
    onUpdate: ({ editor }) => applyEditorUpdate(editor, sync.current),
  });
}

function applyEditorUpdate(
  editor: DescriptionEditorInstance,
  sync: DescriptionSync,
): void {
  if (!editor.isEditable || !sync.ready || sync.running) return;
  const next = sanitizeDescriptionClient(editor.getHTML());
  if (next === sync.value) return;
  sync.value = next;
  sync.onChange(next);
}

function syncExternalValue(
  editor: DescriptionEditorInstance | null,
  value: string,
  htmlMode: boolean,
  sync: React.MutableRefObject<DescriptionSync>,
): void {
  if (!editor || htmlMode) return;
  const next = sanitizeDescriptionClient(value);
  sync.current.running = true;
  if (sanitizeDescriptionClient(editor.getHTML()) !== next) {
    editor.chain().setContent(next, { emitUpdate: false }).setMeta("addToHistory", false).run();
  }
  sync.current = {
    ready: true, running: false, value: next, onChange: sync.current.onChange,
  };
}

function toggleDescriptionMode(
  editor: DescriptionEditorInstance | null,
  input: DescriptionEditorProps,
  htmlMode: boolean,
  setHtmlMode: React.Dispatch<React.SetStateAction<boolean>>,
): void {
  if (!editor) return;
  if (!htmlMode) return setHtmlMode(true);
  const visual = loadVisualContent(editor, input.value);
  if (visual !== input.value) input.onChange(visual);
  setHtmlMode(false);
}

function loadVisualContent(editor: DescriptionEditorInstance, raw: string): string {
  const visual = sanitizeDescriptionClient(raw);
  editor.chain().setContent(visual, { emitUpdate: false }).setMeta("addToHistory", false).run();
  return sanitizeDescriptionClient(editor.getHTML());
}

function editorAttributes(hasError: boolean): Record<string, string> {
  const attributes = {
    class: "sb-description-surface",
    id: "sb-description-input",
    role: "textbox",
    "aria-multiline": "true",
    "aria-labelledby": "sb-description-label",
    "aria-invalid": hasError ? "true" : "false",
  };
  return hasError ? { ...attributes, "aria-describedby": "sb-description-error" } : attributes;
}
