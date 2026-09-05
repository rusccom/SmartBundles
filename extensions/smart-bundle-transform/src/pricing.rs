use crate::{member::Member, money, BundleResult, Json};
use serde_json::json;

pub fn adjustment(members: &[Member<'_>]) -> BundleResult<Option<Json>> {
    let currency = &members[0].line.cost.amount_per_quantity.currency_code;
    let scale = money::scale(currency)?;
    let bundle = money::percent_text(&members[0].rules.d)?;
    let (mut original, mut current) = (0u64, 0u64);
    for member in members {
        let totals = member_totals(member, currency, scale, bundle)?;
        original = original.checked_add(totals.0).ok_or("Bundle price is too large.")?;
        current = current.checked_add(totals.1).ok_or("Bundle price is too large.")?;
    }
    if original == 0 || current == original { return Ok(None); }
    let percentage = (original - current) as f64 * 100.0 / original as f64;
    Ok(Some(json!({ "percentageDecrease": { "value": format!("{percentage:.12}") } })))
}

fn member_totals(member: &Member<'_>, currency: &str, scale: u64, bundle: u64) -> BundleResult<(u64, u64)> {
    let amount = &member.line.cost.amount_per_quantity;
    if amount.currency_code != currency { return Err("Inconsistent bundle currency."); }
    let unit = money::decimal(&amount.amount, scale)?;
    let mut current = 0u64;
    for slot in &member.slots {
        let price = money::discounted(unit, money::percent_text(&slot.d)?, bundle)?;
        let total = price.checked_mul(slot.q).ok_or("Bundle price is too large.")?;
        current = current.checked_add(total).ok_or("Bundle price is too large.")?;
    }
    let original = unit.checked_mul(member.quantity).ok_or("Bundle price is too large.")?;
    Ok((original, current))
}
