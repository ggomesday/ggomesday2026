/* ═══════════════════════════════════════════════════════════════
   G.GOMES DAY 2026 — ADMIN PANEL SCRIPTS
   ═══════════════════════════════════════════════════════════════ */

/* ═══ CONFIGURAÇÃO SUPABASE ═══ */
const SUPABASE_URL = "https://mpxqdabkmhlzdwweuikk.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qp8JrbQYrylukDb6UuFRIQ_IyKorZNV";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ═══ ESTADO GLOBAL ═══ */
let currentUser = null;
let allLeads = [];
let filteredLeads = [];
let allUsers = [];
let currentView = "dashboard";
let currentPage = 1;
const ITEMS_PER_PAGE = 15;
let sortColumn = "created_at";
let sortDirection = "desc";
let deleteCallback = null;

/* ═══ HASH DE SENHA (SHA-256) ═══ */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ═══════════════════════════════════════════════════════════════
   INICIALIZAÇÃO
   ═══════════════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  // Verificar sessão salva
  checkSession();

  // Configurar data no topbar
  updateTopbarDate();

  // Event listeners
  initLoginForm();
  initNavigation();
  initSidebarToggle();
  initLeadsToolbar();
  initUserModal();
  initConfirmModal();
  initGlobalRefresh();
  initPasswordToggle();
});

/* ═══ VERIFICAR SESSÃO ═══ */
function checkSession() {
  const session = localStorage.getItem("ggomes_admin_session");
  if (session) {
    try {
      currentUser = JSON.parse(session);
      showAdminPanel();
    } catch {
      localStorage.removeItem("ggomes_admin_session");
    }
  }
}

/* ═══ LOGIN ═══ */
function initLoginForm() {
  const form = document.getElementById("login-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const errorEl = document.getElementById("login-error");
    const btnLogin = document.getElementById("btn-login");

    if (!username || !password) return;

    // Desabilitar botão
    btnLogin.disabled = true;
    btnLogin.querySelector("span").textContent = "Entrando...";

    try {
      const passwordHash = await sha256(password);

      // Tentar autenticar via função RPC
      const { data, error } = await db.rpc("authenticate_admin", {
        p_username: username,
        p_password_hash: passwordHash,
      });

      if (error) throw error;

      if (data && data.authenticated) {
        currentUser = data.user;
        localStorage.setItem(
          "ggomes_admin_session",
          JSON.stringify(currentUser)
        );
        errorEl.classList.remove("show");
        showAdminPanel();
        showToast("Bem-vindo, " + currentUser.display_name + "!", "success");
      } else {
        errorEl.textContent = data?.error || "Usuário ou senha inválidos";
        errorEl.classList.add("show");
      }
    } catch (err) {
      console.error("Erro no login:", err);

      // Fallback: tentar buscar direto na tabela
      try {
        const passwordHash = await sha256(password);
        const { data: users, error: fetchErr } = await db
          .from("admin_users")
          .select("id, username, display_name, role")
          .eq("username", username)
          .eq("password_hash", passwordHash)
          .eq("is_active", true)
          .limit(1);

        if (fetchErr) throw fetchErr;

        if (users && users.length > 0) {
          currentUser = users[0];
          localStorage.setItem(
            "ggomes_admin_session",
            JSON.stringify(currentUser)
          );
          errorEl.classList.remove("show");
          showAdminPanel();
          showToast(
            "Bem-vindo, " + currentUser.display_name + "!",
            "success"
          );

          // Atualizar last_login
          await db
            .from("admin_users")
            .update({ last_login: new Date().toISOString() })
            .eq("id", currentUser.id);
        } else {
          errorEl.textContent = "Usuário ou senha inválidos";
          errorEl.classList.add("show");
        }
      } catch (fallbackErr) {
        console.error("Fallback login error:", fallbackErr);
        errorEl.textContent =
          "Erro ao conectar ao servidor. Verifique sua conexão.";
        errorEl.classList.add("show");
      }
    } finally {
      btnLogin.disabled = false;
      btnLogin.querySelector("span").textContent = "Entrar";
    }
  });
}

/* ═══ EXIBIR PAINEL ═══ */
function showAdminPanel() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("admin-panel").style.display = "flex";

  // Atualizar info do usuário na sidebar
  const displayName = currentUser.display_name || currentUser.username;
  document.getElementById("sidebar-user-name").textContent = displayName;
  document.getElementById("sidebar-user-role").textContent = formatRole(
    currentUser.role
  );
  document.getElementById("user-avatar").textContent = displayName
    .charAt(0)
    .toUpperCase();

  // Controlar visibilidade da seção de admin
  const isAdmin = currentUser.role === "super_admin";
  document.getElementById("nav-section-admin").style.display = isAdmin
    ? "block"
    : "none";
  document.querySelectorAll(".nav-item-admin").forEach((el) => {
    el.style.display = isAdmin ? "flex" : "none";
  });

  // Carregar dados
  loadDashboard();

  // Configurar logout
  document.getElementById("btn-logout").addEventListener("click", logout);
}

/* ═══ LOGOUT ═══ */
function logout() {
  currentUser = null;
  localStorage.removeItem("ggomes_admin_session");
  document.getElementById("admin-panel").style.display = "none";
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("login-form").reset();
  document.getElementById("login-error").classList.remove("show");
}

/* ═══ TOGGLE MOSTRAR SENHA ═══ */
function initPasswordToggle() {
  const toggle = document.getElementById("toggle-password");
  const input = document.getElementById("login-password");
  if (!toggle || !input) return;

  toggle.addEventListener("click", () => {
    const type = input.type === "password" ? "text" : "password";
    input.type = type;
  });
}

/* ═══════════════════════════════════════════════════════════════
   NAVEGAÇÃO
   ═══════════════════════════════════════════════════════════════ */
function initNavigation() {
  document.querySelectorAll("[data-view]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const view = el.dataset.view;
      switchView(view);
    });
  });
}

function switchView(view) {
  currentView = view;

  // Atualizar nav items
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.view === view);
  });

  // Mostrar view correspondente
  document.querySelectorAll(".view").forEach((el) => {
    el.classList.remove("active");
  });
  const viewEl = document.getElementById("view-" + view);
  if (viewEl) {
    viewEl.classList.add("active");
  }

  // Atualizar título
  const titles = {
    dashboard: "Dashboard",
    leads: "Inscrições",
    users: "Usuários",
  };
  document.getElementById("page-title").textContent =
    titles[view] || "Dashboard";

  // Carregar dados da view
  if (view === "dashboard") loadDashboard();
  if (view === "leads") loadLeads();
  if (view === "users") loadUsers();

  // Fechar sidebar mobile
  document.getElementById("sidebar").classList.remove("open");
}

/* ═══ SIDEBAR TOGGLE (MOBILE) ═══ */
function initSidebarToggle() {
  const toggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");

  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  // Fechar ao clicar fora
  document.addEventListener("click", (e) => {
    if (
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      !toggle.contains(e.target)
    ) {
      sidebar.classList.remove("open");
    }
  });
}

/* ═══ DATA NO TOPBAR ═══ */
function updateTopbarDate() {
  const dateEl = document.getElementById("topbar-date");
  const now = new Date();
  const options = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  dateEl.textContent = now.toLocaleDateString("pt-BR", options);
}

/* ═══ REFRESH GLOBAL ═══ */
function initGlobalRefresh() {
  const btn = document.getElementById("btn-refresh-global");
  btn.addEventListener("click", async () => {
    btn.classList.add("spinning");
    await loadDashboard();
    btn.classList.remove("spinning");
    showToast("Dados atualizados!", "success");
  });
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
async function loadDashboard() {
  try {
    // Buscar todos os leads
    const { data: leads, error } = await db
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    allLeads = leads || [];

    // Atualizar badge na nav
    document.getElementById("nav-leads-badge").textContent = allLeads.length;

    // KPIs
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayCount = allLeads.filter((l) =>
      l.created_at?.startsWith(todayStr)
    ).length;

    const weekCount = allLeads.filter(
      (l) => new Date(l.created_at) >= weekAgo
    ).length;

    const sources = new Set(allLeads.map((l) => l.source).filter(Boolean));

    animateValue("kpi-total", allLeads.length);
    animateValue("kpi-today", todayCount);
    animateValue("kpi-week", weekCount);
    animateValue("kpi-sources", sources.size);

    // Gráfico
    drawChart(allLeads);

    // Recentes
    renderRecentLeads(allLeads.slice(0, 8));
  } catch (err) {
    console.error("Erro ao carregar dashboard:", err);
    showToast("Erro ao carregar dados do dashboard", "error");
  }
}

/* ═══ ANIMAÇÃO DE VALORES ═══ */
function animateValue(elementId, targetValue) {
  const el = document.getElementById(elementId);
  const startValue = parseInt(el.textContent) || 0;
  const diff = targetValue - startValue;
  const duration = 600;
  const startTime = performance.now();

  function step(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(startValue + diff * easeProgress);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/* ═══ GRÁFICO (CANVAS) ═══ */
function drawChart(leads) {
  const canvas = document.getElementById("chart-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  // Ajustar para DPR
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 260 * dpr;
  canvas.style.width = rect.width + "px";
  canvas.style.height = "260px";
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = 260;

  // Preparar dados: últimos 14 dias
  const days = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    const count = leads.filter((l) => l.created_at?.startsWith(dateStr)).length;
    days.push({
      label: date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      value: count,
    });
  }

  const maxValue = Math.max(...days.map((d) => d.value), 1);
  const padding = { top: 20, right: 20, bottom: 40, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = Math.min(chartWidth / days.length - 6, 32);
  const barGap =
    (chartWidth - barWidth * days.length) / (days.length + 1) + barWidth;

  // Limpar canvas
  ctx.clearRect(0, 0, width, height);

  // Grid lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartHeight / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    // Labels do eixo Y
    const val = Math.round(maxValue - (maxValue / gridLines) * i);
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(val, padding.left - 10, y + 4);
  }

  // Barras
  days.forEach((day, i) => {
    const x = padding.left + i * barGap + (barGap - barWidth) / 2;
    const barHeight = (day.value / maxValue) * chartHeight;
    const y = padding.top + chartHeight - barHeight;

    // Gradiente da barra
    const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
    gradient.addColorStop(0, "rgba(34, 197, 94, 0.9)");
    gradient.addColorStop(1, "rgba(25, 100, 32, 0.6)");

    ctx.fillStyle = gradient;
    ctx.beginPath();

    // Barra com cantos arredondados no topo
    const r = Math.min(4, barWidth / 2);
    if (barHeight > r) {
      ctx.moveTo(x, y + barHeight);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.lineTo(x + barWidth - r, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
      ctx.lineTo(x + barWidth, y + barHeight);
    } else if (barHeight > 0) {
      ctx.fillRect(x, y, barWidth, barHeight);
    }
    ctx.fill();

    // Valor acima da barra
    if (day.value > 0) {
      ctx.fillStyle = "rgba(34, 197, 94, 0.8)";
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(day.value, x + barWidth / 2, y - 6);
    }

    // Label do eixo X
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(day.label, x + barWidth / 2, height - padding.bottom + 20);
  });
}

/* ═══ LEADS RECENTES ═══ */
function renderRecentLeads(leads) {
  const container = document.getElementById("recent-leads-list");

  if (!leads.length) {
    container.innerHTML =
      '<div class="loading-placeholder">Nenhuma inscrição ainda</div>';
    return;
  }

  container.innerHTML = leads
    .map((lead) => {
      const initials = (lead.name || "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      const timeAgo = getTimeAgo(lead.created_at);

      return `
      <div class="recent-lead-item">
        <div class="lead-avatar">${initials}</div>
        <div class="lead-info">
          <div class="lead-name">${escapeHtml(lead.name || "Sem nome")}</div>
          <div class="lead-email">${escapeHtml(lead.email || "—")}</div>
        </div>
        <span class="lead-time">${timeAgo}</span>
      </div>
    `;
    })
    .join("");
}

/* ═══════════════════════════════════════════════════════════════
   LEADS TABLE
   ═══════════════════════════════════════════════════════════════ */
function initLeadsToolbar() {
  // Busca
  const searchInput = document.getElementById("search-leads");
  let searchTimeout;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => filterAndRenderLeads(), 300);
  });

  // Filtro de fonte
  document
    .getElementById("filter-source")
    .addEventListener("change", () => filterAndRenderLeads());

  // Atualizar
  document
    .getElementById("btn-refresh-leads")
    .addEventListener("click", () => loadLeads());

  // Exportar CSV
  document
    .getElementById("btn-export-csv")
    .addEventListener("click", exportCSV);

  // Ordenação
  document.querySelectorAll(".th-sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.sort;
      if (sortColumn === col) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
      } else {
        sortColumn = col;
        sortDirection = col === "created_at" ? "desc" : "asc";
      }

      // Atualizar visual
      document.querySelectorAll(".th-sortable").forEach((t) => {
        t.classList.remove("sorted-asc", "sorted-desc");
      });
      th.classList.add("sorted-" + sortDirection);

      filterAndRenderLeads();
    });
  });
}

async function loadLeads() {
  const loading = document.getElementById("leads-loading");
  const table = document.getElementById("leads-table");
  const empty = document.getElementById("leads-empty");

  loading.style.display = "block";
  table.style.display = "none";
  empty.style.display = "none";

  try {
    const { data, error } = await db
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    allLeads = data || [];

    // Preencher filtro de fontes
    const sources = [...new Set(allLeads.map((l) => l.source).filter(Boolean))];
    const filterSelect = document.getElementById("filter-source");
    const currentFilter = filterSelect.value;
    filterSelect.innerHTML =
      '<option value="">Todas as fontes</option>' +
      sources
        .map(
          (s) =>
            `<option value="${escapeHtml(s)}" ${s === currentFilter ? "selected" : ""}>${escapeHtml(s)}</option>`
        )
        .join("");

    // Badge
    document.getElementById("nav-leads-badge").textContent = allLeads.length;

    filterAndRenderLeads();
  } catch (err) {
    console.error("Erro ao carregar leads:", err);
    showToast("Erro ao carregar inscrições", "error");
  } finally {
    loading.style.display = "none";
  }
}

function filterAndRenderLeads() {
  const searchTerm = document
    .getElementById("search-leads")
    .value.toLowerCase()
    .trim();
  const sourceFilter = document.getElementById("filter-source").value;

  // Filtrar
  filteredLeads = allLeads.filter((lead) => {
    const matchesSearch =
      !searchTerm ||
      (lead.name || "").toLowerCase().includes(searchTerm) ||
      (lead.email || "").toLowerCase().includes(searchTerm);

    const matchesSource = !sourceFilter || lead.source === sourceFilter;

    return matchesSearch && matchesSource;
  });

  // Ordenar
  filteredLeads.sort((a, b) => {
    let valA = a[sortColumn] || "";
    let valB = b[sortColumn] || "";

    if (sortColumn === "created_at") {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    } else {
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
    }

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Reset para página 1
  currentPage = 1;

  renderLeadsTable();
}

function renderLeadsTable() {
  const tbody = document.getElementById("leads-tbody");
  const table = document.getElementById("leads-table");
  const empty = document.getElementById("leads-empty");
  const countEl = document.getElementById("leads-count");

  if (!filteredLeads.length) {
    table.style.display = "none";
    empty.style.display = "block";
    countEl.textContent = "0 inscrições";
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  table.style.display = "table";
  empty.style.display = "none";

  // Paginação
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageLeads = filteredLeads.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  // Contador
  countEl.textContent = `${filteredLeads.length} inscrição${filteredLeads.length !== 1 ? "ões" : "ão"}`;

  // Renderizar linhas
  const canDelete =
    currentUser?.role === "super_admin" || currentUser?.role === "editor";

  tbody.innerHTML = pageLeads
    .map((lead) => {
      const date = lead.created_at
        ? new Date(lead.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";

      return `
      <tr>
        <td class="td-name">${escapeHtml(lead.name || "Sem nome")}</td>
        <td class="td-email">${escapeHtml(lead.email || "—")}</td>
        <td><span class="source-badge">${escapeHtml(lead.source || "—")}</span></td>
        <td class="td-date">${date}</td>
        <td>
          <div class="td-actions">
            <button class="btn-action" title="Copiar email" onclick="copyToClipboard('${escapeHtml(lead.email || "")}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            ${
              canDelete
                ? `
            <button class="btn-action btn-action-danger" title="Excluir" onclick="confirmDeleteLead('${lead.id}', '${escapeHtml(lead.name || "")}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
            `
                : ""
            }
          </div>
        </td>
      </tr>
    `;
    })
    .join("");

  // Renderizar paginação
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const container = document.getElementById("pagination");

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";

  // Botão anterior
  html += `<button ${currentPage === 1 ? "disabled" : ""} onclick="goToPage(${currentPage - 1})">‹</button>`;

  // Páginas
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  if (start > 1) {
    html += `<button onclick="goToPage(1)">1</button>`;
    if (start > 2) html += `<button disabled>…</button>`;
  }

  for (let i = start; i <= end; i++) {
    html += `<button class="${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">${i}</button>`;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) html += `<button disabled>…</button>`;
    html += `<button onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }

  // Botão próximo
  html += `<button ${currentPage === totalPages ? "disabled" : ""} onclick="goToPage(${currentPage + 1})">›</button>`;

  container.innerHTML = html;
}

/* ═══ PAGINAÇÃO ═══ */
window.goToPage = function (page) {
  currentPage = page;
  renderLeadsTable();

  // Scroll para o topo da tabela
  document
    .getElementById("view-leads")
    .scrollIntoView({ behavior: "smooth", block: "start" });
};

/* ═══ COPIAR PARA CLIPBOARD ═══ */
window.copyToClipboard = async function (text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Email copiado!", "success");
  } catch {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("Email copiado!", "success");
  }
};

/* ═══ EXCLUIR LEAD ═══ */
window.confirmDeleteLead = function (id, name) {
  document.getElementById(
    "confirm-message"
  ).textContent = `Tem certeza que deseja excluir a inscrição de "${name}"?`;
  deleteCallback = async () => {
    try {
      const { error } = await db.from("leads").delete().eq("id", id);
      if (error) throw error;
      showToast("Inscrição excluída com sucesso", "success");
      loadLeads();
      loadDashboard();
    } catch (err) {
      console.error("Erro ao excluir lead:", err);
      showToast("Erro ao excluir inscrição", "error");
    }
  };
  openModal("modal-confirm");
};

/* ═══ EXPORTAR CSV ═══ */
function exportCSV() {
  if (!filteredLeads.length) {
    showToast("Nenhum dado para exportar", "warning");
    return;
  }

  const canExport =
    currentUser?.role === "super_admin" || currentUser?.role === "editor";
  if (!canExport) {
    showToast("Você não tem permissão para exportar", "error");
    return;
  }

  const headers = ["Nome", "Email", "Fonte", "Data de Inscrição"];
  const rows = filteredLeads.map((lead) => [
    `"${(lead.name || "").replace(/"/g, '""')}"`,
    `"${(lead.email || "").replace(/"/g, '""')}"`,
    `"${(lead.source || "").replace(/"/g, '""')}"`,
    `"${lead.created_at ? new Date(lead.created_at).toLocaleString("pt-BR") : ""}"`,
  ]);

  const csv =
    "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `inscricoes_ggomesday_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  showToast(
    `${filteredLeads.length} inscrições exportadas com sucesso!`,
    "success"
  );
}

/* ═══════════════════════════════════════════════════════════════
   GERENCIAMENTO DE USUÁRIOS
   ═══════════════════════════════════════════════════════════════ */
async function loadUsers() {
  const grid = document.getElementById("users-grid");
  const empty = document.getElementById("users-empty");

  grid.innerHTML =
    '<div class="loading-placeholder">Carregando usuários...</div>';

  try {
    const { data, error } = await db
      .from("admin_users")
      .select("id, username, display_name, role, created_at, last_login, is_active")
      .order("created_at", { ascending: true });

    if (error) throw error;

    allUsers = data || [];

    if (!allUsers.length) {
      grid.innerHTML = "";
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";

    grid.innerHTML = allUsers
      .map((user) => {
        const initials = (user.display_name || user.username)
          .charAt(0)
          .toUpperCase();
        const lastLogin = user.last_login
          ? new Date(user.last_login).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Nunca";

        const isCurrentUser = user.id === currentUser.id;

        return `
        <div class="user-card">
          <div class="user-card-header">
            <div class="user-card-avatar role-${user.role}">${initials}</div>
            <div class="user-card-info">
              <div class="user-card-name">${escapeHtml(user.display_name || user.username)}</div>
              <div class="user-card-username">@${escapeHtml(user.username)}</div>
            </div>
          </div>
          <div class="user-card-meta">
            <div class="user-card-meta-item">
              <span class="meta-label">Permissão</span>
              <span class="role-tag role-tag-${user.role}">${formatRole(user.role)}</span>
            </div>
            <div class="user-card-meta-item">
              <span class="meta-label">Último acesso</span>
              <span class="meta-value">${lastLogin}</span>
            </div>
            <div class="user-card-meta-item">
              <span class="meta-label">Status</span>
              <span class="meta-value" style="color: ${user.is_active ? "var(--accent)" : "var(--danger)"}">${user.is_active ? "Ativo" : "Inativo"}</span>
            </div>
          </div>
          ${
            !isCurrentUser
              ? `
          <div class="user-card-actions">
            <button class="btn-secondary" onclick="confirmDeleteUser('${user.id}', '${escapeHtml(user.display_name || user.username)}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Excluir
            </button>
          </div>
          `
              : '<div style="margin-top:12px;font-size:0.75rem;color:var(--text-muted);text-align:center">Você (logado)</div>'
          }
        </div>
      `;
      })
      .join("");
  } catch (err) {
    console.error("Erro ao carregar usuários:", err);
    grid.innerHTML =
      '<div class="loading-placeholder">Erro ao carregar usuários</div>';
    showToast("Erro ao carregar lista de usuários", "error");
  }
}

/* ═══ MODAL DE USUÁRIO ═══ */
function initUserModal() {
  document.getElementById("btn-add-user").addEventListener("click", () => {
    document.getElementById("modal-user-title").textContent = "Novo Usuário";
    document.getElementById("form-user").reset();
    document.getElementById("form-user-id").value = "";
    document.getElementById("form-password").required = true;
    openModal("modal-user");
  });

  document
    .getElementById("form-user")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = document.getElementById("form-user-id").value;
      const username = document.getElementById("form-username").value.trim();
      const displayName = document
        .getElementById("form-display-name")
        .value.trim();
      const password = document.getElementById("form-password").value;
      const role = document.getElementById("form-role").value;

      if (!username) {
        showToast("Preencha o nome de usuário", "warning");
        return;
      }

      if (!id && !password) {
        showToast("Preencha a senha", "warning");
        return;
      }

      if (password && password.length < 6) {
        showToast("A senha deve ter no mínimo 6 caracteres", "warning");
        return;
      }

      const btnSave = document.getElementById("btn-save-user");
      btnSave.disabled = true;
      btnSave.textContent = "Salvando...";

      try {
        const userData = {
          username,
          display_name: displayName || username,
          role,
        };

        if (password) {
          userData.password_hash = await sha256(password);
        }

        if (id) {
          // Atualizar
          const { error } = await db
            .from("admin_users")
            .update(userData)
            .eq("id", id);
          if (error) throw error;
          showToast("Usuário atualizado com sucesso!", "success");
        } else {
          // Criar
          const { error } = await db.from("admin_users").insert([userData]);
          if (error) {
            if (error.code === "23505") {
              showToast("Este nome de usuário já existe", "error");
              return;
            }
            throw error;
          }
          showToast("Usuário criado com sucesso!", "success");
        }

        closeModal("modal-user");
        loadUsers();
      } catch (err) {
        console.error("Erro ao salvar usuário:", err);
        showToast("Erro ao salvar usuário: " + (err.message || ""), "error");
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = "Salvar Usuário";
      }
    });
}

/* ═══ EXCLUIR USUÁRIO ═══ */
window.confirmDeleteUser = function (id, name) {
  document.getElementById(
    "confirm-message"
  ).textContent = `Tem certeza que deseja excluir o usuário "${name}"?`;
  deleteCallback = async () => {
    try {
      const { error } = await db.from("admin_users").delete().eq("id", id);
      if (error) throw error;
      showToast("Usuário excluído com sucesso!", "success");
      loadUsers();
    } catch (err) {
      console.error("Erro ao excluir usuário:", err);
      showToast("Erro ao excluir usuário", "error");
    }
  };
  openModal("modal-confirm");
};

/* ═══ CONFIRMAÇÃO ═══ */
function initConfirmModal() {
  document
    .getElementById("btn-confirm-delete")
    .addEventListener("click", () => {
      if (deleteCallback) {
        deleteCallback();
        deleteCallback = null;
      }
      closeModal("modal-confirm");
    });
}

/* ═══════════════════════════════════════════════════════════════
   MODAIS
   ═══════════════════════════════════════════════════════════════ */
function openModal(id) {
  document.getElementById(id).style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
  document.body.style.overflow = "";
}

// Event delegation para fechar modais
document.addEventListener("click", (e) => {
  const closeTarget = e.target.dataset.closeModal;
  if (closeTarget) {
    closeModal(closeTarget);
  }
});

// Fechar com ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal").forEach((modal) => {
      if (modal.style.display === "flex") {
        closeModal(modal.id);
      }
    });
  }
});

/* ═══════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════ */
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");

  const icons = {
    success: `<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icons[type] || icons.info}<span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  // Auto-remover
  setTimeout(() => {
    toast.classList.add("toast-exit");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ═══════════════════════════════════════════════════════════════
   UTILITÁRIOS
   ═══════════════════════════════════════════════════════════════ */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatRole(role) {
  const roles = {
    super_admin: "Super Admin",
    editor: "Editor",
    viewer: "Visualizador",
  };
  return roles[role] || role;
}

function getTimeAgo(dateStr) {
  if (!dateStr) return "—";

  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Agora";
  if (diffMinutes < 60) return `${diffMinutes}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/* ═══ REDIMENSIONAR GRÁFICO ═══ */
window.addEventListener("resize", () => {
  if (currentView === "dashboard" && allLeads.length) {
    drawChart(allLeads);
  }
});
