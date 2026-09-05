#[derive(serde::Deserialize)]
pub struct Memberships { pub sv: u64, pub bundles: Vec<super::rules::Rules> }
