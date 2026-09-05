use crate::{money, selection, validation::*, BundleResult, Json};
use serde_json::json;
use crate::output::operation::Operation;

pub fn operation(line: &crate::input::line::Line) -> BundleResult<Option<Operation>> {
    let variant = &line.merchandise;
    let Some(field) = &variant.product.bundle_runtime else { return Ok(None); };
    if variant.typename != "ProductVariant" { return Ok(None); }
    let runtime = &field.json_value;
    validate_header(runtime, &variant.id)?;
    if integer(&runtime["en"])? == 0 { return Ok(None); }
    if line.selling_plan_allocation.is_some() || integer(&runtime["m"])? != 0 { return Err("Invalid bundle parent."); }
    validate_dictionary(runtime)?;
    let items = selection::resolve(line, runtime)?;
    Ok(Some(Operation::Expand(json!({ "lineExpand": { "cartLineId": line.id, "expandedCartItems": items } }))))
}

fn validate_header(runtime: &Json, parent: &str) -> BundleResult<()> {
    if integer(&runtime["sv"])? != 4 || variant(&runtime["p"])? != variant_id(parent)? { return Err("Invalid bundle runtime."); }
    if integer(&runtime["en"])? > 1 { return Err("Invalid bundle status."); }
    let bundle_id = text(&runtime["b"])?;
    if bundle_id.is_empty() || bundle_id.len() > 128 { return Err("Invalid bundle identity."); }
    if integer(&runtime["en"])? == 1 { money::percent(&runtime["d"])?; }
    Ok(())
}

fn validate_dictionary(runtime: &Json) -> BundleResult<()> {
    let components = array(&runtime["c"])?;
    if components.is_empty() || components.len() > 200 { return Err("Invalid bundle components."); }
    for component in components {
        if array(component)?.len() != 2 { return Err("Invalid bundle component."); }
        variant(&json!(format!("gid://shopify/ProductVariant/{}", text(&component[0])?)))?;
        quantity(&component[1])?;
    }
    Ok(())
}
