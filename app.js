/**
 * app.js
 * ----------------------------------------------------------------
 * Admin dashboard-ийн бүх логик. projects.js-с ирсэн configuration
 * дата дээр үндэслэн UI-г render хийнэ. Энэ файлд ямар ч тодорхой
 * project-ийн URL хатуу бичигдээгүй (hardcode-гүй) — бүгд
 * projects.js-ээс дамждаг.
 * ----------------------------------------------------------------
 */

(function () {
  "use strict";

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  const state = {
    query: "",
    statusFilter: "all", // all | active | inactive | maintenance
    sortBy: "id-asc", // id-asc | id-desc | name-asc
  };

  // ---------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------
  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheDom();
    bindEvents();
    startClock();
    renderGrid();
    checkLinksInBackground();
  }

  function cacheDom() {
    els.grid = document.getElementById("project-grid");
    els.emptyState = document.getElementById("empty-state");
    els.searchInput = document.getElementById("search-input");
    els.statusFilter = document.getElementById("status-filter");
    els.sortSelect = document.getElementById("sort-select");
    els.resultsCount = document.getElementById("results-count");
    els.clock = document.getElementById("live-clock");
    els.dateLabel = document.getElementById("live-date");
    els.modal = document.getElementById("detail-modal");
    els.modalBody = document.getElementById("detail-modal-body");
    els.modalClose = document.getElementById("detail-modal-close");
    els.viewAllBtn = document.getElementById("view-all-btn");
    els.navDashboard = document.getElementById("nav-dashboard");
    els.dashboardPanel = document.getElementById("dashboard-screen-panel");
    els.dashboardFrame = document.getElementById("dashboard-screen-frame");
    els.dashboardClose = document.getElementById("dashboard-screen-close");
  }

  function bindEvents() {
    els.searchInput.addEventListener("input", (e) => {
      state.query = e.target.value.trim().toLowerCase();
      renderGrid();
    });

    els.statusFilter.addEventListener("change", (e) => {
      state.statusFilter = e.target.value;
      renderGrid();
    });

    els.sortSelect.addEventListener("change", (e) => {
      state.sortBy = e.target.value;
      renderGrid();
    });

    els.viewAllBtn.addEventListener("click", () => {
      state.query = "";
      state.statusFilter = "all";
      els.searchInput.value = "";
      els.statusFilter.value = "all";
      renderGrid();
      els.grid.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    els.modalClose.addEventListener("click", closeDetailModal);
    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) closeDetailModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !els.modal.classList.contains("hidden")) {
        closeDetailModal();
      }
      if (e.key === "Escape" && els.dashboardPanel.getAttribute("aria-hidden") === "false") {
        closeDashboardScreen();
      }
    });

    els.navDashboard.addEventListener("click", (e) => {
      e.preventDefault();
      openDashboardScreen();
    });
    els.dashboardClose.addEventListener("click", closeDashboardScreen);
  }

  // ---------------------------------------------------------------
  // Right-side screen: tsagNvvr.html (loaded lazily on first open)
  // ---------------------------------------------------------------
  function openDashboardScreen() {
    if (!els.dashboardFrame.getAttribute("src")) {
      els.dashboardFrame.src = "./tsagNvvr.html";
    }
    els.dashboardPanel.classList.remove("translate-x-full");
    els.dashboardPanel.setAttribute("aria-hidden", "false");
  }

  function closeDashboardScreen() {
    els.dashboardPanel.classList.add("translate-x-full");
    els.dashboardPanel.setAttribute("aria-hidden", "true");
  }

  // ---------------------------------------------------------------
  // Clock
  // ---------------------------------------------------------------
  function startClock() {
    const weekdays = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
    function tick() {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      els.clock.textContent = `${hh}:${mm}:${ss}`;
      els.dateLabel.textContent = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} · ${weekdays[now.getDay()]}`;
    }
    tick();
    setInterval(tick, 1000);
  }

  // ---------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------
  function getFilteredProjects() {
    let list = projects.slice();

    if (state.query) {
      list = list.filter((p) => {
        const haystack = `${p.id} ${p.name} ${p.description}`.toLowerCase();
        return haystack.includes(state.query);
      });
    }

    if (state.statusFilter !== "all") {
      list = list.filter((p) => p.status === state.statusFilter);
    }

    switch (state.sortBy) {
      case "id-desc":
        list.sort((a, b) => b.id - a.id);
        break;
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name, "mn"));
        break;
      case "id-asc":
      default:
        list.sort((a, b) => a.id - b.id);
    }

    return list;
  }

  function renderGrid() {
    const list = getFilteredProjects();
    els.resultsCount.textContent = `${list.length} / ${projects.length} хэсэг харагдаж байна`;

    els.grid.innerHTML = "";

    if (list.length === 0) {
      els.emptyState.classList.remove("hidden");
      return;
    }
    els.emptyState.classList.add("hidden");

    const fragment = document.createDocumentFragment();
    list.forEach((project) => fragment.appendChild(buildCard(project)));
    els.grid.appendChild(fragment);
  }

  function statusMeta(status) {
    switch (status) {
      case "active":
        return { label: "Идэвхтэй", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" };
      case "maintenance":
        return { label: "Засвартай", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 ring-amber-600/20" };
      case "inactive":
      default:
        return { label: "Идэвхгүй", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 ring-slate-500/20" };
    }
  }

  function buildCard(project) {
    const meta = statusMeta(project.status);
    const article = document.createElement("article");
    article.className =
      "group relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-within:-translate-y-0.5 focus-within:shadow-md";
    article.setAttribute("data-project-id", project.id);

    article.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0B2E4E] font-mono text-sm font-semibold text-white">
            ${String(project.id).padStart(2, "0")}
          </span>
          <div>
            <h3 class="text-base font-semibold text-slate-900">${escapeHtml(project.name)}</h3>
            <span class="mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.badge}">
              <span class="h-1.5 w-1.5 rounded-full ${meta.dot}"></span>${meta.label}
            </span>
          </div>
        </div>
        <span class="link-status hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium" data-link-status="${project.id}"></span>
      </div>

      <p class="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">${escapeHtml(project.description)}</p>

      <div class="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
        <a
          href="${escapeAttr(project.url)}"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0B2E4E] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#0d3a63] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B2E4E]"
        >
          Системд нэвтрэх
        </a>
        <button
          type="button"
          data-action="view"
          class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B2E4E]"
        >
          Шууд харах
        </button>
      </div>
    `;

    article.querySelector('[data-action="view"]').addEventListener("click", () => openDetailModal(project));
    return article;
  }

  // ---------------------------------------------------------------
  // Detail modal
  // ---------------------------------------------------------------
  function openDetailModal(project) {
    const meta = statusMeta(project.status);
    els.modalBody.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0B2E4E] font-mono text-base font-semibold text-white">
          ${String(project.id).padStart(2, "0")}
        </span>
        <div>
          <h2 class="text-lg font-semibold text-slate-900">${escapeHtml(project.name)}</h2>
          <span class="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.badge}">
            <span class="h-1.5 w-1.5 rounded-full ${meta.dot}"></span>${meta.label}
          </span>
        </div>
      </div>
      <p class="mt-4 text-sm leading-relaxed text-slate-600">${escapeHtml(project.description)}</p>
      <dl class="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
        <div class="flex justify-between gap-3">
          <dt class="text-slate-500">Дугаар</dt>
          <dd class="font-medium text-slate-900">${project.id}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-slate-500">Холбоос</dt>
          <dd class="truncate font-medium text-[#0B2E4E]" title="${escapeAttr(project.url)}">${escapeHtml(project.url)}</dd>
        </div>
      </dl>
      <p class="mt-4 text-xs text-slate-400">
        Энэ мэдээлэл зөвхөн Admin site-ийн танилцуулга бөгөөд тухайн хэсгийн
        дотоод өгөгдөл, LocalStorage-д хамаарахгүй.
      </p>
      <div class="mt-5 flex gap-2">
        <a
          href="${escapeAttr(project.url)}"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex flex-1 items-center justify-center rounded-lg bg-[#0B2E4E] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0d3a63]"
        >
          Системд нэвтрэх
        </a>
      </div>
    `;
    els.modal.classList.remove("hidden");
    els.modalClose.focus();
    document.body.style.overflow = "hidden";
  }

  function closeDetailModal() {
    els.modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  // ---------------------------------------------------------------
  // Broken-link detection (best-effort, no-cors == "давхар шалгах")
  // GitHub Pages нь cross-origin тул response.ok шалгах боломжгүй,
  // тиймээс fetch амжилттай/амжилтгүй байдлаар л (сүлжээ/DNS алдаа)
  // тодорхойлно. Энэ нь 100% баталгаа биш ч ашигтай эхний шалгалт.
  // ---------------------------------------------------------------
  function checkLinksInBackground() {
    projects.forEach((project) => {
      const badge = document.querySelector(`[data-link-status="${project.id}"]`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      fetch(project.url, { mode: "no-cors", signal: controller.signal })
        .then(() => {
          clearTimeout(timeout);
          // no-cors горимд статус кодыг уншиж чадахгүй тул зөвхөн
          // "хандах боломжтой" гэдгийг л баталгаажуулна.
        })
        .catch(() => {
          clearTimeout(timeout);
          if (badge) {
            badge.textContent = "Холбогдсонгүй";
            badge.classList.remove("hidden");
            badge.classList.add("bg-red-50", "text-red-700", "ring-1", "ring-inset", "ring-red-600/20");
          }
        });
    });
  }

  // ---------------------------------------------------------------
  // Utils
  // ---------------------------------------------------------------
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }
})();