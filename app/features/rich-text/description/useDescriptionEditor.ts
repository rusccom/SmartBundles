import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor } from "@tiptap/react";
import type { DescriptionEditorProps } from "./DescriptionEditor";
import type { DescriptionEditorInstance } from "./description-editor.types";
import { descriptionExtensions } from "./description-extensions";
import { sanitizeDescriptionClient } from "./description-sanitize.client";

const NORMALIZED = "Visual editing normalizes this HTML to the supported formatting when you change the description.";

interface DescriptionUiState {
  canonicalValue: string;
  htmlMode: boolean;
  warning: string;
}

interface DescriptionSync {
  ready: boolean;
  running: boolean;
  value: string;
}

export function useDescriptionEditor(input: DescriptionEditorProps) {
  const [ui, setUi] = useState(() => initialUi(input.value));
  const sync = useRef<DescriptionSync>({ ready: false, running: false, value: "" });
  const current = !input.dirty && ui.canonicalValue !== input.value
    ? initialUi(input.value) : ui;
  if (current !== ui) setUi(current);
  const editor = useDescriptionTiptap(input, sync);
  useEffect(() => syncExternalValue(editor, input.value, current.htmlMode, sync),
    [current.htmlMode, editor, input.value, sync]);
  useEffect(() => editor?.setEditable(!input.disabled), [editor, input.disabled]);
  const toggleMode = useCallback(() =>
    toggleDescriptionMode(editor, input, current, setUi), [current, editor, input]);
  const setRawValue = useCallback((value: string) => {
    input.onChange(value, true);
    setUi((state) => ({ ...state, warning: "" }));
  }, [input]);
  return { editor, htmlMode: current.htmlMode, warning: current.warning,
    toggleMode, setRawValue };
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
    onUpdate: ({ editor }) => applyEditorUpdate(editor, input, sync.current),
  });
}

function applyEditorUpdate(
  editor: DescriptionEditorInstance,
  input: DescriptionEditorProps,
  sync: DescriptionSync,
): void {
  if (!editor.isEditable || !sync.ready || sync.running) return;
  const next = sanitizeDescriptionClient(editor.getHTML());
  if (!input.dirty && next === sync.value) return;
  input.onChange(next, true);
}

function syncExternalValue(
  editor: DescriptionEditorInstance | null,
  value: string, htmlMode: boolean,
  sync: React.MutableRefObject<DescriptionSync>,
): void {
  if (!editor || htmlMode) return;
  const current = sanitizeDescriptionClient(editor.getHTML()), next = sanitizeDescriptionClient(value);
  sync.current.running = true;
  try {
    if (current !== next) {
      editor.chain().setContent(next, { emitUpdate: false }).setMeta("addToHistory", false).run();
    }
  }
  finally {
    sync.current = {
      ready: true, running: false,
      value: sanitizeDescriptionClient(editor.getHTML()),
    };
  }
}

function toggleDescriptionMode(
  editor: DescriptionEditorInstance | null,
  input: DescriptionEditorProps,
  ui: DescriptionUiState,
  setUi: React.Dispatch<React.SetStateAction<DescriptionUiState>>,
): void {
  if (!editor) return;
  if (!ui.htmlMode) {
    setUi({ ...ui, htmlMode: true, warning: "" });
    return;
  }
  const visual = loadVisualContent(editor, input.value);
  if (input.dirty) input.onChange(visual, true);
  setUi({ ...ui, htmlMode: false, warning: normalizationWarning(input.value, visual) });
}

function loadVisualContent(editor: DescriptionEditorInstance, raw: string): string {
  const visual = sanitizeDescriptionClient(raw);
  editor.chain().setContent(visual, { emitUpdate: false }).setMeta("addToHistory", false).run();
  return sanitizeDescriptionClient(editor.getHTML());
}

function initialUi(value: string): DescriptionUiState {
  const visual = sanitizeDescriptionClient(value);
  return { canonicalValue: value, htmlMode: false, warning: normalizationWarning(value, visual) };
}

function normalizationWarning(raw: string, visual: string): string {
  return raw === visual ? "" : NORMALIZED;
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
