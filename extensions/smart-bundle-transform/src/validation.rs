use crate::{BundleResult, Json};

pub fn array(value: &Json) -> BundleResult<&Vec<Json>> { value.as_array().ok_or("Invalid bundle array.") }
pub fn text(value: &Json) -> BundleResult<&str> { value.as_str().ok_or("Invalid bundle text.") }

pub fn integer(value: &Json) -> BundleResult<u64> {
    let number = value.as_f64().ok_or("Invalid bundle integer.")?;
    if number < 0.0 || number.fract() != 0.0 || number > 9_007_199_254_740_991.0 { return Err("Invalid bundle integer."); }
    Ok(number as u64)
}

pub fn quantity(value: &Json) -> BundleResult<u64> {
    let quantity = integer(value)?;
    if !(1..=2000).contains(&quantity) { return Err("Invalid bundle quantity."); }
    Ok(quantity)
}

pub fn variant(value: &Json) -> BundleResult<&str> {
    variant_id(text(value)?)
}

pub fn variant_id(id: &str) -> BundleResult<&str> {
    let token = id.strip_prefix("gid://shopify/ProductVariant/").ok_or("Invalid variant.")?;
    if token.starts_with('0') || token.is_empty() || !token.bytes().all(|byte| byte.is_ascii_digit()) { return Err("Invalid variant."); }
    Ok(id)
}

pub fn attribute(line: &crate::input::line::Line) -> BundleResult<Json> {
    let value = &line.bundle_selection.as_ref().ok_or("Missing bundle selection.")?.value;
    if value.len() > 8000 { return Err("Bundle selection is too large."); }
    serde_json::from_str(value).map_err(|_| "Invalid bundle selection.")
}

pub fn exact_keys(value: &Json, keys: &[&str]) -> bool {
    value.as_object().is_some_and(|object| object.len() == keys.len() && keys.iter().all(|key| object.contains_key(*key)))
}

pub fn selector_count(count: usize) -> BundleResult<()> {
    if !(1..=150).contains(&count) { return Err("Invalid bundle selector count."); }
    Ok(())
}
