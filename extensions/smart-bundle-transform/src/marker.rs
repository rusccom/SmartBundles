#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Marker { pub b: String, pub g: String, pub s: Vec<u64> }
