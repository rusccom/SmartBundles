#[derive(serde::Deserialize)]
pub struct Cart { pub lines: Vec<super::line::Line> }
