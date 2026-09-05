use crate::{validation::text, BundleResult, Json};

pub fn scale(currency: &str) -> BundleResult<u64> {
    if !(3..=4).contains(&currency.len()) || !currency.bytes().all(|byte| byte.is_ascii_uppercase()) { return Err("Invalid currency."); }
    let zero = ["AFN", "ALL", "BIF", "BYR", "CLP", "DJF", "GNF", "IQD", "IRR", "ISK", "JPY", "KMF", "KRW", "LAK", "LBP", "MGA", "MMK", "PYG", "RSD", "RWF", "SLL", "SOS", "STD", "SYP", "UGX", "VND", "VUV", "XAF", "XOF", "XPF", "YER"];
    if zero.contains(&currency) { return Ok(1); }
    Ok(if ["BHD", "JOD", "KWD", "LYD", "OMR", "TND"].contains(&currency) { 1000 } else { 100 })
}

pub fn percent(value: &Json) -> BundleResult<u64> {
    percent_text(text(value)?)
}

pub fn percent_text(value: &str) -> BundleResult<u64> {
    let (whole, fraction) = value.split_once('.').unwrap_or((value, ""));
    if whole.len() > 3 || fraction.len() > 2 { return Err("Invalid bundle discount."); }
    let result = decimal(value, 100)?;
    if result > 10000 { return Err("Discount is outside the supported range."); }
    Ok(result)
}

pub fn decimal(value: &str, scale: u64) -> BundleResult<u64> {
    let (whole, fraction) = value.split_once('.').unwrap_or((value, ""));
    if whole.is_empty() || !whole.bytes().chain(fraction.bytes()).all(|byte| byte.is_ascii_digit()) { return Err("Invalid money amount."); }
    let whole: u64 = whole.parse().map_err(|_| "Money amount is too large.")?;
    let digits = scale.ilog10() as usize;
    let bytes = fraction.as_bytes();
    let minor = (0..digits).fold(0, |value, index| value * 10 + u64::from(bytes.get(index).unwrap_or(&b'0') - b'0'));
    let round = u64::from(bytes.get(digits).is_some_and(|byte| *byte >= b'5'));
    whole.checked_mul(scale).and_then(|value| value.checked_add(minor + round)).ok_or("Money amount is too large.")
}

pub fn discounted(amount: u64, component: u64, bundle: u64) -> BundleResult<u64> {
    let numerator = u128::from(amount) * u128::from(10000 - component) * u128::from(10000 - bundle);
    u64::try_from((numerator + 50_000_000) / 100_000_000).map_err(|_| "Bundle price is too large.")
}
