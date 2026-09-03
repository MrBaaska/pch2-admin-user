/**
 * admin-users.js
 * ----------------------------------------------------------------
 * Phase B-2: lets ADMIN01 list the 21 user profiles and view/edit a
 * selected user's app_data rows. Never impersonates the user — every
 * query runs as the signed-in admin session and relies entirely on
 * the existing app_data RLS policy (owner_id = auth.uid() OR
 * is_admin()) to authorize cross-user reads/writes. No table/policy
 * is created or altered by this file.
 * ----------------------------------------------------------------
 */
(function () {
  "use strict";

  const { escapeHtml, AdminReady } = window.SecurityUtils;

  const state = {
    users: [],
    query: "",
    selectedUser: null,
    appData: [],
  };

  const els = {};

  // Invalidates any in-flight app_data fetch/save for a user the admin
  // has since navigated away from (same stale-response guard pattern
  // used by admin-links.js's submission modal).
  let requestId = 0;

  document.addEventListener("DOMContentLoaded", function () {
    AdminReady.onReady(init);
  });

  function init() {
    if (typeof supabaseClient === "undefined") {
      console.error("supabaseClient not found — check supabase-config.js is loaded first.");
      return;
    }
    cacheDom();
    bindEvents();
    loadUsers();
  }

  function cacheDom() {
    els.navUsers = document.getElementById("nav-users");
    els.section = document.getElementById("admin-users-section");
    els.searchInput = document.getElementById("user-search-input");
    els.listCount = document.getElementById("user-list-count");
    els.list = document.getElementById("user-list");
    els.listEmpty = document.getElementById("user-list-empty");
    els.detailEmpty = document.getElementById("user-detail-empty");
    els.detailPanel = document.getElementById("user-detail-panel");
    els.detailAvatar = document.getElementById("user-detail-avatar");
    els.detailName = document.getElementById("user-detail-name");
    els.detailCode = document.getElementById("user-detail-code");
    els.detailStatus = document.getElementById("user-detail-status");
    els.appDataList = document.getElementById("app-data-list");
  }

  function bindEvents() {
    if (els.navUsers) {
      els.navUsers.addEventListener("click", function (e) {
        e.preventDefault();
        els.section.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    els.searchInput.addEventListener("input", function (e) {
      state.query = e.target.value.trim().toLowerCase();
      renderUserList();
    });
  }

  // ---------------------------------------------------------------
  // 21 users (public.profiles, role='user')
  // ---------------------------------------------------------------
  async function loadUsers() {
    els.listCount.textContent = "Ачаалж байна…";

    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id, user_code, display_name, role, is_active")
      .eq("role", "user")
      .order("user_code", { ascending: true });

    if (error) {
      console.error(error);
      els.listCount.textContent = "Алдаа гарлаа: хэрэглэгчдийг ачаалж чадсангүй.";
      return;
    }

    state.users = data || [];
    renderUserList();
  }

  function getFilteredUsers() {
    if (!state.query) return state.users;
    return state.users.filter((u) => `${u.user_code || ""} ${u.display_name || ""}`.toLowerCase().includes(state.query));
  }

  function renderUserList() {
    const list = getFilteredUsers();
    els.listCount.textContent = `${list.length} / ${state.users.length} хэрэглэгч`;
    els.list.innerHTML = "";

    if (list.length === 0) {
      els.listEmpty.classList.remove("hidden");
      return;
    }
    els.listEmpty.classList.add("hidden");

    const fragment = document.createDocumentFragment();
    list.forEach((user) => fragment.appendChild(buildUserRow(user)));
    els.list.appendChild(fragment);
  }

  function buildUserRow(user) {
    const li = document.createElement("li");
    const isSelected = state.selectedUser && state.selectedUser.id === user.id;
    li.className = "flex items-center gap-2 px-4 py-2.5" + (isSelected ? " bg-slate-50" : "");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "flex flex-1 items-center gap-3 text-left";
    button.innerHTML = `
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-[#0B2E4E] text-white" : "bg-slate-100 text-slate-600"} font-mono text-xs font-semibold">${escapeHtml(String(user.user_code || "?").slice(-2))}</span>
      <span>
        <span class="block text-sm font-medium text-slate-900">${escapeHtml(user.display_name || "(нэргүй)")}</span>
        <span class="block font-mono text-xs text-slate-500">${escapeHtml(user.user_code || "")}</span>
      </span>
    `;
    button.addEventListener("click", () => selectUser(user));

    li.appendChild(button);
    return li;
  }

  // ---------------------------------------------------------------
  // Selected user's app_data (admin reads/writes via owner_id filter,
  // authorized by the existing owner-OR-admin app_data RLS policy)
  // ---------------------------------------------------------------
  async function selectUser(user) {
    state.selectedUser = user;
    renderUserList();

    els.detailEmpty.classList.add("hidden");
    els.detailPanel.classList.remove("hidden");
    els.detailAvatar.textContent = String(user.user_code || "?").slice(-2);
    els.detailName.textContent = user.display_name || "(нэргүй)";
    els.detailCode.textContent = user.user_code || "";
    els.detailStatus.textContent = user.is_active ? "Идэвхтэй" : "Идэвхгүй";
    els.appDataList.innerHTML = '<p class="text-sm text-slate-500">Ачаалж байна…</p>';

    await loadAppData(user);
  }

  async function loadAppData(user) {
    const thisRequestId = ++requestId;

    const { data, error } = await supabaseClient
      .from("app_data")
      .select("id, project_id, storage_key, data, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("storage_key", { ascending: true });

    if (thisRequestId !== requestId) return; // stale — admin already selected another user

    if (error) {
      console.error(error);
      els.appDataList.innerHTML = '<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">app_data ачаалахад алдаа гарлаа.</p>';
      return;
    }

    state.appData = data || [];
    renderAppDataList(thisRequestId);
  }

  function renderAppDataList(thisRequestId) {
    els.appDataList.innerHTML = "";

    if (state.appData.length === 0) {
      els.appDataList.innerHTML = '<p class="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Энэ хэрэглэгчид app_data бичлэг алга.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    state.appData.forEach((row) => fragment.appendChild(buildAppDataCard(row, thisRequestId)));
    els.appDataList.appendChild(fragment);
  }

  function buildAppDataCard(row, thisRequestId) {
    const card = document.createElement("div");
    card.className = "rounded-lg border border-slate-200 p-3";
    card.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span class="font-mono text-xs font-semibold text-slate-700">${escapeHtml(row.storage_key)}</span>
          <span class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">${escapeHtml(row.project_id || "MAIN")}</span>
        </div>
        <span class="text-xs text-slate-400">Шинэчилсэн: ${formatDate(row.updated_at)}</span>
      </div>
      <textarea class="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-800 focus:border-[#0B2E4E] focus:bg-white" rows="4"></textarea>
      <div class="mt-2 flex items-center gap-2">
        <button type="button" data-action="save" class="rounded-md bg-[#0B2E4E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0d3a63]">Хадгалах</button>
        <span class="save-status text-xs text-slate-500"></span>
      </div>
    `;

    // .value assignment is never HTML-parsed, so arbitrary app_data
    // content cannot inject markup here even though it is unescaped.
    const textarea = card.querySelector("textarea");
    textarea.value = row.data === null || row.data === undefined ? "" : String(row.data);

    const statusEl = card.querySelector(".save-status");
    card.querySelector('[data-action="save"]').addEventListener("click", () => {
      saveAppDataRow(row, textarea, statusEl, thisRequestId);
    });

    return card;
  }

  async function saveAppDataRow(row, textarea, statusEl, thisRequestId) {
    if (thisRequestId !== requestId) return; // admin already switched to another user

    statusEl.textContent = "Хадгалж байна…";
    statusEl.classList.remove("text-red-600");

    const nowIso = new Date().toISOString();
    const { error } = await supabaseClient
      .from("app_data")
      .update({ data: textarea.value, updated_at: nowIso })
      .eq("id", row.id);

    if (thisRequestId !== requestId) return;

    if (error) {
      console.error(error);
      statusEl.textContent = "Алдаа гарлаа: " + error.message;
      statusEl.classList.add("text-red-600");
      return;
    }

    row.data = textarea.value;
    row.updated_at = nowIso;
    statusEl.textContent = "Хадгалагдлаа.";
    setTimeout(() => {
      statusEl.textContent = "";
    }, 2000);
  }

  function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
})();
