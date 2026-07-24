import { useCallback, useEffect, useState } from "react";
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

export function useDescriptionEditor(input: DescriptionEditorProps) {
  const [ui, setUi] = useState(() => initialUi(input.value));
  const current = !input.dirty && ui.canonicalValue !== input.value
    ? initialUi(input.value) : ui;
  if (current !== ui) setUi(current);
  const editor = useDescriptionTiptap(input);
  useEffect(() => syncExternalValue(editor, input.value, current.htmlMode),
    [current.htmlMode, editor, input.value]);
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

function useDescriptionTiptap(input: DescriptionEditorProps) {
  return useEditor({
    immediatelyRender: false,
    extensions: descriptionExtensions,
    content: "",
    editorProps: { attributes: editorAttributes(Boolean(input.error)) },
    onUpdate: ({ editor }) => applyEditorUpdate(editor, input),
  });
}

function applyEditorUpdate(
  editor: DescriptionEditorInstance,
  input: DescriptionEditorProps,
): void {
  if (!editor.isEditable) return;
  const next = sanitizeDescriptionClient(editor.getHTML());
  if (!input.dirty && next === sanitizeDescriptionClient(input.value)) return;
  input.onChange(next, true);
}

function syncExternalValue(
  editor: DescriptionEditorInstance | null,
  value: string,
  htmlMode: boolean,
): void {
  if (!editor || htmlMode) return;
  const current = sanitizeDescriptionClient(editor.getHTML());
  const next = sanitizeDescriptionClient(value);
  if (current === next) return;
  editor.chain().setContent(next, { emitUpdate: false }).setMeta("addToHistory", false).run();
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
