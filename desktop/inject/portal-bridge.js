// SOUP Companion desktop — portal bridge.
//
// Same real scanning/classifying/filling logic as extension/content-script.js
// (see field-dictionary.js above it). The only thing that differs from the
// browser-extension build is *how* it's invoked: instead of chrome.runtime
// message listeners, main.js calls window.__soupScanPage() /
// window.__soupFillFields(assignments) directly via
// webContents.executeJavaScript(), because the desktop app's main process
// already has first-party control of this embedded page — there's no
// separate extension "content script" concept needed here.
(function () {
  if (window.__soupBridgeInstalled) return;
  window.__soupBridgeInstalled = true;

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
      } catch (e) { /* ignore invalid id */ }
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

  function assignFieldId(el) {
    if (!el.dataset.soupFieldId) {
      window.__soupFieldIdCounter = (window.__soupFieldIdCounter || 0) + 1;
      el.dataset.soupFieldId = "soup-field-" + window.__soupFieldIdCounter + "-" + Date.now();
    }
    return el.dataset.soupFieldId;
  }

  window.__soupScanPage = function () {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("input, select, textarea"));
    var fields = [];
    var fileFields = [];
    nodes.forEach(function (el) {
      var type = (el.getAttribute("type") || el.tagName.toLowerCase()).toLowerCase();
      if (el.disabled || el.readOnly) return;
      if (!isVisible(el)) return;
      var label = labelFor(el);

      // File-upload fields never get a text value typed into them — they go
      // through CDP-based auto-attach (main.js's attachDocumentToField, via
      // Chrome DevTools Protocol's DOM.setFileInputFiles, the only way to
      // programmatically set an <input type="file">'s files in any browser
      // context) rather than window.__soupFillFields, so they're classified
      // and reported separately here.
      if (type === "file") {
        var category = typeof soupClassifyDocumentField === "function" ? soupClassifyDocumentField(label, el.name || "", el.id || "") : null;
        fileFields.push({
          id: assignFieldId(el),
          label: (label || "").slice(0, 160),
          name: el.name || "",
          required: Boolean(el.required),
          matchedCategory: category,
          hasFile: Boolean(el.files && el.files.length),
        });
        return;
      }

      if (["hidden", "submit", "button", "image", "reset"].indexOf(type) !== -1) return;
      var match = typeof soupClassifyField === "function" ? soupClassifyField(label, el.name || "", el.id || "") : null;
      fields.push({
        id: assignFieldId(el),
        label: (label || "").slice(0, 160),
        name: el.name || "",
        inputType: type,
        tag: el.tagName.toLowerCase(),
        currentValue: currentValue(el).slice(0, 300),
        required: Boolean(el.required),
        matchedKey: match ? match.key : null,
        matchedGroup: match ? match.group : null,
        matchedLabel: match ? match.label : null,
      });
    });
    return { fields: fields, fileFields: fileFields, portalHost: location.host, pageUrl: location.href, pageTitle: document.title };
  };

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

  window.__soupFillFields = function (assignments) {
    return (assignments || []).map(function (assignment) {
      var el = null;
      try { el = document.querySelector('[data-soup-field-id="' + CSS.escape(assignment.fieldId) + '"]'); } catch (e) { el = null; }
      if (!el) return { fieldId: assignment.fieldId, ok: false, reason: "NOT_FOUND" };
      try { return Object.assign({ fieldId: assignment.fieldId }, fillOne(el, assignment.value)); }
      catch (e) { return { fieldId: assignment.fieldId, ok: false, reason: "ERROR" }; }
    });
  };
})();
