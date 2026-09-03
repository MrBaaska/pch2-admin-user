/**
 * admin-auth.js
 * ----------------------------------------------------------------
 * Admin authentication gate. Uses the existing Supabase anon/public
 * client only (never service_role). A user is let into the Admin UI
 * only if ALL of these are true, re-checked on every load and on
 * every auth state change:
 *
 *   1. There is an authenticated Supabase session (supabase.auth)
 *   2. A matching row exists in public.profiles for auth.uid()
 *   3. profiles.role = 'admin'
 *   4. profiles.is_active = true
 *
 * This is a UX convenience gate only — the real security boundary is
 * enforced by Postgres RLS policies (see sql/schema.sql /
 * sql/2026-09-03-admin-security-hardening.sql) using the same
 * auth.uid() -> profiles.role/is_active check via public.is_admin().
 * Hiding the UI here does NOT substitute for RLS.
 *
 * No URL params, localStorage, sessionStorage, or hardcoded
 * password/access code are used for authentication.
 * ----------------------------------------------------------------
 */
(function () {
  "use strict";

  const els = {};
  let verifying = false;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    if (typeof supabaseClient === "undefined") {
      console.error("supabaseClient not found — check supabase-config.js is loaded first.");
      return;
    }
    cacheDom();
    bindEvents();
    supabaseClient.auth.onAuthStateChange(function () {
      verifyAdmin();
    });
    verifyAdmin();
  }

  function cacheDom() {
    els.loginScreen = document.getElementById("admin-login-screen");
    els.loginForm = document.getElementById("admin-login-form");
    els.email = document.getElementById("admin-login-email");
    els.password = document.getElementById("admin-login-password");
    els.error = document.getElementById("admin-login-error");
    els.submit = document.getElementById("admin-login-submit");
    els.logoutBtn = document.getElementById("admin-logout-btn");
    els.sidebar = document.getElementById("admin-sidebar");
    els.mainShell = document.getElementById("admin-main-shell");
  }

  function bindEvents() {
    els.loginForm.addEventListener("submit", onLoginSubmit);
    if (els.logoutBtn) {
      els.logoutBtn.addEventListener("click", onLogoutClick);
    }
  }

  async function onLoginSubmit(e) {
    e.preventDefault();
    hideError();
    els.submit.disabled = true;
    els.submit.textContent = "Нэвтэрч байна…";
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: els.email.value.trim(),
        password: els.password.value,
      });
      if (error) {
        showError("Нэвтрэхэд алдаа гарлаа: " + error.message);
        return;
      }
      els.password.value = "";
      await verifyAdmin();
    } finally {
      els.submit.disabled = false;
      els.submit.textContent = "Нэвтрэх";
    }
  }

  async function onLogoutClick() {
    await supabaseClient.auth.signOut();
  }

  async function verifyAdmin() {
    if (verifying) return;
    verifying = true;
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session || !session.user) {
        showLogin();
        return;
      }

      const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("role, is_active")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error || !profile || profile.role !== "admin" || profile.is_active !== true) {
        showLogin("Танд Admin эрх байхгүй байна.");
        await supabaseClient.auth.signOut();
        return;
      }

      showApp();
    } finally {
      verifying = false;
    }
  }

  function showLogin(message) {
    if (els.sidebar) els.sidebar.classList.add("hidden");
    if (els.mainShell) els.mainShell.classList.add("hidden");
    if (els.logoutBtn) els.logoutBtn.classList.add("hidden");
    els.loginScreen.classList.remove("hidden");
    if (message) showError(message);
  }

  function showApp() {
    els.loginScreen.classList.add("hidden");
    hideError();
    if (els.sidebar) els.sidebar.classList.remove("hidden");
    if (els.mainShell) els.mainShell.classList.remove("hidden");
    if (els.logoutBtn) els.logoutBtn.classList.remove("hidden");
    window.dispatchEvent(new CustomEvent("admin:authenticated"));
  }

  function showError(message) {
    els.error.textContent = message;
    els.error.classList.remove("hidden");
  }

  function hideError() {
    els.error.textContent = "";
    els.error.classList.add("hidden");
  }
})();
