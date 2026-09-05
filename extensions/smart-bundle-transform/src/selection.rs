use crate::{money, validation::*, BundleResult, Json};
use serde_json::json;
use std::collections::{BTreeMap, BTreeSet};

pub fn resolve(line: &crate::input::line::Line, runtime: &Json) -> BundleResult<Vec<Json>> {
    let selection = attribute(line)?;
    if !exact_keys(&selection, &["s"]) { return Err("Invalid bundle selection."); }
    let selectors = array(&runtime["s"])?;
    selector_count(selectors.len())?;
    let pairs = selected_pairs(&selection["s"], selectors.len())?;
    let mut totals = BTreeMap::new();
    let mut keys = BTreeSet::new();
    for selector in selectors {
        let key = integer(&selector["k"])?;
        if !keys.insert(key) { return Err("Duplicate bundle selector."); }
        let selected = pairs.get(&key).ok_or("Missing bundle component.")?;
        let component = resolve_option(selector, selected, array(&runtime["c"])?)?;
        let total = totals.entry(selected.to_string()).or_insert(0u64);
        *total += quantity(&component[1])?;
        if *total > 2000 { return Err("Bundle quantity exceeds Shopify's limit."); }
    }
    Ok(totals.into_iter().map(|(id, quantity)| json!({ "merchandiseId": id, "quantity": quantity })).collect())
}

fn selected_pairs(value: &Json, count: usize) -> BundleResult<BTreeMap<u64, &str>> {
    let pairs = array(value)?;
    if pairs.len() != count { return Err("Missing bundle selection."); }
    let mut selected = BTreeMap::new();
    for pair in pairs {
        if array(pair)?.len() != 2 { return Err("Invalid bundle selection."); }
        if selected.insert(integer(&pair[0])?, variant(&pair[1])?).is_some() { return Err("Duplicate selection."); }
    }
    Ok(selected)
}

fn resolve_option<'a>(selector: &Json, selected: &str, components: &'a [Json]) -> BundleResult<&'a Json> {
    if money::percent(&selector["d"])? != 0 { return Err("Invalid fixed bundle discount."); }
    let options = array(&selector["o"])?;
    if options.is_empty() { return Err("Empty bundle selector."); }
    let mut ids = BTreeSet::new();
    let mut resolved = None;
    for index in options {
        let component = components.get(integer(index)? as usize).ok_or("Invalid bundle option.")?;
        let id = format!("gid://shopify/ProductVariant/{}", text(&component[0])?);
        if !ids.insert(id.clone()) { return Err("Duplicate bundle variant."); }
        if id == selected { resolved = Some(component); }
    }
    resolved.ok_or("Variant is not allowed in this bundle.")
}
