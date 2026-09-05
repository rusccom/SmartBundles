#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Money { pub amount: String, pub currency_code: String }
