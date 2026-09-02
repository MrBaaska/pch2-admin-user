/**
 * admin-links.js
 * ----------------------------------------------------------------
 * Read/write layer for the new Supabase project-id/link system.
 * READ-ONLY towards user submissions (`submissions` table): the
 * Admin never inserts/updates/deletes a user's data or files.
 * The only write this file performs is creating a new row in the
 * `projects` table when the admin clicks "Шинэ холбоос үүсгэх" —
 * that table is owned/managed by the Admin, not by users.
 *
 * Required tables (see sql/schema.sql for full DDL + RLS):
 *   projects(project_id text PK, link text, status text,
 *            created_at timestamptz, updated_at timestamptz)
 *   submissions(id uuid PK, project_id text FK -> projects,
 *               user_name text, data jsonb, files jsonb,
 *               created_at timestamptz, updated_at timestamptz)
 * ----------------------------------------------------------------
 */

(function () {
  "use strict";

  const state = {
    projects: [], // [{ project_id, link, status(computed), created_at, updated_at, submissions: [...] }]
    filters: { id: "", name: "", status: "all", from: "", to: "" },
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    if (typeof supabaseClient === "undefined") {
      console.error("supabaseClient not found — check supabase-config.js is loaded first.");
      return;
    }
    cacheDom();
    bindEvents();
    loadLinks();
  }

  function cacheDom() {
    els.createBtn = document.getElementById("create-link-btn");
    els.newLinkResult = document.getElementById("new-link-result");
    els.newLinkId = document.getElementById("new-link-id");
    els.newLinkUrl = document.getElementById("new-link-url");
    els.newLinkCopy = document.getElementById("new-link-copy");

    els.filterId = document.getElementById("link-filter-id");
    els.filterName = document.getElementById("link-filter-name");
    els.filterStatus = document.getElementById("link-filter-status");
    els.filterFrom = document.getElementById("link-filter-from");
    els.filterTo = document.getElementById("link-filter-to");
    els.filterReset = document.getElementById("link-filter-reset");

    els.tableBody = document.getElementById("links-table-body");
    els.resultsCount = document.getElementById("links-results-count");
    els.emptyState = document.getElementById("links-empty-state");

    els.modal = document.getElementById("submission-modal");
    els.modalBody = document.getElementById("submission-modal-body");
    els.modalClose = document.getElementById("submission-modal-close");
  }

  function bindEvents() {
    els.createBtn.addEventListener("click", createNewLink);
    els.newLinkCopy.addEventListener("click", () => {
      copyToClipboard(els.newLinkUrl.textContent, els.newLinkCopy);
    });

    els.filterId.addEventListener("input", (e) => {
      state.filters.id = e.target.value.trim().toLowerCase();
      renderTable();
    });
    els.filterName.addEventListener("input", (e) => {
      state.filters.name = e.target.value.trim().toLowerCase();
      renderTable();
    });
    els.filterStatus.addEventListener("change", (e) => {
      state.filters.status = e.target.value;
      renderTable();
    });
    els.filterFrom.addEventListener("change", (e) => {
      state.filters.from = e.target.value;
      renderTable();
    });
    els.filterTo.addEventListener("change", (e) => {
      state.filters.to = e.target.value;
      renderTable();
    });
    els.filterReset.addEventListener("click", () => {
      state.filters = { id: "", name: "", status: "all", from: "", to: "" };
      els.filterId.value = "";
      els.filterName.value = "";
      els.filterStatus.value = "all";
      els.filterFrom.value = "";
      els.filterTo.value = "";
      renderTable();
    });

    els.modalClose.addEventListener("click", closeSubmissionModal);
    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) closeSubmissionModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !els.modal.classList.contains("hidden")) closeSubmissionModal();
    });
  }

  // ---------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------
  async function loadLinks() {
    els.resultsCount.textContent = "Ачааллаж байна…";

    const { data: projectRows, error: projectsErr } = await supabaseClient
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (projectsErr) {
      console.error(projectsErr);
      els.resultsCount.textContent = "Алдаа гарлаа: холбоосуудыг ачаалж чадсангүй.";
      return;
    }

    // One query for every submission, then group by project_id in JS —
    // avoids N+1 queries and guarantees each project only ever sees
    // rows whose project_id matches its own.
    const { data: submissionRows, error: submissionsErr } = await supabaseClient
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (submissionsErr) {
      console.error(submissionsErr);
    }

    const byProject = new Map();
    (submissionRows || []).forEach((row) => {
      const key = String(row.project_id).trim();
      if (!byProject.has(key)) byProject.set(key, []);
      byProject.get(key).push(row);
    });

    state.projects = (projectRows || []).map((p) => {
      const subs = byProject.get(String(p.project_id).trim()) || [];
      return {
        ...p,
        submissions: subs,
        computedStatus: computeStatus(subs),
      };
    });

    renderTable();
  }

  function computeStatus(submissions) {
    if (!submissions || submissions.length === 0) return "Empty";
    const completed = submissions.some((s) => {
      const d = s.data || {};
      return d.status === "completed" || d.status === "Completed" || d.completed === true;
    });
    return completed ? "Completed" : "In Progress";
  }

  // ---------------------------------------------------------------
  // Create new link
  // ---------------------------------------------------------------
  async function createNewLink() {
    els.createBtn.disabled = true;
    els.createBtn.textContent = "Үүсгэж байна…";

    try {
      const nextId = nextProjectId();
      const link = USER_PROJECT_BASE_URL + "?id=" + nextId;

      const { data, error } = await supabaseClient
        .from("projects")
        .insert({ project_id: nextId, link, status: "Empty" })
        .select()
        .single();

      if (error) {
        console.error(error);
        alert("Холбоос үүсгэхэд алдаа гарлаа: " + error.message);
        return;
      }

      state.projects.unshift({ ...data, submissions: [], computedStatus: "Empty" });
      renderTable();

      els.newLinkId.textContent = data.project_id;
      els.newLinkUrl.textContent = data.link;
      els.newLinkResult.classList.remove("hidden");
      els.newLinkResult.classList.add("flex");
    } finally {
      els.createBtn.disabled = false;
      els.createBtn.textContent = "+ Шинэ холбоос үүсгэх";
    }
  }

  function nextProjectId() {
    let max = 0;
    state.projects.forEach((p) => {
      const m = /^(\d+)$/.exec(String(p.project_id).trim());
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return String(max + 1).padStart(3, "0");
  }

  // ---------------------------------------------------------------
  // Table rendering
  // ---------------------------------------------------------------
  function getFilteredProjects() {
    return state.projects.filter((p) => {
      if (state.filters.id && !String(p.project_id).toLowerCase().includes(state.filters.id)) return false;

      if (state.filters.name) {
        const hasName = (p.submissions || []).some((s) =>
          String(s.user_name || "").toLowerCase().includes(state.filters.name)
        );
        if (!hasName) return false;
      }

      if (state.filters.status !== "all" && p.computedStatus !== state.filters.status) return false;

      if (state.filters.from) {
        const from = new Date(state.filters.from + "T00:00:00");
        if (new Date(p.created_at) < from) return false;
      }
      if (state.filters.to) {
        const to = new Date(state.filters.to + "T23:59:59");
        if (new Date(p.created_at) > to) return false;
      }

      return true;
    });
  }

  function statusBadge(status) {
    switch (status) {
      case "Completed":
        return '<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>Дууссан</span>';
      case "In Progress":
        return '<span class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20"><span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>Явагдаж буй</span>';
      default:
        return '<span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20"><span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span>Хоосон</span>';
    }
  }

  function renderTable() {
    const list = getFilteredProjects();
    els.resultsCount.textContent = `${list.length} / ${state.projects.length} холбоос харагдаж байна`;
    els.tableBody.innerHTML = "";

    if (list.length === 0) {
      els.emptyState.classList.remove("hidden");
      return;
    }
    els.emptyState.classList.add("hidden");

    const fragment = document.createDocumentFragment();
    list.forEach((p) => fragment.appendChild(buildRow(p)));
    els.tableBody.appendChild(fragment);
  }

  function buildRow(p) {
    const tr = document.createElement("tr");
    tr.className = "align-top";
    tr.innerHTML = `
      <td class="px-4 py-3 font-mono text-sm font-semibold text-slate-900">${escapeHtml(p.project_id)}</td>
      <td class="px-4 py-3 max-w-xs truncate text-sm text-[#0B2E4E]" title="${escapeAttr(p.link)}">${escapeHtml(p.link)}</td>
      <td class="px-4 py-3">${statusBadge(p.computedStatus)}</td>
      <td class="px-4 py-3 whitespace-nowrap text-xs text-slate-500">${formatDate(p.created_at)}</td>
      <td class="px-4 py-3 whitespace-nowrap text-xs text-slate-500">${formatDate(p.updated_at)}</td>
      <td class="px-4 py-3">
        <div class="flex gap-2">
          <button type="button" data-action="copy" class="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Хуулах</button>
          <button type="button" data-action="view" class="rounded-md bg-[#0B2E4E] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#0d3a63]">Харах</button>
        </div>
      </td>
    `;
    tr.querySelector('[data-action="copy"]').addEventListener("click", (e) => copyToClipboard(p.link, e.currentTarget));
    tr.querySelector('[data-action="view"]').addEventListener("click", () => openSubmissionModal(p));
    return tr;
  }

  // ---------------------------------------------------------------
  // Submission view modal
  // ---------------------------------------------------------------
  async function openSubmissionModal(project) {
    els.modalBody.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0B2E4E] font-mono text-sm font-semibold text-white">${escapeHtml(project.project_id)}</span>
        <div>
          <h2 class="text-lg font-semibold text-slate-900">${escapeHtml(project.project_id)}</h2>
          ${statusBadge(project.computedStatus)}
        </div>
      </div>
      <p class="mt-3 truncate text-xs text-slate-500" title="${escapeAttr(project.link)}">${escapeHtml(project.link)}</p>
      <div id="submission-list" class="mt-4 space-y-3"><p class="text-sm text-slate-500">Ачаалж байна…</p></div>
    `;
    els.modal.classList.remove("hidden");
    els.modalClose.focus();
    document.body.style.overflow = "hidden";

    const listEl = els.modalBody.querySelector("#submission-list");

    // Explicit, isolated per-project query — never relies on the cached
    // client-side grouping, so this project_id can never show another
    // project's rows even if the bulk grouping above were ever wrong.
    const { data: subs, error } = await supabaseClient
      .from("submissions")
      .select("*")
      .eq("project_id", project.project_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      listEl.innerHTML = '<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">Мэдээллийг ачаалахад алдаа гарлаа.</p>';
      return;
    }

    if (!subs || subs.length === 0) {
      listEl.innerHTML = '<p class="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Энэ project_id-д илгээсэн мэдээлэл одоогоор алга.</p>';
      return;
    }

    listEl.innerHTML = "";
    for (const sub of subs) {
      listEl.appendChild(await buildSubmissionCard(sub));
    }
  }

  async function buildSubmissionCard(sub) {
    const card = document.createElement("div");
    card.className = "rounded-lg border border-slate-200 p-3 text-sm";

    const data = sub.data && typeof sub.data === "object" ? sub.data : {};
    const type = data.type || data.record_type || "";

    const rows = Object.keys(data)
      .filter((k) => !["type", "record_type", "status", "completed"].includes(k))
      .map(
        (k) =>
          `<div class="flex justify-between gap-3"><dt class="text-slate-500">${escapeHtml(k)}</dt><dd class="text-right font-medium text-slate-900">${escapeHtml(stringifyValue(data[k]))}</dd></div>`
      )
      .join("");

    card.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          ${sub.user_name ? `<span class="font-medium text-slate-900">${escapeHtml(sub.user_name)}</span>` : ""}
          ${type ? `<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">${escapeHtml(type)}</span>` : ""}
        </div>
        <span class="text-xs text-slate-400">Үүсгэсэн: ${formatDate(sub.created_at)}${sub.updated_at ? " · Шинэчилсэн: " + formatDate(sub.updated_at) : ""}</span>
      </div>
      <dl class="mt-2 space-y-1">${rows || '<p class="text-slate-400">Дэлгэрэнгүй мэдээлэл алга.</p>'}</dl>
      <div class="mt-2 files-slot"></div>
    `;

    const filesSlot = card.querySelector(".files-slot");
    const files = Array.isArray(sub.files) ? sub.files : [];
    if (files.length > 0) {
      filesSlot.innerHTML = '<p class="text-xs font-medium text-slate-500">Хавсаргасан файл:</p>';
      const linksWrap = document.createElement("div");
      linksWrap.className = "mt-1 flex flex-wrap gap-2";
      for (const path of files) {
        const url = await getFileUrl(path);
        const a = document.createElement("a");
        a.href = url || "#";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "rounded-md border border-slate-200 px-2 py-1 text-xs text-[#0B2E4E] hover:bg-slate-50";
        a.textContent = String(path).split("/").pop();
        linksWrap.appendChild(a);
      }
      filesSlot.appendChild(linksWrap);
    }

    return card;
  }

  async function getFileUrl(path) {
    try {
      const { data, error } = await supabaseClient.storage
        .from(SUBMISSION_FILES_BUCKET)
        .createSignedUrl(path, 3600);
      if (error) {
        console.error(error);
        return null;
      }
      return data.signedUrl;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  function closeSubmissionModal() {
    els.modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  // ---------------------------------------------------------------
  // Utils
  // ---------------------------------------------------------------
  function copyToClipboard(text, triggerEl) {
    const done = () => {
      if (!triggerEl) return;
      const original = triggerEl.textContent;
      triggerEl.textContent = "Хуулсан!";
      setTimeout(() => (triggerEl.textContent = original), 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } catch (e) {
      console.error(e);
    }
    document.body.removeChild(ta);
  }

  function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function stringifyValue(v) {
    if (v === null || v === undefined) return "—";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }
})();
