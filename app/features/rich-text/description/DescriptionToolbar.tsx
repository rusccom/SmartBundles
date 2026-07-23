import type { DescriptionEditorInstance } from "./description-editor.types";
import { DescriptionAlignControls } from "./DescriptionAlignControls";
import { DescriptionBlockSelect } from "./DescriptionBlockSelect";
import { DescriptionHistoryControls } from "./DescriptionHistoryControls";
import { DescriptionInlineControls } from "./DescriptionInlineControls";
import { DescriptionLinkControl } from "./DescriptionLinkControl";
import { DescriptionListControls } from "./DescriptionListControls";
import { DescriptionToolbarButton } from "./DescriptionToolbarButton";

export interface DescriptionToolbarProps {
  editor: DescriptionEditorInstance | null;
  htmlMode: boolean;
  onToggleMode: () => void;
}

export function DescriptionToolbar({ editor, htmlMode, onToggleMode }: DescriptionToolbarProps) {
  const control = { editor, disabled: htmlMode };
  return <div className="sb-description-toolbar" role="toolbar" aria-label="Description formatting">
    <DescriptionBlockSelect {...control} />
    <DescriptionInlineControls {...control} />
    <DescriptionListControls {...control} />
    <DescriptionLinkControl {...control} />
    <DescriptionAlignControls {...control} />
    <DescriptionHistoryControls {...control} />
    <DescriptionToolbarButton label={htmlMode ? "Show editor" : "Show HTML"} content="</>" pressed={htmlMode} onPress={onToggleMode} />
  </div>;
}
