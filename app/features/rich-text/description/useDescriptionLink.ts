import { useCallback, useReducer } from "react";
import { useEditorState } from "@tiptap/react";
import type { DescriptionEditorInstance } from "./description-editor.types";
import { normalizedDescriptionHref } from "./description-url";

interface LinkDraft { open: boolean; href: string; title: string; error: string }
type LinkAction =
  | { type: "open"; value: Omit<LinkDraft, "open" | "error"> }
  | { type: "close" }
  | { type: "href" | "title" | "error"; value: string };

const INITIAL: LinkDraft = { open: false, href: "", title: "", error: "" };

export function useDescriptionLink(editor: DescriptionEditorInstance | null) {
  const active = useEditorState({ editor, selector: ({ editor: current }) => current?.isActive("link") ?? false }) ?? false;
  const [draft, dispatch] = useReducer(linkReducer, INITIAL);
  const toggle = useCallback(() => dispatch(draft.open ? { type: "close" } : { type: "open", value: currentLink(editor) }), [draft.open, editor]);
  const apply = useCallback(() => applyLink(editor, draft, dispatch), [draft, editor]);
  const remove = useCallback(() => removeLink(editor, dispatch), [editor]);
  return { active, draft, dispatch, toggle, apply, remove };
}

function linkReducer(state: LinkDraft, action: LinkAction): LinkDraft {
  if (action.type === "open") return { open: true, href: action.value.href, title: action.value.title, error: "" };
  if (action.type === "close") return { ...state, open: false, error: "" };
  return { ...state, [action.type]: action.value };
}

function currentLink(editor: DescriptionEditorInstance | null) {
  const attributes = editor?.getAttributes("link") ?? {};
  return { href: String(attributes.href ?? ""), title: String(attributes.title ?? "") };
}

function applyLink(editor: DescriptionEditorInstance | null, draft: LinkDraft, dispatch: React.Dispatch<LinkAction>): void {
  const href = normalizedDescriptionHref(draft.href);
  if (!href) {
    dispatch({ type: "error", value: "Enter an http, https, mailto, tel, or relative URL." });
    return;
  }
  editor?.chain().focus().extendMarkRange("link").setLink({ href, title: draft.title.trim() || null, target: null, rel: null }).run();
  dispatch({ type: "close" });
}

function removeLink(editor: DescriptionEditorInstance | null, dispatch: React.Dispatch<LinkAction>): void {
  editor?.chain().focus().extendMarkRange("link").unsetLink().run();
  dispatch({ type: "close" });
}
