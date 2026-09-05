#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Merge {
    pub parent_variant_id: String,
    pub cart_lines: Vec<super::cart_line::CartLine>,
    pub attributes: Vec<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub price: Option<serde_json::Value>,
}
