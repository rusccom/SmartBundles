#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Cost { pub amount_per_quantity: super::money::Money }
