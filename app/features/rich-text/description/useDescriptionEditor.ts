import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor } from "@tiptap/react";
import type { DescriptionEditorProps } from "./DescriptionEditor";
import type { DescriptionEditorInstance } from "./description-editor.types";
import { descriptionExtensions } from "./description-extensions";
import { sanitizeDescriptionClient } from "./description-sanitize.client";

const NORMALIZED = "Visual editing normalizes this HTML to the supported formatting.";

interface DescriptionSync {
  ready: boolean;
  running: boolean;
  value: string;
  onChange: DescriptionEditorProps["onChange"];
}

export function useDescriptionEditor(input: DescriptionEditorProps) {
  const [ui, setUi] = useState(() => ({
    htmlMode: false,
    warning: normalizationWarning(input.value),
  }));
  const sync = useDescriptionSync(input.onChange);
  const editor = useDescriptionTiptap(input, sync);
  useEffect(() => syncExternalValue(editor, input.value, ui.htmlMode, sync),
    [editor, input.value, ui.htmlMode, sync]);
  useEffect(() => editor?.setEditable(!input.disabled), [editor, input.disabled]);
  const toggleMode = useCallback(() =>
    toggleDescriptionMode(editor, input, ui.htmlMode, setUi), [editor, input, ui.htmlMode]);
  const setRawValue = useCallback((value: string) => {
    input.onChange(value);
    setUi((state) => ({ ...state, warning: "" }));
  }, [input]);
  return { editor, ...ui, toggleMode, setRawValue };
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
  setUi: React.Dispatch<React.SetStateAction<{ htmlMode: boolean; warning: string }>>,
): void {
  if (!editor) return;
  if (!htmlMode) return setUi((state) => ({ ...state, htmlMode: true }));
  const visual = loadVisualContent(editor, input.value);
  if (visual !== input.value) input.onChange(visual);
  setUi({ htmlMode: false, warning: visual === input.value ? "" : NORMALIZED });
}

function loadVisualContent(editor: DescriptionEditorInstance, raw: string): string {
  const visual = sanitizeDescriptionClient(raw);
  editor.chain().setContent(visual, { emitUpdate: false }).setMeta("addToHistory", false).run();
  return sanitizeDescriptionClient(editor.getHTML());
}

function normalizationWarning(value: string): string {
  return value === sanitizeDescriptionClient(value) ? "" : NORMALIZED;
}

function editorAttributes(hasError: boolean): Record<string, string> {
  return {
    class: "sb-description-surface",
    id: "sb-description-input",
    role: "textbox",
    "aria-multiline": "true",
    "aria-labelledby": "sb-description-label",
    "aria-describedby": "sb-description-help sb-description-warning sb-description-error",
    "aria-invalid": hasError ? "true" : "false",
  };
}
