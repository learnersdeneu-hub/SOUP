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

    // A div/button-driven custom dropdown, combobox or date picker (common
    // in React component libraries) is invisible to the plain
    // input/select/textarea query above -- it was never scanned, never
    // shown as needing attention, and the student had no way to know
    // Companion had anything to say about it. These can't be filled the
    // same way (no safe, generic way to drive an arbitrary library's
    // click/keyboard interaction), but surfacing them as a recognized
    // "needs your input" item beats them not existing on the student's
    // radar at all. matchedKey is a synthetic key with no answer-bank
    // entry, so these always resolve to "needs" further down the pipeline,
    // never a silent wrong guess.
    var customWidgets = Array.prototype.slice.call(document.querySelectorAll('[role="combobox"], [role="listbox"], [contenteditable="true"]'));
    customWidgets.forEach(function (el) {
      if (el.closest && el.closest("[data-soup-field-id]")) return;
      if (el.disabled || el.getAttribute("aria-disabled") === "true") return;
      if (!isVisible(el)) return;
      var label = labelFor(el);
      fields.push({
        id: assignFieldId(el),
        label: (label || "Custom control").slice(0, 160),
        name: el.name || "",
        inputType: "custom-widget",
        tag: el.tagName.toLowerCase(),
        currentValue: "",
        required: Boolean(el.getAttribute("aria-required") === "true"),
        matchedKey: "custom_widget",
        matchedGroup: "other",
        matchedLabel: (label || "Custom control").slice(0, 160),
      });
    });

    // ---------- Multi-step gating: the "Next/Continue" control (Phase B) ----------
    // A wizard's own "Next"/"Continue" control, distinct from its real
    // final submit ("Submit"/"Finish"/"Apply now"/"Review") — the run
    // orchestrator (panel.js) checks every required field on THIS page is
    // answered before ever clicking this, rather than advancing blind into
    // a page it can't come back from easily.
    function controlText(el) { return (textOf(el) || el.value || "").trim(); }
    function looksLikeNextControl(el) {
      var text = controlText(el);
      if (!/^(next|continue)\b/i.test(text)) return false;
      if (/submit|finish|complete|apply\s*now|review/i.test(text)) return false;
      return true;
    }
    var nextCandidates = Array.prototype.slice.call(document.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"], [role="button"]'));
    var nextEl = nextCandidates.find ? nextCandidates.find(function (el) { return isVisible(el) && !el.disabled && looksLikeNextControl(el); }) : null;
    var nextControl = nextEl ? { id: assignFieldId(nextEl), label: controlText(nextEl).slice(0, 80) } : null;

    // The account-creation submit itself ("Sign up"/"Create account"/
    // "Register") — deliberately not matched by looksLikeNextControl
    // above. Clicked by the run orchestrator only once the password
    // field is no longer blocking (see authBlock below), i.e. only after
    // the student has typed and confirmed their own password.
    function looksLikeSignupControl(el) { return /^(sign\s*up|create\s*account|register|join)\b/i.test(controlText(el)); }
    var signupEl = nextCandidates.find ? nextCandidates.find(function (el) { return isVisible(el) && !el.disabled && looksLikeSignupControl(el); }) : null;
    var signupControl = signupEl ? { id: assignFieldId(signupEl), label: controlText(signupEl).slice(0, 80) } : null;

    // ---------- "Auth command" detection (Phase D) ----------
    // Things only the student themselves can do — a visible CAPTCHA
    // widget, a one-time verification code input, or a live password
    // field on what looks like an account sign-up. Detected here and
    // reported for the run orchestrator to pause on; this file never
    // attempts to solve, fill or bypass any of these. A password field
    // only blocks while it is still EMPTY — once the student has typed
    // their own password, it stops reporting as a block (otherwise every
    // rescan after typing it would pause the run again, forever).
    var hasCaptcha = Boolean(document.querySelector('iframe[src*="recaptcha" i], iframe[src*="hcaptcha" i], div.g-recaptcha, div.h-captcha, [data-sitekey]'));
    var passwordEls = Array.prototype.slice.call(document.querySelectorAll('input[type="password"]')).filter(function (el) { return isVisible(el) && !el.value; });
    var otpEl = Array.prototype.slice.call(document.querySelectorAll("input")).find(function (el) {
      if (!isVisible(el)) return false;
      if ((el.getAttribute("autocomplete") || "").toLowerCase() === "one-time-code") return true;
      var l = labelFor(el).toLowerCase();
      return /verification code|one-time code|\botp\b|security code/.test(l);
    });
    var authBlock = hasCaptcha ? { kind: "CAPTCHA" }
      : otpEl ? { kind: "OTP" }
      : passwordEls.length ? { kind: "PASSWORD", fields: passwordEls.map(function (el) { return { id: assignFieldId(el), label: (labelFor(el) || "Password").slice(0, 80) }; }) }
      : null;

    return {
      fields: fields,
      fileFields: fileFields,
      portalHost: location.host,
      pageUrl: location.href,
      pageTitle: document.title,
      nextControl: nextControl,
      signupControl: signupControl,
      authBlock: authBlock,
    };
  };

  window.__soupClickControl = function (fieldId) {
    var el = null;
    try { el = document.querySelector('[data-soup-field-id="' + CSS.escape(fieldId) + '"]'); } catch (e) { el = null; }
    if (!el) return { ok: false, reason: "NOT_FOUND" };
    el.click();
    return { ok: true };
  };

  // Multi-step/wizard forms swap their own fields in and out without a
  // full navigation -- did-navigate/dom-ready in main.js never fire again,
  // so without this the panel keeps showing whatever it scanned on the
  // very first load of that page. Debounced so typing into a field (which
  // also mutates the DOM, e.g. a live validation message appearing) doesn't
  // trigger a rescan storm; only fires when the preload bridge for this
  // view actually exists (it won't for a view loaded before this file
  // shipped, or in a context with no window.soupPortal for any reason).
  if (window.soupPortal && typeof window.soupPortal.notifyDomChanged === "function") {
    var domChangeTimer = null;
    var observer = new MutationObserver(function () {
      if (domChangeTimer) clearTimeout(domChangeTimer);
      domChangeTimer = setTimeout(function () {
        window.soupPortal.notifyDomChanged();
      }, 600);
    });
    try {
      observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (e) { /* document not ready enough to observe yet -- safe to skip */ }
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

  // Every branch below re-reads the control after dispatching its events and
  // reports ok:true only when the value actually stuck — "no exception was
  // thrown" and "the page kept the value" are different things, and a
  // React/Vue-controlled input can silently reset a programmatically-set
  // value on its next render rather than rejecting it synchronously. The
  // ~60ms wait before re-reading is what catches that next-tick reset
  // instead of reporting false success the instant dispatchEvent returns.
  function fillOne(el, value) {
    return new Promise(function (resolve) {
      var type = (el.getAttribute("type") || el.tagName.toLowerCase()).toLowerCase();

      function verifyAfter(stillCorrect) {
        setTimeout(function () {
          resolve(stillCorrect() ? { ok: true, verified: true } : { ok: false, reason: "DID_NOT_STICK" });
        }, 60);
      }

      if (el.tagName === "SELECT") {
        var options = Array.prototype.slice.call(el.options);
        var optionMatch = options.find(function (o) { return o.value === value; })
          || options.find(function (o) { return o.textContent.trim().toLowerCase() === String(value).toLowerCase(); });
        if (!optionMatch) { resolve({ ok: false, reason: "NO_MATCHING_OPTION" }); return; }
        el.value = optionMatch.value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        flash(el);
        verifyAfter(function () { return el.value === optionMatch.value; });
        return;
      }

      if (type === "checkbox") {
        var shouldCheck = value === "true" || value === true;
        el.checked = shouldCheck;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        flash(el);
        verifyAfter(function () { return el.checked === shouldCheck; });
        return;
      }

      // Radios were previously unhandled entirely (fell through to
      // nativeSetValue, which sets .value -- meaningless for a radio, which
      // is selected via .checked). The intended answer is the OPTION VALUE
      // to select, not a boolean on the one element the scan happened to
      // assign this fieldId to -- so this looks across every radio sharing
      // the same name for the one whose value matches, and checks that one.
      if (type === "radio") {
        var target = el;
        if (el.name) {
          try {
            var group = Array.prototype.slice.call(document.querySelectorAll('input[type="radio"][name="' + CSS.escape(el.name) + '"]'));
            var byValue = group.find(function (r) { return r.value === String(value); })
              || group.find(function (r) { return r.value.toLowerCase() === String(value).toLowerCase(); });
            if (byValue) target = byValue;
          } catch (e) { /* invalid name for CSS.escape -- fall back to el itself */ }
        }
        // If no sibling matched by value, treat `value` as a plain
        // true/false "check this specific radio" instead (the same
        // convention a checkbox uses) rather than silently doing nothing.
        var radioShouldCheck = target !== el ? true : (value === "true" || value === true);
        target.checked = radioShouldCheck;
        target.dispatchEvent(new Event("change", { bubbles: true }));
        flash(target);
        verifyAfter(function () { return target.checked === radioShouldCheck; });
        return;
      }

      nativeSetValue(el, value);
      flash(el);
      verifyAfter(function () { return String(el.value) === String(value); });
    });
  }

  window.__soupFillFields = function (assignments) {
    var list = assignments || [];
    var results = [];
    var index = 0;
    // Sequential, not Promise.all: each fill briefly waits to verify, and
    // doing that one field at a time avoids several near-simultaneous
    // change events on the same form confusing a framework's own
    // re-render/validation timing.
    function next() {
      if (index >= list.length) return Promise.resolve(results);
      var assignment = list[index++];
      var el = null;
      try { el = document.querySelector('[data-soup-field-id="' + CSS.escape(assignment.fieldId) + '"]'); } catch (e) { el = null; }
      var pending = !el
        ? Promise.resolve({ fieldId: assignment.fieldId, ok: false, reason: "NOT_FOUND" })
        : fillOne(el, assignment.value)
            .then(function (result) { return Object.assign({ fieldId: assignment.fieldId }, result); })
            .catch(function () { return { fieldId: assignment.fieldId, ok: false, reason: "ERROR" }; });
      return pending.then(function (result) { results.push(result); return next(); });
    }
    return next();
  };
})();
