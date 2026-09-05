import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";

const PARENT = "gid://shopify/ProductVariant/900";
const VARIANTS = ["101", "102", "103", "104"];

test("expands an exact four-slot selection", () => {
  const result = run(selection(VARIANTS));
  assert.deepEqual(result.operations, [{
    lineExpand: {
      cartLineId: "gid://shopify/CartLine/1",
      expandedCartItems: VARIANTS.map((id) => component(id)),
    },
  }]);
});

test("preserves different discounts for the same variant in a dynamic bundle", () => {
  const input = dynamicInput();
  const first = input.cart.lines[0];
  updateRules(first, (rules) => rules.s.push({ k: 2, q: 2, d: "50" }));
  first.bundleSelection.value = JSON.stringify({ b: "bundle-1", g: "group-1", s: [1, 2] });
  first.quantity = 4;
  input.cart.lines.splice(1, 1);
  assert.equal(mergedTotal(input), 55);
});

test("prices dynamic components in presentment currency", () => {
  const input = dynamicInput("EUR");
  input.cart.lines.forEach((line) => updateRules(line, (rules) => { rules.d = "10"; }));
  updateRules(input.cart.lines[0], (rules) => { rules.s[0].d = "50"; });
  input.cart.lines.forEach((line, index) => { line.cost.amountPerQuantity.amount = String([8, 8.8, 9.6, 10.4][index]); });
  assert.equal(mergedTotal(input), 33.12);
  input.cart.lines[0].cost.amountPerQuantity.amount = "20";
  assert.equal(mergedTotal(input), 43.92);
  input.cart.lines.forEach((line) => { line.quantity *= 2; });
  assert.equal(mergedTotal(input), 87.84);
  assert.equal(cartTransformRun(input).operations[0].linesMerge.cartLines[0].quantity, 4);
});

test("rounds each dynamic unit in a zero-decimal presentment currency", () => {
  const input = dynamicInput("JPY");
  const first = input.cart.lines[0];
  first.cost.amountPerQuantity.amount = "3";
  updateRules(first, (rules) => { rules.s[0].d = "50"; });
  assert.equal(mergedTotal(input), 40);
});

test("supports Shopify's four-letter USDC currency code", () => {
  assert.equal(mergedTotal(dynamicInput("USDC")), 56);
});

test("rejects an aggregate quantity above the Shopify limit", () => {
  const runtime = quantityRuntime();
  assert.throws(() => run(selection(["101", "101", "103", "104"]), runtime));
});

test("rejects missing or malformed selections", () => {
  const fixedDiscount = validRuntime();
  fixedDiscount.s[0].d = "1";
  assert.throws(() => run(undefined));
  assert.throws(() => run("not-json"));
  assert.throws(() => run(JSON.stringify({ rv: 1, s: [] })));
  assert.throws(() => run(selection(VARIANTS), fixedDiscount));
  const missing = dynamicInput();
  missing.cart.lines.pop();
  assert.throws(() => cartTransformRun(missing));
});

test("rejects forged variants", () => {
  assert.throws(() => run(selection(["101", "102", "103", "999"])));
  const forged = dynamicInput();
  forged.cart.lines[0].merchandise.id = component("999").merchandiseId;
  forged.cart.lines[0].merchandise.bundleMemberships = null;
  assert.throws(() => cartTransformRun(forged));
});

test("rejects a different cart-line parent variant", () => {
  const input = inputFor(selection(VARIANTS));
  input.cart.lines[0].merchandise.id = "gid://shopify/ProductVariant/901";
  assert.throws(() => cartTransformRun(input));
});

test("rejects runtime without the pinned parent", () => {
  const runtime = validRuntime();
  delete runtime.p;
  assert.throws(() => run(selection(VARIANTS), runtime));
});

test("rejects more than 150 selectors", () => {
  const runtime = repeatedRuntime(151);
  const choices = Array.from({ length: 151 }, (_, index) => String(1_000 + index));
  assert.throws(() => run(selection(choices), runtime));
});

function run(attribute, runtime = validRuntime()) {
  return cartTransformRun(inputFor(attribute, runtime));
}

function inputFor(attribute, runtime = validRuntime()) {
  return { cart: { lines: [{
    id: "gid://shopify/CartLine/1",
    quantity: 1,
    cost: { amountPerQuantity: { currencyCode: "USD", amount: "100" } },
    bundleSelection: attribute === undefined ? null : { value: attribute },
    merchandise: {
      __typename: "ProductVariant", id: PARENT, requiresComponents: true,
      product: { bundleRuntime: { jsonValue: runtime } },
    },
  }] } };
}

function validRuntime() {
  return {
    sv: 4, en: 1, b: "bundle-1", p: PARENT, m: 0, d: "0",
    c: VARIANTS.map((id) => [id, 1]),
    s: VARIANTS.map((_, index) => ({ k: index + 1, o: [index], d: "0" })),
  };
}

function dynamicInput(currencyCode = "USD") {
  const rules = { b: "bundle-1", p: PARENT, r: "a".repeat(64), n: 4, d: "0",
    s: VARIANTS.map((_, index) => ({ k: index + 1, q: index === 0 ? 2 : 1, d: "0" })) };
  return { cart: { lines: VARIANTS.map((id, index) => ({
    id: `gid://shopify/CartLine/${index + 1}`, quantity: rules.s[index].q,
    cost: { amountPerQuantity: { currencyCode, amount: `${index + 10}.00` } },
    bundleSelection: { value: JSON.stringify({ b: "bundle-1", g: "group-1", s: [index + 1] }) },
    merchandise: { __typename: "ProductVariant", id: component(id).merchandiseId,
      product: {}, bundleMemberships: { jsonValue: { sv: 1, bundles: [{ ...rules, s: [rules.s[index]] }] } } },
  })) } };
}

function cartTransformRun(input) {
  const cli = fileURLToPath(new URL("../../../node_modules/@shopify/cli/bin/run.js", import.meta.url));
  const path = fileURLToPath(new URL("..", import.meta.url));
  const result = spawnSync(process.execPath, [cli, "app", "function", "run", "--path", path, "--json"], {
    input: JSON.stringify(input), encoding: "utf8", maxBuffer: 2_000_000,
  });
  if (result.status !== 0) throw new Error(result.stderr || "Shopify Function failed.");
  const output = JSON.parse(result.stdout);
  if (!output.success) throw new Error(output.logs || "Shopify Function rejected the cart.");
  assert.ok(output.instructions < 11_000_000);
  return output.output;
}

function updateRules(line, update) {
  update(line.merchandise.bundleMemberships.jsonValue.bundles[0]);
}

function mergedTotal(input) {
  const merge = cartTransformRun(input).operations[0].linesMerge;
  assert.equal(merge.parentVariantId, PARENT);
  const original = input.cart.lines.reduce((sum, line) => sum + Number(line.cost.amountPerQuantity.amount) * line.quantity, 0);
  const percent = Number(merge.price?.percentageDecrease.value || 0);
  return Math.round(original * (100 - percent)) / 100;
}

function quantityRuntime() {
  const runtime = validRuntime();
  runtime.c[0][1] = 1_500;
  runtime.s[1].o = [0, 1];
  return runtime;
}

function repeatedRuntime(count) {
  const ids = Array.from({ length: count }, (_, index) => String(1_000 + index));
  return {
    sv: 4, en: 1, b: "bundle-1", p: PARENT, m: 0, d: "0",
    c: ids.map((id) => [id, 1]),
    s: ids.map((_, index) => ({ k: index + 1, o: [index], d: "0" })),
  };
}

function selection(ids) {
  return JSON.stringify({
    s: ids.map((id, index) => [index + 1, `gid://shopify/ProductVariant/${id}`]),
  });
}

function component(id, quantity = 1) {
  return { merchandiseId: `gid://shopify/ProductVariant/${id}`, quantity };
}
