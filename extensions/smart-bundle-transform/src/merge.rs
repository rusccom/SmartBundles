use crate::{input::line::Line, member::Member, membership, pricing, BundleResult};
use crate::output::{cart_line::CartLine, merge::Merge, merge_operation::MergeOperation, operation::Operation};
use serde_json::json;
use std::collections::{BTreeMap, BTreeSet};

pub fn operations(lines: &[Line]) -> BundleResult<Vec<Operation>> {
    let mut groups: BTreeMap<(String, String), Vec<Member<'_>>> = BTreeMap::new();
    for line in lines {
        if line.merchandise.typename != "ProductVariant" || line.bundle_selection.is_none() { continue; }
        if line.merchandise.product.bundle_runtime.is_some() { continue; }
        let member = membership::read(line)?;
        let key = (member.marker.b.clone(), member.marker.g.clone());
        groups.entry(key).or_default().push(member);
    }
    groups.values().map(|members| operation(members)).collect()
}

fn operation(members: &[Member<'_>]) -> BundleResult<Operation> {
    validate_group(members)?;
    let first = &members[0];
    let lines = members.iter().map(|member| CartLine { cart_line_id: member.line.id.clone(), quantity: member.line.quantity }).collect();
    let marker = json!({ "b": first.marker.b, "g": first.marker.g }).to_string();
    let merge = Merge { parent_variant_id: first.rules.p.clone(), cart_lines: lines,
        attributes: vec![json!({ "key": "_sb", "value": marker })], price: pricing::adjustment(members)? };
    Ok(Operation::Merge(MergeOperation { lines_merge: merge }))
}

fn validate_group(members: &[Member<'_>]) -> BundleResult<()> {
    let first = &members[0];
    membership::validate_rules(first.rules)?;
    let mut keys = BTreeSet::new();
    let mut quantities = BTreeMap::new();
    for member in members {
        if !same_rules(member, first) { return Err("Stale bundle composition."); }
        for slot in &member.slots {
            if !keys.insert(slot.k) { return Err("Duplicate bundle slot."); }
        }
        let quantity = quantities.entry(&member.line.merchandise.id).or_insert(0u64);
        *quantity += member.quantity;
        if *quantity > 2000 { return Err("Bundle quantity exceeds Shopify's limit."); }
    }
    if keys.len() != first.rules.n { return Err("Incomplete bundle composition."); }
    Ok(())
}

fn same_rules(member: &Member<'_>, first: &Member<'_>) -> bool {
    member.count == first.count && member.rules.r == first.rules.r && member.rules.p == first.rules.p
        && member.rules.n == first.rules.n && member.rules.d == first.rules.d
}
