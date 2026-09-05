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
    els.refreshBtn = document.getElementById("user-refresh-btn");
    els.refreshStatus = document.getElementById("user-refresh-status");
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

    if (els.refreshBtn) {
      els.refreshBtn.addEventListener("click", onRefreshClick);
    }
  }

  // Re-query Supabase app_data for the CURRENTLY selected user only, using the
  // existing loadAppData(state.selectedUser) flow (owner_id = selectedUser.id).
  async function onRefreshClick() {
    if (!state.selectedUser) return;

    els.refreshBtn.disabled = true;
    const originalLabel = els.refreshBtn.textContent;
    els.refreshBtn.textContent = "Сэргээж байна…";
    if (els.refreshStatus) {
      els.refreshStatus.classList.remove("text-red-600");
      els.refreshStatus.textContent = "";
    }

    try {
      await loadAppData(state.selectedUser);
      if (els.refreshStatus) {
        els.refreshStatus.textContent = "Мэдээлэл шинэчлэгдлээ.";
        setTimeout(() => { els.refreshStatus.textContent = ""; }, 2500);
      }
    } catch (err) {
      console.error("Refresh app_data failed:", err);
      if (els.refreshStatus) {
        els.refreshStatus.textContent = "Шинэчлэхэд алдаа гарлаа: " + (err && err.message ? err.message : err);
        els.refreshStatus.classList.add("text-red-600");
      }
    } finally {
      els.refreshBtn.disabled = false;
      els.refreshBtn.textContent = originalLabel;
    }
  }

  // ---------------------------------------------------------------
  // 21 users (public.profiles, role='user')
  // ---------------------------------------------------------------
  async function loadUsers() {
    console.log("[ADMIN DEBUG] loadUsers started");
    els.listCount.textContent = "Ачаалж байна…";

    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id, user_code, display_name, role, is_active")
      .eq("role", "user")
      .order("user_code", { ascending: true });

    console.log("[ADMIN DEBUG] profiles query result:", data);
    console.log("[ADMIN DEBUG] profiles error:", error);

    if (error) {
      console.error(error);
      els.listCount.textContent = "Алдаа гарлаа: хэрэглэгчдийг ачаалж чадсангүй.";
      return;
    }

    state.users = data || [];
    console.log("[ADMIN DEBUG] user count:", state.users.length);
    console.log("[ADMIN DEBUG] user codes:", state.users.map((u) => u.user_code));
    renderUserList();
  }

  function getFilteredUsers() {
    if (!state.query) return state.users;
    return state.users.filter((u) => `${u.user_code || ""} ${formatSectionLabel(u.user_code)} ${u.display_name || ""}`.toLowerCase().includes(state.query));
  }

  function renderUserList() {
    const list = getFilteredUsers();
    console.log("[ADMIN DEBUG] filtered user count:", list.length);
    console.log("[ADMIN DEBUG] filtered user codes:", list.map((u) => u.user_code));
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

  // Display-only label (user_code 001-020 -> "PD-1-N"); anything else
  // (e.g. U21) is shown as its own raw user_code, never renumbered.
  // Purely cosmetic — never used for any query/owner_id/authorization logic.
  function formatSectionLabel(userCode) {
    const code = String(userCode || "");
    if (/^\d{1,3}$/.test(code)) {
      const n = parseInt(code, 10);
      if (n >= 1 && n <= 20) return "PD-1-" + n;
    }
    return code;
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
        <span class="block font-mono text-xs text-slate-500">${escapeHtml(formatSectionLabel(user.user_code))}</span>
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
    console.log("[ADMIN ATTENDANCE DEBUG] selectUser clicked, user row from profiles list:", user);
    console.log("[ADMIN DEBUG] selected user code:", user.user_code);
    console.log("[ADMIN DEBUG] selected user.id:", user.id);
    state.selectedUser = user;
    renderUserList();

    els.detailEmpty.classList.add("hidden");
    els.detailPanel.classList.remove("hidden");
    els.detailAvatar.textContent = String(user.user_code || "?").slice(-2);
    els.detailName.textContent = user.display_name || "(нэргүй)";
    els.detailCode.textContent = formatSectionLabel(user.user_code);
    els.detailStatus.textContent = user.is_active ? "Идэвхтэй" : "Идэвхгүй";
    els.appDataList.innerHTML = '<p class="text-sm text-slate-500">Ачаалж байна…</p>';

    await loadAppData(user);
  }

  async function loadAppData(user) {
    const thisRequestId = ++requestId;

    const { data: authData } = await supabaseClient.auth.getUser();
    console.log("[ADMIN ATTENDANCE DEBUG] auth.uid():", authData && authData.user ? authData.user.id : null);
    console.log("[ADMIN ATTENDANCE DEBUG] selected user object passed to loadAppData:", user);
    console.log("[ADMIN ATTENDANCE DEBUG] user.id used for owner_id filter:", user.id);

    const { data, error } = await supabaseClient
      .from("app_data")
      .select("id, project_id, storage_key, data, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("storage_key", { ascending: true });

    console.log("[ADMIN ATTENDANCE DEBUG] query: app_data.select(...).eq('owner_id','" + user.id + "')");
    console.log("[ADMIN ATTENDANCE DEBUG] error:", error);
    console.log("[ADMIN ATTENDANCE DEBUG] returned rows count:", data ? data.length : 0);
    console.log("[ADMIN ATTENDANCE DEBUG] returned storage_keys:", (data || []).map((r) => r.storage_key));

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
    console.log("[ADMIN ATTENDANCE DEBUG] renderAppDataList: state.appData length =", state.appData.length, "rows =", state.appData);

    if (state.appData.length === 0) {
      els.appDataList.innerHTML = '<p class="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Энэ хэрэглэгчид app_data бичлэг алга.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    state.appData.forEach((row) => fragment.appendChild(buildAppDataCard(row, thisRequestId)));
    els.appDataList.appendChild(fragment);
    console.log("[ADMIN ATTENDANCE DEBUG] appended", state.appData.length, "card(s) to #app-data-list; DOM children now:", els.appDataList.children.length);
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

    // Array of arrays of plain values (row/column text grids, e.g. anhaar.html's
    // auditTableData) -> render as a bounded table instead of a raw JSON dump,
    // since the previous fallback below made this data look "missing".
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((x) => Array.isArray(x))) {
      const colCount = parsed.reduce((max, row) => Math.max(max, row.length), 0);
      const wrap = document.createElement("div");
      wrap.className = "mt-2 max-h-72 overflow-auto rounded border border-slate-200";
      const table = document.createElement("table");
      table.className = "min-w-full divide-y divide-slate-200 text-xs";
      const tbody = document.createElement("tbody");
      tbody.className = "divide-y divide-slate-100";
      parsed.forEach((row) => {
        const tr = document.createElement("tr");
        for (let i = 0; i < colCount; i++) {
          const td = document.createElement("td");
          td.className = "px-2 py-1 text-slate-700 align-top";
          const cell = row[i];
          if (isImageString(cell)) {
            const safe = safeImageSrc(cell);
            if (safe) {
              const img = document.createElement("img");
              img.src = safe;
              img.alt = "";
              img.className = "h-16 w-auto rounded border border-slate-200 object-cover";
              td.appendChild(img);
            }
          } else {
            td.textContent = (cell === null || cell === undefined || cell === "") ? "—" : (typeof cell === "object" ? JSON.stringify(cell) : String(cell));
          }
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
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

  // Row/column grid data (currently only anhaar.html's "auditTableData":
  // array of [requirement, content, note, auditResultCode, recommendation]).
  // Detected by shape, not by storage_key name, so it stays part of the same
  // generic buildReadableView dispatch rather than a parallel system.
  const GRID_FIELD_DEFS = [
    { label: "Үйл явц, шаардлагууд", type: "textarea" },
    { label: "Агуулга", type: "textarea" },
    { label: "Тэмдэглэл", type: "textarea" },
    { label: "Аудитын үр дүн", type: "select", options: ["1", "2", "3", "4"] },
    { label: "Сайжруулах зөвлөмж", type: "textarea" },
  ];

  function isGridShape(parsed) {
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every((x) => Array.isArray(x));
  }

  // Editable table for grid-shaped data. Saves by row.id (UPDATE, never
  // INSERT), so the existing app_data row for this owner_id/project_id/
  // storage_key is always reused and no duplicate can be created.
  function buildEditableGridView(parsed, row, thisRequestId) {
    const colCount = Math.max(GRID_FIELD_DEFS.length, parsed.reduce((max, r) => Math.max(max, r.length), 0));

    const wrap = document.createElement("div");
    wrap.className = "mt-2 max-h-96 overflow-auto rounded border border-slate-200";
    const table = document.createElement("table");
    table.className = "min-w-full divide-y divide-slate-200 text-xs";
    const thead = document.createElement("thead");
    const htr = document.createElement("tr");
    for (let c = 0; c < colCount; c++) {
      const th = document.createElement("th");
      th.className = "sticky top-0 bg-slate-50 px-2 py-1 text-left font-semibold text-slate-600";
      th.textContent = (GRID_FIELD_DEFS[c] && GRID_FIELD_DEFS[c].label) || ("Багана " + (c + 1));
      htr.appendChild(th);
    }
    thead.appendChild(htr);

    const tbody = document.createElement("tbody");
    tbody.className = "divide-y divide-slate-100";
    const cellInputs = [];
    parsed.forEach((rowVals) => {
      const tr = document.createElement("tr");
      const rowInputs = [];
      for (let c = 0; c < colCount; c++) {
        const td = document.createElement("td");
        td.className = "px-1 py-1 align-top";
        const def = GRID_FIELD_DEFS[c];
        const val = rowVals[c] === undefined || rowVals[c] === null ? "" : String(rowVals[c]);
        let el;
        if (def && def.type === "select") {
          el = document.createElement("select");
          el.className = "w-full rounded border border-slate-200 bg-white p-1 text-xs";
          def.options.forEach((opt) => {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = opt;
            if (opt === val) o.selected = true;
            el.appendChild(o);
          });
        } else {
          el = document.createElement("textarea");
          el.className = "w-full min-w-[140px] resize-y rounded border border-slate-200 bg-white p-1 text-xs";
          el.rows = 2;
          el.value = val;
        }
        td.appendChild(el);
        tr.appendChild(td);
        rowInputs.push(el);
      }
      cellInputs.push(rowInputs);
      tbody.appendChild(tr);
    });
    table.appendChild(thead);
    table.appendChild(tbody);
    wrap.appendChild(table);

    const footer = document.createElement("div");
    footer.className = "mt-2 flex items-center gap-2";
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "rounded-md bg-[#0B2E4E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0d3a63]";
    saveBtn.textContent = "Хадгалах";
    const statusEl = document.createElement("span");
    statusEl.className = "text-xs text-slate-500";
    footer.appendChild(saveBtn);
    footer.appendChild(statusEl);

    saveBtn.addEventListener("click", async () => {
      if (thisRequestId !== requestId) return; // admin already selected another user
      saveBtn.disabled = true;
      statusEl.classList.remove("text-red-600");
      statusEl.textContent = "Хадгалж байна…";

      const nextData = cellInputs.map((rowInputs) => rowInputs.map((el) => el.value));
      const nowIso = new Date().toISOString();
      const { error } = await supabaseClient
        .from("app_data")
        .update({ data: JSON.stringify(nextData), updated_at: nowIso })
        .eq("id", row.id)
        .eq("owner_id", state.selectedUser.id);

      saveBtn.disabled = false;
      if (thisRequestId !== requestId) return;

      if (error) {
        console.error(error);
        statusEl.textContent = "Алдаа гарлаа: " + error.message;
        statusEl.classList.add("text-red-600");
        return;
      }

      row.data = JSON.stringify(nextData);
      row.updated_at = nowIso;
      statusEl.textContent = "Хадгалагдлаа.";
      setTimeout(() => { statusEl.textContent = ""; }, 2000);
    });

    const container = document.createElement("div");
    container.appendChild(wrap);
    container.appendChild(footer);
    return container;
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

    // Default: readable view. Grid-shaped data (array-of-arrays, e.g.
    // auditTableData) gets an editable table; everything else stays read-only
    // (edit via the Raw JSON toggle below).
    const initialParsed = tryParseJson(rawText);
    console.log("[ADMIN ATTENDANCE DEBUG] buildAppDataCard storage_key=" + row.storage_key + " rawText.length=" + rawText.length + " parsed:", initialParsed);
    readableContainer.appendChild(
      isGridShape(initialParsed) ? buildEditableGridView(initialParsed, row, thisRequestId) : buildReadableView(initialParsed)
    );
    console.log("[ADMIN ATTENDANCE DEBUG] storage_key=" + row.storage_key + " readable-container child count after render:", readableContainer.children.length);

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
      .eq("id", row.id)
      .eq("owner_id", state.selectedUser.id);

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
      const reparsed = tryParseJson(textarea.value);
      readableContainer.appendChild(
        isGridShape(reparsed) ? buildEditableGridView(reparsed, row, thisRequestId) : buildReadableView(reparsed)
      );
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
