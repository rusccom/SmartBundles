import { useCallback, useEffect, useState } from "react";
import { useEditor } from "@tiptap/react";
import type { DescriptionEditorInstance } from "./description-editor.types";
import { descriptionExtensions } from "./description-extensions";
import { sanitizeDescriptionClient } from "./description-sanitize.client";

const NORMALIZED = "Visual editing normalizes this HTML to the supported formatting when you change the description.";

interface DescriptionStateSetters {
  value: (value: string) => void;
  dirty: (value: boolean) => void;
  htmlMode: (value: boolean) => void;
  warning: (value: string) => void;
}

type DescriptionModeSetters = Pick<DescriptionStateSetters, "value" | "htmlMode" | "warning">;

export function useDescriptionEditor(initialValue: string, error?: string) {
  const state = useDescriptionFieldState(initialValue);
  const editor = useDescriptionTiptap(error, state.sync);
  const reset = state.reset;
  useEffect(() => reset(editor, initialValue), [editor, initialValue, reset]);
  const toggleMode = useCallback(() => toggleDescriptionMode(
    editor, state.value, state.htmlMode, state.dirty, {
      value: state.setValue, htmlMode: state.setHtmlMode, warning: state.setWarning,
    },
  ), [editor, state.dirty, state.htmlMode, state.setHtmlMode, state.setValue,
    state.setWarning, state.value]);
  return { editor, value: state.value, setRawValue: state.setRawValue, dirty: state.dirty,
    htmlMode: state.htmlMode, toggleMode, warning: state.warning };
}

function useDescriptionFieldState(initialValue: string) {
  const [value, setValue] = useState(initialValue);
  const [htmlMode, setHtmlMode] = useState(false), [dirty, setDirty] = useState(false);
  const [warning, setWarning] = useState("");
  const sync = useCallback((editor: DescriptionEditorInstance) => syncEditorValue(editor, setValue, setDirty), []);
  const reset = useCallback((editor: DescriptionEditorInstance | null, initial: string) => resetDescription(editor, initial, {
    value: setValue, dirty: setDirty, htmlMode: setHtmlMode, warning: setWarning,
  }), []);
  const setRawValue = useCallback((raw: string) => {
    setValue(raw);
    setDirty(true);
    setWarning("");
  }, []);
  return { value, htmlMode, dirty, warning, sync, reset, setRawValue,
    setValue, setHtmlMode, setWarning };
}

function syncEditorValue(
  editor: DescriptionEditorInstance,
  setValue: (value: string) => void,
  setDirty: (value: boolean) => void,
): void {
  if (!editor.isEditable) return;
  setValue(sanitizeDescriptionClient(editor.getHTML()));
  setDirty(true);
}

function useDescriptionTiptap(
  error: string | undefined,
  sync: (editor: DescriptionEditorInstance) => void,
) {
  return useEditor({
    immediatelyRender: false,
    extensions: descriptionExtensions,
    content: "",
    editorProps: { attributes: editorAttributes(Boolean(error)) },
    onUpdate: ({ editor }) => sync(editor),
  });
}

function resetDescription(
  editor: DescriptionEditorInstance | null,
  initialValue: string,
  setters: DescriptionStateSetters,
): void {
  if (!editor) return;
  const visual = loadVisualContent(editor, initialValue);
  setters.value(initialValue);
  setters.dirty(false);
  setters.htmlMode(false);
  setters.warning(normalizationWarning(initialValue, visual));
}

function toggleDescriptionMode(
  editor: DescriptionEditorInstance | null,
  value: string,
  htmlMode: boolean,
  dirty: boolean,
  setters: DescriptionModeSetters,
): void {
  if (!editor) return;
  if (!htmlMode) return showHtmlMode(setters);
  const visual = loadVisualContent(editor, value);
  if (dirty) setters.value(visual);
  setters.warning(normalizationWarning(value, visual));
  setters.htmlMode(false);
}

function loadVisualContent(editor: DescriptionEditorInstance, raw: string): string {
  const visual = sanitizeDescriptionClient(raw);
  editor.chain().setContent(visual, { emitUpdate: false }).setMeta("addToHistory", false).run();
  return sanitizeDescriptionClient(editor.getHTML());
}

function showHtmlMode(setters: DescriptionModeSetters): void {
  setters.htmlMode(true);
  setters.warning("");
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
