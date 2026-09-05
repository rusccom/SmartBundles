#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Merchandise {
    #[serde(rename = "__typename")]
    pub typename: String,
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub product: super::product::Product,
    pub bundle_memberships: Option<super::metafield::Metafield<super::memberships::Memberships>>,
}
