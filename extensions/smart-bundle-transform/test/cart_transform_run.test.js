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

test("aggregates a variant selected in multiple slots", () => {
  const result = run(selection(["101", "101", "103", "104"]), duplicateRuntime());
  assert.deepEqual(result.operations[0].lineExpand.expandedCartItems, [
    component("101", 2), component("103"), component("104"),
  ]);
});

test("rejects missing or malformed selections", () => {
  assert.deepEqual(run(undefined).operations, []);
  assert.deepEqual(run("not-json").operations, []);
  assert.deepEqual(run(JSON.stringify({ rv: 1, s: [] })).operations, []);
});

test("rejects forged variants and revision mismatches", () => {
  assert.deepEqual(run(selection(["101", "102", "103", "999"])).operations, []);
  assert.deepEqual(run(selection(VARIANTS, 2)).operations, []);
});

test("rejects a different cart-line parent variant", () => {
  const input = inputFor(selection(VARIANTS));
  input.cart.lines[0].merchandise.id = "gid://shopify/ProductVariant/901";
  assert.deepEqual(cartTransformRun(input).operations, []);
});

test("rejects runtime without the pinned parent", () => {
  const runtime = validRuntime();
  delete runtime.p;
  assert.deepEqual(run(selection(VARIANTS), runtime).operations, []);
});

test("rejects more than 150 selectors", () => {
  const runtime = repeatedRuntime(151);
  const choices = Array.from({ length: 151 }, (_, index) => String(1_000 + index));
  assert.deepEqual(run(selection(choices), runtime).operations, []);
});

function run(attribute, runtime = validRuntime()) {
  return cartTransformRun(inputFor(attribute, runtime));
}

function inputFor(attribute, runtime = validRuntime()) {
  return { cart: { lines: [{
    id: "gid://shopify/CartLine/1",
    bundleSelection: attribute === undefined ? null : { value: attribute },
    merchandise: {
      __typename: "ProductVariant", id: PARENT, requiresComponents: true,
      product: { bundleRuntime: { jsonValue: runtime } },
    },
  }] } };
}

function validRuntime() {
  return {
    sv: 1, rv: 1, en: 1, b: "bundle-1", p: PARENT,
    c: VARIANTS.map((id) => [id, 1]),
    s: VARIANTS.map((_, index) => ({ k: index + 1, o: [index] })),
  };
}

function duplicateRuntime() {
  const runtime = validRuntime();
  runtime.s[1].o = [0, 1];
  return runtime;
}

function repeatedRuntime(count) {
  const ids = Array.from({ length: count }, (_, index) => String(1_000 + index));
  return {
    sv: 1, rv: 1, en: 1, b: "bundle-1", p: PARENT,
    c: ids.map((id) => [id, 1]),
    s: ids.map((_, index) => ({ k: index + 1, o: [index] })),
  };
}

function selection(ids, revision = 1) {
  return JSON.stringify({
    rv: revision,
    s: ids.map((id, index) => [index + 1, `gid://shopify/ProductVariant/${id}`]),
  });
}

function component(id, quantity = 1) {
  return { merchandiseId: `gid://shopify/ProductVariant/${id}`, quantity };
}
