import { STOREFRONT_TEXT_GROUPS } from "../storefront-text-fields";
import type { StorefrontTextKey, StorefrontTexts } from "../storefront-text.types";
import { StorefrontTextGroup } from "./StorefrontTextGroup";

export interface StorefrontTextGroupsProps {
  texts: StorefrontTexts;
  errors: Record<string, string>;
  onChange: (key: StorefrontTextKey, value: string) => void;
}

export function StorefrontTextGroups(props: StorefrontTextGroupsProps) {
  return <>{STOREFRONT_TEXT_GROUPS.map((group) =>
    <StorefrontTextGroup key={group} group={group} texts={props.texts}
      errors={props.errors} onChange={props.onChange} />)}</>;
}
