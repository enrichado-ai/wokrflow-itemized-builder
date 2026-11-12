/**
 * Pure calculation helpers for the quote / invoice builder.
 * No DOM access here, so the same file runs in the browser and in Node tests.
 */
(function (root) {
  "use strict";

  /** Round to 2 decimal places, avoiding common float errors (1.005 -> 1.01). */
  function round2(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  /** Turn user input into a finite, non-negative number (blank or bad input -> 0). */
  function toNumber(value) {
    var n = parseFloat(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  /** Amount and tax for a single line item. */
  function lineTotals(item) {
    var qty = toNumber(item.qty);
    var rate = toNumber(item.rate);
    var taxRate = toNumber(item.tax);
    var amount = round2(qty * rate);
    return { amount: amount, tax: round2((amount * taxRate) / 100) };
  }

  /**
   * Totals for a whole document.
   * The discount is a percentage taken off the subtotal before tax,
   * so each line's tax is reduced by the same percentage.
   */
  function documentTotals(items, discountPercent) {
    var discountRate = Math.min(toNumber(discountPercent), 100) / 100;
    var subtotal = 0;
    var tax = 0;

    (items || []).forEach(function (item) {
      var line = lineTotals(item);
      subtotal += line.amount;
      tax += line.tax;
    });

    subtotal = round2(subtotal);
    var discount = round2(subtotal * discountRate);
    tax = round2(tax * (1 - discountRate));
    var total = round2(subtotal - discount + tax);

    return { subtotal: subtotal, discount: discount, tax: tax, total: total };
  }

  /** Format a number as money, e.g. formatMoney(1234.5, "USD") -> "$1,234.50". */
  function formatMoney(value, currency, locale) {
    try {
      return new Intl.NumberFormat(locale || undefined, {
        style: "currency",
        currency: currency || "USD",
      }).format(value);
    } catch (err) {
      return (currency || "") + " " + round2(value).toFixed(2);
    }
  }

  var api = {
    round2: round2,
    toNumber: toNumber,
    lineTotals: lineTotals,
    documentTotals: documentTotals,
    formatMoney: formatMoney,
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.QuoteCalc = api;
  }
})(typeof self !== "undefined" ? self : this);
