#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeOperation { pub lines_merge: super::merge::Merge }
