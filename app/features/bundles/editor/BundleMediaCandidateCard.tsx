import type { BundleMediaCandidate } from "./bundle-media.types";

interface BundleMediaCandidateCardProps {
  candidate: BundleMediaCandidate;
  selected: boolean;
  onSelect: (candidate: BundleMediaCandidate) => void;
}

export function BundleMediaCandidateCard({ candidate, selected, onSelect }: BundleMediaCandidateCardProps) {
  return <s-clickable padding="small" border="base" borderRadius="base" background="subdued"
    accessibilityLabel={`${selected ? "Selected image. " : ""}Use image from ${candidate.title}`}
    onClick={() => onSelect(candidate)}>
    <s-stack gap="small">
      <s-image src={candidate.url} alt={`Image of ${candidate.title}`} aspectRatio="1" objectFit="contain" />
      <s-text>{candidate.title}</s-text>
      {selected ? <s-badge icon="check">Selected</s-badge> : null}
    </s-stack>
  </s-clickable>;
}
