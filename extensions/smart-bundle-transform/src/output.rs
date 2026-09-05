pub mod cart_line;
pub mod merge;
pub mod merge_operation;
pub mod operation;

#[derive(serde::Serialize)]
pub struct Output { pub operations: Vec<operation::Operation> }
