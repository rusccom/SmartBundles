import { useCallback, useEffect, useState } from "react";
import { useEditor } from "@tiptap/react";
import type { DescriptionEditorInstance } from "./description-editor.types";
import { descriptionExtensions } from "./description-extensions";
import { sanitizeDescriptionClient } from "./description-sanitize.client";
import { descriptionSourceSupportsVisual } from "./description-visual-compatibility.client";

const UNSUPPORTED = "This HTML cannot be previewed safely. Its exact source is preserved; edit it as HTML or in Shopify.";
const PREVIEW_ONLY = "Preview only: the exact Shopify HTML is preserved. Switch to HTML to edit it without reformatting.";

type VisualMode = "editable" | "preview";

interface DescriptionStateSetters {
  value: (value: string) => void;
  dirty: (value: boolean) => void;
  htmlMode: (value: boolean) => void;
  previewOnly: (value: boolean) => void;
  compatibilityError: (value: string) => void;
}

type DescriptionModeSetters = Pick<DescriptionStateSetters, "htmlMode" | "previewOnly" | "compatibilityError">;

export function useDescriptionEditor(initialValue: string, error?: string) {
  const state = useDescriptionFieldState(initialValue);
  const editor = useDescriptionTiptap(error, state.sync);
  const reset = state.reset;
  useEffect(() => reset(editor, initialValue), [editor, initialValue, reset]);
  useEffect(() => editor?.setEditable(!state.previewOnly, false), [editor, state.previewOnly]);
  const toggleMode = useCallback(() => toggleDescriptionMode(
    editor, state.value, state.htmlMode, {
      htmlMode: state.setHtmlMode, previewOnly: state.setPreviewOnly,
      compatibilityError: state.setCompatibilityError,
    },
  ), [editor, state.htmlMode, state.setCompatibilityError, state.setHtmlMode,
    state.setPreviewOnly, state.value]);
  return { editor, value: state.value, setRawValue: state.setRawValue, dirty: state.dirty,
    htmlMode: state.htmlMode, previewOnly: state.previewOnly,
    toggleMode, compatibilityError: state.compatibilityError };
}

function useDescriptionFieldState(initialValue: string) {
  const [value, setValue] = useState(initialValue);
  const [htmlMode, setHtmlMode] = useState(false), [dirty, setDirty] = useState(false);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [compatibilityError, setCompatibilityError] = useState("");
  const sync = useCallback((editor: DescriptionEditorInstance) => syncEditorValue(editor, setValue, setDirty), []);
  const reset = useCallback((editor: DescriptionEditorInstance | null, initial: string) => resetDescription(editor, initial, {
    value: setValue, dirty: setDirty, htmlMode: setHtmlMode, previewOnly: setPreviewOnly,
    compatibilityError: setCompatibilityError,
  }), []);
  const setRawValue = useCallback((raw: string) => {
    setValue(raw);
    setDirty(true);
    setPreviewOnly(false);
    setCompatibilityError("");
  }, []);
  return { value, htmlMode, previewOnly, dirty, compatibilityError, sync, reset,
    setRawValue, setHtmlMode, setPreviewOnly, setCompatibilityError };
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
  const visual = visualMode(editor, initialValue);
  setters.value(initialValue);
  setters.dirty(false);
  setters.htmlMode(visual === null);
  setters.previewOnly(visual === "preview");
  setters.compatibilityError(visualMessage(visual));
}

function toggleDescriptionMode(
  editor: DescriptionEditorInstance | null,
  value: string,
  htmlMode: boolean,
  setters: DescriptionModeSetters,
): void {
  if (!editor) return;
  if (!htmlMode) return showHtmlMode(setters);
  const visual = visualMode(editor, value);
  setters.compatibilityError(visualMessage(visual));
  setters.previewOnly(visual === "preview");
  if (visual !== null) setters.htmlMode(false);
}

function visualMode(editor: DescriptionEditorInstance, raw: string): VisualMode | null {
  if (!descriptionSourceSupportsVisual(raw)) return null;
  const sanitized = sanitizeDescriptionClient(raw);
  editor.chain().setContent(sanitized, { emitUpdate: false }).setMeta("addToHistory", false).run();
  const generated = sanitizeDescriptionClient(editor.getHTML());
  return raw === "" || (sanitized === raw && generated === raw) ? "editable" : "preview";
}

function showHtmlMode(setters: DescriptionModeSetters): void {
  setters.htmlMode(true);
  setters.previewOnly(false);
  setters.compatibilityError("");
}

function visualMessage(mode: VisualMode | null): string {
  if (mode === null) return UNSUPPORTED;
  return mode === "preview" ? PREVIEW_ONLY : "";
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
