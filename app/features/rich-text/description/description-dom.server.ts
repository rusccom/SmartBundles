import { Window } from "happy-dom";
import { normalizeDescriptionDom } from "./description-dom";

const SETTINGS = {
  disableJavaScriptEvaluation: true,
  disableJavaScriptFileLoading: true,
  disableCSSFileLoading: true,
  disableIframePageLoading: true,
  disableComputedStyleRendering: true,
};

export function normalizeDescriptionHtmlServer(html: string): string {
  const window = new Window({ settings: SETTINGS });
  try {
    window.document.body.innerHTML = html;
    return normalizeDescriptionDom(window.document.body as unknown as Element);
  } finally {
    window.happyDOM.abort();
    window.happyDOM.close();
  }
}
