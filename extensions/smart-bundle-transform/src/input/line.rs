#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Line {
    pub id: String,
    pub quantity: u64,
    pub cost: super::cost::Cost,
    pub bundle_selection: Option<super::attribute::Attribute>,
    pub selling_plan_allocation: Option<serde::de::IgnoredAny>,
    pub merchandise: super::merchandise::Merchandise,
}
