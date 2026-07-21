export interface BundleVariantInput {
  id: string;
  title: string;
  imageUrl?: string;
  available?: boolean;
}

export interface BundleSelectorInput {
  key: number;
  label: string;
  productId: string;
  productTitle: string;
  options: BundleVariantInput[];
}

export interface BundleDraftInput {
  price: string;
  selectors: BundleSelectorInput[];
}

export interface BundleContentSubmission {
  title: string;
  descriptionHtml: string;
  descriptionDirty: boolean;
  contentVersionToken: string;
}

export interface BundleEditorSubmission {
  draft: BundleDraftInput;
  content: BundleContentSubmission;
  bundleVersion: number | null;
  creationToken: string;
}

export interface BundleValidationResult {
  data?: BundleEditorSubmission;
  errors: Record<string, string>;
}

export interface RuntimeConfig {
  sv: 1;
  rv: number;
  en: 0 | 1;
  b: string;
  p: string;
  c: Array<[string, number]>;
  s: Array<{ k: number; o: number[] }>;
}

export interface PresentationConfig {
  sv: 1;
  rv: number;
  en: 0 | 1;
  b: string;
  parentVariantId: string;
  selectors: BundleSelectorInput[];
}
