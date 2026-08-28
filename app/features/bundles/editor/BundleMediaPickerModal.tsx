import type { BundleMediaCandidate } from "./bundle-media.types";

export const BUNDLE_MEDIA_PICKER_ID = "bundle-media-picker";

export interface BundleMediaPickerModalProps {
  candidates: BundleMediaCandidate[];
  selectedUrl?: string;
  onSelect: (candidate: BundleMediaCandidate) => void;
}

export function BundleMediaPickerModal(props: BundleMediaPickerModalProps) {
  const select = (candidate: BundleMediaCandidate) => {
    props.onSelect(candidate);
    closePicker();
  };
  return <s-modal id={BUNDLE_MEDIA_PICKER_ID} heading="Choose a component image" size="large">
    <div className="sb-media-picker-grid">
      {props.candidates.map((candidate) => <button type="button"
        className="sb-media-picker-item" key={candidate.productId}
        aria-label={`Use image from ${candidate.title}`}
        aria-pressed={candidate.url === props.selectedUrl}
        onClick={() => select(candidate)}>
        <img src={candidate.url} alt="" />
        <span>{candidate.title}</span>
      </button>)}
    </div>
    <s-button slot="secondary-actions" command="--hide"
      commandFor={BUNDLE_MEDIA_PICKER_ID}>Cancel</s-button>
  </s-modal>;
}

function closePicker(): void {
  const modal = document.getElementById(BUNDLE_MEDIA_PICKER_ID) as HTMLElementTagNameMap["s-modal"] | null;
  modal?.hideOverlay();
}
