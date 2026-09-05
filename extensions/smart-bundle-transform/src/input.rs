pub mod attribute;
pub mod cart;
pub mod cost;
pub mod line;
pub mod merchandise;
pub mod metafield;
pub mod money;
pub mod product;
pub mod rules;
pub mod slot;
pub mod memberships;

#[derive(serde::Deserialize)]
pub struct Input { pub cart: cart::Cart }
