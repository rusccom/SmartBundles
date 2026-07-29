import test from "node:test";
import assert from "node:assert/strict";
import { cartTransformRun } from "../src/cart_transform_run.js";

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

test("keeps different component discounts as separate expanded items", () => {
  const result = run(selection(["101", "101", "103", "104"]), duplicateRuntime());
  assert.deepEqual(result.operations[0].lineExpand.expandedCartItems, [
    pricedComponent("101", 2, "10.00"), pricedComponent("101", 2, "5.00"),
    pricedComponent("103", 1, "12.00"), pricedComponent("104", 1, "13.00"),
  ]);
});

test("prices dynamic components in presentment currency", () => {
  const runtime = dynamicRuntime();
  runtime.d = "10";
  runtime.s[0].d = "50";
  const result = run(selection(VARIANTS), runtime, "0.80");
  assert.deepEqual(result.operations[0].lineExpand.expandedCartItems[0], {
    ...component("101", 2),
    price: { adjustment: { fixedPricePerUnit: { amount: "3.60" } } },
  });
});

test("rounds each dynamic unit in a zero-decimal presentment currency", () => {
  const runtime = dynamicRuntime();
  runtime.c[0][2] = "0.01";
  const result = run(selection(VARIANTS), runtime, "150", "JPY");
  assert.equal(result.operations[0].lineExpand.expandedCartItems[0]
    .price.adjustment.fixedPricePerUnit.amount, "2");
});

test("supports Shopify's four-letter USDC currency code", () => {
  const result = run(selection(VARIANTS), dynamicRuntime(), "1", "USDC");
  assert.equal(result.operations[0].lineExpand.expandedCartItems[0]
    .price.adjustment.fixedPricePerUnit.amount, "10.00");
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
});

test("rejects forged variants", () => {
  assert.throws(() => run(selection(["101", "102", "103", "999"])));
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

function run(attribute, runtime = validRuntime(), presentmentCurrencyRate = "1.0", currencyCode = "USD") {
  return cartTransformRun(inputFor(attribute, runtime, presentmentCurrencyRate, currencyCode));
}

function inputFor(attribute, runtime = validRuntime(), presentmentCurrencyRate = "1.0", currencyCode = "USD") {
  return { presentmentCurrencyRate, cart: { lines: [{
    id: "gid://shopify/CartLine/1",
    cost: { amountPerQuantity: { currencyCode } },
    bundleSelection: attribute === undefined ? null : { value: attribute },
    merchandise: {
      __typename: "ProductVariant", id: PARENT, requiresComponents: true,
      product: { bundleRuntime: { jsonValue: runtime } },
    },
  }] } };
}

function validRuntime() {
  return {
    sv: 3, en: 1, b: "bundle-1", p: PARENT, m: 0, d: "0",
    c: VARIANTS.map((id) => [id, 1]),
    s: VARIANTS.map((_, index) => ({ k: index + 1, o: [index], d: "0" })),
  };
}

function dynamicRuntime() {
  const runtime = validRuntime();
  runtime.m = 1;
  runtime.c = VARIANTS.map((id, index) => [id, index === 0 ? 2 : 1, `${index + 10}.00`]);
  return runtime;
}

function quantityRuntime() {
  const runtime = validRuntime();
  runtime.c[0][1] = 1_500;
  runtime.s[1].o = [0, 1];
  return runtime;
}

function duplicateRuntime() {
  const runtime = dynamicRuntime();
  runtime.s[1].o = [0, 1];
  runtime.s[1].d = "50";
  return runtime;
}

function repeatedRuntime(count) {
  const ids = Array.from({ length: count }, (_, index) => String(1_000 + index));
  return {
    sv: 3, en: 1, b: "bundle-1", p: PARENT, m: 0, d: "0",
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

function pricedComponent(id, quantity, amount) {
  return { ...component(id, quantity), price: { adjustment: { fixedPricePerUnit: { amount } } } };
}
