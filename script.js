/* =========================================================
   BMI Calculator — script.js
   Vanilla JS only. No external dependencies.
   ========================================================= */
(function () {
  "use strict";

  /* ---------------- Theme (dark mode) ---------------- */
  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem("bmi-theme"); } catch (e) { /* storage unavailable */ }
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = stored || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);

    var toggle = document.querySelector(".theme-toggle");
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    toggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      toggle.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
      try { localStorage.setItem("bmi-theme", next); } catch (e) { /* ignore */ }
    });
  }

  /* ---------------- Mobile nav ---------------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".main-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------------- FAQ accordion (native <details>, enhanced) ---------------- */
  function initFaq() {
    var items = document.querySelectorAll(".faq-item");
    items.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (item.open) {
          items.forEach(function (other) {
            if (other !== item) other.open = false;
          });
        }
      });
    });
  }

  /* ---------------- BMI Calculator ---------------- */
  function initCalculator() {
    var form = document.getElementById("bmi-form");
    if (!form) return;

    var unitButtons = document.querySelectorAll(".unit-switch button");
    var metricHeight = document.getElementById("height-metric-wrap");
    var imperialHeight = document.getElementById("height-imperial-wrap");
    var metricWeight = document.getElementById("weight-metric-wrap");
    var imperialWeight = document.getElementById("weight-imperial-wrap");

    var unit = "metric";

    function setUnit(next) {
      unit = next;
      unitButtons.forEach(function (btn) {
        btn.setAttribute("aria-pressed", btn.dataset.unit === next ? "true" : "false");
      });
      metricHeight.hidden = next !== "metric";
      imperialHeight.hidden = next === "metric";
      metricWeight.hidden = next !== "metric";
      imperialWeight.hidden = next === "metric";
    }

    unitButtons.forEach(function (btn) {
      btn.addEventListener("click", function () { setUnit(btn.dataset.unit); });
    });
    setUnit("metric");

    var resultsPanel = document.getElementById("results-panel");
    var readoutValue = document.getElementById("readout-value");
    var readoutCategory = document.getElementById("readout-category");
    var categoryDot = document.getElementById("category-dot");
    var gaugeMarker = document.getElementById("gauge-marker");
    var statRange = document.getElementById("stat-range");
    var statHealthy = document.getElementById("stat-healthy-weight");
    var teenNotice = document.getElementById("teen-notice");
    var adultStats = document.getElementById("adult-stats");
    var statusMsg = document.getElementById("status-msg");

    function showError(fieldId, message) {
      var el = document.getElementById(fieldId + "-error");
      var input = document.getElementById(fieldId);
      if (el) el.textContent = message || "";
      if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
    }

    function clearErrors() {
      ["age", "height-cm", "height-ft", "height-in", "weight-kg", "weight-lb"].forEach(function (id) {
        showError(id, "");
      });
    }

    function toNumber(id) {
      var el = document.getElementById(id);
      if (!el) return NaN;
      var val = el.value.trim();
      if (val === "") return NaN;
      var n = Number(val);
      return n;
    }

    function categoryFor(bmi) {
      if (bmi < 18.5) return { key: "under", label: "Underweight", cssVar: "--cat-under" };
      if (bmi < 25) return { key: "normal", label: "Normal weight", cssVar: "--cat-normal" };
      if (bmi < 30) return { key: "over", label: "Overweight", cssVar: "--cat-over" };
      return { key: "obese", label: "Obesity", cssVar: "--cat-obese" };
    }

    function positionGauge(bmi) {
      // Gauge spans 10 (0%) to 40+ (100%), matching the visual segments.
      var min = 10, max = 40;
      var clamped = Math.min(Math.max(bmi, min), max);
      var pct = ((clamped - min) / (max - min)) * 100;
      gaugeMarker.style.left = pct + "%";
      gaugeMarker.setAttribute("data-bmi", bmi.toFixed(1));
    }

    function healthyWeightRange(heightM) {
      var lowKg = 18.5 * heightM * heightM;
      var highKg = 24.9 * heightM * heightM;
      return { lowKg: lowKg, highKg: highKg };
    }

    function formatWeight(kg, unitSystem) {
      if (unitSystem === "metric") {
        return kg.toFixed(1) + " kg";
      }
      var lb = kg * 2.20462;
      return lb.toFixed(1) + " lb";
    }

    // Trims a needless ".0" so copied/shared text reads "65 kg" instead of "65.0 kg".
    function formatNumberClean(n) {
      var fixed = n.toFixed(1);
      return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
    }

    var lastResult = null;

    function saveHistory(entry) {
      var list = [];
      try { list = JSON.parse(localStorage.getItem("bmi-history") || "[]"); } catch (e) { list = []; }
      list.unshift(entry);
      list = list.slice(0, 8);
      try { localStorage.setItem("bmi-history", JSON.stringify(list)); } catch (e) { /* ignore */ }
      renderHistory();
    }

    function renderHistory() {
      var wrap = document.getElementById("history-list");
      if (!wrap) return;
      var list = [];
      try { list = JSON.parse(localStorage.getItem("bmi-history") || "[]"); } catch (e) { list = []; }
      if (!list.length) {
        wrap.innerHTML = '<li class="history-empty">No saved results yet.</li>';
        return;
      }
      wrap.innerHTML = list.map(function (item) {
        return '<li class="history-item"><span>' + item.bmi.toFixed(1) + " · " + item.category + "</span><span class=\"muted\">" + item.date + "</span></li>";
      }).join("");
    }

    var clearHistoryBtn = document.getElementById("clear-history");
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener("click", function () {
        try { localStorage.removeItem("bmi-history"); } catch (e) { /* ignore */ }
        renderHistory();
      });
    }
    renderHistory();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearErrors();
      statusMsg.textContent = "";

      var age = toNumber("age");
      var validAge = !isNaN(age) && age >= 2 && age <= 120;
      if (!validAge) {
        showError("age", "Please enter a valid age (2–120).");
      }

      var heightM = NaN;
      if (unit === "metric") {
        var cm = toNumber("height-cm");
        if (isNaN(cm) || cm < 60 || cm > 260) {
          showError("height-cm", "Please enter a valid height.");
        } else {
          heightM = cm / 100;
        }
      } else {
        var ft = toNumber("height-ft");
        var inch = toNumber("height-in");
        if (isNaN(ft) || ft < 1 || ft > 8 || isNaN(inch) || inch < 0 || inch >= 12) {
          showError("height-ft", "Please enter a valid height.");
        } else {
          heightM = (ft * 12 + inch) * 0.0254;
        }
      }

      var weightKg = NaN;
      if (unit === "metric") {
        var kg = toNumber("weight-kg");
        if (isNaN(kg) || kg < 2 || kg > 400) {
          showError("weight-kg", "Please enter a valid weight.");
        } else {
          weightKg = kg;
        }
      } else {
        var lb = toNumber("weight-lb");
        if (isNaN(lb) || lb < 4 || lb > 900) {
          showError("weight-lb", "Please enter a valid weight.");
        } else {
          weightKg = lb * 0.453592;
        }
      }

      if (!validAge || isNaN(heightM) || isNaN(weightKg)) {
        statusMsg.textContent = "Please correct the highlighted fields above.";
        resultsPanel.classList.remove("visible");
        return;
      }

      var bmi = weightKg / (heightM * heightM);
      var isMinor = age < 18;

      // Human-readable height/weight strings for the Copy/Share result text,
      // built from whichever unit fields the user actually filled in.
      var heightDisplay = unit === "metric"
        ? formatNumberClean(cm) + " cm"
        : ft + " ft " + inch + " in";
      var weightDisplay = unit === "metric"
        ? formatNumberClean(weightKg) + " kg"
        : formatNumberClean(weightKg * 2.20462) + " lb";

      resultsPanel.classList.add("visible");
      readoutValue.textContent = bmi.toFixed(1);

      if (isMinor) {
        teenNotice.hidden = false;
        adultStats.hidden = true;
        readoutCategory.textContent = "See note below";
        categoryDot.style.background = "var(--muted)";
        positionGauge(bmi);

        lastResult = {
          bmi: bmi,
          category: "Not applicable (under 18 — see note below)",
          heightDisplay: heightDisplay,
          weightDisplay: weightDisplay,
          date: new Date().toLocaleDateString()
        };
      } else {
        teenNotice.hidden = true;
        adultStats.hidden = false;
        var cat = categoryFor(bmi);
        readoutCategory.textContent = cat.label;
        categoryDot.style.background = "var(" + cat.cssVar + ")";
        positionGauge(bmi);

        var range = healthyWeightRange(heightM);
        statRange.textContent = "18.5 – 24.9";
        statHealthy.textContent = formatWeight(range.lowKg, unit) + " – " + formatWeight(range.highKg, unit);

        lastResult = {
          bmi: bmi,
          category: cat.label,
          heightDisplay: heightDisplay,
          weightDisplay: weightDisplay,
          date: new Date().toLocaleDateString()
        };
        saveHistory(lastResult);
      }

      resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    var resetBtn = document.getElementById("reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        form.reset();
        clearErrors();
        resultsPanel.classList.remove("visible");
        statusMsg.textContent = "";
        setUnit("metric");
      });
    }

    var calcAgainBtn = document.getElementById("calc-again-btn");
    if (calcAgainBtn) {
      calcAgainBtn.addEventListener("click", function () {
        resultsPanel.classList.remove("visible");
        document.getElementById("age").focus();
      });
    }

    // Builds the exact multi-line text that gets copied/shared.
    function buildResultText(result) {
      return "BMI Result\n" +
        "BMI: " + result.bmi.toFixed(1) + "\n" +
        "Category: " + result.category + "\n" +
        "Height: " + result.heightDisplay + "\n" +
        "Weight: " + result.weightDisplay;
    }

    // Legacy/insecure-context fallback: a hidden, selected textarea + execCommand("copy").
    // Kept as a real fallback (not a no-op) for browsers or contexts where the
    // modern Clipboard API is unavailable or throws (e.g. blocked permission).
    function fallbackCopyText(text) {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      var activeEl = document.activeElement;
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      var succeeded = false;
      try {
        succeeded = document.execCommand("copy");
      } catch (err) {
        succeeded = false;
      }
      document.body.removeChild(textarea);
      if (activeEl && typeof activeEl.focus === "function") activeEl.focus();
      return succeeded;
    }

    // Always resolves to true/false — never throws/rejects — so callers never
    // need a second catch just to stay console-clean.
    function copyTextToClipboard(text) {
      var hasModernClipboard = !!(navigator.clipboard && navigator.clipboard.writeText);
      // On GitHub Pages (HTTPS) this is a secure context, so the modern API is used.
      // window.isSecureContext is checked defensively in case of local http:// testing.
      if (hasModernClipboard && window.isSecureContext !== false) {
        return navigator.clipboard.writeText(text).then(function () {
          return true;
        }).catch(function () {
          return fallbackCopyText(text);
        });
      }
      return Promise.resolve(fallbackCopyText(text));
    }

    // Temporarily swaps a button's label (e.g. "Copy Result" -> "Copied!") then reverts it.
    function flashButtonLabel(btn, tempLabel, originalLabel, delayMs) {
      if (!btn) return;
      btn.textContent = tempLabel;
      btn.disabled = true;
      window.setTimeout(function () {
        btn.textContent = originalLabel;
        btn.disabled = false;
      }, delayMs || 2000);
    }

    var copyBtn = document.getElementById("copy-btn");
    if (copyBtn) {
      var copyBtnDefaultLabel = copyBtn.textContent;
      copyBtn.addEventListener("click", function () {
        if (!lastResult) {
          statusMsg.textContent = "Calculate your BMI first, then copy the result.";
          return;
        }
        var text = buildResultText(lastResult);
        copyTextToClipboard(text).then(function (succeeded) {
          if (succeeded) {
            statusMsg.textContent = "Result copied to clipboard.";
            flashButtonLabel(copyBtn, "Copied!", copyBtnDefaultLabel, 2000);
          } else {
            statusMsg.textContent = "Couldn't copy automatically. Your result: " + text;
          }
        });
      });
    }

    var shareBtn = document.getElementById("share-btn");
    if (shareBtn) {
      shareBtn.addEventListener("click", function () {
        if (!lastResult) {
          statusMsg.textContent = "Calculate your BMI first, then share the result.";
          return;
        }
        var text = "BMI Result\n" +
          "BMI: " + lastResult.bmi.toFixed(1) + "\n" +
          "Category: " + lastResult.category;

        if (navigator.share) {
          navigator.share({ title: "My BMI result", text: text, url: window.location.href })
            .catch(function () {
              // User cancelled the native share sheet, or it failed silently —
              // either way this isn't an error worth surfacing to the user.
            });
          return;
        }

        // No Web Share API: copy instead, and say so clearly rather than
        // leaving the button looking broken.
        copyTextToClipboard(text).then(function (succeeded) {
          if (succeeded) {
            statusMsg.textContent = "Sharing isn't supported on this browser. The result has been copied instead.";
          } else {
            statusMsg.textContent = "Sharing isn't supported on this browser, and the result couldn't be copied automatically. Your result: " + text;
          }
        });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initNav();
    initFaq();
    initCalculator();
  });
})();
