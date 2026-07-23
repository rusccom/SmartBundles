import { useCallback, useEffect, useState } from "react";
import { Form, useBeforeUnload, useBlocker, useNavigation } from "react-router";
import type { StorefrontTextKey, StorefrontTexts } from "../storefront-text.types";
import { StorefrontTextFormActions } from "./StorefrontTextFormActions";
import { StorefrontTextGroups } from "./StorefrontTextGroups";

export interface StorefrontTextSettings {
  textVersion: number;
  texts: StorefrontTexts;
}

export interface StorefrontTextFormProps {
  settings: StorefrontTextSettings;
  errors: Record<string, string>;
  message?: string;
}

export function StorefrontTextForm(props: StorefrontTextFormProps) {
  const state = useTextFormState(props.settings);
  return <Form method="post" className="sb-settings-form" aria-busy={state.busy}>
    <input type="hidden" name="expectedTextVersion" value={props.settings.textVersion} />
    {props.message ? <s-banner tone="critical">{props.message}</s-banner> : null}
    {props.errors.form ? <s-banner tone="critical">{props.errors.form}</s-banner> : null}
    <fieldset disabled={state.busy} className="sb-settings-fieldset">
      <legend className="sb-settings-visually-hidden">Storefront texts</legend>
      <StorefrontTextGroups texts={state.texts} errors={props.errors} onChange={state.changeText} />
    </fieldset>
    <StorefrontTextFormActions dirty={state.dirty} busy={state.busy} />
  </Form>;
}

function useTextFormState(settings: StorefrontTextSettings) {
  const [texts, setTexts] = useState(settings.texts);
  const busy = useNavigation().state !== "idle";
  const dirty = JSON.stringify(texts) !== JSON.stringify(settings.texts);
  useUnsavedTextWarning(dirty, busy);
  const changeText = (key: StorefrontTextKey, value: string) =>
    setTexts((current) => ({ ...current, [key]: value }));
  return { texts, dirty, busy, changeText };
}

function useUnsavedTextWarning(dirty: boolean, busy: boolean) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && !busy && locationKey(currentLocation) !== locationKey(nextLocation));
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("Discard unsaved storefront text changes?")) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  useBeforeUnload(useCallback((event) => {
    if (!dirty || busy) return;
    event.preventDefault();
    event.returnValue = "";
  }, [dirty, busy]));
}

function locationKey(location: { pathname: string; search: string; hash: string }): string {
  return `${location.pathname}${location.search}${location.hash}`;
}
