use crate::{input::{line::Line, rules::Rules, slot::Slot}, marker::Marker, member::Member, money, validation::*, BundleResult};

pub fn read(line: &Line) -> BundleResult<Member<'_>> {
    let marker = read_marker(line)?;
    let value = &line.merchandise.bundle_memberships.as_ref().ok_or("Unknown bundle member.")?.json_value;
    if value.sv != 1 || line.selling_plan_allocation.is_some() { return Err("Invalid bundle membership."); }
    let rules = value.bundles.iter().find(|rules| marker.b == rules.b).ok_or("Unknown bundle.")?;
    let slots = resolve_slots(&marker, rules)?;
    let quantity = slots.iter().map(|slot| slot.q).sum::<u64>();
    if quantity == 0 || quantity > 2000 || !(1..=2000).contains(&line.quantity) || line.quantity % quantity != 0 { return Err("Invalid bundle quantity."); }
    Ok(Member { line, rules, slots, marker, quantity, count: line.quantity / quantity })
}

fn read_marker(line: &Line) -> BundleResult<Marker> {
    let value = &line.bundle_selection.as_ref().ok_or("Missing bundle marker.")?.value;
    if value.len() > 8000 { return Err("Bundle marker is too large."); }
    let marker: Marker = serde_json::from_str(value).map_err(|_| "Invalid bundle marker.")?;
    if marker.b.is_empty() || marker.b.len() > 128 || marker.g.is_empty() || marker.g.len() > 64 { return Err("Invalid bundle identity."); }
    selector_count(marker.s.len())?;
    Ok(marker)
}

pub fn validate_rules(rules: &Rules) -> BundleResult<()> {
    variant_id(&rules.p)?;
    money::percent_text(&rules.d)?;
    selector_count(rules.n)?;
    if rules.r.len() != 64 || !rules.r.bytes().all(|byte| byte.is_ascii_hexdigit()) { return Err("Invalid bundle revision."); }
    Ok(())
}

fn resolve_slots<'a>(marker: &Marker, rules: &'a Rules) -> BundleResult<Vec<&'a Slot>> {
    marker.s.iter().map(|key| {
        let slot = rules.s.iter().find(|slot| slot.k == *key).ok_or("Variant is not allowed in this slot.")?;
        if !(1..=2000).contains(&slot.q) { return Err("Invalid bundle quantity."); }
        Ok(slot)
    }).collect()
}
