// SOUP Companion — content script.
//
// Runs on every external page (the SOUP web app itself is excluded in
// manifest.json). It does two real things, not mocked placeholders:
//   1. Scans the page's actual form controls and classifies them against
//      SOUP_FIELD_DICTIONARY (loaded first, see manifest.json).
//   2. Fills a specific field with a specific value using the native
//      property setter + dispatched input/change events, which is what makes
//      this work on React/Vue/Angular-controlled inputs, not just plain HTML
//      forms.
// It never sends any student data anywhere on its own — it only responds to
// messages from the side panel, which already holds the authenticated
// context fetched from the SOUP backend.
(function () {
  if (window.__soupCompanionContentScriptInstalled) return;
  window.__soupCompanionContentScriptInstalled = true;

  function isVisible(el) {
    if (!el || typeof el.getBoundingClientRect !== "function") return false;
    var style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function textOf(node) {
    return node && node.textContent ? node.textContent.replace(/\s+/g, " ").trim() : "";
  }

  function labelFor(el) {
    if (el.id) {
      try {
        var byFor = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (byFor) { var t = textOf(byFor); if (t) return t; }
      } catch (e) { /* invalid id for CSS.escape edge cases — ignore */ }
    }
    var wrapping = el.closest ? el.closest("label") : null;
    if (wrapping) {
      var clone = wrapping.cloneNode(true);
      var inner = clone.querySelector("input, select, textarea");
      if (inner) inner.remove();
      var wrapped = textOf(clone);
      if (wrapped) return wrapped;
    }
    var ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
    var labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      var ids = labelledBy.split(/\s+/);
      var combined = ids.map(function (id) { var node = document.getElementById(id); return node ? textOf(node) : ""; }).filter(Boolean).join(" ");
      if (combined) return combined;
    }
    if (el.placeholder && el.placeholder.trim()) return el.placeholder.trim();
    var row = el.closest ? el.closest("div, td, li, fieldset, p") : null;
    if (row) {
      var rowClone = row.cloneNode(true);
      var controls = rowClone.querySelectorAll("input, select, textarea, button, script, style, svg");
      controls.forEach(function (n) { n.remove(); });
      var rowText = textOf(rowClone);
      if (rowText && rowText.length > 0 && rowText.length < 140) return rowText;
    }
    return el.name || el.id || "";
  }

  function currentValue(el) {
    var type = (el.getAttribute("type") || el.tagName.toLowerCase()).toLowerCase();
    if (type === "checkbox" || type === "radio") return String(el.checked);
    return String(el.value || "");
  }

  function scanPage() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("input, select, textarea"));
    var fields = [];
    var uidCounter = 0;
    nodes.forEach(function (el) {
      var type = (el.getAttribute("type") || el.tagName.toLowerCase()).toLowerCase();
      if (["hidden", "submit", "button", "image", "reset", "file"].indexOf(type) !== -1) return;
      if (el.disabled || el.readOnly) return;
      if (!isVisible(el)) return;
      var label = labelFor(el);
      var match = typeof soupClassifyField === "function" ? soupClassifyField(label, el.name || "", el.id || "") : null;
      if (!el.dataset.soupFieldId) {
        uidCounter += 1;
        el.dataset.soupFieldId = "soup-field-" + uidCounter + "-" + Date.now();
      }
      fields.push({
        id: el.dataset.soupFieldId,
        label: (label || "").slice(0, 160),
        name: el.name || "",
        inputType: type,
        tag: el.tagName.toLowerCase(),
        currentValue: currentValue(el).slice(0, 300),
        required: Boolean(el.required),
        matchedKey: match ? match.key : null,
        matchedGroup: match ? match.group : null,
        matchedLabel: match ? match.label : null,
        options: el.tagName === "SELECT" ? Array.prototype.slice.call(el.options).map(function (o) { return { value: o.value, text: o.textContent.trim() }; }).slice(0, 60) : undefined,
      });
    });
    return { fields: fields, portalHost: location.host, pageUrl: location.href, pageTitle: document.title };
  }

  function nativeSetValue(el, value) {
    var proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    var descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) descriptor.set.call(el, value); else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function flash(el) {
    var previous = el.style.outline;
    el.style.outline = "2px solid #0F7B6C";
    el.style.outlineOffset = "1px";
    setTimeout(function () { el.style.outline = previous; }, 1000);
  }

  function fillOne(el, value) {
    var type = (el.getAttribute("type") || el.tagName.toLowerCase()).toLowerCase();
    if (el.tagName === "SELECT") {
      var options = Array.prototype.slice.call(el.options);
      var match = options.find(function (o) { return o.value === value; })
        || options.find(function (o) { return o.textContent.trim().toLowerCase() === String(value).toLowerCase(); });
      if (!match) return { ok: false, reason: "NO_MATCHING_OPTION" };
      el.value = match.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      flash(el);
      return { ok: true };
    }
    if (type === "checkbox") {
      el.checked = value === "true" || value === true;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      flash(el);
      return { ok: true };
    }
    nativeSetValue(el, value);
    flash(el);
    return { ok: true };
  }

  function fillFields(assignments) {
    return (assignments || []).map(function (assignment) {
      var el = null;
      try { el = document.querySelector('[data-soup-field-id="' + CSS.escape(assignment.fieldId) + '"]'); } catch (e) { el = null; }
      if (!el) return { fieldId: assignment.fieldId, ok: false, reason: "NOT_FOUND" };
      try { return Object.assign({ fieldId: assignment.fieldId }, fillOne(el, assignment.value)); }
      catch (e) { return { fieldId: assignment.fieldId, ok: false, reason: "ERROR" }; }
    });
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (!message || !message.type) return false;
    if (message.type === "SOUP_SCAN") { sendResponse(scanPage()); return true; }
    if (message.type === "SOUP_FILL") { sendResponse({ results: fillFields(message.assignments) }); return true; }
    return false;
  });
})();
