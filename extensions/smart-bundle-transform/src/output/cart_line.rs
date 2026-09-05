#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CartLine { pub cart_line_id: String, pub quantity: u64 }
