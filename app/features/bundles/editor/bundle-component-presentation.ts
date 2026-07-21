import type { EditorSelector } from "./editor.types";

export function isSimpleBundleComponent(selector: Pick<EditorSelector, "options">): boolean {
  return selector.options.length === 1;
}
