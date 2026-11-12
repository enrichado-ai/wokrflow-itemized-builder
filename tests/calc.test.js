// Run with: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const Calc = require("../calc.js");

test("round2 handles float edge cases", () => {
  assert.equal(Calc.round2(1.005), 1.01);
  assert.equal(Calc.round2(0.1 + 0.2), 0.3);
  assert.equal(Calc.round2(10), 10);
});

test("toNumber treats blank, negative and bad input as 0", () => {
  assert.equal(Calc.toNumber(""), 0);
  assert.equal(Calc.toNumber("abc"), 0);
  assert.equal(Calc.toNumber("-5"), 0);
  assert.equal(Calc.toNumber("2.5"), 2.5);
});

test("lineTotals computes amount and tax", () => {
  assert.deepEqual(Calc.lineTotals({ qty: 3, rate: 75, tax: 6 }), { amount: 225, tax: 13.5 });
  assert.deepEqual(Calc.lineTotals({ qty: "", rate: 100, tax: "" }), { amount: 0, tax: 0 });
});

test("documentTotals sums lines with no discount", () => {
  const items = [
    { qty: 1, rate: 1200, tax: 0 },
    { qty: 1, rate: 150, tax: 0 },
    { qty: 3, rate: 75, tax: 6 },
  ];
  assert.deepEqual(Calc.documentTotals(items, ""), {
    subtotal: 1575,
    discount: 0,
    tax: 13.5,
    total: 1588.5,
  });
});

test("discount applies before tax", () => {
  const items = [{ qty: 2, rate: 50, tax: 10 }]; // 100 subtotal, 10 tax
  assert.deepEqual(Calc.documentTotals(items, 10), {
    subtotal: 100,
    discount: 10,
    tax: 9,
    total: 99,
  });
});

test("discount is capped at 100%", () => {
  const totals = Calc.documentTotals([{ qty: 1, rate: 80, tax: 5 }], 150);
  assert.equal(totals.total, 0);
});

test("empty item list totals to zero", () => {
  assert.deepEqual(Calc.documentTotals([], 0), { subtotal: 0, discount: 0, tax: 0, total: 0 });
});

test("formatMoney formats with currency", () => {
  assert.equal(Calc.formatMoney(1234.5, "USD", "en-US"), "$1,234.50");
  assert.equal(Calc.formatMoney(1000, "JPY", "en-US"), "¥1,000");
});
