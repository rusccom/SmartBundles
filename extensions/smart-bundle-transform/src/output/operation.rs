#[derive(serde::Serialize)]
#[serde(untagged)]
pub enum Operation { Merge(super::merge_operation::MergeOperation), Expand(serde_json::Value) }
