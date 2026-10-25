import type { BundleMediaCandidate } from "./bundle-media.types";
import { BundleMediaCandidateCard } from "./BundleMediaCandidateCard";

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
    <s-grid gridTemplateColumns="repeat(auto-fill, minmax(140px, 1fr))" gap="base">
      {props.candidates.map((candidate) => <BundleMediaCandidateCard key={candidate.productId}
        candidate={candidate} selected={candidate.url === props.selectedUrl} onSelect={select} />)}
    </s-grid>
    <s-button slot="secondary-actions" command="--hide"
      commandFor={BUNDLE_MEDIA_PICKER_ID}>Cancel</s-button>
  </s-modal>;
}

function closePicker(): void {
  const modal = document.getElementById(BUNDLE_MEDIA_PICKER_ID) as HTMLElementTagNameMap["s-modal"] | null;
  modal?.hideOverlay();
}
