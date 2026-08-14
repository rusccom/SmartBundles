import coreScript from "../../../../extensions/smart-bundle-theme/assets/smart-bundle-core.js?raw";
import formGuardScript from "../../../../extensions/smart-bundle-theme/assets/smart-bundle-form-guard.js?raw";
// eslint-disable-next-line import/default
import priceScript from "../../../../extensions/smart-bundle-theme/assets/smart-bundle-price.js?raw";
import pricingScript from "../../../../extensions/smart-bundle-theme/assets/smart-bundle-pricing.js?raw";
import bundleScript from "../../../../extensions/smart-bundle-theme/assets/smart-bundle.js?raw";
import storefrontStyles from "../../../../extensions/smart-bundle-theme/assets/smart-bundle.css?raw";
import pageStyles from "./bundle-preview-page.css?raw";

export const PREVIEW_STYLES = `${pageStyles}\n${storefrontStyles}`;

export const PREVIEW_SCRIPTS = [
  coreScript, priceScript, pricingScript, formGuardScript, bundleScript,
];
