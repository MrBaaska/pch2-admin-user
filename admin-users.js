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

  // --------------------------------------------------------
  // Readable rendering helpers (arrays -> table, objects -> key/value,
  // image data -> gallery). Raw JSON remains available via the toggle.
  // All text is escaped; image srcs are limited to data:/blob:/https:.
  // --------------------------------------------------------
  function tryParseJson(text) {
    if (typeof text !== "string") return null;
    const trimmed = text.trim();
    if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null;
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return null;
    }
  }

  function isImageString(value) {
    if (typeof value !== "string") return false;
    const v = value.trim().toLowerCase();
    return v.startsWith("data:image/") || v.startsWith("blob:") || /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/.test(v);
  }

  function safeImageSrc(value) {
    const v = String(value).trim();
    const lower = v.toLowerCase();
    if (lower.startsWith("data:image/") || lower.startsWith("blob:")) return v;
    if (/^https?:\/\//i.test(v)) return v;
    return null;
  }

  function buildReadableView(parsed) {
    // Array of image strings -> gallery
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((x) => typeof x === "string" && isImageString(x))) {
      const wrap = document.createElement("div");
      wrap.className = "mt-2 flex flex-wrap gap-2";
      parsed.forEach((src) => {
        const safe = safeImageSrc(src);
        if (!safe) return;
        const img = document.createElement("img");
        img.src = safe;
        img.alt = "image";
        img.className = "h-20 w-auto rounded border border-slate-200 object-cover";
        img.loading = "lazy";
        wrap.appendChild(img);
      });
      return wrap;
    }

    // Array of objects -> table
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
      const cols = [];
      parsed.forEach((row) => Object.keys(row).forEach((k) => { if (!cols.includes(k)) cols.push(k); }));
      const wrap = document.createElement("div");
      wrap.className = "mt-2 max-h-72 overflow-auto rounded border border-slate-200";
      const table = document.createElement("table");
      table.className = "min-w-full divide-y divide-slate-200 text-xs";
      const thead = document.createElement("thead");
      const htr = document.createElement("tr");
      cols.forEach((c) => {
        const th = document.createElement("th");
        th.className = "bg-slate-50 px-2 py-1 text-left font-semibold text-slate-600";
        th.textContent = c;
        htr.appendChild(th);
      });
      thead.appendChild(htr);
      const tbody = document.createElement("tbody");
      tbody.className = "divide-y divide-slate-100";
      parsed.forEach((row) => {
        const tr = document.createElement("tr");
        cols.forEach((c) => {
          const td = document.createElement("td");
          td.className = "px-2 py-1 text-slate-700 align-top";
          const v = row[c];
          td.textContent = (v === null || v === undefined) ? "" : (typeof v === "object" ? JSON.stringify(v) : String(v));
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(thead);
      table.appendChild(tbody);
      wrap.appendChild(table);
      return wrap;
    }

    // Plain object -> key/value list (images under keys rendered as thumbnails)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const wrap = document.createElement("dl");
      wrap.className = "mt-2 max-h-72 overflow-auto rounded border border-slate-200 p-2 text-xs";
      Object.keys(parsed).forEach((k) => {
        const v = parsed[k];
        const dt = document.createElement("dt");
        dt.className = "font-semibold text-slate-600 mt-1";
        dt.textContent = k;
        wrap.appendChild(dt);
        const dd = document.createElement("dd");
        dd.className = "ml-2 text-slate-700";
        if (isImageString(v)) {
          const safe = safeImageSrc(v);
          if (safe) {
            const img = document.createElement("img");
            img.src = safe;
            img.alt = k;
            img.className = "h-20 w-auto rounded border border-slate-200 object-cover";
            dd.appendChild(img);
          } else {
            dd.textContent = String(v);
          }
        } else if (Array.isArray(v) && v.length && v.every((x) => typeof x === "string" && isImageString(x))) {
          const g = document.createElement("div");
          g.className = "flex flex-wrap gap-2 mt-1";
          v.forEach((s) => { const safe = safeImageSrc(s); if (safe) { const i = document.createElement("img"); i.src = safe; i.className = "h-16 w-auto rounded border border-slate-200 object-cover"; g.appendChild(i); } });
          dd.appendChild(g);
        } else {
          dd.textContent = (v === null || v === undefined) ? "" : (typeof v === "object" ? JSON.stringify(v) : String(v));
        }
        wrap.appendChild(dd);
      });
      return wrap;
    }

    // Primitives / anything else -> plain text block
    const pre = document.createElement("pre");
    pre.className = "mt-2 whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700";
    pre.textContent = (parsed === null || parsed === undefined) ? String(parsed) : (typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : String(parsed));
    return pre;
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
      <div class="readable-container"></div>
      <textarea class="mt-2 hidden w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs text-slate-800 focus:border-[#0B2E4E] focus:bg-white" rows="6"></textarea>
      <div class="mt-2 flex items-center gap-2">
        <button type="button" data-action="toggle" class="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Raw JSON</button>
        <button type="button" data-action="save" class="hidden rounded-md bg-[#0B2E4E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0d3a63]">Хадгалах</button>
        <span class="save-status text-xs text-slate-500"></span>
      </div>
    `;

    const readableContainer = card.querySelector(".readable-container");
    const textarea = card.querySelector("textarea");
    const toggleBtn = card.querySelector('[data-action="toggle"]');
    const saveBtn = card.querySelector('[data-action="save"]');
    const statusEl = card.querySelector(".save-status");

    // .value assignment is never HTML-parsed, so arbitrary app_data
    // content cannot inject markup here even though it is unescaped.
    const rawText = row.data === null || row.data === undefined ? "" : String(row.data);
    textarea.value = rawText;

    // Default: readable view (falls back to a text block when not JSON).
    readableContainer.appendChild(buildReadableView(tryParseJson(rawText)));

    let rawVisible = false;
    toggleBtn.addEventListener("click", () => {
      rawVisible = !rawVisible;
      textarea.classList.toggle("hidden", !rawVisible);
      saveBtn.classList.toggle("hidden", !rawVisible);
      readableContainer.classList.toggle("hidden", rawVisible);
      toggleBtn.textContent = rawVisible ? "Readable" : "Raw JSON";
    });

    saveBtn.addEventListener("click", () => {
      saveAppDataRow(row, textarea, statusEl, thisRequestId, readableContainer);
    });

    return card;
  }

  async function saveAppDataRow(row, textarea, statusEl, thisRequestId, readableContainer) {
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
    if (readableContainer) {
      readableContainer.innerHTML = "";
      readableContainer.appendChild(buildReadableView(tryParseJson(textarea.value)));
    }
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
