mod fixed;
mod input;
mod member;
mod marker;
mod membership;
mod merge;
mod money;
mod output;
mod pricing;
mod selection;
mod validation;

use serde_json::Value;
use std::io::{Read, Write};

fn main() {
    let mut source = String::new();
    std::io::stdin().read_to_string(&mut source).unwrap();
    let input = serde_json::from_str(&source).unwrap();
    let output = cart_transform_run(&input).expect("Invalid SmartBundle composition.");
    let bytes = serde_json::to_vec(&output).unwrap();
    std::io::stdout().write_all(&bytes).unwrap();
}

fn cart_transform_run(input: &input::Input) -> BundleResult<output::Output> {
    let lines = &input.cart.lines;
    let mut operations = merge::operations(lines)?;
    for line in lines {
        if let Some(operation) = fixed::operation(line)? { operations.push(operation); }
    }
    Ok(output::Output { operations })
}

type BundleResult<T> = std::result::Result<T, &'static str>;
type Json = Value;
