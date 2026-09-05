#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Metafield<T> { pub json_value: T }
