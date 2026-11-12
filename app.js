/* Itemized Quote Builder: UI logic. Depends on calc.js (window.QuoteCalc). */
(function () {
  "use strict";

  var Calc = window.QuoteCalc;
  var STORAGE_KEY = "itemized-quote-builder:v1";
  var MAX_LOGO_BYTES = 500 * 1024; // keep localStorage happy

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // ---------- State ----------

  function today(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + mm + "-" + dd;
  }

  var nextId = 1;
  function newItem(desc, qty, rate, tax) {
    return { id: nextId++, description: desc || "", qty: qty == null ? 1 : qty, rate: rate == null ? "" : rate, tax: tax == null ? "" : tax };
  }

  function defaultState() {
    return {
      docType: "quote",
      number: "Q-0001",
      currency: "USD",
      issueDate: today(0),
      dueDate: today(30),
      logo: "",
      from: { name: "", email: "", phone: "", address: "" },
      to: { name: "", email: "", address: "" },
      items: [
        newItem("Website design (5 pages)", 1, 1200, 0),
        newItem("Hosting setup", 1, 150, 0),
        newItem("Monthly maintenance", 3, 75, 6),
      ],
      discount: "",
      notes: "Payment due within 15 days of acceptance. Thank you for your business!",
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var saved = JSON.parse(raw);
      var base = defaultState();
      var state = Object.assign(base, saved);
      state.from = Object.assign(defaultState().from, saved.from);
      state.to = Object.assign(defaultState().to, saved.to);
      state.items = Array.isArray(saved.items) ? saved.items.map(function (it) {
        return newItem(it.description, it.qty, it.rate, it.tax);
      }) : base.items;
      return state;
    } catch (err) {
      return defaultState();
    }
  }

  var state = loadState();
  var saveTimer = null;

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var status = $("#saveStatus");
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        status.textContent = "Saved in this browser";
      } catch (err) {
        status.textContent = "Couldn't save in this browser (private mode or storage full).";
      }
    }, 300);
  }

  // ---------- Field binding ----------

  function getPath(obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  function setPath(obj, path, value) {
    var keys = path.split(".");
    var last = keys.pop();
    var target = keys.reduce(function (o, k) { return o[k]; }, obj);
    target[last] = value;
  }

  function fillForm() {
    $$("[data-field]").forEach(function (el) {
      var v = getPath(state, el.dataset.field);
      el.value = v == null ? "" : v;
    });
    $$('input[name="docType"]').forEach(function (r) { r.checked = r.value === state.docType; });
    renderItemRows();
    renderLogoControls();
  }

  $("#editor").addEventListener("input", function (e) {
    var el = e.target;
    if (el.dataset.field) {
      setPath(state, el.dataset.field, el.value);
    } else if (el.name === "docType") {
      setDocType(el.value);
    } else {
      return; // item rows handle themselves
    }
    update();
  });
  $("#editor").addEventListener("submit", function (e) { e.preventDefault(); });

  function setDocType(type) {
    var prev = state.docType;
    state.docType = type;
    // Swap the default number prefix so "Q-0001" becomes "INV-0001" and back.
    var prefixes = { quote: "Q-", invoice: "INV-" };
    if (prev !== type && state.number.indexOf(prefixes[prev]) === 0) {
      state.number = prefixes[type] + state.number.slice(prefixes[prev].length);
      $('[data-field="number"]').value = state.number;
    }
  }

  // ---------- Line items ----------

  function renderItemRows() {
    var list = $("#itemsList");
    var tpl = $("#itemRowTpl");
    list.textContent = "";
    state.items.forEach(function (item) {
      var row = tpl.content.firstElementChild.cloneNode(true);
      row.dataset.id = item.id;
      $(".i-desc", row).value = item.description;
      $(".i-qty", row).value = item.qty;
      $(".i-rate", row).value = item.rate;
      $(".i-tax", row).value = item.tax;
      list.appendChild(row);
    });
  }

  function findItem(row) {
    var id = Number(row.dataset.id);
    return state.items.find(function (it) { return it.id === id; });
  }

  $("#itemsList").addEventListener("input", function (e) {
    var row = e.target.closest(".item-row");
    var item = row && findItem(row);
    if (!item) return;
    var map = { "i-desc": "description", "i-qty": "qty", "i-rate": "rate", "i-tax": "tax" };
    Object.keys(map).forEach(function (cls) {
      if (e.target.classList.contains(cls)) item[map[cls]] = e.target.value;
    });
    update();
  });

  $("#itemsList").addEventListener("click", function (e) {
    if (!e.target.classList.contains("i-remove")) return;
    var row = e.target.closest(".item-row");
    var item = findItem(row);
    state.items = state.items.filter(function (it) { return it !== item; });
    if (state.items.length === 0) state.items.push(newItem());
    renderItemRows();
    update();
  });

  $("#addItemBtn").addEventListener("click", function () {
    // New rows inherit the last row's tax rate, which is usually what you want.
    var last = state.items[state.items.length - 1];
    state.items.push(newItem("", 1, "", last ? last.tax : ""));
    renderItemRows();
    update();
    var rows = $$("#itemsList .item-row");
    $(".i-desc", rows[rows.length - 1]).focus();
  });

  // ---------- Logo ----------

  function renderLogoControls() {
    var preview = $("#logoPreview");
    preview.textContent = "";
    if (state.logo) {
      var img = document.createElement("img");
      img.src = state.logo;
      img.alt = "";
      preview.appendChild(img);
    } else {
      preview.textContent = "Logo";
    }
    $("#logoRemove").hidden = !state.logo;
  }

  $("#logoInput").addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      alert("Please choose an image under 500 KB.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      state.logo = String(reader.result);
      renderLogoControls();
      update();
    };
    reader.readAsDataURL(file);
  });

  $("#logoRemove").addEventListener("click", function () {
    state.logo = "";
    renderLogoControls();
    update();
  });

  // ---------- Preview ----------

  function formatDate(iso) {
    if (!iso) return "—";
    var parts = iso.split("-");
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function text(id, value) { $(id).textContent = value; }

  function joinLines(parts) {
    return parts.filter(function (p) { return p && String(p).trim(); }).join("\n");
  }

  function renderPreview() {
    var money = function (v) { return Calc.formatMoney(v, state.currency); };
    var isInvoice = state.docType === "invoice";
    var dueLabel = isInvoice ? "Due date" : "Valid until";

    text("#dueLabel", dueLabel);
    text("#pDueLabel", dueLabel);
    text("#pTitle", isInvoice ? "INVOICE" : "QUOTE");
    text("#pNumber", state.number || "—");
    text("#pIssue", formatDate(state.issueDate));
    text("#pDue", formatDate(state.dueDate));

    var logo = $("#pLogo");
    logo.hidden = !state.logo;
    if (state.logo) logo.src = state.logo; else logo.removeAttribute("src");

    text("#pFromName", state.from.name || "Your Business Name");
    text("#pFromDetails", joinLines([state.from.address, state.from.email, state.from.phone]));
    text("#pToName", state.to.name || "Client Name");
    text("#pToDetails", joinLines([state.to.address, state.to.email]));

    var tbody = $("#pItems");
    tbody.textContent = "";
    var shown = state.items.filter(function (it) {
      return String(it.description).trim() || Calc.toNumber(it.rate) > 0;
    });
    if (shown.length === 0) {
      var empty = tbody.insertRow();
      var cell = empty.insertCell();
      cell.colSpan = 5;
      cell.className = "p-empty";
      cell.textContent = "Add line items to see them here.";
    }
    shown.forEach(function (it) {
      var line = Calc.lineTotals(it);
      var tr = tbody.insertRow();
      var cells = [
        it.description || "—",
        String(Calc.toNumber(it.qty)),
        money(Calc.toNumber(it.rate)),
        Calc.toNumber(it.tax) ? Calc.toNumber(it.tax) + "%" : "—",
        money(line.amount),
      ];
      cells.forEach(function (value, i) {
        var td = tr.insertCell();
        td.textContent = value;
        if (i > 0) td.className = "num";
      });
    });

    var totals = Calc.documentTotals(state.items, state.discount);
    var discountPct = Math.min(Calc.toNumber(state.discount), 100);
    text("#pSubtotal", money(totals.subtotal));
    text("#pDiscountLabel", discountPct ? "Discount (" + discountPct + "%)" : "Discount");
    text("#pDiscount", totals.discount ? "−" + money(totals.discount) : money(0));
    text("#pTax", money(totals.tax));
    text("#pTotal", money(totals.total));
    $("#pDiscountLabel").hidden = $("#pDiscount").hidden = !totals.discount;

    text("#pNotes", state.notes || "");
    $("#pNotes").hidden = !String(state.notes || "").trim();
  }

  function update() {
    renderPreview();
    save();
  }

  // ---------- Actions ----------

  $("#printBtn").addEventListener("click", function () {
    // The browser uses the page title as the default PDF file name.
    var original = document.title;
    var label = state.docType === "invoice" ? "Invoice" : "Quote";
    document.title = [label, state.number, state.to.name].filter(Boolean).join(" - ");
    window.print();
    setTimeout(function () { document.title = original; }, 500);
  });

  $("#resetBtn").addEventListener("click", function () {
    if (!confirm("Start a new document? Your business details and logo are kept; everything else is cleared.")) return;
    var keep = { from: state.from, logo: state.logo, currency: state.currency, notes: state.notes };
    state = Object.assign(defaultState(), keep, { items: [newItem()] });
    fillForm();
    update();
  });

  // ---------- Start ----------
  fillForm();
  renderPreview();
})();
