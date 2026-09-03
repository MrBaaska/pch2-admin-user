/**
 * security-utils.js
 * ----------------------------------------------------------------
 * Shared, dependency-free helpers used by app.js / admin-links.js:
 *  - escapeHtml/escapeAttr: safe text-context HTML escaping
 *  - sanitizeUrl/setSafeHref: protocol allowlist for any URL that
 *    ends up in an href (blocks javascript:/data:/vbscript: XSS)
 *  - AdminReady: lets other scripts defer their init() until
 *    admin-auth.js has confirmed the session belongs to an active
 *    admin profile, so no admin-only Supabase query ever fires early.
 * Must be loaded after supabase-config.js and before admin-auth.js,
 * projects.js, app.js, admin-links.js.
 * ----------------------------------------------------------------
 */
(function () {
  "use strict";

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str === null || str === undefined ? "" : String(str);
    return div.innerHTML;
  }

  // Same safe result as escapeHtml (encodes quotes/angle brackets),
  // kept as a distinct name for readability at attribute call sites.
  function escapeAttr(str) {
    return escapeHtml(str);
  }

  const ALLOWED_URL_PROTOCOLS = ["https:", "http:"];

  // Returns a safe absolute URL string, or null if the value is empty,
  // unparseable, or uses a disallowed protocol (javascript:, data:,
  // vbscript:, etc.).
  function sanitizeUrl(rawUrl) {
    if (!rawUrl) return null;
    let parsed;
    try {
      parsed = new URL(String(rawUrl), window.location.href);
    } catch (e) {
      return null;
    }
    if (!ALLOWED_URL_PROTOCOLS.includes(parsed.protocol)) return null;
    return parsed.href;
  }

  // Sets href on an anchor only if the URL passes protocol validation;
  // otherwise the anchor is left without href (inert, not clickable).
  function setSafeHref(anchorEl, rawUrl) {
    const safe = sanitizeUrl(rawUrl);
    if (safe) {
      anchorEl.setAttribute("href", safe);
      anchorEl.removeAttribute("aria-disabled");
    } else {
      anchorEl.removeAttribute("href");
      anchorEl.setAttribute("aria-disabled", "true");
      anchorEl.title = "Хүчингүй холбоос";
    }
    return safe;
  }

  let adminReady = false;
  const waitingForAdmin = [];
  window.addEventListener("admin:authenticated", function () {
    adminReady = true;
    waitingForAdmin.splice(0).forEach(function (cb) {
      cb();
    });
  });

  window.SecurityUtils = {
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
    sanitizeUrl: sanitizeUrl,
    setSafeHref: setSafeHref,
    AdminReady: {
      onReady: function (cb) {
        if (adminReady) cb();
        else waitingForAdmin.push(cb);
      },
    },
  };
})();
