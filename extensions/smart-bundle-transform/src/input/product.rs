#[derive(Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Product { pub bundle_runtime: Option<super::metafield::Metafield<serde_json::Value>> }
