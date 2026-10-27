/* ============================================================
   GIZONA DOCES — Painel Administrativo
============================================================ */
const root = document.getElementById("adminApp");
const admin = { session: null, isAdmin: false, tab: "dashboard", data: {} };

function fmt(v) { return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

const STATUS_LABEL = { pending: "Pendente", confirmed: "Confirmado", production: "Em Produção", delivered: "Entregue", cancelled: "Cancelado" };

/* ---------------- Init ---------------- */
(async function init() {
  try {
    const { data } = await sb.auth.getSession();
    admin.session = data.session;
    if (admin.session) {
      const { data: cust } = await sb.from("customers").select("*").eq("id", admin.session.user.id).maybeSingle();
      admin.isAdmin = !!(cust && cust.is_admin);
      admin.customerName = cust ? cust.full_name : "";
    }
  } catch (e) {
    console.error(e);
  }
  render();
})();

function render() {
  if (!admin.session) return renderLogin();
  if (!admin.isAdmin) return renderNoAccess();
  restoreNav();
  renderShell();
}

/* ---------------- LOGIN ---------------- */
function renderLogin() {
  root.innerHTML = `
    <div class="login-shell">
      <div class="login-box">
        <img src="../images/brand/icon.png" alt="Gizona Doces" style="width:64px;display:block;margin:0 auto 12px">
        <h1>Painel Admin</h1>
        <p>Gizona Doces</p>
        <div id="loginErr"></div>
        <div class="admin-form">
          <label>E-mail<input type="email" id="adminEmail"></label>
          <label>Senha<input type="password" id="adminPassword"></label>
          <button class="btn btn-pink" style="padding:12px;margin-top:6px" onclick="handleAdminLogin()">Entrar</button>
        </div>
      </div>
    </div>
  `;
}
async function handleAdminLogin() {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    admin.session = data.session;
    const { data: cust } = await sb.from("customers").select("*").eq("id", admin.session.user.id).maybeSingle();
    admin.isAdmin = !!(cust && cust.is_admin);
    admin.customerName = cust ? cust.full_name : "";
    render();
  } catch (e) {
    document.getElementById("loginErr").innerHTML = `<div class="error-box">E-mail ou senha incorretos.</div>`;
  }
}

function renderNoAccess() {
  root.innerHTML = `
    <div class="login-shell">
      <div class="login-box" style="text-align:center">
        <h1>Acesso restrito</h1>
        <p>Essa conta não tem permissão de administrador.</p>
        <button class="btn btn-outline" onclick="handleAdminLogout()">Sair</button>
      </div>
    </div>
  `;
}
async function handleAdminLogout() {
  await sb.auth.signOut();
  admin.session = null;
  admin.isAdmin = false;
  render();
}

/* ---------------- SHELL ---------------- */
function navIcon(name) {
  const paths = {
    home: `<path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-9z" fill="none"/>`,
    bag: `<path d="M6 8h12l1 13H5L6 8z" fill="none"/><path d="M8 8V6a4 4 0 018 0v2" fill="none"/>`,
    cube: `<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" fill="none"/><path d="M4 7.5L12 12l8-4.5M12 12v9" fill="none"/>`,
    users: `<circle cx="9" cy="8" r="3" fill="none"/><path d="M3 20a6 6 0 0112 0" fill="none"/><path d="M15 8a3 3 0 110-6M21 20a6 6 0 00-6-6" fill="none"/>`,
    wallet: `<rect x="3" y="6" width="18" height="13" rx="2" fill="none"/><path d="M16 12h2" /><path d="M3 9h18" fill="none"/>`,
    chart: `<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" fill="none"/>`,
    box: `<path d="M3 8l9-5 9 5-9 5-9-5z" fill="none"/><path d="M3 8v8l9 5 9-5V8M12 13v8" fill="none"/>`,
    book: `<path d="M5 4h9a3 3 0 013 3v13H8a3 3 0 00-3 3V4z" fill="none"/><path d="M17 4v16" fill="none"/>`,
    calc: `<rect x="5" y="3" width="14" height="18" rx="2" fill="none"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" fill="none"/>`,
    calendar: `<rect x="3" y="5" width="18" height="16" rx="2" fill="none"/><path d="M3 10h18M8 3v4M16 3v4" fill="none"/>`,
    ticket: `<path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 100-4V8z" fill="none"/><path d="M13 6v12" fill="none" stroke-dasharray="2 2"/>`,
    truck: `<path d="M3 7h11v9H3V7z" fill="none"/><path d="M14 10h4l3 3v3h-7v-6z" fill="none"/><circle cx="7" cy="18" r="1.6" fill="none"/><circle cx="17" cy="18" r="1.6" fill="none"/>`,
    sheet: `<path d="M7 3h8l4 4v14H7z" fill="none"/><path d="M15 3v4h4M10 12h6M10 16h6" fill="none"/>`,
    crown: `<path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8z" fill="currentColor" stroke="none"/>`,
    gift: `<rect x="4" y="9" width="16" height="11" rx="1" fill="none"/><path d="M4 13h16M12 9v11M12 9c-1.5-4-6-4-6-1.5S9 9 12 9zm0 0c1.5-4 6-4 6-1.5S15 9 12 9z" fill="none"/>`,
  };
  return `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ""}</svg>`;
}

function renderShell() {
  root.innerHTML = `
    <div class="admin-shell" id="adminShell">
      <header class="admin-mobilebar">
        <button type="button" class="admin-burger" onclick="toggleAdminMenu()" aria-label="Abrir menu" aria-controls="adminSidebar" aria-expanded="false"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
        <img class="admin-top-logo" src="../images/brand/icon.png" alt="">
        <strong id="adminTopTitle">Painel</strong>
      </header>
      <div class="admin-scrim" onclick="toggleAdminMenu(false)"></div>
      <aside class="admin-sidebar" id="adminSidebar">
        <div class="admin-logo"><img class="seal" src="../images/brand/icon.png" alt="Gizona Doces"><span>Painel Admin<br>Gizona Doces</span></div>
        <nav class="admin-nav">
          <button class="${admin.tab === 'dashboard' ? 'active' : ''}" onclick="setTab('dashboard')">${navIcon("home")}Dashboard</button>
          <button class="${admin.tab === 'orders' ? 'active' : ''}" onclick="setTab('orders')">${navIcon("bag")}Pedidos</button>
          <button class="${admin.tab === 'products' ? 'active' : ''}" onclick="setTab('products')">${navIcon("cube")}Produtos</button>
          <button class="${admin.tab === 'customers' ? 'active' : ''}" onclick="setTab('customers')">${navIcon("users")}Clientes</button>
          <button class="${admin.tab === 'caixa' ? 'active' : ''}" onclick="setTab('caixa')">${navIcon("wallet")}Caixa</button>
          <button class="${admin.tab === 'financeiro' ? 'active' : ''}" onclick="setTab('financeiro')">${navIcon("chart")}Financeiro</button>
          <button class="${admin.tab === 'estoque' ? 'active' : ''}" onclick="setTab('estoque')">${navIcon("box")}Estoque de Insumos</button>
          <button class="${admin.tab === 'estoque_produtos' ? 'active' : ''}" onclick="setTab('estoque_produtos')">${navIcon("cube")}Estoque de Produtos</button>
          <button class="${admin.tab === 'planejamento' ? 'active' : ''}" onclick="setTab('planejamento')">${navIcon("calendar")}Produção e congelados</button>
          <button class="${admin.tab === 'receitas' ? 'active' : ''}" onclick="setTab('receitas')">${navIcon("book")}Receitas</button>
          <button class="${admin.tab === 'fichas' ? 'active' : ''}" onclick="setTab('fichas')">${navIcon("sheet")}Ficha técnica</button>
          <button class="${admin.tab === 'precificacao' ? 'active' : ''}" onclick="setTab('precificacao')">${navIcon("calc")}Precificação</button>
          <button class="${admin.tab === 'calendario' ? 'active' : ''}" onclick="setTab('calendario')">${navIcon("calendar")}Calendário</button>
          <button class="${admin.tab === 'cupons' ? 'active' : ''}" onclick="setTab('cupons')">${navIcon("ticket")}Cupons</button>
          <button class="${admin.tab === 'entrega' ? 'active' : ''}" onclick="setTab('entrega')">${navIcon("truck")}Entrega</button>
          <button class="${admin.tab === 'rewards' ? 'active' : ''}" onclick="setTab('rewards')">${navIcon("gift")}Mimos</button>
        </nav>
        <a href="../index.html" target="_blank" style="margin:0 12px 8px;color:var(--muted);font-size:12.5px;text-align:center;text-decoration:underline;">Ver site</a>
        <button class="admin-logout" onclick="handleAdminLogout()">Sair</button>
      </aside>
      <main class="admin-main" id="adminMain"><div class="center-msg">Carregando...</div></main>
    </div>
  `;
  const act = root.querySelector(".admin-nav button.active");
  const tt = document.getElementById("adminTopTitle");
  if (act && tt) tt.textContent = act.textContent.trim();
  loadTab();
  updateNewOrdersUI();
  startNewOrderPolling();
}
function toggleAdminMenu(force) {
  const sh = document.getElementById("adminShell"); if (!sh) return;
  const open = typeof force === "boolean" ? force : !sh.classList.contains("menu-open");
  sh.classList.toggle("menu-open", open);
  const b = sh.querySelector(".admin-burger"); if (b) b.setAttribute("aria-expanded", open ? "true" : "false");
}
document.addEventListener("keydown", e => { if (e.key === "Escape") toggleAdminMenu(false); });
const ADMIN_TABS = ["dashboard","orders","products","customers","caixa","financeiro","estoque","estoque_produtos","planejamento","receitas","fichas","precificacao","calendario","cupons","entrega","rewards"];
function saveNav() {
  try { localStorage.setItem("gz_admin_nav", JSON.stringify({ tab: admin.tab, finMonth: admin.data.finMonth || null, stockMonth: admin.data.stockMonth || null })); } catch (e) {}
}
function restoreNav() {
  let nav = {};
  try { nav = JSON.parse(localStorage.getItem("gz_admin_nav") || "{}"); } catch (e) {}
  const h = decodeURIComponent((location.hash || "").replace(/^#\/?/, ""));
  const tab = ADMIN_TABS.includes(h) ? h : (ADMIN_TABS.includes(nav.tab) ? nav.tab : null);
  if (tab) admin.tab = tab;
  if (/^\d{4}-\d{2}$/.test(nav.finMonth || "")) admin.data.finMonth = nav.finMonth;
  if (/^\d{4}-\d{2}$/.test(nav.stockMonth || "")) admin.data.stockMonth = nav.stockMonth;
}
window.addEventListener("hashchange", () => {
  const h = decodeURIComponent((location.hash || "").replace(/^#\/?/, ""));
  if (ADMIN_TABS.includes(h) && h !== admin.tab && admin.session && admin.isAdmin) { admin.tab = h; saveNav(); renderShell(); }
});
function setTab(tab) {
  if (tab === "loyalty") tab = "customers";
  if (tab !== "customers") admin.data.custView = null;
  admin.tab = tab;
  try { history.replaceState(null, "", "#/" + tab); } catch (e) {}
  saveNav();
  renderShell();
}

async function loadTab() {
  const main = document.getElementById("adminMain");
  try {
    if (admin.tab === "dashboard") await loadDashboard(main);
    else if (admin.tab === "orders") await loadOrders(main);
    else if (admin.tab === "products") await loadProducts(main);
    else if (admin.tab === "customers") await loadCustomers(main);
    else if (admin.tab === "caixa") await loadCaixa(main);
    else if (admin.tab === "financeiro") await loadFinanceiro(main);
    else if (admin.tab === "estoque") await loadEstoque(main);
    else if (admin.tab === "estoque_produtos") await loadEstoqueProdutos(main);
    else if (admin.tab === "planejamento") await loadPlanejamento(main);
    else if (admin.tab === "receitas") await loadReceitas(main);
    else if (admin.tab === "fichas") await loadFichas(main);
    else if (admin.tab === "precificacao") await loadPrecificacao(main);
    else if (admin.tab === "calendario") await loadCalendario(main);
    else if (admin.tab === "cupons") await loadCupons(main);
    else if (admin.tab === "entrega") await loadEntrega(main);
    else if (admin.tab === "loyalty") await loadLoyalty(main);
    else if (admin.tab === "rewards") await loadRewards(main);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="error-box">Erro ao carregar: ${e.message}</div>`;
  }
}

/* ---------------- DASHBOARD ---------------- */

/* ============================================================
   DATAS COMEMORATIVAS (fixas e móveis) + lembretes de 45 dias
============================================================ */
const HOLIDAY_ADVANCE_DAYS = 45;
function easterDate(y) { // algoritmo de Meeus/Jones/Butcher
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
function nthWeekday(y, month, weekday, n) { // n-ésimo dia da semana do mês (month 0-11)
  const first = new Date(y, month, 1).getDay();
  return new Date(y, month, 1 + ((weekday - first + 7) % 7) + (n - 1) * 7);
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function commemorativeDates(y) {
  const easter = easterDate(y);
  const list = [
    ["ano-novo", "Ano-Novo", new Date(y, 0, 1)],
    ["carnaval", "Carnaval", addDays(easter, -47)],
    ["dia-mulher", "Dia Internacional da Mulher", new Date(y, 2, 8)],
    ["pascoa", "Páscoa", easter],
    ["dia-maes", "Dia das Mães", nthWeekday(y, 4, 0, 2)],
    ["dia-namorados", "Dia dos Namorados", new Date(y, 5, 12)],
    ["festa-junina", "Festas Juninas (São João)", new Date(y, 5, 24)],
    ["dia-amigo", "Dia do Amigo", new Date(y, 6, 20)],
    ["dia-avos", "Dia dos Avós", new Date(y, 6, 26)],
    ["dia-pais", "Dia dos Pais", nthWeekday(y, 7, 0, 2)],
    ["dia-cliente", "Dia do Cliente", new Date(y, 8, 15)],
    ["dia-criancas", "Dia das Crianças", new Date(y, 9, 12)],
    ["dia-professores", "Dia dos Professores", new Date(y, 9, 15)],
    ["halloween", "Halloween", new Date(y, 9, 31)],
    ["black-friday", "Black Friday", addDays(nthWeekday(y, 10, 4, 4), 1)],
    ["natal", "Natal", new Date(y, 11, 25)],
    ["reveillon", "Réveillon (Ceia de Ano-Novo)", new Date(y, 11, 31)],
  ];
  return list.map(([key, name, date]) => ({ key, name, date, iso: isoDate(date), year: y }));
}
function holidayPlan(key, year) {
  return (admin.data.holidayPlans || []).find(p => p.holiday_key === key && p.year === year) || { done: false, dismissed: false };
}
function holidaysByIso(year) {
  const m = {};
  commemorativeDates(year).forEach(h => (m[h.iso] = m[h.iso] || []).push(h));
  return m;
}
function daysUntil(date) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
}
async function loadHolidayPlans() {
  const r = await sb.from("holiday_plans").select("*");
  admin.data.holidayPlansOk = !r.error;
  admin.data.holidayPlans = r.error ? [] : (r.data || []);
}
function upcomingHolidays(limitDays) {
  const y = new Date().getFullYear();
  return [...commemorativeDates(y), ...commemorativeDates(y + 1)]
    .map(h => ({ ...h, days: daysUntil(h.date) }))
    .filter(h => h.days >= 0 && (limitDays == null || h.days <= limitDays))
    .sort((a, b) => a.days - b.days);
}
async function setHolidayPlan(key, year, patch) {
  const cur = holidayPlan(key, year);
  const row = { holiday_key: key, year, done: cur.done, dismissed: cur.dismissed, ...patch, updated_at: new Date().toISOString() };
  const { error } = await sb.from("holiday_plans").upsert(row, { onConflict: "holiday_key,year" });
  if (error) { alert("Não foi possível salvar: " + (error.message || "") + "\n\nRode o script add_melhorias_v2.sql no Supabase."); return; }
  const list = admin.data.holidayPlans || (admin.data.holidayPlans = []);
  const i = list.findIndex(p => p.holiday_key === key && p.year === year);
  if (i >= 0) list[i] = { ...list[i], ...row }; else list.push(row);
  if (admin.tab === "dashboard") renderDashboardReminders(); else renderCalendario(document.getElementById("adminMain"));
}
function whenLabel(days) { return days === 0 ? "É hoje!" : days === 1 ? "Falta 1 dia" : `Faltam ${days} dias`; }
function renderDashboardReminders() {
  const box = document.getElementById("dashReminders"); if (!box) return;
  const hol = upcomingHolidays(HOLIDAY_ADVANCE_DAYS).filter(h => { const p = holidayPlan(h.key, h.year); return !p.done && !p.dismissed; });
  const own = (admin.data.productionEvents || []).filter(e => e.remind_days != null && !e.done).map(e => ({ e, days: daysUntil(e.event_date + "T00:00:00") }))
    .filter(x => x.days >= 0 && x.days <= x.e.remind_days).sort((a, b) => a.days - b.days);
  const next = upcomingHolidays(null).filter(h => !hol.some(x => x.key === h.key && x.year === h.year)).slice(0, 3);
  const dFmt = d => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  box.innerHTML = `
    <h2 class="dash-title"><svg ${SVG_ATTR} width="18" height="18"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/></svg> Datas comemorativas e lembretes</h2>
    ${!admin.data.holidayPlansOk ? `<p class="hint">Para marcar planejamentos como concluídos, rode o script <strong>add_melhorias_v2.sql</strong> no Supabase.</p>` : ""}
    ${hol.length ? hol.map(h => `
      <div class="holiday-alert">
        <div style="flex:1">
          <strong>${whenLabel(h.days)} para ${h.name}!</strong>
          <div class="hint" style="margin:2px 0 0">${dFmt(h.date)} · Que tal começar a planejar sua campanha?</div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-pink btn-sm" onclick="setHolidayPlan('${h.key}', ${h.year}, { done: true })">Planejamento concluído</button>
          <button class="btn btn-outline btn-sm" onclick="setHolidayPlan('${h.key}', ${h.year}, { dismissed: true })">Dispensar</button>
        </div>
      </div>`).join("") : `<p class="hint">Nenhuma data comemorativa nos próximos ${HOLIDAY_ADVANCE_DAYS} dias precisando de planejamento.</p>`}
    ${own.length ? own.map(x => `
      <div class="holiday-alert own">
        <div style="flex:1"><strong>${whenLabel(x.days)}: ${escapeHtml(x.e.title)}</strong>
          <div class="hint" style="margin:2px 0 0">${new Date(x.e.event_date + "T00:00:00").toLocaleDateString("pt-BR")} · lembrete seu</div></div>
        <button class="btn btn-outline btn-sm" onclick="toggleEventDone('${x.e.id}', true)">Concluir</button>
      </div>`).join("") : ""}
    ${next.length ? `<p class="hint" style="margin:12px 0 4px"><strong>Próximas datas:</strong></p>` + next.map(h => `
      <div class="dash-row"><span style="flex:1">${h.name} · ${dFmt(h.date)}</span><span class="pill-count">${h.days} dias</span></div>`).join("") : ""}
  `;
}

async function loadDashboard(main) {
  const [{ data: orders }, { data: customers }, { data: loyalty }, { data: ingredients }, { data: products }] = await Promise.all([
    sb.from("orders").select("*").order("created_at", { ascending: false }),
    sb.from("customers").select("id"),
    sb.from("loyalty_cards").select("customer_id"),
    sb.from("ingredients").select("name, unit, current_stock, min_stock"),
    sb.from("products").select("id, active"),
  ]);

  await loadHolidayPlans();
  const evr = await sb.from("production_events").select("id,title,event_date,done,remind_days");
  admin.data.productionEvents = evr.error ? (await sb.from("production_events").select("id,title,event_date,done")).data || [] : (evr.data || []);
  const all = orders || [];
  const active = all.filter(o => o.status !== "cancelled");
  const now = new Date();
  const monthRevenue = active.filter(o => {
    const d = new Date(o.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, o) => s + Number(o.total || 0) + Number(o.delivery_fee || 0), 0);
  const totalRevenue = active.reduce((s, o) => s + Number(o.total || 0) + Number(o.delivery_fee || 0), 0);
  const avgTicket = active.length ? totalRevenue / active.length : 0;
  const countByStatus = s => all.filter(o => o.status === s).length;
  const lowStock = (ingredients || []).filter(i => isLowStock(i));

  const sold = {};
  active.forEach(o => (Array.isArray(o.items) ? o.items : []).forEach(i => {
    if (i.product_name) sold[i.product_name] = (sold[i.product_name] || 0) + (Number(i.quantity) || 0);
  }));
  const top = Object.entries(sold).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    ["Receita do mês", fmt(monthRevenue)],
    ["Receita total", fmt(totalRevenue)],
    ["Total de pedidos", all.length],
    ["Ticket médio", fmt(avgTicket)],
    ["Clientes cadastrados", (customers || []).length],
    ["Produtos ativos", (products || []).filter(p => p.active).length],
    ["Pendentes", countByStatus("pending")],
    ["Confirmados", countByStatus("confirmed")],
    ["Em produção", countByStatus("production")],
    ["Concluídos", countByStatus("delivered")],
    ["Cancelados", countByStatus("cancelled")],
    ["Clientes fidelidade", (loyalty || []).length],
    ["Produto mais vendido", top ? top[0] : "—"],
  ];

  const byDate = {};
  active.forEach(o => { if (o.event_date) byDate[o.event_date] = (byDate[o.event_date] || 0) + 1; });
  const dates = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(0, 8);
  const weekday = d => new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long" }).replace(/^./, c => c.toUpperCase());
  const recent = [...all].sort((a, b) => orderNum(b) - orderNum(a)).slice(0, 5);

  main.innerHTML = `
    <div class="admin-topbar"><h1>Dashboard</h1></div>

    <div id="dashNewOrders"></div>

    <div class="stat-grid">
      ${stats.map(([label, value]) => `<div class="stat-card"><div class="label">${label}</div><div class="value">${value}</div></div>`).join("")}
    </div>

    <div class="admin-card" id="dashReminders"></div>

    ${lowStock.length ? `
      <div class="attention-box">
        <h2><svg ${SVG_ATTR} width="18" height="18"><path d="M12 3.5L2 20h20L12 3.5z"/><path d="M12 10v4M12 17.5v.01"/></svg> Itens de Estoque em Atenção</h2>
        ${lowStock.map(i => `<p>- ${i.name}: ${i.current_stock} ${i.unit} (mínimo: ${i.min_stock} ${i.unit})</p>`).join("")}
      </div>` : ""}

    <div class="dash-cols">
      <div>
        <h2 class="dash-title"><svg ${SVG_ATTR} width="18" height="18"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/></svg> Calendário de Produção</h2>
        ${dates.length ? dates.map(([d, c]) => `
          <div class="dash-row">
            <span class="dash-ic"><svg ${SVG_ATTR} width="16" height="16"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/></svg></span>
            <span style="flex:1">${new Date(d + "T00:00:00").toLocaleDateString("pt-BR")} (${weekday(d)})</span>
            <span class="pill-count">${c} pedido${c > 1 ? "s" : ""}</span>
          </div>`).join("") : `<div class="dash-row" style="color:var(--muted)">Nenhum evento com data agendada ainda.</div>`}
      </div>
      <div>
        <h2 class="dash-title">Últimos Pedidos</h2>
        ${recent.length ? recent.map(o => `
          <div class="dash-row" style="align-items:flex-start">
            <div style="flex:1">
              <div style="color:var(--pink);font-size:11px;font-weight:700">${o.order_number}</div>
              <div style="font-size:13px">${o.customer_name}</div>
              <div style="color:var(--muted);font-size:11.5px">${o.customer_email || o.customer_phone || ""}</div>
            </div>
            <div style="text-align:right">
              <div style="color:var(--pink);font-weight:700;font-size:13px">${fmt(Number(o.total) + Number(o.delivery_fee || 0))}</div>
              <span class="badge ${o.status}">${STATUS_LABEL[o.status] || o.status}</span>
            </div>
          </div>`).join("") : `<div class="dash-row" style="color:var(--muted)">Nenhum pedido ainda.</div>`}
      </div>
    </div>
  `;
  renderDashboardReminders();
  renderNewOrdersAlert();
}

/* ---------------- PEDIDOS ---------------- */
async function loadOrders(main) {
  const [{ data: orders }, { data: dprods }] = await Promise.all([
    sb.from("orders").select("*").order("created_at", { ascending: false }),
    sb.from("products").select("id,name,price").eq("category", "delivery").order("name"),
  ]);
  admin.data.orders = orders || [];
  admin.data.dProducts = dprods || [];
  admin.data.orderFilter = admin.data.orderFilter || "all";
  renderOrdersTable(main);
}

// número do pedido como inteiro (00012 -> 12) para ordenar corretamente
function orderNum(o) { return parseInt(String(o.order_number || "").replace(/\D/g, ""), 10) || 0; }

function paymentSummary(o) {
  const parts = [];
  if (o.payment_method_1 && o.payment_amount_1) parts.push(`${o.payment_method_1} ${fmt(o.payment_amount_1)}`);
  if (o.payment_method_2 && o.payment_amount_2) parts.push(`${o.payment_method_2} ${fmt(o.payment_amount_2)}`);
  if (parts.length) return parts.join(" + ");
  if (o.payment_method === "pix") return "PIX";
  if (o.payment_method === "credito") return "Crédito";
  return "—";
}

function setOrderFilter(filter) {
  admin.data.orderFilter = filter;
  renderOrdersTable(document.getElementById("adminMain"));
}

function renderOrdersTable(main) {
  const filter = admin.data.orderFilter || "all";
  const typeFilter = admin.data.orderTypeFilter || "all";
  const orders = admin.data.orders
    .filter(o => filter === "all" ? true : (o.origin || "site") === filter)
    .filter(o => typeFilter === "all" ? true : (o.order_type || "encomenda") === typeFilter)
    .map(o => ({ ...o, order_date_key: o.order_date || (o.created_at ? o.created_at.slice(0, 10) : null) }))
    .sort((a, b) => orderNum(b) - orderNum(a)); // maior número (mais recente) primeiro
  main.innerHTML = `
    <div class="admin-topbar"><h1>Pedidos</h1><button class="btn btn-pink" onclick="openManualOrderForm()">+ Lançar pedido manual</button></div>
    <p class="hint">Pedidos do site e pedidos lançados manualmente (WhatsApp, Instagram, presencial etc). Tudo editável.</p>
    <div class="tabs-row" style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <button class="btn ${typeFilter === "all" ? "btn-pink" : "btn-outline"} btn-sm" onclick="setOrderTypeFilter('all')">Todos os tipos</button>
      <button class="btn ${typeFilter === "encomenda" ? "btn-pink" : "btn-outline"} btn-sm" onclick="setOrderTypeFilter('encomenda')">Encomenda</button>
      <button class="btn ${typeFilter === "delivery" ? "btn-pink" : "btn-outline"} btn-sm" onclick="setOrderTypeFilter('delivery')">Delivery</button>
    </div>
    <div class="tabs-row" style="display:flex;gap:8px;margin-bottom:14px">
      <button class="btn ${filter === "all" ? "btn-pink" : "btn-outline"} btn-sm" onclick="setOrderFilter('all')">Todos</button>
      <button class="btn ${filter === "site" ? "btn-pink" : "btn-outline"} btn-sm" onclick="setOrderFilter('site')">Site</button>
      <button class="btn ${filter === "manual" ? "btn-pink" : "btn-outline"} btn-sm" onclick="setOrderFilter('manual')">Manual</button>
    </div>
    <div id="orderFormArea"></div>
    ${(() => {
      const pend = orders.filter(o => o.status !== "cancelled" && pendingAmount(o) > 0);
      const total = pend.reduce((t, o) => t + pendingAmount(o), 0);
      return `<div class="admin-card" style="border-left:4px solid #E0A100"><p class="hint" style="margin:0">⏳ Vendas pendentes: <strong style="color:#B77B00;font-size:18px">${fmt(total)}</strong> · ${pend.length} cliente(s) com pagamento pendente</p></div>`;
    })()}
    ${orders.length ? groupByMonth(orders, "order_date_key").map(([key, listRaw]) => {
      const list = [...listRaw].sort((a, b) => orderNum(b) - orderNum(a));
      const valid = list.filter(o => o.status !== "cancelled");
      const tot = valid.reduce((t, o) => t + Number(o.total || 0), 0);
      const frete = valid.reduce((t, o) => t + Number(o.delivery_fee || 0), 0);
      const descontos = valid.reduce((t, o) => t + Number(o.discount_amount || 0), 0);
      return `
    <div class="admin-card">
      <div class="admin-topbar" style="margin-bottom:8px">
        <h2 style="margin:0">${key === "sem-data" ? "Sem data" : monthGroupLabel(key)}</h2>
        <span class="hint" style="margin:0">${valid.length} pedido(s) | total das vendas: <strong style="color:#2E7D46">${fmt(tot)}</strong> | total de frete: <strong>${fmt(frete)}</strong>${descontos > 0 ? ` | descontos concedidos (já abatidos): <strong>${fmt(descontos)}</strong>` : ""} | total: <strong style="color:#2E7D46">${fmt(tot + frete)}</strong></span>
      </div>
        <table>
          <thead><tr><th>Data</th><th>Nº</th><th>Cliente</th><th>Tipo</th><th>Origem</th><th>Total</th><th>Pagamento</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${list.map(o => `
              <tr style="${pendingAmount(o) > 0 && o.status !== "cancelled" ? "background:#FFF3C4" : o.status === "delivered" ? "background:#E6F6EA" : ""}">
                <td>${o.order_date_key ? new Date(o.order_date_key + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                <td>${o.order_number}</td>
                <td>
                  ${o.customer_name}<br><small style="color:var(--muted)">${o.customer_phone}</small>
                  ${(o.order_type || "encomenda") === "encomenda" && o.event_date ? `<br><small style="color:var(--pink)">Evento: ${new Date(o.event_date + "T00:00:00").toLocaleDateString("pt-BR")}</small>` : ""}
                  ${o.coupon_code ? `<br><small style="color:#1F8A4C">Cupom ${o.coupon_code}: -${fmt(Number(o.discount_amount || 0))}</small>` : ""}
                  ${Number(o.delivery_fee) > 0 ? `<br><small style="color:var(--muted)">Frete: ${fmt(Number(o.delivery_fee))}</small>` : ""}
                  ${(o.order_type === "delivery" && Array.isArray(o.items)) ? `<br><small style="color:var(--muted)">${o.items.map(i => `${i.quantity}x ${i.product_name}`).join(", ")}</small>` : ""}
                </td>
                <td><span class="badge-status ${(o.order_type || "encomenda") === "delivery" ? "production" : "confirmed"}">${(o.order_type || "encomenda") === "delivery" ? "Delivery" : "Encomenda"}</span></td>
                <td><span class="badge-status ${o.origin === "manual" ? "pending" : "confirmed"}">${o.origin === "manual" ? "Manual" : "Site"}</span></td>
                <td>${fmt(Number(o.total || 0) + Number(o.delivery_fee || 0))}${Number(o.delivery_fee) > 0 || Number(o.discount_amount) > 0 ? `<br><small style="color:var(--muted)">vendas ${fmt(o.total)}${Number(o.delivery_fee) > 0 ? ` + frete ${fmt(o.delivery_fee)}` : ""}</small>` : ""}${o.subtotal == null && Number(o.adjustment_amount) !== 0 ? `<br><small style="color:#B77B00">⚠ conferir ajuste antigo</small>` : ""}</td>
                <td>${paymentSummary(o)}</td>
                <td>
                  <select onchange="updateOrderStatus('${o.id}', this.value)">
                    ${Object.entries(STATUS_LABEL).map(([k, v]) => `<option value="${k}" ${o.status === k ? "selected" : ""}>${v}</option>`).join("")}
                  </select>
                </td>
                <td style="display:flex;gap:6px">
                  <button class="btn btn-outline btn-sm" onclick="openOrderEditForm('${o.id}')">Editar</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteOrder('${o.id}')">Excluir</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
    </div>`;
    }).join("") : `<div class="admin-card"><p class="center-msg">Nenhum pedido encontrado com esse filtro.</p></div>`}
  `;
}

function setOrderTypeFilter(type) {
  admin.data.orderTypeFilter = type;
  renderOrdersTable(document.getElementById("adminMain"));
}

async function updateOrderStatus(id, status) {
  const { error } = await sb.from("orders").update({ status }).eq("id", id);
  if (error) { console.error(error); alert("Não foi possível atualizar o status: " + (error.message || JSON.stringify(error))); return; }
  const o = admin.data.orders.find(o => o.id === id);
  if (o) o.status = status;
  renderOrdersTable(document.getElementById("adminMain"));
  if (["confirmed", "production", "delivered"].includes(status) && o) {
    await ensureRevenueForOrder(o);
  }
  if ((status === "cancelled" || status === "pending") && o) {
    // o gatilho do banco já remove, mas garantimos aqui também (sem risco: DELETE em linha que já não existe não dá erro)
    await sb.from("revenue_entries").delete().eq("order_id", o.id);
  }
}

// Garante a receita automática mesmo se o gatilho do banco falhar por algum motivo —
// confere se já existe antes de criar, então nunca duplica.
async function ensureRevenueForOrder(order) {
  const { data: existing, error: checkError } = await sb.from("revenue_entries").select("id").eq("order_id", order.id).maybeSingle();
  if (checkError) { console.error(checkError); return; }
  if (existing) return; // já lançada (pelo gatilho ou por essa mesma função antes)

  const { error: insertError } = await sb.from("revenue_entries").insert({
    entry_date: new Date().toISOString().slice(0, 10),
    description: "Pedido " + order.order_number,
    amount: Number((Number(order.total || 0) + Number(order.delivery_fee || 0)).toFixed(2)), // produtos − desconto + frete
    source: "site",
    order_id: order.id,
  });
  if (insertError) {
    console.error(insertError);
    alert("O status foi salvo, mas não consegui lançar a receita automaticamente no Financeiro: " + (insertError.message || JSON.stringify(insertError)) + ". Você pode lançar manualmente por enquanto.");
    return;
  }
  setTimeout(() => alert("Pedido confirmado — a receita entrou no Financeiro."), 50);
}

async function deleteOrder(id) {
  if (!confirm("Tem certeza que deseja excluir este pedido? Essa ação não pode ser desfeita.")) return;
  await sb.from("revenue_entries").delete().eq("order_id", id);
  const { error: delErr } = await sb.from("orders").delete().eq("id", id);
  if (delErr) { console.error(delErr); alert("Não foi possível excluir o pedido: " + (delErr.message || "")); return; }
  // recarrega do banco: os pedidos seguintes são renumerados e o estoque/financeiro já foram atualizados
  await loadOrders(document.getElementById("adminMain"));
}

const PAYMENT_OPTIONS = ["Pix", "Cartão", "Dinheiro", "Outro", "Pendente"];

// parte ainda não paga do pedido (pagamento marcado como "Pendente")
function pendingAmount(o) {
  let t = 0;
  if (o.payment_method_1 === "Pendente") t += Number(o.payment_amount_1) || (Number(o.total) + Number(o.delivery_fee || 0)) || 0;
  if (o.payment_method_2 === "Pendente") t += Number(o.payment_amount_2) || 0;
  return t;
}

/* valores do pedido para o formulário: produtos, frete e desconto separados */
function orderMoneyParts(o) {
  const adj = Number(o.adjustment_amount || 0);
  const legacy = !!o.id && o.subtotal == null && adj !== 0;
  let base = 0, desconto = Number(o.discount_amount || 0), frete = Number(o.delivery_fee || 0);
  if (o.id) {
    if (o.subtotal != null) base = Number(o.subtotal);
    else { base = Number(o.total || 0) - adj; if (adj < 0) desconto += -adj; }
  }
  if (legacy && adj > 0) base = Number(o.total || 0); // ajuste positivo antigo: não classifica sozinho
  return { base: Number(base.toFixed(2)), desconto, frete, legacyWarn: legacy && adj > 0 && !frete && !desconto, legacyAdj: adj };
}

/* ---- Autocomplete de cliente do Clube Fidelidade (pedido manual) ---- */
async function ofLoadCustomers() {
  if (admin.data.ofCustomers) return admin.data.ofCustomers;
  const { data } = await sb.from("customers").select("id, full_name, phone").order("full_name");
  admin.data.ofCustomers = data || [];
  return admin.data.ofCustomers;
}
const ofNorm = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
function ofBadge() {
  const el = document.getElementById("ofCustBadge"); if (!el) return;
  const id = document.getElementById("ofCustId").value;
  const locked = document.getElementById("ofCustId").dataset.locked === "1";
  el.innerHTML = id
    ? `<span style="color:#2e7d32">✔ Cadastro do Clube vinculado${locked ? " (login no site)" : ""} — este pedido gera pontos quando entregue/concluído.</span>`
    : `<span style="color:var(--muted)">Texto livre — sem vínculo com o Clube (não gera pontos). Digite as primeiras letras para buscar um cadastro.</span>`;
}
function ofHideSugg() { const b = document.getElementById("ofSugg"); if (b) b.style.display = "none"; }
async function ofNameInput() {
  const nameEl = document.getElementById("ofName"), idEl = document.getElementById("ofCustId"), box = document.getElementById("ofSugg");
  if (!nameEl || !idEl || !box) return;
  if (idEl.dataset.locked !== "1" && idEl.value && nameEl.value.trim() !== idEl.dataset.name) { idEl.value = ""; idEl.dataset.name = ""; }
  ofBadge();
  const q = ofNorm(nameEl.value);
  if (q.length < 2 || (idEl.value && nameEl.value.trim() === idEl.dataset.name)) { box.style.display = "none"; return; }
  const list = await ofLoadCustomers();
  const hits = list.filter(c => ofNorm(c.full_name).split(/\s+/).some(w => w.startsWith(q)) || ofNorm(c.full_name).startsWith(q)).slice(0, 8);
  if (!hits.length) { box.style.display = "none"; return; }
  box.innerHTML = hits.map(c => `<div class="cust-sugg-item" onmousedown="ofPickCustomer('${c.id}')"><strong>${escapeHtml(c.full_name)}</strong><small>${escapeHtml(c.phone || "sem telefone")}</small></div>`).join("");
  box.style.display = "block";
}
function ofPickCustomer(id) {
  const c = (admin.data.ofCustomers || []).find(x => x.id === id); if (!c) return;
  document.getElementById("ofName").value = c.full_name;
  if (c.phone) document.getElementById("ofPhone").value = c.phone;
  const idEl = document.getElementById("ofCustId");
  idEl.value = c.id; idEl.dataset.name = c.full_name; idEl.dataset.phone = c.phone || "";
  ofHideSugg(); ofBadge();
}
function ofPhoneInput() { /* telefone livre não desfaz o vínculo escolhido; o vínculo é pelo id do cadastro */ }

function orderFormFields(o) {
  o = o || {};
  const ob = orderMoneyParts(o);
  return `
    <div class="form-grid">
      <label style="position:relative">Cliente
        <input type="text" id="ofName" value="${escapeHtml(o.customer_name || "")}" autocomplete="off" oninput="ofNameInput()" onfocus="ofNameInput()" onblur="setTimeout(ofHideSugg,180)">
        <input type="hidden" id="ofCustId" value="${o.customer_id || ""}" data-name="${escapeHtml(o.customer_name || "")}" data-locked="${o.loyalty_link === "auth" ? "1" : ""}">
        <div id="ofSugg" class="cust-sugg" style="display:none"></div>
        <span id="ofCustBadge" class="hint" style="margin:0;font-weight:600"></span>
      </label>
      <label>Telefone/WhatsApp<input type="text" id="ofPhone" value="${escapeHtml(o.customer_phone || "")}" oninput="ofPhoneInput()"></label>
      <label>Tipo do pedido
        <select id="ofOrderType" onchange="onOrderTypeChange()">
          <option value="encomenda" ${(o.order_type || "encomenda") === "encomenda" ? "selected" : ""}>Encomenda</option>
          <option value="delivery" ${o.order_type === "delivery" ? "selected" : ""}>Delivery</option>
        </select>
      </label>
      <label>Data do pedido<input type="date" id="ofOrderDate" value="${o.order_date || (o.created_at ? o.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10))}"></label>
      <label id="ofEventWrap">Data do evento (encomenda)<input type="date" id="ofEventDate" value="${o.event_date || ""}"></label>
      <div id="ofProductWrap" class="span-2" data-lines="${o.id && o.origin === "site" ? "0" : "1"}">
        <p class="hint"><strong>Itens do pedido</strong> — o valor dos produtos é somado automaticamente (quantidade × valor unitário)</p>
        <div id="ofEncLines"></div>
        <button type="button" class="btn btn-outline btn-sm" onclick="addEncLine()">+ Adicionar item</button>
      </div>
      <div id="ofDeliveryWrap" class="span-2" style="display:none"></div>
      <label>Valor dos produtos (R$)<input type="number" step="0.01" min="0" id="ofBaseTotal" value="${ob.base || ""}" placeholder="0,00" oninput="recalcOrderTotal()"></label>
      <label>Frete (R$)<input type="number" step="0.01" min="0" id="ofFrete" value="${ob.frete || ""}" placeholder="0,00" oninput="recalcOrderTotal()"></label>
      <label>Desconto sobre os produtos (R$)<input type="number" step="0.01" min="0" id="ofDesconto" value="${ob.desconto || ""}" placeholder="0,00" oninput="recalcOrderTotal()"></label>
      <label>Observação do frete/desconto (opcional)<input type="text" id="ofAdjustmentNote" value="${o.adjustment_note || ""}" placeholder="Ex: Frete combinado por fora"></label>
      ${ob.legacyWarn ? `<p class="hint span-2" style="color:#B77B00">⚠️ Este pedido tem um ajuste antigo de ${fmt(ob.legacyAdj)} (campo “ajuste frete/desconto” que não existe mais) e o valor foi mantido nos produtos. Confira: se foi frete, informe no campo Frete e reduza o valor dos produtos em ${fmt(ob.legacyAdj)}; se foi desconto, o valor dos produtos deve ser o preço cheio.</p>` : ""}
      <div class="span-2" id="ofSummary"></div>
      <input type="hidden" id="ofTotal" value="">
      <label>Status
        <select id="ofStatus">
          ${Object.entries(STATUS_LABEL).map(([k, v]) => `<option value="${k}" ${o.status === k ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </label>
      <label>Pagamento 1
        <select id="ofPay1">
          ${PAYMENT_OPTIONS.map(p => `<option ${o.payment_method_1 === p ? "selected" : ""}>${p}</option>`).join("")}
        </select>
      </label>
      <label>Valor pagamento 1 (R$)<input type="number" step="0.01" id="ofPay1Amount" value="${o.payment_amount_1 || ""}"></label>
      <label>Pagamento 2 (opcional)
        <select id="ofPay2">
          <option value="">Nenhum</option>
          ${PAYMENT_OPTIONS.map(p => `<option ${o.payment_method_2 === p ? "selected" : ""}>${p}</option>`).join("")}
        </select>
      </label>
      <label>Valor pagamento 2 (R$)<input type="number" step="0.01" id="ofPay2Amount" value="${o.payment_amount_2 || ""}"></label>
      <label class="span-2">Observação<input type="text" id="ofObs" value="${o.observations || ""}"></label>
    </div>
    <p class="hint" id="ofPaySumHint" style="margin-top:8px"></p>
  `;
}

function deliveryStockMap() {
  const m = {};
  (admin.data.dProducts || []).forEach(p => { m[p.id] = 0; });
  (admin.data.dStockLevels || []).forEach(r => { m[r.product_id] = Number(r.stock); });
  return m;
}

function onOrderTypeChange(existing) {
  const isDel = document.getElementById("ofOrderType").value === "delivery";
  const pw = document.getElementById("ofProductWrap");
  const linesMode = pw.dataset.lines === "1";
  document.getElementById("ofBaseTotal").readOnly = isDel || linesMode; // valor vem dos itens escolhidos
  document.getElementById("ofEventWrap").style.display = isDel ? "none" : "";
  pw.style.display = (isDel || !linesMode) ? "none" : "";
  if (!isDel && linesMode) {
    const box = document.getElementById("ofEncLines");
    if (!box.children.length) {
      const its = existing && Array.isArray(existing.items) ? existing.items.filter(i => i.unit_price != null && Number(i.quantity) > 0) : [];
      if (its.length) its.forEach(i => addEncLine(i.product_name, i.quantity, i.unit_price)); else addEncLine(existing && existing.id ? "Pedido" : "", 1, existing && existing.id ? orderMoneyParts(existing).base : "");
    }
    recalcEncTotal();
  }
  const box = document.getElementById("ofDeliveryWrap");
  box.style.display = isDel ? "" : "none";
  if (!isDel || box.dataset.ready) return;
  box.dataset.ready = "1";
  if (existing && Array.isArray(existing.items) && existing.items.length) {
    box.innerHTML = `<p class="hint"><strong>Produtos do pedido</strong> (para alterar os itens, exclua e lance de novo — o estoque é controlado por eles):</p>` +
      existing.items.map(i => `<div>${i.quantity}x ${i.product_name} — ${fmt(i.subtotal || i.quantity * i.unit_price)}</div>`).join("");
    return;
  }
  if (!(admin.data.dProducts || []).length) { box.innerHTML = `<p class="hint">Cadastre antes os produtos em Produtos → Delivery.</p>`; return; }
  box.innerHTML = `<p class="hint"><strong>Produtos do pedido</strong> (lista do Estoque de Produtos)</p><div id="ofLines"></div>
    <button type="button" class="btn btn-outline btn-sm" onclick="addDeliveryLine()">+ Adicionar produto</button>`;
  sb.from("delivery_stock_batches").select("product_id,quantity").then(async ({ data: b }) => {
    const { data: sl } = await sb.from("delivery_sales").select("product_id,quantity,reversed");
    const lv = {};
    (b || []).forEach(x => { lv[x.product_id] = (lv[x.product_id] || 0) + Number(x.quantity); });
    (sl || []).forEach(x => { if (!x.reversed) lv[x.product_id] = (lv[x.product_id] || 0) - Number(x.quantity); });
    const { data: wo } = await sb.from("delivery_stock_writeoffs").select("product_id,quantity");
    (wo || []).forEach(x => { lv[x.product_id] = (lv[x.product_id] || 0) - Number(x.quantity); });
    admin.data.dStockLevels = Object.entries(lv).map(([product_id, stock]) => ({ product_id, stock }));
    addDeliveryLine();
  });
}

function addDeliveryLine() {
  const stock = deliveryStockMap();
  const div = document.createElement("div");
  div.className = "of-line";
  div.style.cssText = "display:flex;gap:8px;margin-bottom:6px";
  div.innerHTML = `<select onchange="recalcDeliveryTotal()" style="flex:1">${admin.data.dProducts.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} — ${fmt(p.price)} (estoque: ${stock[p.id] || 0})</option>`).join("")}</select>
    <input type="number" min="1" step="1" value="1" oninput="recalcDeliveryTotal()" style="width:80px">
    <button type="button" class="btn btn-outline btn-sm" onclick="this.parentElement.remove();recalcDeliveryTotal()">✕</button>`;
  document.getElementById("ofLines").appendChild(div);
  recalcDeliveryTotal();
}

function addEncLine(desc, qty, price) {
  const div = document.createElement("div");
  div.className = "enc-line";
  div.style.cssText = "display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap";
  div.innerHTML = `<input type="text" placeholder="Descrição (ex: Bolo 2kg)" value="${escapeHtml(String(desc || ""))}" style="flex:2;min-width:140px">
    <input type="number" min="1" step="1" value="${qty || 1}" oninput="recalcEncTotal()" style="width:70px" title="Quantidade">
    <input type="number" min="0" step="0.01" value="${price === "" || price == null ? "" : price}" placeholder="Valor unit." oninput="recalcEncTotal()" style="width:100px" title="Valor unitário (R$)">
    <button type="button" class="btn btn-outline btn-sm" onclick="this.parentElement.remove();recalcEncTotal()">✕</button>`;
  document.getElementById("ofEncLines").appendChild(div);
  recalcEncTotal();
}
function collectEncItems() {
  return [...document.querySelectorAll("#ofEncLines .enc-line")].map(l => {
    const [d, q, u] = l.querySelectorAll("input");
    const quantity = parseInt(q.value) || 0, unit_price = Number(u.value) || 0;
    return { product_name: d.value.trim() || "Item", category: "manual", quantity, unit_price, subtotal: Number((quantity * unit_price).toFixed(2)) };
  }).filter(i => i.quantity > 0 && i.unit_price > 0);
}
function recalcEncTotal() {
  const pw = document.getElementById("ofProductWrap");
  if (!pw || pw.dataset.lines !== "1" || document.getElementById("ofOrderType").value === "delivery") return;
  const sum = collectEncItems().reduce((t, i) => t + i.subtotal, 0);
  const base = document.getElementById("ofBaseTotal");
  if (base) base.value = sum ? sum.toFixed(2) : "";
  recalcOrderTotal();
}

function collectDeliveryItems() {
  return [...document.querySelectorAll("#ofLines .of-line")].map(l => {
    const sel = l.querySelector("select");
    const opt = sel.options[sel.selectedIndex];
    const quantity = parseInt(l.querySelector("input").value) || 0;
    const unit_price = Number(opt.dataset.price) || 0;
    return { id: sel.value, product_name: opt.text.split(" — ")[0], category: "delivery", quantity, unit_price, subtotal: quantity * unit_price };
  }).filter(i => i.quantity > 0);
}

function recalcDeliveryTotal() {
  const sum = collectDeliveryItems().reduce((t, i) => t + i.subtotal, 0);
  const base = document.getElementById("ofBaseTotal");
  if (base) base.value = sum ? sum.toFixed(2) : "";
  recalcOrderTotal();
}

// Total de vendas = produtos − desconto; Total do pedido = vendas + frete (frete nunca entra nas vendas)
function orderTotalsFromForm() {
  const n = id => { const el = document.getElementById(id); return Math.max(Number(el && el.value) || 0, 0); };
  const base = n("ofBaseTotal"), frete = n("ofFrete");
  const desconto = Math.min(n("ofDesconto"), base);
  const vendas = Number((base - desconto).toFixed(2));
  return { base, desconto, frete, vendas, grand: Number((vendas + frete).toFixed(2)) };
}
function recalcOrderTotal() {
  const t = orderTotalsFromForm();
  const tot = document.getElementById("ofTotal"); if (tot) tot.value = t.grand.toFixed(2);
  const box = document.getElementById("ofSummary");
  if (box) box.innerHTML = `<div class="callout" style="margin:0">
    Produtos: <strong>${fmt(t.base)}</strong><br>
    Desconto: <strong>− ${fmt(t.desconto)}</strong><br>
    Total de vendas: <strong>${fmt(t.vendas)}</strong><br>
    Total de frete: <strong>${fmt(t.frete)}</strong><br>
    <span style="font-size:15px">Total do pedido: <strong style="color:var(--pink)">${fmt(t.grand)}</strong></span></div>`;
  checkPaymentSum();
}

function checkPaymentSum() {
  const totalEl = document.getElementById("ofTotal"); if (!totalEl) return;
  const total = Number(totalEl.value) || 0;
  const p1 = Number(document.getElementById("ofPay1Amount").value) || 0;
  const p2 = Number(document.getElementById("ofPay2Amount").value) || 0;
  const hint = document.getElementById("ofPaySumHint");
  const soma = p1 + p2;
  if (Math.abs(soma - total) > 0.01) {
    hint.innerHTML = `⚠️ A soma dos pagamentos (${fmt(soma)}) é diferente do valor total (${fmt(total)}).`;
  } else {
    hint.innerHTML = `✓ Soma dos pagamentos confere com o total.`;
  }
}

function openManualOrderForm() {
  document.getElementById("orderFormArea").innerHTML = `
    <div class="admin-card">
      <h2>Lançar pedido manual</h2>
      <p class="hint">Use pra pedidos que aconteceram fora do site (WhatsApp, Instagram, presencial, indicação etc). Entra normalmente no histórico e no Financeiro.</p>
      ${orderFormFields({})}
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveManualOrder()">Salvar pedido</button>
        <button class="btn btn-outline" onclick="document.getElementById('orderFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>
  `;
  ["ofPay1Amount", "ofPay2Amount"].forEach(id => document.getElementById(id).addEventListener("input", checkPaymentSum));
  onOrderTypeChange();
  recalcOrderTotal();
  ofBadge();
}

async function saveManualOrder() {
  const name = document.getElementById("ofName").value.trim();
  const phone = document.getElementById("ofPhone").value.trim();
  const mt = orderTotalsFromForm();
  if (!name || !phone || !(mt.base > 0)) { alert("Preencha ao menos cliente, telefone e o valor dos produtos."); return; }
  if (Number(document.getElementById("ofDesconto").value) > mt.base) { alert("O desconto não pode ser maior que o valor dos produtos."); return; }
  const isDelivery = document.getElementById("ofOrderType").value === "delivery";
  const dItems = isDelivery ? collectDeliveryItems() : [];
  if (isDelivery && !dItems.length) { alert("Adicione ao menos um produto do delivery."); return; }
  const eItems = isDelivery ? [] : collectEncItems();
  if (!isDelivery && !eItems.length) { alert("Adicione ao menos um item com quantidade e valor unitário."); return; }

  const payload = {
    order_date: document.getElementById("ofOrderDate").value || null,
    origin: "manual",
    customer_name: name,
    customer_phone: phone,
    customer_id: document.getElementById("ofCustId").value || null,
    order_type: document.getElementById("ofOrderType").value,
    event_date: document.getElementById("ofEventDate").value || null,
    items: isDelivery ? dItems : eItems,
    subtotal: mt.base, discount_amount: mt.desconto, delivery_fee: mt.frete,
    total: mt.vendas, // total de vendas (produtos − desconto), sem frete
    adjustment_amount: 0,
    adjustment_note: document.getElementById("ofAdjustmentNote").value.trim() || null,
    status: document.getElementById("ofStatus").value,
    payment_method_1: document.getElementById("ofPay1").value || null,
    payment_amount_1: Number(document.getElementById("ofPay1Amount").value) || null,
    payment_method_2: document.getElementById("ofPay2").value || null,
    payment_amount_2: Number(document.getElementById("ofPay2Amount").value) || null,
    observations: document.getElementById("ofObs").value.trim() || null,
  };
  const { data: created, error } = await sb.from("orders").insert(payload).select().single();
  if (error) {
    console.error(error);
    alert(/Estoque insuficiente/i.test(error.message || "") ? "Estoque insuficiente para um dos produtos. Registre uma nova leva no Estoque de Produtos." : "Não foi possível salvar o pedido: " + (error.message || "") + (/indispon|batch_item|request_id/i.test(error.message || "") ? "\n\nRode o script fix_delivery_venda_manual.sql no Supabase." : ""));
    return;
  }
  if (created && ["confirmed", "production", "delivered"].includes(payload.status)) await ensureRevenueForOrderQuiet(created);
  document.getElementById("orderFormArea").innerHTML = "";
  await loadOrders(document.getElementById("adminMain"));
}

function openOrderEditForm(id) {
  const o = admin.data.orders.find(o => o.id === id);
  if (!o) return;
  document.getElementById("orderFormArea").innerHTML = `
    <div class="admin-card">
      <h2>Editar pedido ${o.order_number}</h2>
      ${orderFormFields(o)}
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveOrderEdit('${id}')">Salvar alterações</button>
        <button class="btn btn-outline" onclick="document.getElementById('orderFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>
  `;
  ["ofPay1Amount", "ofPay2Amount"].forEach(idAttr => document.getElementById(idAttr).addEventListener("input", checkPaymentSum));
  onOrderTypeChange(o);
  recalcOrderTotal();
  ofBadge();
}

async function saveOrderEdit(id) {
  const mt = orderTotalsFromForm();
  const old = admin.data.orders.find(x => x.id === id) || {};
  if (Number(document.getElementById("ofDesconto").value) > mt.base) { alert("O desconto não pode ser maior que o valor dos produtos."); return; }
  const ob = orderMoneyParts(old);
  if (ob.legacyWarn && !mt.frete && !mt.desconto && !confirm(`Este pedido tinha um ajuste antigo de ${fmt(ob.legacyAdj)}. Salvar sem informar frete nem desconto mantém o valor atual dos produtos (${fmt(mt.base)}). Continuar?`)) return;
  const payload = {
    customer_name: document.getElementById("ofName").value.trim(),
    customer_phone: document.getElementById("ofPhone").value.trim(),
    customer_id: document.getElementById("ofCustId").value || null,
    order_type: document.getElementById("ofOrderType").value,
    order_date: document.getElementById("ofOrderDate").value || null,
    event_date: document.getElementById("ofEventDate").value || null,
    subtotal: mt.base, discount_amount: mt.desconto, delivery_fee: mt.frete,
    total: mt.vendas, // total de vendas (produtos − desconto), sem frete
    adjustment_amount: 0,
    adjustment_note: document.getElementById("ofAdjustmentNote").value.trim() || null,
    status: document.getElementById("ofStatus").value,
    payment_method_1: document.getElementById("ofPay1").value || null,
    payment_amount_1: Number(document.getElementById("ofPay1Amount").value) || null,
    payment_method_2: document.getElementById("ofPay2").value || null,
    payment_amount_2: Number(document.getElementById("ofPay2Amount").value) || null,
    observations: document.getElementById("ofObs").value.trim() || null,
  };
  if (document.getElementById("ofProductWrap").dataset.lines === "1" && payload.order_type !== "delivery") {
    const eItems = collectEncItems();
    if (!eItems.length) { alert("Adicione ao menos um item com quantidade e valor unitário."); return; }
    payload.items = eItems;
  }
  const { error } = await sb.from("orders").update(payload).eq("id", id);
  if (error) { console.error(error); alert("Não foi possível salvar as alterações."); return; }
  document.getElementById("orderFormArea").innerHTML = "";
  await loadOrders(document.getElementById("adminMain"));
}

/* ---------------- PRODUTOS ---------------- */
async function loadProducts(main) {
  const { data: products } = await sb.from("products").select("*").order("category").order("sort_order");
  admin.data.products = products || [];
  const med = await sb.from("site_media").select("*");
  admin.data.mediaOk = !med.error;
  admin.data.media = {}; (med.data || []).forEach(m => { admin.data.media[m.key] = m.image_url; });
  renderProductsTable(main);
}
function renderProductsTable(main) {
  const tab = admin.data.productTab || "encomendas";
  const products = admin.data.products.filter(p => tab === "delivery" ? p.category === "delivery" : p.category !== "delivery");
  main.innerHTML = `
    <div class="admin-topbar"><h1>Produtos</h1><button class="btn btn-pink" onclick="openProductForm()">+ Novo produto</button></div>
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn ${tab === "encomendas" ? "btn-pink" : "btn-outline"}" onclick="setProductTab('encomendas')">Encomendas</button>
      <button class="btn ${tab === "delivery" ? "btn-pink" : "btn-outline"}" onclick="setProductTab('delivery')">Delivery</button>
    </div>
    ${tab === "delivery" ? `<p class="hint">Produtos de delivery são de uso interno por enquanto: o cliente ainda vê "Delivery em breve" no site. Eles alimentam o Estoque de Produtos.</p>` : ""}
    ${tab === "encomendas" ? renderSiteMediaCard() : ""}
    <div id="productFormArea"></div>
    <div class="admin-card">
      ${products.length ? `
        <table>
          <thead><tr><th></th><th>Nome</th><th>Categoria</th><th>Preço</th><th>Ativo</th><th></th></tr></thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td>${p.image_url ? `<img class="img-thumb" src="${p.image_url}" alt="Foto do produto ${escapeHtml(p.name || "")}" onerror="this.style.display='none'">` : ""}</td>
                <td>${p.name}</td>
                <td>${p.category === "brigadeiro" ? "Brigadeiro" : p.category === "geladinho" ? "Geladinho" : "Delivery"}</td>
                <td>${fmt(p.price)}</td>
                <td><label class="ds-toggle sm" title="${p.active ? "Ativo — clique para desativar" : "Inativo — clique para ativar"}"><input type="checkbox" ${p.active ? "checked" : ""} onchange="toggleProductActive('${p.id}', this.checked)"><span></span></label></td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="openProductForm('${p.id}')">Editar</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Excluir</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `<p class="center-msg">Nenhum produto cadastrado.</p>`}
    </div>
  `;
}
async function toggleProductActive(id, active) {
  const { error } = await sb.from("products").update({ active }).eq("id", id);
  if (error) { console.error(error); alert("Não foi possível alterar: " + (error.message || "")); await loadProducts(document.getElementById("adminMain")); return; }
  const p = admin.data.products.find(x => x.id === id);
  if (p) p.active = active;
  renderProductsTable(document.getElementById("adminMain"));
}
function setPhotoCount(n) {
  const box = document.getElementById("photo2Box");
  if (box) box.style.display = n === 2 ? "" : "none";
  document.querySelectorAll(".photo-count button").forEach(b => b.classList.toggle("on", Number(b.dataset.n) === n));
  document.getElementById("pfPhotoCount").value = String(n);
}
function setProductTab(t) {
  admin.data.productTab = t;
  renderProductsTable(document.getElementById("adminMain"));
}
function openProductForm(id) {
  const p = id ? admin.data.products.find(p => p.id === id) : null;
  document.getElementById("productFormArea").innerHTML = `
    <div class="admin-card">
      <h2>${p ? "Editar produto" : "Novo produto"}</h2>
      <div class="form-grid">
        <label>Nome<input id="pfName" value="${p ? p.name : ""}"></label>
        ${(admin.data.productTab === "delivery" || (p && p.category === "delivery")) ? `<input type="hidden" id="pfCategory" value="delivery">` : `<label>Categoria
          <select id="pfCategory">
            <option value="brigadeiro" ${p && p.category === "brigadeiro" ? "selected" : ""}>Brigadeiro</option>
            <option value="geladinho" ${p && p.category === "geladinho" ? "selected" : ""}>Geladinho</option>
          </select>
        </label>`}
        <label>Preço (R$)<input id="pfPrice" type="number" step="0.10" value="${p ? p.price : ""}"></label>
        <label>Ordem de exibição<input id="pfSort" type="number" value="${p ? p.sort_order : 0}"></label>
      </div>
      <label style="display:block;margin-top:10px">Descrição<textarea id="pfDesc" rows="2">${p ? p.description || "" : ""}</textarea></label>

      <p class="photo-upload-label" style="margin-top:14px">Quantas fotos o produto tem?</p>
      <input type="hidden" id="pfPhotoCount" value="${p && p.image_url_2 ? 2 : 1}">
      <div class="photo-count">
        <button type="button" data-n="1" class="${p && p.image_url_2 ? "" : "on"}" onclick="setPhotoCount(1)">Uma foto</button>
        <button type="button" data-n="2" class="${p && p.image_url_2 ? "on" : ""}" onclick="setPhotoCount(2)">Duas fotos</button>
      </div>
      <p class="hint" style="margin:6px 0 0">Com uma foto, só ela aparece no site (sem quadro vazio ao lado).</p>
      <div class="photo-upload-row">
        <div class="photo-upload-box">
          <p class="photo-upload-label">${p && p.image_url_2 ? "Foto inteira" : "Foto"}</p>
          <div id="pfImagePreview" class="photo-preview">${p && p.image_url ? productImagePreviewHTML(p.image_url, p, "primary") : "Sem foto"}</div>
          <input type="hidden" id="pfImage" value="${p ? p.image_url || "" : ""}">
          <input type="file" accept="image/*" id="pfImageFile" onchange="handlePhotoUpload(this, 'pfImage')">
          <button type="button" class="btn btn-outline btn-sm crop-open-btn" onclick="openImageCropper('pfImage','Foto inteira')" ${p && p.image_url ? "" : "disabled"}>✂ Ajustar foto</button>
          ${imageAdjustControlsHTML(p, "primary")}
          <p id="pfImageStatus" class="photo-status"></p>
        </div>
        <div class="photo-upload-box" id="photo2Box" style="${p && p.image_url_2 ? "" : "display:none"}">
          <p class="photo-upload-label">Foto mordida</p>
          <div id="pfImage2Preview" class="photo-preview">${p && p.image_url_2 ? productImagePreviewHTML(p.image_url_2, p, "secondary") : "Sem foto"}</div>
          <input type="hidden" id="pfImage2" value="${p ? p.image_url_2 || "" : ""}">
          <input type="file" accept="image/*" id="pfImage2File" onchange="handlePhotoUpload(this, 'pfImage2')">
          <button type="button" class="btn btn-outline btn-sm crop-open-btn" onclick="openImageCropper('pfImage2','Foto mordida')" ${p && p.image_url_2 ? "" : "disabled"}>✂ Ajustar foto</button>
          ${imageAdjustControlsHTML(p, "secondary")}
          <p id="pfImage2Status" class="photo-status"></p>
        </div>
      </div>

      <label style="display:flex;flex-direction:row;align-items:center;gap:8px;margin-top:14px">
        <input type="checkbox" id="pfActive" ${!p || p.active ? "checked" : ""} style="width:auto"> Ativo
      </label>
      <div style="margin-top:14px;display:flex;gap:10px">
        <button class="btn btn-pink" onclick="saveProduct(${p ? `'${p.id}'` : "null"})">Salvar</button>
        <button class="btn btn-outline" onclick="document.getElementById('productFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>
  `;
}

function imageSetting(p, key, fallback) {
  const value = Number(p?.[key]);
  return Number.isFinite(value) ? value : fallback;
}

function imageAdjustControlsHTML(p, kind) {
  const prefix = kind === "primary" ? "pfImage" : "pfImage2";
  const scaleKey = kind === "primary" ? "image_scale" : "image2_scale";
  const xKey = kind === "primary" ? "image_position_x" : "image2_position_x";
  const yKey = kind === "primary" ? "image_position_y" : "image2_position_y";
  const scale = imageSetting(p, scaleKey, 1);
  const x = imageSetting(p, xKey, 50);
  const y = imageSetting(p, yKey, 50);
  return `
    <div class="image-adjust-controls">
      <div class="image-adjust-title">Ajuste da foto</div>
      <label>Zoom <output id="${prefix}ScaleOut">${Math.round(scale * 100)}%</output>
        <input id="${prefix}Scale" type="range" min="1" max="3" step="0.01" value="${scale}" oninput="updateProductImagePreview('${prefix}')">
      </label>
      <label>Horizontal <output id="${prefix}XOut">${Math.round(x)}%</output>
        <input id="${prefix}X" type="range" min="0" max="100" step="1" value="${x}" oninput="updateProductImagePreview('${prefix}')">
      </label>
      <label>Vertical <output id="${prefix}YOut">${Math.round(y)}%</output>
        <input id="${prefix}Y" type="range" min="0" max="100" step="1" value="${y}" oninput="updateProductImagePreview('${prefix}')">
      </label>
      <button type="button" class="btn btn-outline btn-sm" onclick="resetProductImageAdjustments('${prefix}')">Centralizar e resetar</button>
    </div>`;
}

function productImagePreviewHTML(url, p, kind) {
  const scale = imageSetting(p, kind === "primary" ? "image_scale" : "image2_scale", 1);
  const x = imageSetting(p, kind === "primary" ? "image_position_x" : "image2_position_x", 50);
  const y = imageSetting(p, kind === "primary" ? "image_position_y" : "image2_position_y", 50);
  return `<img src="${url}" alt="Pré-visualização da imagem" style="--img-scale:${scale};--img-x:${x}%;--img-y:${y}%">`;
}

function updateProductImagePreview(prefix) {
  const scale = Number(document.getElementById(prefix + "Scale").value);
  const x = Number(document.getElementById(prefix + "X").value);
  const y = Number(document.getElementById(prefix + "Y").value);
  const preview = document.getElementById(prefix + "Preview");
  const img = preview?.querySelector("img");
  if (!img) return;
  img.style.setProperty("--img-scale", scale);
  img.style.setProperty("--img-x", x + "%");
  img.style.setProperty("--img-y", y + "%");
  document.getElementById(prefix + "ScaleOut").textContent = Math.round(scale * 100) + "%";
  document.getElementById(prefix + "XOut").textContent = Math.round(x) + "%";
  document.getElementById(prefix + "YOut").textContent = Math.round(y) + "%";
}

function resetProductImageAdjustments(prefix) {
  document.getElementById(prefix + "Scale").value = 1;
  document.getElementById(prefix + "X").value = 50;
  document.getElementById(prefix + "Y").value = 50;
  updateProductImagePreview(prefix);
}

/* ---------------- RECORTADOR VISUAL ---------------- */
const imageCropper = {
  targetFieldId: null,
  title: "",
  url: "",
  scale: 1,
  x: 50,
  y: 50,
  baseScale: 1,
  naturalWidth: 0,
  naturalHeight: 0,
  viewportSize: 280,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  startPointerX: 0,
  startPointerY: 0,
  startOffsetX: 0,
  startOffsetY: 0
};

function openImageCropper(targetFieldId, title) {
  const url = document.getElementById(targetFieldId)?.value?.trim();
  if (!url) { alert("Envie uma foto primeiro para poder ajustá-la."); return; }

  const isPrimary = targetFieldId === "pfImage";
  const p = admin.data.products.find(item => item.id === getEditingProductId());
  const scaleKey = isPrimary ? "image_scale" : "image2_scale";
  const xKey = isPrimary ? "image_position_x" : "image2_position_x";
  const yKey = isPrimary ? "image_position_y" : "image2_position_y";

  imageCropper.targetFieldId = targetFieldId;
  imageCropper.title = title || "Ajustar foto";
  imageCropper.url = url;
  imageCropper.scale = Math.max(1, imageSetting(p, scaleKey, 1));
  imageCropper.x = imageSetting(p, xKey, 50);
  imageCropper.y = imageSetting(p, yKey, 50);

  document.body.insertAdjacentHTML("beforeend", `
    <div class="cropper-overlay" id="imageCropperModal" role="dialog" aria-modal="true" aria-label="${imageCropper.title}">
      <div class="cropper-box">
        <h3>${imageCropper.title}</h3>
        <p class="cropper-hint">Arraste a foto para posicionar. Use o zoom para aproximar ou afastar.</p>
        <div class="cropper-viewport" id="cropperViewport">
          <img id="cropperImage" src="${imageCropper.url}" alt="Prévia da foto">
          <div class="cropper-guide" aria-hidden="true"></div>
          <div class="cropper-crosshair" aria-hidden="true"><span></span><i></i></div>
        </div>
        <div class="cropper-zoom-row">
          <span>−</span>
          <input id="cropperZoom" type="range" min="1" max="3" step="0.01" value="${imageCropper.scale}">
          <span>+</span>
        </div>
        <div class="cropper-zoom-value" id="cropperZoomValue">${Math.round(imageCropper.scale * 100)}%</div>
        <div class="cropper-actions">
          <button type="button" class="btn btn-outline" onclick="resetImageCropper()">Centralizar</button>
          <button type="button" class="btn btn-outline" onclick="closeImageCropper()">Cancelar</button>
          <button type="button" class="btn btn-pink" onclick="applyImageCropper()">Aplicar</button>
        </div>
      </div>
    </div>
  `);

  const img = document.getElementById("cropperImage");
  const viewport = document.getElementById("cropperViewport");
  img.onload = () => {
    imageCropper.naturalWidth = img.naturalWidth;
    imageCropper.naturalHeight = img.naturalHeight;
    imageCropper.viewportSize = viewport.clientWidth || 280;
    imageCropper.baseScale = Math.max(
      imageCropper.viewportSize / img.naturalWidth,
      imageCropper.viewportSize / img.naturalHeight
    );
    imageCropper.offsetX = 0;
    imageCropper.offsetY = 0;
    positionCropperFromPercent();
    renderImageCropper();
  };

  document.getElementById("cropperZoom").addEventListener("input", (event) => {
    const before = getCropperImageSize();
    const centerBefore = { x: imageCropper.offsetX, y: imageCropper.offsetY };
    imageCropper.scale = Number(event.target.value);
    const after = getCropperImageSize();
    const ratioX = after.width ? before.width / after.width : 1;
    const ratioY = after.height ? before.height / after.height : 1;
    imageCropper.offsetX = centerBefore.x * ratioX;
    imageCropper.offsetY = centerBefore.y * ratioY;
    clampCropperOffset();
    renderImageCropper();
  });

  const startDrag = (event) => {
    event.preventDefault();
    imageCropper.dragging = true;
    imageCropper.startPointerX = event.clientX;
    imageCropper.startPointerY = event.clientY;
    imageCropper.startOffsetX = imageCropper.offsetX;
    imageCropper.startOffsetY = imageCropper.offsetY;
    viewport.setPointerCapture?.(event.pointerId);
  };
  const moveDrag = (event) => {
    if (!imageCropper.dragging) return;
    imageCropper.offsetX = imageCropper.startOffsetX + (event.clientX - imageCropper.startPointerX);
    imageCropper.offsetY = imageCropper.startOffsetY + (event.clientY - imageCropper.startPointerY);
    clampCropperOffset();
    renderImageCropper();
  };
  const endDrag = () => { imageCropper.dragging = false; };
  viewport.addEventListener("pointerdown", startDrag);
  viewport.addEventListener("pointermove", moveDrag);
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("pointerleave", endDrag);
}

function getEditingProductId() {
  const saveButton = document.querySelector('#productFormArea button[onclick^="saveProduct("]');
  const match = saveButton?.getAttribute("onclick")?.match(/saveProduct\('([^']+)'\)/);
  return match ? match[1] : null;
}

function getCropperImageSize() {
  return {
    width: imageCropper.naturalWidth * imageCropper.baseScale * imageCropper.scale,
    height: imageCropper.naturalHeight * imageCropper.baseScale * imageCropper.scale
  };
}

function clampCropperOffset() {
  const size = getCropperImageSize();
  const halfX = Math.max(0, (size.width - imageCropper.viewportSize) / 2);
  const halfY = Math.max(0, (size.height - imageCropper.viewportSize) / 2);
  imageCropper.offsetX = Math.max(-halfX, Math.min(halfX, imageCropper.offsetX));
  imageCropper.offsetY = Math.max(-halfY, Math.min(halfY, imageCropper.offsetY));
}

function positionCropperFromPercent() {
  const size = getCropperImageSize();
  const halfX = Math.max(0, (size.width - imageCropper.viewportSize) / 2);
  const halfY = Math.max(0, (size.height - imageCropper.viewportSize) / 2);
  imageCropper.offsetX = ((imageCropper.x - 50) / 50) * halfX;
  imageCropper.offsetY = ((imageCropper.y - 50) / 50) * halfY;
  clampCropperOffset();
}

function getCropperPercentages() {
  const size = getCropperImageSize();
  const halfX = Math.max(0, (size.width - imageCropper.viewportSize) / 2);
  const halfY = Math.max(0, (size.height - imageCropper.viewportSize) / 2);
  return {
    x: halfX ? 50 + (imageCropper.offsetX / halfX) * 50 : 50,
    y: halfY ? 50 + (imageCropper.offsetY / halfY) * 50 : 50
  };
}

function renderImageCropper() {
  const img = document.getElementById("cropperImage");
  if (!img) return;
  const size = getCropperImageSize();
  img.style.width = `${size.width}px`;
  img.style.height = `${size.height}px`;
  img.style.left = `calc(50% + ${imageCropper.offsetX}px)`;
  img.style.top = `calc(50% + ${imageCropper.offsetY}px)`;
  const zoom = document.getElementById("cropperZoom");
  const value = document.getElementById("cropperZoomValue");
  if (zoom) zoom.value = imageCropper.scale;
  if (value) value.textContent = `${Math.round(imageCropper.scale * 100)}%`;
}

function resetImageCropper() {
  imageCropper.scale = 1;
  imageCropper.offsetX = 0;
  imageCropper.offsetY = 0;
  renderImageCropper();
}

function closeImageCropper() {
  document.getElementById("imageCropperModal")?.remove();
}

function applyImageCropper() {
  const percentages = getCropperPercentages();
  const prefix = imageCropper.targetFieldId;
  const scaleId = prefix === "pfImage" ? "pfImageScale" : "pfImage2Scale";
  const xId = prefix === "pfImage" ? "pfImageX" : "pfImage2X";
  const yId = prefix === "pfImage" ? "pfImageY" : "pfImage2Y";
  const scaleEl = document.getElementById(scaleId);
  const xEl = document.getElementById(xId);
  const yEl = document.getElementById(yId);
  if (scaleEl) scaleEl.value = imageCropper.scale;
  if (xEl) xEl.value = Math.round(percentages.x);
  if (yEl) yEl.value = Math.round(percentages.y);
  updateProductImagePreview(prefix);
  closeImageCropper();
}

/* Comprime a imagem no navegador (máx. 900px no lado maior, JPEG ~82%)
   antes de enviar — resolve o problema de fotos gigantes/lentas. */
function compressImage(file, maxSize = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxSize) { height = Math.round(height * (maxSize / width)); width = maxSize; }
      else if (height > maxSize) { width = Math.round(width * (maxSize / height)); height = maxSize; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("Não foi possível converter a imagem para JPEG."));
      }, "image/jpeg", quality);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handlePhotoUpload(inputEl, targetFieldId) {
  const file = inputEl.files[0];
  if (!file) return;
  const statusEl = document.getElementById(targetFieldId + "Status");
  const previewEl = document.getElementById(targetFieldId + "Preview");
  statusEl.textContent = "Comprimindo...";
  try {
    const compressed = await compressImage(file);
    statusEl.textContent = "Enviando...";
    const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await sb.storage.from("photos").upload(fileName, compressed, { contentType: "image/jpeg" });
    if (error) throw error;
    const { data: urlData } = sb.storage.from("photos").getPublicUrl(fileName);
    document.getElementById(targetFieldId).value = urlData.publicUrl;
    previewEl.innerHTML = `<img src="${urlData.publicUrl}" alt="Pré-visualização da imagem" style="--img-scale:1;--img-x:50%;--img-y:50%">`;
    const cropButton = document.querySelector(`button[onclick^="openImageCropper('${targetFieldId}'"]`);
    if (cropButton) cropButton.disabled = false;
    updateProductImagePreview(targetFieldId);
    statusEl.textContent = `Pronto (${(compressed.size / 1024).toFixed(0)} KB)`;
  } catch (e) {
    console.error(e);
    statusEl.textContent = `Não foi possível enviar: ${e.message || "tente novamente."}`;
  } finally {
    // Permite selecionar novamente o mesmo arquivo após uma falha temporária.
    inputEl.value = "";
  }
}

async function saveProduct(id) {
  const payload = {
    name: document.getElementById("pfName").value.trim(),
    category: document.getElementById("pfCategory").value,
    price: parseFloat(document.getElementById("pfPrice").value) || 0,
    sort_order: parseInt(document.getElementById("pfSort").value) || 0,
    description: document.getElementById("pfDesc").value.trim(),
    image_url: document.getElementById("pfImage").value.trim(),
    image_url_2: document.getElementById("pfPhotoCount").value === "2" ? document.getElementById("pfImage2").value.trim() : "",
    image_scale: Number(document.getElementById("pfImageScale")?.value) || 1,
    image_position_x: Number(document.getElementById("pfImageX")?.value) || 50,
    image_position_y: Number(document.getElementById("pfImageY")?.value) || 50,
    image2_scale: Number(document.getElementById("pfImage2Scale")?.value) || 1,
    image2_position_x: Number(document.getElementById("pfImage2X")?.value) || 50,
    image2_position_y: Number(document.getElementById("pfImage2Y")?.value) || 50,
    active: document.getElementById("pfActive").checked,
  };
  const { error: pErr } = id ? await sb.from("products").update(payload).eq("id", id) : await sb.from("products").insert(payload);
  if (pErr) { console.error(pErr); alert("Não foi possível salvar: " + (pErr.message || "") + (payload.category === "delivery" ? "\n\nRode o script add_delivery_estoque.sql no Supabase." : "")); return; }
  document.getElementById("productFormArea").innerHTML = "";
  await loadProducts(document.getElementById("adminMain"));
}
async function deleteProduct(id) {
  if (!confirm("Excluir este produto?")) return;
  await sb.from("products").delete().eq("id", id);
  admin.data.products = admin.data.products.filter(p => p.id !== id);
  renderProductsTable(document.getElementById("adminMain"));
}

/* ---------------- CLIENTES (cadastro + fidelidade unificados) ---------------- */

async function loadCustomers(main) {
  const [c, l, r, m] = await Promise.all([
    sb.from("customers").select("*").order("full_name", { ascending: true }),
    sb.from("loyalty_cards").select("*"),
    sb.from("rewards").select("*").order("points_required", { ascending: true }),
    sb.from("loyalty_movements").select("*").order("created_at", { ascending: false }),
  ]);
  if (c.error) throw c.error;
  if (l.error) throw l.error;
  admin.data.allCustomers = c.data || [];
  admin.data.customers = admin.data.allCustomers;
  admin.data.loyalty = l.data || [];
  admin.data.rewards = r.data || [];
  admin.data.movesOk = !m.error;      // false até rodar add_melhorias_v2.sql
  admin.data.moves = m.data || [];
  if (admin.data.custView) {
    if (admin.data.custView === "new" || admin.data.allCustomers.some(x => x.id === admin.data.custView)) return renderCustomerDetail(main);
    admin.data.custView = null;
  }
  renderCustomersTable(main);
}
const custCard = id => admin.data.loyalty.find(l => l.customer_id === id);
const custPoints = id => { const k = custCard(id); return k ? Number(k.points || 0) : 0; };
const fmtDT = d => new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function renderCustomersTable(main) {
  const q = (admin.data.custSearch || "").toLowerCase().trim();
  const all = admin.data.allCustomers;
  const list = !q ? all : all.filter(c => [c.full_name, c.email, c.phone, c.cpf].some(v => String(v || "").toLowerCase().includes(q)));
  main.innerHTML = `
    <div class="admin-topbar"><h1>Clientes</h1>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline" onclick="setTab('rewards')">Benefícios (Mimos)</button>
        <button class="btn btn-pink" onclick="openCustomerDetail('new')">+ Novo cliente</button>
      </div>
    </div>
    <div class="admin-card" style="padding:14px 18px;margin-bottom:12px">
      <strong>Regra do Clube Fidelidade</strong>
      <div style="margin-top:4px;color:var(--muted);font-size:13px">Cada R$ 1,00 em pedido entregue = 1 ponto. Clique em um cliente para ver dados, compras, pontos e resgates.</div>
    </div>
    ${!admin.data.movesOk ? `<div class="error-box">Para ver o histórico de pontos, rode o script <strong>add_melhorias_v2.sql</strong> no Supabase.</div>` : ""}
    <div class="admin-card">
      <input id="custSearch" placeholder="Buscar por nome, e-mail, telefone ou CPF" value="${escapeHtml(admin.data.custSearch || "")}" oninput="custSearchInput(this.value)" style="width:100%;border:1.5px solid var(--border);border-radius:12px;padding:10px 14px;margin-bottom:14px;font:inherit">
      ${list.length ? `
        <div style="overflow-x:auto"><table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Pontos</th><th>Pedidos</th><th></th></tr></thead>
          <tbody>
            ${list.map(c => {
              const k = custCard(c.id);
              return `<tr>
                <td><strong>${escapeHtml(c.full_name || "—")}</strong>${c.manual ? ` <small style="color:var(--muted)">(cadastro manual)</small>` : ""}</td>
                <td>${escapeHtml(c.email || "—")}</td>
                <td>${escapeHtml(c.phone || "—")}</td>
                <td><strong>${custPoints(c.id)}</strong> <small>pontos</small></td>
                <td>${k ? Number(k.completed_orders || 0) : 0}</td>
                <td><button class="btn btn-outline btn-sm" onclick="openCustomerDetail('${c.id}')">Abrir</button></td>
              </tr>`;
            }).join("")}
          </tbody></table></div>
      ` : `<p class="center-msg">${all.length ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}</p>`}
    </div>`;
  const el = document.getElementById("custSearch");
  if (el && q) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
}
function custSearchInput(v) { admin.data.custSearch = v; renderCustomersTable(document.getElementById("adminMain")); }
function openCustomerDetail(id) { admin.data.custView = id; renderCustomerDetail(document.getElementById("adminMain")); window.scrollTo(0, 0); }
function closeCustomerDetail() { admin.data.custView = null; renderCustomersTable(document.getElementById("adminMain")); }
// compatibilidade com chamadas antigas
function openCustomerForm(id) { openCustomerDetail(id); }

async function renderCustomerDetail(main) {
  const id = admin.data.custView;
  const isNew = id === "new";
  const c = isNew ? {} : admin.data.allCustomers.find(x => x.id === id);
  if (!c) return closeCustomerDetail();
  const field = (lbl, fid, val, extra = "") => `<label>${lbl}<input id="${fid}" value="${escapeHtml(val || "")}" ${extra}></label>`;
  const head = `
    <div class="admin-topbar"><h1>${isNew ? "Novo cliente" : escapeHtml(c.full_name || "Cliente")}</h1>
      <button class="btn btn-outline" onclick="closeCustomerDetail()">← Voltar para a lista</button></div>`;
  const form = `
    <div class="admin-card">
      <h2>Dados cadastrais</h2>
      <div class="form-grid">
        ${field("Nome completo", "cfName", c.full_name)}
        <label>Gênero
          <select id="cfGender">
            <option value="" ${!c.gender ? "selected" : ""}>Prefiro não informar</option>
            <option value="feminino" ${c.gender === "feminino" ? "selected" : ""}>Feminino</option>
            <option value="masculino" ${c.gender === "masculino" ? "selected" : ""}>Masculino</option>
          </select>
        </label>
        ${isNew || c.manual ? field("E-mail", "cfEmail", c.email) : `<label>E-mail (não editável aqui)<input value="${escapeHtml(c.email || "")}" disabled></label>`}
        ${isNew || c.manual ? field("CPF", "cfCpf", (c.cpf || "").replace(/#m$/, "")) : `<label>CPF (não editável)<input value="${escapeHtml(c.cpf || "")}" disabled></label>`}
        ${field("Telefone", "cfPhone", c.phone)}
        ${field("CEP", "cfCep", c.cep)}
        ${field("Rua", "cfStreet", c.street)}
        ${field("Número", "cfNumber", c.number)}
        ${field("Complemento", "cfComplement", c.complement)}
        ${field("Bairro", "cfNeighborhood", c.neighborhood)}
        ${field("Cidade", "cfCity", c.city)}
        ${field("Estado", "cfState", c.state, 'maxlength="2"')}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="btn btn-pink" onclick="saveCustomerProfile('${isNew ? "new" : c.id}')">${isNew ? "Cadastrar cliente" : "Salvar alterações"}</button>
        ${isNew ? "" : `<button class="btn btn-danger" onclick="deleteCustomer('${c.id}')">Excluir cadastro</button>`}
      </div>
    </div>`;
  if (isNew) { main.innerHTML = head + `<p class="hint">Cadastro manual: o cliente ainda não tem login no site. Se ele criar uma conta depois com o mesmo CPF, os pedidos e pontos serão unidos automaticamente.</p>` + form; return; }

  // dados do cliente
  // só pedidos VINCULADOS ao cadastro contam (nada de ligar por nome/telefone)
  const [byId, byPhone] = await Promise.all([
    sb.from("orders").select("*").eq("customer_id", c.id),
    c.phone ? sb.from("orders").select("*").eq("customer_phone", c.phone).is("customer_id", null) : Promise.resolve({ data: [] }),
  ]);
  if (admin.data.custView !== id) return; // usuário mudou de tela enquanto carregava
  const ords = (byId.data || []).sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)));
  const unlinked = byPhone.data || [];
  const done = ords.filter(o => o.status === "delivered" || o.status === "completed");
  const spent = done.reduce((s, o) => s + Number(o.total || 0), 0);
  const card = custCard(c.id);
  const points = custPoints(c.id);
  const moves = admin.data.moves.filter(m => m.customer_id === c.id);
  const redeems = moves.filter(m => m.kind === "resgate");
  const claimed = card ? Number(card.rewards_claimed || 0) : 0;
  const older = Math.max(0, claimed - redeems.length);
  const loggedSum = moves.reduce((s, m) => s + m.delta, 0);
  const before = points - loggedSum; // saldo anterior ao início do registro de movimentações
  const rewardOpts = admin.data.rewards.filter(r => r.active);

  main.innerHTML = head + `
    <div class="stat-grid">
      <div class="stat-card"><div class="label">Saldo de pontos</div><div class="value">${points}</div></div>
      <div class="stat-card"><div class="label">Pedidos concluídos</div><div class="value">${card ? Number(card.completed_orders || 0) : done.length}</div></div>
      <div class="stat-card"><div class="label">Total comprado</div><div class="value">${fmt(spent)}</div></div>
      <div class="stat-card"><div class="label">Resgates</div><div class="value">${claimed}</div></div>
    </div>
    ${form}

    <div class="admin-card">
      <h2>Pontos de fidelidade</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input id="cfPointsDelta" type="number" min="1" placeholder="Quantidade" style="width:120px;border:1.5px solid var(--border);border-radius:10px;padding:9px 11px;">
        <input id="cfPointsReason" placeholder="Motivo (opcional)" style="flex:1;min-width:160px;border:1.5px solid var(--border);border-radius:10px;padding:9px 11px;">
        <button class="btn btn-pink btn-sm" onclick="adjustCustomerPoints('${c.id}', 1)">+ Adicionar</button>
        <button class="btn btn-outline btn-sm" onclick="adjustCustomerPoints('${c.id}', -1)">− Remover</button>
        <button class="btn btn-outline btn-sm" onclick="resetLoyaltyPoints('${c.id}')">Zerar pontos</button>
      </div>
      <h3 style="font-size:14px;margin:18px 0 8px">Histórico de movimentações</h3>
      ${!admin.data.movesOk ? `<p class="hint">Rode o <strong>add_melhorias_v2.sql</strong> para registrar o histórico.</p>` : `
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Data</th><th>Motivo</th><th>Pontos</th><th>Saldo</th></tr></thead>
        <tbody>
          ${moves.map(m => `<tr><td>${fmtDT(m.created_at)}</td><td>${escapeHtml(m.reason || "")}</td>
            <td style="font-weight:700;color:${m.delta >= 0 ? "#2E7D46" : "#B23434"}">${m.delta > 0 ? "+" : ""}${m.delta}</td><td>${m.balance}</td></tr>`).join("")}
          ${before !== 0 ? `<tr><td>—</td><td><em>Saldo anterior ao registro de movimentações</em></td><td>${before > 0 ? "+" : ""}${before}</td><td>${before}</td></tr>` : ""}
          ${!moves.length && before === 0 ? `<tr><td colspan="4" class="center-msg">Nenhuma movimentação.</td></tr>` : ""}
        </tbody></table></div>`}
    </div>

    <div class="admin-card">
      <h2>Resgates de mimos</h2>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
        <select id="cfRedeemReward" style="border:1.5px solid var(--border);border-radius:10px;padding:9px 11px;min-width:220px">
          ${rewardOpts.length ? rewardOpts.map(r => `<option value="${r.id}">${escapeHtml(r.name)} — ${Number(r.points_required)} pts</option>`).join("") : `<option value="">Nenhum mimo ativo</option>`}
        </select>
        <button class="btn btn-pink btn-sm" ${rewardOpts.length ? "" : "disabled"} onclick="adminRedeemReward('${c.id}')">Registrar resgate</button>
        <button class="btn btn-outline btn-sm" onclick="setTab('rewards')">Gerenciar benefícios</button>
      </div>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Data</th><th>Mimo</th><th>Pontos usados</th></tr></thead>
        <tbody>
          ${redeems.map(m => `<tr><td>${fmtDT(m.created_at)}</td><td>${escapeHtml((m.reason || "").replace(/^Resgate:\s*/, ""))}</td><td>${Math.abs(m.delta)}</td></tr>`).join("")}
          ${older ? `<tr><td>—</td><td><em>${older} resgate${older > 1 ? "s" : ""} anterior${older > 1 ? "es" : ""} ao registro</em></td><td>—</td></tr>` : ""}
          ${!redeems.length && !older ? `<tr><td colspan="3" class="center-msg">Nenhum resgate realizado.</td></tr>` : ""}
        </tbody></table></div>
    </div>

    <div class="admin-card">
      <h2>Histórico de compras</h2>
      ${ords.length ? `<div style="overflow-x:auto"><table>
        <thead><tr><th>Pedido</th><th>Data</th><th>Tipo</th><th>Itens</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          ${ords.map(o => {
            const items = (Array.isArray(o.items) ? o.items : []).map(i => `${i.quantity || i.qty || 1}x ${escapeHtml(i.name || i.title || "")}`).join(", ");
            return `<tr><td><strong>${escapeHtml(o.order_number || "")}</strong></td><td>${fmtDT(o.created_at)}</td>
              <td>${o.order_type === "delivery" ? "Delivery" : "Encomenda"}</td>
              <td style="max-width:320px">${items || "—"}</td><td>${fmt(Number(o.total || 0))}</td>
              <td><span class="badge ${o.status}">${STATUS_LABEL[o.status] || o.status}</span></td></tr>`;
          }).join("")}
        </tbody></table></div>` : `<p class="center-msg">Nenhuma compra registrada.</p>`}
      ${unlinked.length ? `<p class="hint" style="margin-top:10px">⚠ ${unlinked.length} pedido${unlinked.length > 1 ? "s" : ""} com o mesmo telefone (${unlinked.map(o => escapeHtml(o.order_number || "")).join(", ")}) <strong>não estão vinculados</strong> a este cadastro e por isso não geram pontos. Para vincular, edite o pedido e escolha este cliente no campo "Cliente".</p>` : ""}
    </div>

    <div class="admin-card">
      <h2>Senha de acesso</h2>
      ${c.manual ? `<p class="hint">Cadastro manual: este cliente ainda não tem login no site.</p>` : `
      <div style="color:var(--muted);font-size:13px">Por segurança, não é possível definir a senha por aqui. Você pode enviar ao cliente um link para criar uma nova senha.</div>
      <button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="sendCustomerPasswordReset('${escapeHtml(c.email || "")}')">Enviar link de redefinição de senha</button>`}
    </div>`;
}

async function saveCustomerProfile(id) {
  const v = k => { const el = document.getElementById(k); return el ? el.value.trim() : undefined; };
  const payload = {
    full_name: v("cfName"), gender: document.getElementById("cfGender").value || null,
    phone: v("cfPhone"), cep: v("cfCep"), street: v("cfStreet"), number: v("cfNumber"),
    complement: v("cfComplement"), neighborhood: v("cfNeighborhood"), city: v("cfCity"),
    state: (v("cfState") || "").toUpperCase(),
  };
  if (!payload.full_name) { alert("Informe o nome do cliente."); return; }
  if (v("cfEmail") !== undefined) payload.email = v("cfEmail") || null;
  if (v("cfCpf") !== undefined) payload.cpf = (v("cfCpf") || "").replace(/\D/g, "") || null;
  let res;
  if (id === "new") {
    res = await sb.from("customers").insert({ ...payload, manual: true }).select().single();
  } else {
    res = await sb.from("customers").update(payload).eq("id", id).select().single();
  }
  if (res.error) {
    console.error(res.error);
    alert(/duplicate|unique/i.test(res.error.message || "") ? "Já existe um cliente com esse CPF." :
      /null value|not-null/i.test(res.error.message || "") ? "Rode o script add_melhorias_v2.sql no Supabase para permitir cadastro manual." :
      "Não foi possível salvar: " + (res.error.message || ""));
    return;
  }
  alert(id === "new" ? "Cliente cadastrado." : "Dados do cliente atualizados.");
  admin.data.custView = id === "new" ? res.data.id : id;
  await loadCustomers(document.getElementById("adminMain"));
}

async function deleteCustomer(id) {
  const c = admin.data.allCustomers.find(x => x.id === id); if (!c) return;
  if (!confirm(`Excluir o cadastro de "${c.full_name}"?\n\nOs pontos e o histórico de pontos dele serão apagados. Os pedidos continuam salvos, apenas sem vínculo com o cadastro. Esta ação não pode ser desfeita.`)) return;
  if (!confirm("Confirma a exclusão definitiva deste cliente?")) return;
  const { error } = await sb.from("customers").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir: " + (error.message || "")); return; }
  admin.data.custView = null;
  await loadCustomers(document.getElementById("adminMain"));
}

async function adjustCustomerPoints(customerId, sign) {
  const raw = Math.floor(Number(document.getElementById("cfPointsDelta").value));
  if (!raw || raw <= 0) { alert("Informe uma quantidade de pontos maior que zero."); return; }
  const reason = document.getElementById("cfPointsReason").value.trim();
  let { error } = await sb.rpc("admin_adjust_points", { p_customer: customerId, p_delta: sign * raw, p_reason: reason });
  if (error && /admin_adjust_points/.test(error.message || "")) {
    // script v2 ainda não rodado: mantém o comportamento antigo (sem histórico)
    const next = Math.max(0, custPoints(customerId) + sign * raw);
    const card = custCard(customerId);
    ({ error } = card ? await sb.from("loyalty_cards").update({ points: next }).eq("customer_id", customerId)
                      : await sb.from("loyalty_cards").insert({ customer_id: customerId, points: next }));
  }
  if (error) { console.error(error); alert("Não foi possível atualizar os pontos."); return; }
  await loadCustomers(document.getElementById("adminMain"));
}

async function resetLoyaltyPoints(customerId) {
  if (!confirm("Zerar os pontos desse cliente?")) return;
  const cur = custPoints(customerId);
  if (!cur) return;
  let { error } = await sb.rpc("admin_adjust_points", { p_customer: customerId, p_delta: -cur, p_reason: "Pontos zerados pelo admin" });
  if (error && /admin_adjust_points/.test(error.message || "")) ({ error } = await sb.from("loyalty_cards").update({ points: 0 }).eq("customer_id", customerId));
  if (error) { console.error(error); alert("Não foi possível zerar os pontos."); return; }
  await loadCustomers(document.getElementById("adminMain"));
}

async function adminRedeemReward(customerId) {
  const rid = document.getElementById("cfRedeemReward").value;
  const r = admin.data.rewards.find(x => x.id === rid); if (!r) return;
  if (!confirm(`Registrar o resgate de "${r.name}" (${r.points_required} pontos)?`)) return;
  const { error } = await sb.rpc("admin_redeem_reward", { p_customer: customerId, p_reward: rid });
  if (error) { console.error(error); alert(/insuficientes/i.test(error.message || "") ? "O cliente não tem pontos suficientes." : "Não foi possível registrar o resgate (rode o add_melhorias_v2.sql). " + (error.message || "")); return; }
  await loadCustomers(document.getElementById("adminMain"));
}

async function sendCustomerPasswordReset(email) {
  if (!email) { alert("Cliente sem e-mail cadastrado."); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/" });
  if (error) { console.error(error); alert("Não foi possível enviar o e-mail de redefinição."); return; }
  alert("E-mail de redefinição de senha enviado para " + email + ".");
}

/* ---------------- CAIXA (100% manual: entrada, saída, retirada) ---------------- */

async function loadCaixa(main) {
  const { data: entries, error } = await sb.from("cash_entries").select("*").order("entry_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  admin.data.cashEntries = entries || [];
  renderCaixa(main);
}

const CAIXA_TYPE_LABEL = { entrada: "Entrada", saida: "Saída", retirada: "Retirada" };
const CAIXA_TYPE_BADGE = { entrada: "completed", saida: "cancelled", retirada: "production" };
const CAIXA_TYPE_COLOR = { entrada: "#2E7D46", saida: "#B23434", retirada: "#6A2CC4" };

function renderCaixa(main) {
  const entries = admin.data.cashEntries;
  const totalEntradas = entries.filter(e => e.type === "entrada").reduce((s, e) => s + Number(e.amount), 0);
  const totalSaidas = entries.filter(e => e.type === "saida").reduce((s, e) => s + Number(e.amount), 0);
  const totalRetiradas = entries.filter(e => e.type === "retirada").reduce((s, e) => s + Number(e.amount), 0);
  const saldo = totalEntradas - totalSaidas - totalRetiradas;
  const norm = m => { const t = String(m || "").toLowerCase(); return t.includes("pix") ? "pix" : t.includes("dinheiro") ? "dinheiro" : "outros"; };
  const bal = { dinheiro: 0, pix: 0, outros: 0 };
  entries.forEach(e => { bal[norm(e.payment_method)] += (e.type === "entrada" ? 1 : -1) * Number(e.amount); });

  main.innerHTML = `
    <div class="admin-topbar"><h1>Caixa</h1><button class="btn btn-pink" onclick="openCashForm()">+ Nova movimentação</button></div>
    <p class="hint">Controle 100% manual — nada aqui é lançado sozinho pelo sistema.</p>

    <div class="stat-grid">
      <div class="stat-card"><div class="label">Entradas</div><div class="value" style="color:#2E7D46">${fmt(totalEntradas)}</div></div>
      <div class="stat-card"><div class="label">Saídas</div><div class="value" style="color:#B23434">${fmt(totalSaidas)}</div></div>
      <div class="stat-card"><div class="label">Retiradas</div><div class="value" style="color:#6A2CC4">${fmt(totalRetiradas)}</div></div>
      <div class="stat-card"><div class="label">Saldo total</div><div class="value">${fmt(saldo)}</div></div>
    </div>
    <div class="stat-grid">
      <div class="stat-card"><div class="label">Saldo em dinheiro</div><div class="value" style="color:${bal.dinheiro < 0 ? "#B23434" : "var(--ink)"}">${fmt(bal.dinheiro)}</div></div>
      <div class="stat-card"><div class="label">Saldo no Pix</div><div class="value" style="color:${bal.pix < 0 ? "#B23434" : "var(--ink)"}">${fmt(bal.pix)}</div></div>
      ${Math.abs(bal.outros) > 0.004 ? `<div class="stat-card"><div class="label">Cartão / outros</div><div class="value">${fmt(bal.outros)}</div></div>` : ""}
    </div>

    <div id="cashFormArea"></div>

    <div class="admin-card">
      <div class="admin-topbar" style="margin-bottom:10px">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700"><input type="checkbox" id="caixaSelectAll" onchange="toggleAllCashEntries(this.checked)"> Selecionar todos</label>
        <button class="btn btn-danger btn-sm" onclick="deleteSelectedCashEntries()">Excluir selecionadas</button>
      </div>
      ${entries.length ? `
        <table>
          <thead><tr><th></th><th>Data</th><th>Tipo</th><th>Descrição</th><th>Pagamento</th><th>Valor</th><th></th></tr></thead>
          <tbody>
            ${entries.map(e => `
              <tr>
                <td><input type="checkbox" class="caixaCheck" value="${e.id}"></td>
                <td>${new Date(e.entry_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                <td><span class="badge-status ${CAIXA_TYPE_BADGE[e.type]}">${CAIXA_TYPE_LABEL[e.type]}</span></td>
                <td>${e.description}</td>
                <td>${e.payment_method || "—"}</td>
                <td><strong style="color:${CAIXA_TYPE_COLOR[e.type]}">${e.type === "entrada" ? "+" : "−"} ${fmt(e.amount)}</strong></td>
                <td><button class="btn btn-outline btn-sm" onclick="deleteCashEntry('${e.id}')">Excluir</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `<p class="center-msg">Nenhuma movimentação ainda.</p>`}
    </div>
  `;
}

function openCashForm() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("cashFormArea").innerHTML = `
    <div class="admin-card">
      <h2>Nova movimentação de caixa</h2>
      <div class="form-grid">
        <label>Data<input type="date" id="ceDate" value="${today}"></label>
        <label>Tipo
          <select id="ceType">
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="retirada">Retirada</option>
          </select>
        </label>
        <label>Descrição<input type="text" id="ceDescription" placeholder="Ex: Ana Paula - geladinho, ou Compra atacadão"></label>
        <label>Forma de pagamento
          <select id="cePayment">
            <option value="Pix">Pix</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Cartão">Cartão</option>
            <option value="Outro">Outro</option>
          </select>
        </label>
        <label>Valor (R$)<input type="number" step="0.01" min="0" id="ceAmount" placeholder="0,00"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveCashEntry()">Salvar</button>
        <button class="btn btn-outline" onclick="document.getElementById('cashFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>
  `;
}

async function saveCashEntry() {
  const payload = {
    entry_date: document.getElementById("ceDate").value,
    type: document.getElementById("ceType").value,
    description: document.getElementById("ceDescription").value.trim(),
    payment_method: document.getElementById("cePayment").value,
    amount: Number(document.getElementById("ceAmount").value),
  };
  if (!payload.entry_date || !payload.description || !payload.amount) {
    alert("Preencha data, descrição e valor.");
    return;
  }
  const { error } = await sb.from("cash_entries").insert(payload);
  if (error) { console.error(error); alert("Não foi possível salvar o lançamento."); return; }
  document.getElementById("cashFormArea").innerHTML = "";
  await loadCaixa(document.getElementById("adminMain"));
}

async function deleteCashEntry(id) {
  if (!confirm("Excluir esta movimentação?")) return;
  const { error } = await sb.from("cash_entries").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir."); return; }
  await loadCaixa(document.getElementById("adminMain"));
}

function toggleAllCashEntries(checked) {
  document.querySelectorAll(".caixaCheck").forEach(cb => cb.checked = checked);
}

async function deleteSelectedCashEntries() {
  const ids = Array.from(document.querySelectorAll(".caixaCheck:checked")).map(cb => cb.value);
  if (!ids.length) { alert("Selecione ao menos uma movimentação."); return; }
  const plural = ids.length > 1;
  if (!confirm(`Excluir ${ids.length} movimentaç${plural ? "ões" : "ão"} selecionad${plural ? "as" : "a"}? Essa ação não pode ser desfeita.`)) return;

  const btn = document.querySelector('button[onclick="deleteSelectedCashEntries()"]');
  if (btn) { btn.disabled = true; btn.textContent = "Excluindo..."; }

  // Em lotes pequenos: mandar centenas de IDs de uma vez estoura o tamanho do pedido.
  const CHUNK = 40;
  let deleted = 0;
  let firstError = null;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { data, error } = await sb.from("cash_entries").delete().in("id", chunk).select("id");
    if (error) { firstError = error.message || String(error); break; }
    deleted += data ? data.length : 0;
  }

  if (firstError) {
    alert(`Foram excluídas ${deleted} de ${ids.length}. Parou por causa deste erro: ${firstError}`);
  } else if (deleted < ids.length) {
    alert(`Só ${deleted} de ${ids.length} foram excluídas. As outras não foram apagadas — provavelmente é uma permissão (RLS) da tabela cash_entries no Supabase.`);
  }
  await loadCaixa(document.getElementById("adminMain"));
}

/* ---------------- FINANCEIRO (Faturamento automático do site + manual, e Despesas) ---------------- */

async function loadFinanceiro(main) {
  const [{ data: revenue, error: rErr }, { data: expenses, error: eErr }] = await Promise.all([
    sb.from("revenue_entries").select("*").order("entry_date", { ascending: false }),
    sb.from("expense_entries").select("*").order("entry_date", { ascending: false }),
  ]);
  if (rErr) throw rErr;
  if (eErr) throw eErr;
  admin.data.revenueEntries = revenue || [];
  admin.data.expenseEntries = expenses || [];
  const [pu, ins, pay] = await Promise.all([
    sb.from("card_purchases").select("*").order("purchase_date", { ascending: false }),
    sb.from("card_installments").select("*").order("ref_month"),
    sb.from("card_statement_payments").select("*"),
  ]);
  admin.data.cardsOk = !(pu.error || ins.error || pay.error);
  admin.data.cardPurchases = admin.data.cardsOk ? (pu.data || []) : [];
  admin.data.cardInst = admin.data.cardsOk ? (ins.data || []) : [];
  admin.data.cardPaid = admin.data.cardsOk ? (pay.data || []) : [];
  // identificação dos pedidos (número + cliente) e valor de venda do estoque restante
  await sb.rpc("rollover_delivery_stock"); // idempotente: só transfere sobras de mês já encerrado
  const [ord, dp, db, ds, dt, dw] = await Promise.all([
    sb.from("orders").select("id,order_number,customer_name"),
    sb.from("products").select("*").eq("category", "delivery"),
    sb.from("delivery_stock_batches").select("*"),
    sb.from("delivery_sales").select("*"),
    sb.from("delivery_stock_transfers").select("*"),
    sb.from("delivery_stock_writeoffs").select("*"),
  ]);
  admin.data.dWriteoffs = dw.error ? [] : (dw.data || []);
  admin.data.finOrders = {}; (ord.data || []).forEach(o => { admin.data.finOrders[o.id] = o; });
  // dados do estoque de produtos: o resultado projetado é calculado POR MÊS (stockMonthRows)
  admin.data.dProducts = (dp.data || []).filter(p => p.active !== false);
  admin.data.dBatches = db.data || [];
  admin.data.dSales = ds.data || [];
  admin.data.dTransfers = dt.error ? [] : (dt.data || []);
  if (!admin.data.finMonth) admin.data.finMonth = new Date().toISOString().slice(0, 7);
  renderFinanceiro(main);
}

const CARD_NAMES = ["XP Investimentos", "Nubank"];
const PAYMENT_METHOD_LABEL = { dinheiro: "Dinheiro", pix: "Pix", debito: "Débito", credito: "Crédito" };

function monthGroupLabel(key) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES_CAL[Number(m) - 1]}/${y}`;
}

function groupByMonth(list, dateField) {
  const groups = {};
  list.forEach(item => {
    const key = item[dateField] ? item[dateField].slice(0, 7) : "sem-data";
    (groups[key] = groups[key] || []).push(item);
  });
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)); // mais recente primeiro
}


/* ---- helpers de mês / cartão ---- */
// padrão de identificação: número do pedido na 1ª linha, nome do cliente abaixo
function orderIdentHtml(orderNumber, customerName) {
  return `<strong>Pedido ${escapeHtml(String(orderNumber || ""))}</strong>${customerName ? `<br><span style="color:var(--muted)">${escapeHtml(customerName)}</span>` : ""}`;
}
function monthIndex(key) { const [y, m] = key.split("-").map(Number); return y * 12 + (m - 1); }
function monthFromIndex(i) { return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`; }
function shiftMonth(key, n) { return monthFromIndex(monthIndex(key) + n); }
function splitInstallments(total, n) { // em centavos; última parcela absorve a diferença
  const cents = Math.round(total * 100), base = Math.floor(cents / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? cents - base * (n - 1) : base) / 100);
}
function buildInstallments(purchaseId, card, dateStr, total, n, closed) {
  const start = shiftMonth(dateStr.slice(0, 7), closed ? 1 : 0);
  return splitInstallments(total, n).map((amount, i) => ({
    purchase_id: purchaseId, card_name: card, number: i + 1, total_installments: n, amount, ref_month: shiftMonth(start, i) + "-01",
  }));
}
// fatura de um cartão num mês: parcelas + compras de crédito antigas lançadas como despesa
function statementItems(card, key) {
  const items = [];
  admin.data.cardInst.filter(i => i.card_name === card && i.ref_month.slice(0, 7) === key).forEach(i => {
    const pu = admin.data.cardPurchases.find(p => p.id === i.purchase_id) || {};
    items.push({ kind: "inst", id: i.id, purchaseId: i.purchase_id, desc: pu.description || "Compra", amount: Number(i.amount), n: i.number, total: i.total_installments, date: pu.purchase_date || "" });
  });
  admin.data.expenseEntries.filter(e => e.payment_method === "credito" && e.card_name === card && (e.entry_date || "").slice(0, 7) === key).forEach(e => {
    items.push({ kind: "legacy", id: e.id, desc: e.description, amount: Number(e.amount), n: 1, total: 1, date: e.entry_date });
  });
  return items;
}
function statementTotal(card, key) { return statementItems(card, key).reduce((t, i) => t + i.amount, 0); }
function statementPaid(card, key) { return admin.data.cardPaid.some(p => p.card_name === card && p.ref_month.slice(0, 7) === key && p.paid); }
// saídas de um mês = despesas lançadas (inclui crédito antigo) + parcelas de cartão do mês. Pagar fatura NÃO soma de novo.
function monthOut(key) {
  return admin.data.expenseEntries.filter(e => (e.entry_date || "").slice(0, 7) === key).reduce((t, e) => t + Number(e.amount), 0)
    + admin.data.cardInst.filter(i => i.ref_month.slice(0, 7) === key).reduce((t, i) => t + Number(i.amount), 0);
}
function monthIn(key) { return admin.data.revenueEntries.filter(r => (r.entry_date || "").slice(0, 7) === key).reduce((t, r) => t + Number(r.amount), 0); }
function setFinMonth(key) { if (key) { admin.data.finMonth = key; saveNav(); admin.data.openStatement = null; renderFinanceiro(document.getElementById("adminMain")); } }
function setFinYearMonth() {
  const y = document.getElementById("finYear").value, m = document.getElementById("finMon").value;
  setFinMonth(`${y}-${m}`);
}
function openStatement(card) { admin.data.openStatement = admin.data.openStatement === card ? null : card; renderFinanceiro(document.getElementById("adminMain")); }

function renderFinanceiro(main) {
  const key = admin.data.finMonth;
  const [yy, mm] = key.split("-");
  const year = Number(yy);
  const revenueM = admin.data.revenueEntries.filter(r => (r.entry_date || "").slice(0, 7) === key);
  const expensesM = admin.data.expenseEntries.filter(e => (e.entry_date || "").slice(0, 7) === key);
  const totalIn = monthIn(key), totalOut = monthOut(key), resultado = totalIn - totalOut;
  // estoque restante SOMENTE do mês selecionado (saldo inicial transferido + produzido − vendido − transferido)
  const stkRows = stockMonthRows(key);
  const stockValue = stkRows.reduce((t, r) => t + r.potential, 0);
  const stockUnits = stkRows.reduce((t, r) => t + Math.max(r.stock, 0), 0);
  const nowYear = new Date().getFullYear();
  const years = []; for (let y = Math.min(nowYear - 3, year); y <= Math.max(nowYear + 3, year); y++) years.push(y);
  const open = admin.data.openStatement;
  const lbl = monthGroupLabel(key);

  // resumo anual do ano selecionado
  const annual = MONTH_NAMES_CAL.map((name, i) => { const k = `${year}-${String(i + 1).padStart(2, "0")}`; const inn = monthIn(k), out = monthOut(k); return { k, name, inn, out, res: inn - out }; });
  const sum = annual.reduce((t, m) => ({ inn: t.inn + m.inn, out: t.out + m.out }), { inn: 0, out: 0 });

  // parcelas futuras por cartão (a partir do mês atual)
  const curKey = new Date().toISOString().slice(0, 7);
  const futureKeys = [...new Set(admin.data.cardInst.map(i => i.ref_month.slice(0, 7)).filter(k => k >= curKey))].sort();

  const stmtCard = c => {
    const items = statementItems(c, key), tot = items.reduce((t, i) => t + i.amount, 0), paid = statementPaid(c, key);
    return `<div class="stat-card" style="cursor:pointer;${open === c ? "outline:2px solid #6A2CC4" : ""}" onclick="openStatement('${c}')" title="Ver compras desta fatura">
      <div class="label">Fatura ${c} — ${lbl}</div><div class="value" style="color:#6A2CC4">${fmt(tot)}</div>
      <div class="hint" style="margin:4px 0 0">${items.length} item(ns) · ${tot === 0 ? "sem fatura" : paid ? "✓ paga" : "pendente"} · clique para detalhar</div></div>`;
  };

  main.innerHTML = `
    <div class="admin-topbar"><h1>Financeiro</h1><div style="display:flex;gap:8px"><button class="btn btn-outline" onclick="openCardPurchaseForm()">+ Compra no cartão</button><button class="btn btn-pink" onclick="openFinanceForm()">+ Lançamento manual</button></div></div>
    <p class="hint">Quando um pedido do site é marcado como "Confirmado", a receita entra aqui sozinha — sem duplicar. Pedidos de fora do site e despesas são lançados manualmente.</p>
    ${!admin.data.cardsOk ? `<div class="error-box">Para usar compras parceladas no cartão, rode o script <strong>add_cartoes_parcelas.sql</strong> no Supabase.</div>` : ""}

    <div class="admin-card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <button class="btn btn-outline btn-sm" onclick="setFinMonth(shiftMonth('${key}', -1))">‹</button>
      <select id="finMon" onchange="setFinYearMonth()">${MONTH_NAMES_CAL.map((n, i) => `<option value="${String(i + 1).padStart(2, "0")}" ${String(i + 1).padStart(2, "0") === mm ? "selected" : ""}>${n}</option>`).join("")}</select>
      <select id="finYear" onchange="setFinYearMonth()">${years.map(y => `<option ${y === year ? "selected" : ""}>${y}</option>`).join("")}</select>
      <button class="btn btn-outline btn-sm" onclick="setFinMonth(shiftMonth('${key}', 1))">›</button>
      <button class="btn btn-outline btn-sm" onclick="setFinMonth(new Date().toISOString().slice(0,7))">Mês atual</button>
      <strong style="margin-left:6px">Painel de ${lbl}</strong>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="label">Faturamento de ${lbl}</div><div class="value" style="color:#2E7D46">${fmt(totalIn)}</div></div>
      <div class="stat-card"><div class="label">Despesas de ${lbl}</div><div class="value" style="color:#B23434">${fmt(totalOut)}</div></div>
      <div class="stat-card"><div class="label">Resultado de ${lbl}</div><div class="value" style="color:${resultado < 0 ? "#B23434" : "#2E7D46"}">${fmt(resultado)}</div></div>
      <div class="stat-card"><div class="label">Lucro de ${lbl} (% sobre as entradas)</div><div class="value" style="color:${totalIn > 0 ? (resultado < 0 ? "#B23434" : "#2E7D46") : "var(--muted)"}">${totalIn > 0 ? fmtPct((resultado / totalIn) * 100) : "N/D"}</div>
        <div class="hint" style="margin:4px 0 0">${totalIn > 0 ? (resultado < 0 ? "prejuízo no mês" : "resultado ÷ entradas × 100") : "sem entradas no mês"}</div></div>
      <div class="stat-card"><div class="label">Resultado projetado</div><div class="value" style="color:${resultado + stockValue < 0 ? "#B23434" : "#2E7D46"}">${fmt(resultado + stockValue)}</div>
        <div class="hint" style="margin:4px 0 0">Resultado de ${lbl} (${fmt(resultado)}) + estoque restante vendido (${stockUnits} un. = ${fmt(stockValue)}) — estoque de ${lbl}</div></div>
      ${CARD_NAMES.map(stmtCard).join("")}
    </div>
    <p class="hint">As despesas do mês já incluem as parcelas de cartão que vencem neste mês. Pagar a fatura apenas marca como paga — não soma de novo.</p>

    ${open ? renderStatementDetail(open, key) : ""}

    <div id="financeFormArea"></div>

    <div class="admin-card">
      <h2>Resumo anual — ${year}</h2>
      <table>
        <thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Resultado</th><th>Lucro (%)</th></tr></thead>
        <tbody>
          ${annual.map(m => `<tr style="${m.k === key ? "background:#FDEEF3;cursor:pointer" : "cursor:pointer"}" onclick="setFinMonth('${m.k}')">
            <td>${m.name}</td><td style="color:#2E7D46">${fmt(m.inn)}</td><td style="color:#B23434">${fmt(m.out)}</td>
            <td><strong style="color:${m.res < 0 ? "#B23434" : "#2E7D46"}">${fmt(m.res)}</strong></td>
            <td>${m.inn > 0 ? `<strong style="color:${m.res < 0 ? "#B23434" : "#2E7D46"}">${fmtPct((m.res / m.inn) * 100)}</strong>` : `<span style="color:var(--muted)">N/D</span>`}</td></tr>`).join("")}
          <tr style="font-weight:800;border-top:2px solid var(--border)"><td>Total anual</td><td style="color:#2E7D46">${fmt(sum.inn)}</td><td style="color:#B23434">${fmt(sum.out)}</td>
            <td style="color:${sum.inn - sum.out < 0 ? "#B23434" : "#2E7D46"}">${fmt(sum.inn - sum.out)}</td>
            <td>${sum.inn > 0 ? `<span style="color:${sum.inn - sum.out < 0 ? "#B23434" : "#2E7D46"}">${fmtPct(((sum.inn - sum.out) / sum.inn) * 100)}</span>` : `<span style="color:var(--muted)">N/D</span>`}</td></tr>
        </tbody>
      </table>
      <p class="hint" style="margin-top:8px">Clique em um mês para abrir o painel dele.</p>
    </div>

    ${futureKeys.length ? `<div class="admin-card">
      <h2>Faturas futuras (parcelas já lançadas)</h2>
      <table><thead><tr><th>Mês</th>${CARD_NAMES.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>
        ${futureKeys.map(k => `<tr style="cursor:pointer" onclick="setFinMonth('${k}')"><td>${monthGroupLabel(k)}</td>${CARD_NAMES.map(c => `<td>${fmt(statementTotal(c, k))}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div>` : ""}

    <div class="admin-card">
      <h2>Faturamento — ${lbl}</h2>
      ${revenueM.length ? `
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Origem</th><th>Valor</th><th></th></tr></thead>
          <tbody>
            ${revenueM.map(r => `
              <tr>
                <td>${new Date(r.entry_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                <td>${r.order_id && admin.data.finOrders[r.order_id] ? orderIdentHtml(admin.data.finOrders[r.order_id].order_number, admin.data.finOrders[r.order_id].customer_name) : r.description}</td>
                <td><span class="badge-status ${r.source === "site" ? "confirmed" : "pending"}">${r.source === "site" ? "Automático (site)" : "Manual"}</span></td>
                <td><strong style="color:#2E7D46">${fmt(r.amount)}</strong></td>
                <td><button class="btn btn-outline btn-sm" onclick="deleteRevenueEntry('${r.id}')">Excluir</button></td>
              </tr>`).join("")}
          </tbody>
        </table>` : `<p class="center-msg">Nenhuma receita em ${lbl}.</p>`}
    </div>

    <div class="admin-card">
      <h2>Despesas — ${lbl}</h2>
      ${expensesM.length ? `
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Pagamento</th><th>Valor</th><th></th></tr></thead>
          <tbody>
            ${expensesM.map(e => `
              <tr>
                <td>${new Date(e.entry_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                <td>${e.description}</td>
                <td>${e.category || "—"}</td>
                <td>${e.payment_method ? PAYMENT_METHOD_LABEL[e.payment_method] + (e.card_name ? ` (${e.card_name})` : "") : "—"}</td>
                <td><strong style="color:#B23434">${fmt(e.amount)}</strong></td>
                <td><button class="btn btn-outline btn-sm" onclick="deleteExpenseEntry('${e.id}')">Excluir</button></td>
              </tr>`).join("")}
          </tbody>
        </table>` : `<p class="center-msg">Nenhuma despesa direta em ${lbl}.</p>`}
      <p class="hint" style="margin-top:8px">Compras no cartão aparecem nas faturas acima, por mês de competência da parcela.</p>
    </div>
  `;
}

function renderStatementDetail(card, key) {
  const items = statementItems(card, key).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const tot = items.reduce((t, i) => t + i.amount, 0), paid = statementPaid(card, key);
  return `<div class="admin-card" style="border-left:4px solid #6A2CC4">
    <div class="admin-topbar" style="margin-bottom:8px"><h2 style="margin:0">Fatura ${card} — ${monthGroupLabel(key)}</h2>
      <div style="display:flex;gap:8px;align-items:center"><strong style="color:#6A2CC4;font-size:18px">${fmt(tot)}</strong>
      ${tot > 0 ? `<button class="btn ${paid ? "btn-outline" : "btn-pink"} btn-sm" onclick="toggleStatementPaid('${card}', '${key}', ${!paid})">${paid ? "✓ Paga — desfazer" : "Marcar como paga"}</button>` : ""}</div></div>
    ${items.length ? `<table><thead><tr><th>Compra</th><th>Data da compra</th><th>Parcela</th><th>Valor da parcela</th><th>Referência</th><th></th></tr></thead><tbody>
      ${items.map(i => `<tr><td>${i.desc}</td><td>${i.date ? new Date(i.date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
        <td>${i.kind === "legacy" ? "à vista" : `${i.n}/${i.total}`}</td><td><strong>${fmt(i.amount)}</strong></td><td>${monthGroupLabel(key)}</td>
        <td style="white-space:nowrap">${i.kind === "inst" ? `<button class="btn btn-outline btn-sm" onclick="openCardPurchaseForm('${i.purchaseId}')">Editar compra</button> <button class="btn btn-outline btn-sm" onclick="deleteCardPurchase('${i.purchaseId}')">Excluir compra</button>` : `<button class="btn btn-outline btn-sm" onclick="deleteExpenseEntry('${i.id}')">Excluir</button>`}</td></tr>`).join("")}
    </tbody></table>` : `<p class="center-msg">Nenhuma compra nesta fatura.</p>`}
    <p class="hint" style="margin-top:8px">Editar ou excluir uma compra parcelada atualiza/remove todas as parcelas dela.</p></div>`;
}

async function toggleStatementPaid(card, key, paid) {
  const { error } = await sb.from("card_statement_payments").upsert({ card_name: card, ref_month: key + "-01", paid, paid_at: paid ? new Date().toISOString().slice(0, 10) : null }, { onConflict: "card_name,ref_month" });
  if (error) { alert("Não foi possível salvar: " + (error.message || "")); return; }
  await loadFinanceiro(document.getElementById("adminMain"));
}
async function deleteCardPurchase(id) {
  if (!confirm("Excluir esta compra e TODAS as parcelas dela (em todos os meses)?")) return;
  const { error } = await sb.from("card_purchases").delete().eq("id", id);
  if (error) { alert("Não foi possível excluir: " + (error.message || "")); return; }
  await loadFinanceiro(document.getElementById("adminMain"));
}
function cardPreview() {
  const total = Number(document.getElementById("cpTotal").value), n = document.getElementById("cpInst").value === "sim" ? Math.max(2, parseInt(document.getElementById("cpN").value, 10) || 2) : 1;
  const date = document.getElementById("cpDate").value, closed = document.getElementById("cpClosed").value === "sim";
  const box = document.getElementById("cpPreview"); if (!box) return;
  document.getElementById("cpNWrap").style.display = n > 1 || document.getElementById("cpInst").value === "sim" ? "flex" : "none";
  if (!total || !date) { box.innerHTML = ""; return; }
  const rows = buildInstallments("x", "x", date, total, n, closed);
  box.innerHTML = `<p class="hint" style="margin:8px 0 4px"><strong>Distribuição automática:</strong></p>` +
    rows.map(r => `<div class="dash-row"><span style="flex:1">${monthGroupLabel(r.ref_month.slice(0, 7))} — parcela ${r.number}/${r.total_installments}</span><strong>${fmt(r.amount)}</strong></div>`).join("");
}
function openCardPurchaseForm(purchaseId) {
  const p = purchaseId ? admin.data.cardPurchases.find(x => x.id === purchaseId) : null;
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("financeFormArea").innerHTML = `
    <div class="admin-card">
      <h2>${p ? "Editar compra no cartão" : "Compra no cartão de crédito"}</h2>
      <div class="form-grid">
        <label class="span-2">Descrição da compra<input id="cpDesc" value="${p ? escapeHtml(p.description) : ""}" placeholder="Ex: Embalagens"></label>
        <label>Data da compra<input type="date" id="cpDate" value="${p ? p.purchase_date : today}" onchange="cardPreview()"></label>
        <label>Cartão<select id="cpCard">${CARD_NAMES.map(c => `<option ${p && p.card_name === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
        <label>Valor total da compra (R$)<input type="number" step="0.01" min="0" id="cpTotal" value="${p ? p.total_amount : ""}" oninput="cardPreview()"></label>
        <label>Categoria (opcional)<input id="cpCat" value="${p && p.category ? escapeHtml(p.category) : ""}"></label>
        <label>Compra parcelada?<select id="cpInst" onchange="cardPreview()"><option value="nao">Não</option><option value="sim" ${p && p.installments > 1 ? "selected" : ""}>Sim</option></select></label>
        <label id="cpNWrap" style="display:none">Quantidade de parcelas<input type="number" min="2" max="60" id="cpN" value="${p && p.installments > 1 ? p.installments : 2}" oninput="cardPreview()"></label>
        <label>Fatura fechada?<select id="cpClosed" onchange="cardPreview()"><option value="nao">Não (cobra no mês da compra)</option><option value="sim" ${p && p.statement_closed ? "selected" : ""}>Sim (cobra no mês seguinte)</option></select></label>
      </div>
      <div id="cpPreview"></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveCardPurchase(${p ? `'${p.id}'` : "null"})">Salvar</button>
        <button class="btn btn-outline" onclick="document.getElementById('financeFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>`;
  cardPreview();
  document.getElementById("financeFormArea").scrollIntoView({ behavior: "smooth" });
}
async function saveCardPurchase(id) {
  const description = document.getElementById("cpDesc").value.trim();
  const purchase_date = document.getElementById("cpDate").value;
  const card_name = document.getElementById("cpCard").value;
  const total_amount = Math.round(Number(document.getElementById("cpTotal").value) * 100) / 100;
  const installments = document.getElementById("cpInst").value === "sim" ? Math.max(2, parseInt(document.getElementById("cpN").value, 10) || 2) : 1;
  const statement_closed = document.getElementById("cpClosed").value === "sim";
  const category = document.getElementById("cpCat").value.trim() || null;
  if (!description || !purchase_date || !total_amount) { alert("Preencha descrição, data e valor."); return; }
  const row = { description, purchase_date, card_name, total_amount, installments, statement_closed, category };
  let pid = id;
  if (id) {
    const { error } = await sb.from("card_purchases").update(row).eq("id", id);
    if (error) { alert("Não foi possível salvar: " + (error.message || "")); return; }
    const del = await sb.from("card_installments").delete().eq("purchase_id", id);
    if (del.error) { alert("Não foi possível atualizar as parcelas: " + (del.error.message || "")); return; }
  } else {
    const { data, error } = await sb.from("card_purchases").insert(row).select().single();
    if (error || !data) { alert("Não foi possível salvar: " + ((error && error.message) || "") + "\n\nRode o script add_cartoes_parcelas.sql no Supabase."); return; }
    pid = data.id;
  }
  const { error: iErr } = await sb.from("card_installments").insert(buildInstallments(pid, card_name, purchase_date, total_amount, installments, statement_closed));
  if (iErr) { alert("A compra foi salva mas as parcelas falharam: " + (iErr.message || "")); }
  document.getElementById("financeFormArea").innerHTML = "";
  await loadFinanceiro(document.getElementById("adminMain"));
}

function updateFinanceFormFields() {
  const type = document.getElementById("feType").value;
  const payMethod = document.getElementById("fePayment") ? document.getElementById("fePayment").value : "";
  document.getElementById("fePaymentWrap").style.display = type === "despesa" ? "flex" : "none";
  document.getElementById("feCardWrap").style.display = (type === "despesa" && payMethod === "credito") ? "flex" : "none";
}

function openFinanceForm() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("financeFormArea").innerHTML = `
    <div class="admin-card">
      <h2>Lançamento financeiro manual</h2>
      <div class="form-grid">
        <label>Tipo
          <select id="feType" onchange="updateFinanceFormFields()">
            <option value="receita">Receita (venda fora do site)</option>
            <option value="despesa">Despesa</option>
          </select>
        </label>
        <label>Data<input type="date" id="feDate" value="${today}"></label>
        <label>Categoria (opcional, só despesa)<input type="text" id="feCategory" placeholder="Ex: Ingredientes, Embalagem"></label>
        <label>Valor (R$)<input type="number" step="0.01" min="0" id="feAmount" placeholder="0,00"></label>
        <label id="fePaymentWrap" style="display:none">Forma de pagamento
          <select id="fePayment" onchange="updateFinanceFormFields()">
            <option value="">—</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
          </select>
        </label>
        <label id="feCardWrap" style="display:none">Cartão
          <select id="feCard">
            ${CARD_NAMES.map(c => `<option>${c}</option>`).join("")}
          </select>
        </label>
        <label class="span-2">Descrição<input type="text" id="feDescription" placeholder="Ex: Venda WhatsApp - Ana Paula"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveFinanceEntry()">Salvar</button>
        <button class="btn btn-outline" onclick="document.getElementById('financeFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>
  `;
}

async function saveFinanceEntry() {
  const type = document.getElementById("feType").value;
  const entry_date = document.getElementById("feDate").value;
  const description = document.getElementById("feDescription").value.trim();
  const amount = Number(document.getElementById("feAmount").value);
  if (!entry_date || !description || !amount) { alert("Preencha data, descrição e valor."); return; }
  if (type === "despesa" && document.getElementById("fePayment").value === "credito") {
    openCardPurchaseForm(); // compra no cartão tem fluxo próprio (parcelas)
    document.getElementById("cpDesc").value = description; document.getElementById("cpDate").value = entry_date;
    document.getElementById("cpTotal").value = amount; document.getElementById("cpCard").value = document.getElementById("feCard").value;
    document.getElementById("cpCat").value = document.getElementById("feCategory").value.trim(); cardPreview();
    return;
  }

  if (type === "receita") {
    const { error } = await sb.from("revenue_entries").insert({ entry_date, description, amount, source: "manual" });
    if (error) { console.error(error); alert("Não foi possível salvar a receita."); return; }
  } else {
    const category = document.getElementById("feCategory").value.trim() || null;
    const payment_method = document.getElementById("fePayment").value || null;
    const card_name = payment_method === "credito" ? document.getElementById("feCard").value : null;
    const { error } = await sb.from("expense_entries").insert({ entry_date, description, amount, category, payment_method, card_name });
    if (error) { console.error(error); alert("Não foi possível salvar a despesa."); return; }
  }
  document.getElementById("financeFormArea").innerHTML = "";
  await loadFinanceiro(document.getElementById("adminMain"));
}

async function deleteRevenueEntry(id) {
  if (!confirm("Excluir esta entrada do Faturamento? Se ela veio de um pedido, o pedido continua existindo.")) return;
  const { error } = await sb.from("revenue_entries").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir."); return; }
  await loadFinanceiro(document.getElementById("adminMain"));
}

async function deleteExpenseEntry(id) {
  if (!confirm("Excluir esta despesa?")) return;
  const { error } = await sb.from("expense_entries").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir."); return; }
  await loadFinanceiro(document.getElementById("adminMain"));
}

/* ---------------- ESTOQUE (ingredientes) ---------------- */

async function loadEstoque(main) {
  const [{ data: ingredients, error: iErr }, { data: movements, error: mErr }] = await Promise.all([
    sb.from("ingredients").select("*").order("name", { ascending: true }),
    sb.from("stock_movements").select("*, ingredients(name, unit)").order("created_at", { ascending: false }).limit(40),
  ]);
  if (iErr) throw iErr;
  if (mErr) throw mErr;
  admin.data.ingredients = ingredients || [];
  admin.data.stockMovements = movements || [];
  renderEstoque(main);
}

function renderEstoque(main) {
  const ingredients = admin.data.ingredients;
  const movements = admin.data.stockMovements;
  const valorTotalEstoque = ingredients.reduce((s, i) => s + Number(i.current_stock || 0) * Number(i.cost_per_unit || 0), 0);

  main.innerHTML = `
    <div class="admin-topbar">
      <h1>Estoque de Insumos</h1>
      <div style="display:flex;gap:8px">
        <button class="btn btn-danger" onclick="deleteAllIngredients()">Apagar tudo</button>
        <button class="btn btn-pink" onclick="openIngredientForm()">+ Novo ingrediente</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="label">Valor em estoque</div><div class="value" style="font-size:24px">${fmt(valorTotalEstoque)}</div></div>
      <div class="stat-card"><div class="label">Itens cadastrados</div><div class="value">${ingredients.length}</div></div>
      <div class="stat-card"><div class="label">Abaixo do mínimo</div><div class="value" style="color:#B23434">${ingredients.filter(i => isLowStock(i)).length}</div></div>
    </div>

    <div id="ingredientFormArea"></div>
    <div id="movementFormArea"></div>

    <div class="admin-card">
      <h2>Estoque</h2>
      <p class="hint">Tudo editável direto na tabela — altere o campo e clique em "Salvar" na linha.</p>
      ${ingredients.length ? `
        <table>
          <thead><tr><th>Ingrediente</th><th>Qtd. comprada</th><th>Unidade</th><th>Valor pago</th><th>Custo/un.</th><th>Atual</th><th>Mínimo</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${ingredients.map(i => {
              const low = isLowStock(i);
              return `
                <tr>
                  <td><input value="${i.name}" id="ing_name_${i.id}" style="border:1px solid var(--border);border-radius:7px;padding:6px;width:150px"></td>
                  <td><input type="number" step="0.01" value="${i.package_qty ?? ""}" id="ing_pkgqty_${i.id}" style="border:1px solid var(--border);border-radius:7px;padding:6px;width:90px"></td>
                  <td>
                    <select id="ing_unit_${i.id}" style="border:1px solid var(--border);border-radius:7px;padding:6px">
                      <option value="g" ${i.unit === "g" ? "selected" : ""}>g</option>
                      <option value="ml" ${i.unit === "ml" ? "selected" : ""}>ml</option>
                      <option value="uni" ${i.unit === "uni" ? "selected" : ""}>uni</option>
                    </select>
                  </td>
                  <td><input type="number" step="0.01" value="${i.package_cost ?? ""}" id="ing_pkgcost_${i.id}" style="border:1px solid var(--border);border-radius:7px;padding:6px;width:90px"></td>
                  <td>${fmt(i.cost_per_unit || 0)}/${i.unit}</td>
                  <td><input type="number" step="0.01" value="${i.current_stock}" id="ing_current_${i.id}" style="border:1px solid var(--border);border-radius:7px;padding:6px;width:90px"></td>
                  <td><input type="number" step="0.01" value="${i.min_stock}" id="ing_min_${i.id}" style="border:1px solid var(--border);border-radius:7px;padding:6px;width:90px"></td>
                  <td>${low ? `<span class="badge-status cancelled">Atenção — comprar</span>` : `<span class="badge-status completed">Normal</span>`}</td>
                  <td style="display:flex;gap:6px;flex-wrap:wrap">
                    <button class="btn btn-outline btn-sm" onclick="saveIngredientEdit('${i.id}')">Salvar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteIngredient('${i.id}')">Excluir</button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      ` : `<p class="center-msg">Nenhum ingrediente cadastrado ainda.</p>`}
    </div>

    <div class="admin-card">
      <h2>Registrar movimentação rápida</h2>
      <p class="hint">Atalho opcional — soma/subtrai do estoque atual e fica registrado no histórico abaixo. Você também pode editar "Atual" direto na tabela acima.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${ingredients.map(i => `
          <div style="display:flex;gap:4px">
            <button class="btn btn-outline btn-sm" onclick="openMovementForm('${i.id}', 'entrada')">+ ${i.name}</button>
            <button class="btn btn-outline btn-sm" onclick="openMovementForm('${i.id}', 'saida')">− ${i.name}</button>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="admin-card">
      <h2>Últimas movimentações</h2>
      ${movements.length ? `
        <table>
          <thead><tr><th>Data</th><th>Ingrediente</th><th>Tipo</th><th>Quantidade</th><th>Obs.</th></tr></thead>
          <tbody>
            ${movements.map(m => `
              <tr>
                <td>${new Date(m.movement_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                <td>${m.ingredients ? m.ingredients.name : "—"}</td>
                <td><span class="badge-status ${m.type === "entrada" ? "completed" : "cancelled"}">${m.type === "entrada" ? "Entrada" : "Saída"}</span></td>
                <td>${m.quantity} ${m.ingredients ? m.ingredients.unit : ""}</td>
                <td>${m.note || "—"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `<p class="center-msg">Nenhuma movimentação ainda.</p>`}
    </div>
  `;
}

async function saveIngredientEdit(id) {
  const name = document.getElementById(`ing_name_${id}`).value.trim();
  const unit = document.getElementById(`ing_unit_${id}`).value;
  const packageQty = Number(document.getElementById(`ing_pkgqty_${id}`).value) || null;
  const packageCost = Number(document.getElementById(`ing_pkgcost_${id}`).value) || null;
  const currentStock = Number(document.getElementById(`ing_current_${id}`).value) || 0;
  const minStock = Number(document.getElementById(`ing_min_${id}`).value) || 0;
  const costPerUnit = (packageQty && packageCost) ? packageCost / packageQty : null;

  const { error } = await sb.from("ingredients").update({
    name, unit, package_qty: packageQty, package_cost: packageCost,
    cost_per_unit: costPerUnit, current_stock: currentStock, min_stock: minStock,
  }).eq("id", id);
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  await loadEstoque(document.getElementById("adminMain"));
}

async function deleteIngredient(id) {
  if (!confirm("Excluir este ingrediente? Essa ação não pode ser desfeita.")) return;
  const { error } = await sb.from("ingredients").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir — verifique se ele não está sendo usado em alguma receita."); return; }
  await loadEstoque(document.getElementById("adminMain"));
}

async function deleteAllIngredients() {
  const ingredients = admin.data.ingredients;
  if (!ingredients.length) { alert("Não há nenhum ingrediente cadastrado."); return; }
  const digitado = prompt(`Isso vai apagar TODOS os ${ingredients.length} ingredientes do estoque, sem volta. Digite APAGAR pra confirmar:`);
  if (digitado !== "APAGAR") { if (digitado !== null) alert("Cancelado — o texto não bateu com \"APAGAR\"."); return; }
  const { error } = await sb.from("ingredients").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) { console.error(error); alert("Não foi possível apagar tudo: " + (error.message || JSON.stringify(error)) + " (provavelmente algum ingrediente está em uso numa receita)"); return; }
  await loadEstoque(document.getElementById("adminMain"));
}

function openIngredientForm() {
  document.getElementById("ingredientFormArea").innerHTML = `
    <div class="admin-card">
      <h2>Novo ingrediente</h2>
      <div class="form-grid">
        <label>Nome<input type="text" id="ingName" placeholder="Ex: Chocolate em gotas ao leite - genuine"></label>
        <label>Unidade
          <select id="ingUnit">
            <option value="g">g (gramas)</option>
            <option value="ml">ml</option>
            <option value="uni">uni (unidade)</option>
          </select>
        </label>
        <label>Tamanho do pacote comprado<input type="number" step="0.01" id="ingPackageQty" placeholder="Ex: 1000"></label>
        <label>Custo do pacote (R$)<input type="number" step="0.01" id="ingPackageCost" placeholder="Ex: 18.70"></label>
        <label>Estoque mínimo<input type="number" step="0.01" id="ingMinStock" placeholder="Ex: 500"></label>
        <label>Estoque atual (inicial)<input type="number" step="0.01" id="ingCurrentStock" placeholder="Ex: 0"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveIngredient()">Salvar</button>
        <button class="btn btn-outline" onclick="document.getElementById('ingredientFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>
  `;
}

async function saveIngredient() {
  const name = document.getElementById("ingName").value.trim();
  const unit = document.getElementById("ingUnit").value;
  const packageQty = Number(document.getElementById("ingPackageQty").value) || null;
  const packageCost = Number(document.getElementById("ingPackageCost").value) || null;
  const minStock = Number(document.getElementById("ingMinStock").value) || 0;
  const currentStock = Number(document.getElementById("ingCurrentStock").value) || 0;
  if (!name) { alert("Informe o nome do ingrediente."); return; }
  const costPerUnit = (packageQty && packageCost) ? packageCost / packageQty : null;

  const { error } = await sb.from("ingredients").insert({
    name, unit, package_qty: packageQty, package_cost: packageCost,
    cost_per_unit: costPerUnit, min_stock: minStock, current_stock: currentStock,
  });
  if (error) { console.error(error); alert("Não foi possível salvar o ingrediente."); return; }
  document.getElementById("ingredientFormArea").innerHTML = "";
  await loadEstoque(document.getElementById("adminMain"));
}

function openMovementForm(ingredientId, type) {
  const ing = admin.data.ingredients.find(i => i.id === ingredientId);
  if (!ing) return;
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("movementFormArea").innerHTML = `
    <div class="admin-card">
      <h2>${type === "entrada" ? "Registrar entrada" : "Registrar saída"} — ${ing.name}</h2>
      <p class="center-msg" style="margin:0 0 10px">Saldo atual: <strong>${ing.current_stock} ${ing.unit}</strong></p>
      <div class="form-grid">
        <label>Data<input type="date" id="movDate" value="${today}"></label>
        <label>Quantidade (${ing.unit})<input type="number" step="0.01" min="0.01" id="movQty"></label>
        <label>Observação (opcional)<input type="text" id="movNote"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveMovement('${ingredientId}', '${type}')">Salvar</button>
        <button class="btn btn-outline" onclick="document.getElementById('movementFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>
  `;
}

async function saveMovement(ingredientId, type) {
  const qty = Number(document.getElementById("movQty").value);
  const date = document.getElementById("movDate").value;
  const note = document.getElementById("movNote").value.trim();
  if (!qty || qty <= 0 || !date) { alert("Informe data e uma quantidade válida."); return; }

  const ing = admin.data.ingredients.find(i => i.id === ingredientId);
  const delta = type === "entrada" ? qty : -qty;
  const newStock = Math.max(0, Number(ing.current_stock) + delta);

  const { error: mErr } = await sb.from("stock_movements").insert({
    ingredient_id: ingredientId, movement_date: date, type, quantity: qty, note: note || null,
  });
  if (mErr) { console.error(mErr); alert("Não foi possível registrar a movimentação."); return; }

  const { error: uErr } = await sb.from("ingredients").update({ current_stock: newStock }).eq("id", ingredientId);
  if (uErr) { console.error(uErr); alert("Movimentação salva, mas não foi possível atualizar o saldo."); }

  document.getElementById("movementFormArea").innerHTML = "";
  await loadEstoque(document.getElementById("adminMain"));
}

/* ---------------- RESULTADOS ---------------- */

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

async function loadResultados(main) {
  const [{ data: orders, error: oErr }, { data: revenue, error: rErr }, { data: expenses, error: eErr }] = await Promise.all([
    sb.from("orders").select("id, total, status, items, created_at"),
    sb.from("revenue_entries").select("entry_date, amount"),
    sb.from("expense_entries").select("entry_date, amount"),
  ]);
  if (oErr) throw oErr;
  if (rErr) throw rErr;
  if (eErr) throw eErr;
  admin.data.resultOrders = orders || [];
  admin.data.resultRevenue = revenue || [];
  admin.data.resultExpenses = expenses || [];
  renderResultados(main);
}

function renderResultados(main) {
  const orders = admin.data.resultOrders.filter(o => o.status !== "cancelled");
  const revenue = admin.data.resultRevenue;
  const expenses = admin.data.resultExpenses;

  // agrupa por mês (AAAA-MM) — faturamento vem do Financeiro (site + manual),
  // despesas também vêm do Financeiro
  const months = {};
  function monthKey(dateStr) { return dateStr ? dateStr.slice(0, 7) : null; }
  function ensure(key) {
    if (!months[key]) months[key] = { faturamento: 0, gasto: 0 };
    return months[key];
  }

  revenue.forEach(r => {
    const key = monthKey(r.entry_date);
    if (key) ensure(key).faturamento += Number(r.amount || 0);
  });
  expenses.forEach(e => {
    const key = monthKey(e.entry_date);
    if (key) ensure(key).gasto += Number(e.amount || 0);
  });

  const sortedKeys = Object.keys(months).sort();

  // faturamento por produto/categoria — vem dos itens dos pedidos feitos pelo site
  // (cobre só as vendas feitas pelo site; vendas manuais no Financeiro não têm categoria)
  const byCategory = {};
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      const cat = item.category || item.product_name || "Outros";
      byCategory[cat] = (byCategory[cat] || 0) + Number(item.subtotal || 0);
    });
  });
  const categoryRows = Object.entries(byCategory).sort(([, a], [, b]) => b - a);

  const totalFaturamento = revenue.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalGasto = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalLucro = totalFaturamento - totalGasto;

  main.innerHTML = `
    <div class="admin-topbar"><h1>Resultados</h1></div>

    <div class="stat-grid">
      <div class="stat-card"><div class="label">Faturamento total</div><div class="value" style="color:#2E7D46">${fmt(totalFaturamento)}</div></div>
      <div class="stat-card"><div class="label">Gastos totais</div><div class="value" style="color:#B23434">${fmt(totalGasto)}</div></div>
      <div class="stat-card"><div class="label">Lucro total</div><div class="value">${fmt(totalLucro)}</div></div>
    </div>

    <div class="admin-card">
      <h2>Resumo por mês</h2>
      ${sortedKeys.length ? `
        <table>
          <thead><tr><th>Mês</th><th>Faturamento</th><th>Gasto</th><th>Lucro</th><th>Lucro %</th></tr></thead>
          <tbody>
            ${sortedKeys.map(key => {
              const [year, month] = key.split("-");
              const m = months[key];
              const lucro = m.faturamento - m.gasto;
              const pct = m.faturamento > 0 ? (lucro / m.faturamento) * 100 : 0;
              return `
                <tr>
                  <td>${MONTH_NAMES[Number(month) - 1]}/${year}</td>
                  <td style="color:#2E7D46">${fmt(m.faturamento)}</td>
                  <td style="color:#B23434">${fmt(m.gasto)}</td>
                  <td><strong>${fmt(lucro)}</strong></td>
                  <td>${pct.toFixed(1)}%</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      ` : `<p class="center-msg">Ainda não há pedidos ou lançamentos suficientes pra gerar o resumo.</p>`}
    </div>

    <div class="admin-card">
      <h2>Faturamento por produto</h2>
      ${categoryRows.length ? `
        <table>
          <thead><tr><th>Produto</th><th>Faturamento</th></tr></thead>
          <tbody>
            ${categoryRows.map(([cat, val]) => `<tr><td>${cat}</td><td style="color:#2E7D46">${fmt(val)}</td></tr>`).join("")}
          </tbody>
        </table>
      ` : `<p class="center-msg">Nenhum item de pedido encontrado ainda.</p>`}
    </div>

    <p class="hint" style="text-align:center">Faturamento e despesas vêm do Financeiro (a receita entra sozinha quando um pedido do site é concluído; o resto é lançado manualmente). O quadro "faturamento por produto" cobre só as vendas feitas pelo site. Este relatório é calculado automaticamente — não precisa lançar nada aqui.</p>
  `;
}

/* ---------------- ESTOQUE DE PRODUTOS (delivery, movido por vendas) ---------------- */

function spToday() { return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }); }
async function loadEstoqueProdutos(main) {
  // vira o mês: transfere automaticamente as sobras do(s) mês(es) anterior(es) — uma única vez por período
  const ro = await sb.rpc("rollover_delivery_stock");
  admin.data.rolloverOk = !ro.error;
  admin.data.rolloverCount = ro.error ? 0 : Number(ro.data || 0);
  const tr = await sb.from("delivery_stock_transfers").select("*").order("transferred_at", { ascending: false });
  admin.data.dTransfers = tr.error ? [] : (tr.data || []);
  if (!admin.data.stockMonth) admin.data.stockMonth = spToday().slice(0, 7);
  const [pr, ba, sa, st, cu, wo] = await Promise.all([
    sb.from("products").select("*").eq("category", "delivery").order("sort_order").order("name"),
    sb.from("delivery_stock_batches").select("*").order("produced_at", { ascending: false }),
    sb.from("delivery_sales").select("*, orders(order_number, customer_name)").order("created_at", { ascending: false }),
    sb.from("delivery_settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("customers").select("id, full_name, email, phone").order("full_name"),
    sb.from("delivery_stock_writeoffs").select("*").order("written_off_at", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  admin.data.woOk = !wo.error;                       // false = script add_baixa_congelados_planejamento.sql ainda não foi rodado
  admin.data.dWriteoffs = wo.error ? [] : (wo.data || []);
  admin.data.dSettings = st.error ? null : st.data;
  admin.data.dCustomers = cu.error ? [] : (cu.data || []);
  if (pr.error) throw pr.error;
  if (ba.error) throw ba.error;
  if (sa.error) throw sa.error;
  admin.data.dProducts = pr.data || [];
  admin.data.dBatches = ba.data || [];
  admin.data.dSales = sa.data || [];
  renderEstoqueProdutos(main);
}

function deliveryStockRows() {
  return admin.data.dProducts.map(p => {
    const bs = admin.data.dBatches.filter(b => b.product_id === p.id);
    const ss = admin.data.dSales.filter(x => x.product_id === p.id && !x.reversed);
    const produced = bs.reduce((t, b) => t + Number(b.quantity), 0);
    const sold = ss.reduce((t, x) => t + Number(x.quantity), 0);
    const wasted = (admin.data.dWriteoffs || []).filter(w => w.product_id === p.id).reduce((t, w) => t + Number(w.quantity), 0);
    const invoiced = ss.reduce((t, x) => t + Number(x.quantity) * Number(x.unit_price), 0);
    const stock = produced - sold - wasted;
    return { p, produced, sold, wasted, stock, invoiced, potential: Math.max(stock, 0) * Number(p.price) };
  });
}

/* Estoque por mês: saldo anterior (transferido) + produzido − vendido (líquido de estornos) − transferido = saldo do mês */
function stockMonthRows(key) {
  const inM = d => String(d || "").slice(0, 7) === key;
  const spDate = ts => ts ? new Date(ts).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) : "";
  return admin.data.dProducts.map(p => {
    const tIn = admin.data.dTransfers.filter(t => t.product_id === p.id && inM(t.to_month)).reduce((t, x) => t + Number(x.quantity), 0);
    const tOut = admin.data.dTransfers.filter(t => t.product_id === p.id && inM(t.from_month)).reduce((t, x) => t + Number(x.quantity), 0);
    const produced = admin.data.dBatches.filter(b => b.product_id === p.id && inM(b.produced_at)).reduce((t, b) => t + Number(b.quantity), 0);
    const sales = admin.data.dSales.filter(x => x.product_id === p.id);
    const sold = sales.filter(x => inM(x.sold_at)).reduce((t, x) => t + Number(x.quantity), 0);
    const estornos = sales.filter(x => x.reversed && inM(spDate(x.reversed_at) || x.sold_at)).reduce((t, x) => t + Number(x.quantity), 0);
    const invoiced = sales.filter(x => !x.reversed && inM(x.sold_at)).reduce((t, x) => t + Number(x.quantity) * Number(x.unit_price), 0);
    const wasted = (admin.data.dWriteoffs || []).filter(w => w.product_id === p.id && inM(w.written_off_at)).reduce((t, w) => t + Number(w.quantity), 0);
    const stock = tIn + produced - sold + estornos - tOut - wasted;
    return { p, opening: tIn, produced, sold: sold - estornos, wasted, out: tOut, stock, invoiced, potential: Math.max(stock, 0) * Number(p.price) };
  });
}
function setStockMonth(key) { if (key) { admin.data.stockMonth = key; saveNav(); renderEstoqueProdutos(document.getElementById("adminMain")); } }
function setStockYearMonth() { setStockMonth(`${document.getElementById("skYear").value}-${document.getElementById("skMon").value}`); }
function renderStockTransfers(key) {
  const list = admin.data.dTransfers.filter(t => String(t.to_month).slice(0, 7) === key || String(t.from_month).slice(0, 7) === key);
  const nameOf = id => (admin.data.dProducts.find(p => p.id === id) || {}).name || "—";
  const mlabel = d => monthGroupLabel(String(d).slice(0, 7));
  return `<div class="admin-card"><h2>Transferências de saldo — ${monthGroupLabel(key)}</h2>
    ${!admin.data.rolloverOk ? `<div class="error-box">Para a transferência automática entre meses, rode o script <strong>add_melhorias_v3.sql</strong> no Supabase.</div>` : ""}
    ${admin.data.rolloverCount > 0 ? `<p class="hint" style="color:#2E7D46"><strong>${admin.data.rolloverCount} saldo(s) foram transferidos automaticamente agora (virada de mês).</strong></p>` : ""}
    ${list.length ? `<table><thead><tr><th>Produto</th><th>Quantidade</th><th>Mês de origem</th><th>Mês de destino</th><th>Data da transferência</th></tr></thead><tbody>
      ${list.map(t => `<tr><td>${nameOf(t.product_id)}</td><td><strong>${t.quantity}</strong></td><td>${mlabel(t.from_month)}</td><td>${mlabel(t.to_month)}</td><td>${new Date(t.transferred_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td></tr>`).join("")}
    </tbody></table>` : `<p class="hint">Nenhuma transferência envolvendo ${monthGroupLabel(key)}.</p>`}
    <p class="hint" style="margin-top:8px">Ao virar o mês, as sobras passam para o mês novo e o saldo do mês anterior fica zerado. O histórico de vendas e levas não é alterado.</p></div>`;
}

function renderEstoqueProdutos(main) {
  const skey = admin.data.stockMonth;
  const rows = stockMonthRows(skey);
  const totInv = rows.reduce((t, r) => t + r.invoiced, 0);
  const totPot = rows.reduce((t, r) => t + r.potential, 0);
  const recent = admin.data.dSales.filter(x => String(x.sold_at || "").slice(0, 7) === skey);
  const monthBatches = admin.data.dBatches.filter(b => String(b.produced_at || "").slice(0, 7) === skey);
  const [sy, sm] = skey.split("-");
  const sNow = new Date().getFullYear(); const sYears = []; for (let y = Math.min(sNow - 2, Number(sy)); y <= Math.max(sNow + 1, Number(sy)); y++) sYears.push(y);
  const nameOf = id => (admin.data.dProducts.find(p => p.id === id) || {}).name || "—";
  main.innerHTML = `
    <div class="admin-topbar"><h1>Estoque de Produtos</h1>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline" onclick="openQuickSale()">Venda rápida</button>
        <button class="btn btn-outline" onclick="openWriteoffForm()">Baixa por perda/vencimento</button>
        <button class="btn btn-pink" onclick="openStockBatchForm()">+ Nova leva</button>
      </div>
    </div>
    ${renderDeliverySwitch()}
    <div id="notifyArea">${admin.data.showNotify ? renderNotifyPanel() : ""}</div>
    <p class="hint">Produtos cadastrados em Produtos → Delivery. Toda venda dá baixa no estoque: pedidos do site e vendas feitas por fora (use <strong>Venda rápida</strong>) — cancelar ou excluir o pedido devolve o produto.</p>
    <div id="stockFormArea"></div>
    <div class="admin-card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <button class="btn btn-outline btn-sm" onclick="setStockMonth(shiftMonth('${skey}', -1))">‹</button>
      <select id="skMon" onchange="setStockYearMonth()">${MONTH_NAMES_CAL.map((n, i) => `<option value="${String(i + 1).padStart(2, "0")}" ${String(i + 1).padStart(2, "0") === sm ? "selected" : ""}>${n}</option>`).join("")}</select>
      <select id="skYear" onchange="setStockYearMonth()">${sYears.map(y => `<option ${y === Number(sy) ? "selected" : ""}>${y}</option>`).join("")}</select>
      <button class="btn btn-outline btn-sm" onclick="setStockMonth(shiftMonth('${skey}', 1))">›</button>
      <button class="btn btn-outline btn-sm" onclick="setStockMonth(spToday().slice(0,7))">Mês atual</button>
      <strong style="margin-left:6px">Estoque de ${monthGroupLabel(skey)}</strong>
    </div>
    <div class="admin-card">
      <p class="hint" style="margin:0">Faturado: <strong style="color:#2E7D46">${fmt(totInv)}</strong> · Ainda a faturar (estoque × preço): <strong>${fmt(totPot)}</strong></p>
    </div>
    <div class="admin-card">
      ${rows.length ? `<table>
        <thead><tr><th>Produto</th><th>Saldo anterior</th><th>Produzido</th><th>Vendido</th><th>Perdas</th><th>Transferido</th><th>Estoque</th><th>Preço</th><th>Faturado</th><th>A faturar</th></tr></thead>
        <tbody>${rows.map(r => `<tr>
          <td><strong>${r.p.name}</strong></td><td>${r.opening}</td><td>${r.produced}</td><td>${r.sold}</td><td style="color:${r.wasted ? "#B23434" : "inherit"}">${r.wasted ? `−${r.wasted}` : 0}</td><td>${r.out ? `−${r.out}` : 0}</td>
          <td style="color:${r.stock <= 0 ? "#B23434" : "var(--ink)"}"><strong>${r.stock}</strong></td>
          <td>${fmt(r.p.price)}</td><td style="color:#2E7D46">${fmt(r.invoiced)}</td><td>${fmt(r.potential)}</td></tr>`).join("")}
        </tbody></table>` : `<p class="center-msg">Cadastre primeiro os produtos na aba Produtos → Delivery.</p>`}
    </div>
    ${typeof renderValidityCard === "function" ? renderValidityCard() : ""}
    ${typeof renderWasteCard === "function" ? renderWasteCard(skey) : ""}
    ${renderStockTransfers(skey)}
    <div class="admin-card">
      <h2>Movimentações — ${monthGroupLabel(skey)}</h2>
      ${recent.length ? `<table><thead><tr><th>Data</th><th>Produto</th><th>Qtd</th><th>Valor</th><th>Origem</th><th></th></tr></thead><tbody>
        ${recent.map(x => `<tr style="${x.reversed ? "background:#FDECEC;color:#8A3A3A" : ""}"><td>${new Date(x.sold_at + "T00:00:00").toLocaleDateString("pt-BR")}</td><td>${nameOf(x.product_id)}</td>
          <td>${x.reversed ? `+${x.quantity} <small>(voltou ao estoque)</small>` : x.quantity}</td>
          <td>${x.reversed ? `<s>${fmt(Number(x.quantity) * Number(x.unit_price))}</s>` : fmt(Number(x.quantity) * Number(x.unit_price))}</td>
          <td>${x.orders ? orderIdentHtml(x.orders.order_number, x.orders.customer_name) : "Venda avulsa (antiga)"}${x.reversed ? ` <span class="badge cancelled">ESTORNO · Cancelado</span>` : ""}</td>
          <td>${!x.order_id ? `<button class="btn btn-outline btn-sm" onclick="deleteStockSale('${x.id}')">Excluir</button>` : ""}</td></tr>`).join("")}
      </tbody></table>` : `<p class="center-msg">Nenhuma venda em ${monthGroupLabel(skey)}.</p>`}
    </div>
    <div class="admin-card">
      <h2>Levas produzidas — ${monthGroupLabel(skey)}</h2>
      ${monthBatches.length ? `<table><thead><tr><th>Data</th><th>Produto</th><th>Qtd</th><th>Valor un.</th><th>Validade</th><th></th></tr></thead><tbody>
        ${monthBatches.map(b => `<tr><td>${new Date(b.produced_at + "T00:00:00").toLocaleDateString("pt-BR")}</td><td>${nameOf(b.product_id)}${b.origin === "descongelado" ? ` <span class="badge">descongelado</span>` : ""}</td><td>${b.quantity}</td><td>${fmt(b.unit_price)}</td><td>${b.expires_at ? new Date(b.expires_at + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
          <td style="display:flex;gap:6px"><button class="btn btn-outline btn-sm" onclick="openStockBatchForm('${b.id}');window.scrollTo(0,0)">Editar</button><button class="btn btn-danger btn-sm" onclick="deleteStockBatch('${b.id}')">Excluir</button></td></tr>`).join("")}
      </tbody></table>` : `<p class="center-msg">Nenhuma leva em ${monthGroupLabel(skey)}.</p>`}
    </div>
  `;
}

function stockProductOptions() {
  return admin.data.dProducts.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name}</option>`).join("");
}
function stockFillPrice() {
  const sel = document.getElementById("stProduct");
  const opt = sel && sel.options[sel.selectedIndex];
  if (opt) document.getElementById("stPrice").value = opt.dataset.price || "";
}

function openStockBatchForm(id) {
  if (!admin.data.dProducts.length) { alert("Cadastre antes um produto em Produtos → Delivery."); return; }
  const b = id ? admin.data.dBatches.find(x => x.id === id) : null;
  document.getElementById("stockFormArea").innerHTML = `
    <div class="admin-card"><h2>${b ? "Editar leva" : "Nova leva"}</h2>
      <div class="form-grid">
        <label>Produto<select id="stProduct" onchange="stockFillPrice()">${stockProductOptions()}</select></label>
        <label>Quantidade produzida<input type="number" min="1" step="1" id="stQty" value="${b ? b.quantity : ""}"></label>
        <label>Valor de venda (R$)<input type="number" min="0" step="0.01" id="stPrice" value="${b ? b.unit_price : ""}"></label>
        <label>Data<input type="date" id="stDate" value="${b ? b.produced_at : new Date().toISOString().slice(0, 10)}"></label>
        <label>Validade (opcional)<input type="date" id="stExpires" value="${b && b.expires_at ? b.expires_at : ""}"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveStockBatch('${id || ""}')">Salvar</button>
        <button class="btn btn-outline" onclick="document.getElementById('stockFormArea').innerHTML=''">Cancelar</button>
      </div></div>`;
  if (b) document.getElementById("stProduct").value = b.product_id; else stockFillPrice();
}

async function saveStockBatch(id) {
  const product_id = document.getElementById("stProduct").value;
  const quantity = parseInt(document.getElementById("stQty").value);
  const unit_price = Number(document.getElementById("stPrice").value) || 0;
  const produced_at = document.getElementById("stDate").value;
  const expEl = document.getElementById("stExpires");
  const expires_at = expEl && expEl.value ? expEl.value : null;
  if (!product_id || !quantity || quantity <= 0) { alert("Informe o produto e a quantidade."); return; }
  if (id) {
    const row = deliveryStockRows().find(r => r.p.id === product_id);
    const old = admin.data.dBatches.find(x => x.id === id);
    const newStock = (row ? row.stock : 0) - (old && old.product_id === product_id ? Number(old.quantity) : 0) + quantity;
    if (newStock < 0 && !confirm("Com essa quantidade o estoque ficaria negativo (já foi vendido mais do que isso). Salvar mesmo assim?")) return;
  }
  const row = { product_id, quantity, unit_price, produced_at };
  if (expires_at || id) row.expires_at = expires_at;     // coluna criada por add_baixa_congelados_planejamento.sql
  const { error } = id
    ? await sb.from("delivery_stock_batches").update(row).eq("id", id)
    : await sb.from("delivery_stock_batches").insert(row);
  if (error) { console.error(error); alert(/expires_at/.test(error.message || "") ? "Para guardar a validade, rode primeiro o script add_baixa_congelados_planejamento.sql no Supabase." : "Não foi possível salvar: " + (error.message || "")); return; }
  // o preço informado passa a ser o preço do produto no delivery
  await sb.from("products").update({ price: unit_price }).eq("id", product_id);
  await loadEstoqueProdutos(document.getElementById("adminMain"));
}

async function deleteStockBatch(id) {
  if (!confirm("Excluir esta leva? O estoque desse produto diminui.")) return;
  const { error } = await sb.from("delivery_stock_batches").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir."); return; }
  await loadEstoqueProdutos(document.getElementById("adminMain"));
}

function openStockSaleForm() {
  if (!admin.data.dProducts.length) { alert("Cadastre antes um produto em Produtos → Delivery."); return; }
  document.getElementById("stockFormArea").innerHTML = `
    <div class="admin-card"><h2>Registrar venda fora do site</h2>
      <div class="form-grid">
        <label>Produto<select id="stProduct" onchange="stockFillPrice()">${stockProductOptions()}</select></label>
        <label>Quantidade<input type="number" min="1" step="1" id="stQty"></label>
        <label>Valor unitário (R$)<input type="number" min="0" step="0.01" id="stPrice"></label>
        <label>Data<input type="date" id="stDate" value="${new Date().toISOString().slice(0, 10)}"></label>
      </div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="stRevenue" checked style="width:auto"> Lançar no Financeiro (Faturamento)</label>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveStockSale()">Registrar</button>
        <button class="btn btn-outline" onclick="document.getElementById('stockFormArea').innerHTML=''">Cancelar</button>
      </div></div>`;
  stockFillPrice();
}

async function saveStockSale() {
  const product_id = document.getElementById("stProduct").value;
  const quantity = parseInt(document.getElementById("stQty").value);
  const unit_price = Number(document.getElementById("stPrice").value) || 0;
  const sold_at = document.getElementById("stDate").value;
  if (!product_id || !quantity || quantity <= 0) { alert("Informe o produto e a quantidade."); return; }
  const row = deliveryStockRows().find(r => r.p.id === product_id);
  if (row && quantity > row.stock && !confirm(`Só há ${row.stock} em estoque. Registrar mesmo assim?`)) return;
  let revenue_entry_id = null;
  if (document.getElementById("stRevenue").checked && unit_price > 0) {
    const { data: rev, error: rErr } = await sb.from("revenue_entries").insert({
      entry_date: sold_at, description: `Venda delivery: ${row ? row.p.name : ""} (${quantity}x)`,
      amount: quantity * unit_price, source: "manual",
    }).select("id").single();
    if (rErr) { console.error(rErr); alert("Não foi possível lançar no Financeiro: " + (rErr.message || "")); return; }
    revenue_entry_id = rev.id;
  }
  const { error } = await sb.from("delivery_sales").insert({ product_id, quantity, unit_price, source: "manual", sold_at, revenue_entry_id });
  if (error) {
    console.error(error);
    if (revenue_entry_id) await sb.from("revenue_entries").delete().eq("id", revenue_entry_id);
    alert("Não foi possível registrar: " + (error.message || "")); return;
  }
  await loadEstoqueProdutos(document.getElementById("adminMain"));
}

async function deleteStockSale(id) {
  if (!confirm("Excluir esta venda? O estoque volta e o lançamento no Financeiro também sai.")) return;
  const sale = admin.data.dSales.find(x => x.id === id);
  if (sale && sale.revenue_entry_id) await sb.from("revenue_entries").delete().eq("id", sale.revenue_entry_id);
  const { error } = await sb.from("delivery_sales").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir."); return; }
  await loadEstoqueProdutos(document.getElementById("adminMain"));
}

/* ---------------- RECEITAS ---------------- */

const YIELD_UNITS = ["g", "kg", "ml", "l", "unidade"];

async function loadReceitas(main) {
  const [{ data: recipes, error: rErr }, { data: ingredients, error: iErr }] = await Promise.all([
    sb.from("recipes").select("*, recipe_ingredients(*, ingredients(name, unit, cost_per_unit))").order("name", { ascending: true }),
    sb.from("ingredients").select("*").order("name", { ascending: true }),
  ]);
  if (rErr) throw rErr;
  if (iErr) throw iErr;
  admin.data.recipes = recipes || [];
  admin.data.ingredients = ingredients || [];
  renderReceitas(main);
}

function recipeCost(recipe) {
  return (recipe.recipe_ingredients || []).reduce((s, ri) => {
    const cpu = ri.ingredients ? Number(ri.ingredients.cost_per_unit || 0) : 0;
    return s + cpu * Number(ri.quantity);
  }, 0);
}
function recipeUnitCost(recipe) {
  const cost = recipeCost(recipe);
  return recipe.yield_qty > 0 ? cost / recipe.yield_qty : 0;
}

function renderReceitas(main) {
  const recipes = admin.data.recipes;
  main.innerHTML = `
    <div class="admin-topbar"><h1>Receitas</h1><button class="btn btn-pink" onclick="openRecipeForm()">+ Nova receita</button></div>
    <p class="hint">Ingredientes usados vêm sempre do Cadastro de Ingredientes — o custo é calculado sozinho.</p>
    <div id="recipeFormArea"></div>
    <div class="admin-card">
      ${recipes.length ? `
        <table>
          <thead><tr><th>Receita</th><th>Rendimento</th><th>Custo total</th><th>Custo por unidade</th><th></th></tr></thead>
          <tbody>
            ${recipes.map(r => `
                <tr>
                  <td><strong>${r.name}</strong></td>
                  <td>${r.yield_qty} ${r.yield_unit}</td>
                  <td>${fmt(recipeCost(r))}</td>
                  <td>${fmt(recipeUnitCost(r))}/${r.yield_unit}</td>
                  <td><button class="btn btn-outline btn-sm" onclick="openRecipeDetail('${r.id}')">Abrir</button></td>
                </tr>
              `).join("")}
          </tbody>
        </table>
      ` : `<p class="center-msg">Nenhuma receita cadastrada ainda.</p>`}
    </div>
  `;
}

function openRecipeForm() {
  document.getElementById("recipeFormArea").innerHTML = `
    <div class="admin-card">
      <h2>Nova receita</h2>
      <div class="form-grid">
        <label>Nome da receita<input type="text" id="rpName" placeholder="Ex: Creme de Ninho"></label>
        <label>Rendimento (quantidade)<input type="number" step="0.01" id="rpYieldQty" placeholder="Ex: 695"></label>
        <label>Unidade do rendimento
          <select id="rpYieldUnit">${YIELD_UNITS.map(u => `<option value="${u}">${u}</option>`).join("")}</select>
        </label>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveRecipe()">Salvar</button>
        <button class="btn btn-outline" onclick="document.getElementById('recipeFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>
  `;
}

async function saveRecipe() {
  const name = document.getElementById("rpName").value.trim();
  const yieldQty = Number(document.getElementById("rpYieldQty").value) || 1;
  const yieldUnit = document.getElementById("rpYieldUnit").value;
  if (!name) { alert("Informe o nome da receita."); return; }
  const { error } = await sb.from("recipes").insert({ name, yield_qty: yieldQty, yield_unit: yieldUnit });
  if (error) { console.error(error); alert("Não foi possível salvar a receita."); return; }
  document.getElementById("recipeFormArea").innerHTML = "";
  await loadReceitas(document.getElementById("adminMain"));
}

async function deleteRecipe(recipeId) {
  if (!confirm("Excluir esta receita? Essa ação não pode ser desfeita.")) return;
  const { error } = await sb.from("recipes").delete().eq("id", recipeId);
  if (error) { console.error(error); alert("Não foi possível excluir — verifique se ela não está sendo usada em alguma Precificação."); return; }
  document.getElementById("recipeFormArea").innerHTML = "";
  await loadReceitas(document.getElementById("adminMain"));
}

function openRecipeDetail(recipeId) {
  const recipe = admin.data.recipes.find(r => r.id === recipeId);
  if (!recipe) return;
  const ingredients = admin.data.ingredients;
  const cost = recipeCost(recipe);
  const unitCost = recipeUnitCost(recipe);

  document.getElementById("recipeFormArea").innerHTML = `
    <div class="admin-card">
      <div class="admin-topbar" style="margin-bottom:6px"><h2 style="margin:0">Receita</h2><button class="btn btn-outline btn-sm" onclick="document.getElementById('recipeFormArea').innerHTML=''">Fechar</button></div>

      <div class="form-grid" style="margin-bottom:14px">
        <label class="span-2">Título da receita<input type="text" id="rpEditName" value="${escapeHtml(recipe.name)}"></label>
        <label>Rendimento (quantidade)<input type="number" step="0.01" id="rpEditYieldQty" value="${recipe.yield_qty}"></label>
        <label>Unidade do rendimento
          <select id="rpEditYieldUnit">${YIELD_UNITS.map(u => `<option value="${u}" ${u === recipe.yield_unit ? "selected" : ""}>${u}</option>`).join("")}</select>
        </label>
        <button class="btn btn-pink btn-sm" style="align-self:end" onclick="saveRecipeBasics('${recipeId}')">Salvar título e rendimento</button>
      </div>

      <div class="seg-tabs">
        <button class="${admin.data.recipeTab === "notes" ? "" : "on"}" onclick="setRecipeTab('${recipeId}', 'ing')">Ingredientes</button>
        <button class="${admin.data.recipeTab === "notes" ? "on" : ""}" onclick="setRecipeTab('${recipeId}', 'notes')">Observações${recipe.notes ? " •" : ""}</button>
      </div>

      ${admin.data.recipeTab === "notes" ? `
        <label>Observações da receita
          <textarea id="rpNotes" rows="8" placeholder="Dicas, ponto da massa, tempo de forno, validade..." onchange="saveRecipeNotes('${recipeId}')">${escapeHtml(recipe.notes || "")}</textarea></label>
        <p class="hint" id="rpNotesStatus" style="margin:6px 0 0"></p>
        <div style="margin-top:14px"><button class="btn btn-danger btn-sm" onclick="deleteRecipe('${recipeId}')">Excluir receita</button></div>
      </div>` : ""}
      ${admin.data.recipeTab === "notes" ? "" : `<table>
        <thead><tr><th>Ingrediente</th><th>Quantidade</th><th>Custo</th><th></th></tr></thead>
        <tbody>
          ${(recipe.recipe_ingredients || []).map(ri => `
            <tr>
              <td>${ri.ingredients ? ri.ingredients.name : "—"}</td>
              <td><input type="number" step="0.001" value="${ri.quantity}" style="width:110px;border:1.5px solid var(--border);border-radius:10px;padding:7px 9px" onchange="saveRecipeIngredientQty('${ri.id}', '${recipeId}', this.value)"> ${ri.ingredients ? ri.ingredients.unit : ""}</td>
              <td>${fmt(Number(ri.ingredients?.cost_per_unit || 0) * Number(ri.quantity))}</td>
              <td><button class="btn btn-outline btn-sm" onclick="removeRecipeIngredient('${ri.id}', '${recipeId}')">Remover</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
        <label style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:var(--muted)">Ingrediente
          <select id="riIngredient" style="border:1.5px solid var(--border);border-radius:10px;padding:9px 11px">
            ${ingredients.map(i => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join("")}
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:var(--muted)">Quantidade usada
          <input type="number" step="0.001" id="riQuantity" style="border:1.5px solid var(--border);border-radius:10px;padding:9px 11px;width:110px">
        </label>
        <button class="btn btn-pink btn-sm" onclick="addRecipeIngredient('${recipeId}')">+ Adicionar ingrediente</button>
      </div>

      <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <strong>Custo total da receita: ${fmt(cost)}</strong><br>
          <strong>Custo por ${recipe.yield_unit}: ${fmt(unitCost)}</strong>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteRecipe('${recipeId}')">Excluir receita</button>
      </div>`}
    </div>
  `;
}

async function saveRecipeYield(recipeId) {
  const yieldQty = Number(document.getElementById("rpEditYieldQty").value) || 1;
  const yieldUnit = document.getElementById("rpEditYieldUnit").value;
  const { error } = await sb.from("recipes").update({ yield_qty: yieldQty, yield_unit: yieldUnit }).eq("id", recipeId);
  if (error) { console.error(error); alert("Não foi possível salvar o rendimento."); return; }
  await loadReceitas(document.getElementById("adminMain"));
  openRecipeDetail(recipeId);
}

async function addRecipeIngredient(recipeId) {
  const ingredientId = document.getElementById("riIngredient").value;
  const quantity = Number(document.getElementById("riQuantity").value);
  if (!ingredientId || !quantity || quantity <= 0) { alert("Escolha um ingrediente e uma quantidade válida."); return; }
  const { error } = await sb.from("recipe_ingredients").insert({ recipe_id: recipeId, ingredient_id: ingredientId, quantity });
  if (error) { console.error(error); alert("Não foi possível adicionar o ingrediente."); return; }
  await loadReceitas(document.getElementById("adminMain"));
  openRecipeDetail(recipeId);
}

async function removeRecipeIngredient(recipeIngredientId, recipeId) {
  const { error } = await sb.from("recipe_ingredients").delete().eq("id", recipeIngredientId);
  if (error) { console.error(error); alert("Não foi possível remover."); return; }
  await loadReceitas(document.getElementById("adminMain"));
  openRecipeDetail(recipeId);
}

/* ---------------- PRECIFICAÇÃO (ingredientes e/ou receitas) ---------------- */

async function loadPrecificacao(main) {
  const [{ data: pricings, error: pErr }, { data: ingredients, error: iErr }, { data: recipes, error: rErr }] = await Promise.all([
    sb.from("pricings").select("*, pricing_items(*, ingredients(name, unit, cost_per_unit), recipes(name, yield_qty, yield_unit, recipe_ingredients(quantity, ingredients(cost_per_unit))))").order("name", { ascending: true }),
    sb.from("ingredients").select("*").order("name", { ascending: true }),
    sb.from("recipes").select("*, recipe_ingredients(quantity, ingredients(cost_per_unit))").order("name", { ascending: true }),
  ]);
  if (pErr) throw pErr;
  if (iErr) throw iErr;
  if (rErr) throw rErr;
  admin.data.pricings = pricings || [];
  admin.data.ingredients = ingredients || [];
  admin.data.recipes = recipes || [];
  renderPrecificacaoList(main);
}

// custo de 1 unidade da própria receita (yield_unit), reaproveitado aqui pra não duplicar lógica
function recipeCostFromRaw(recipe) {
  return (recipe.recipe_ingredients || []).reduce((s, ri) => s + Number(ri.ingredients?.cost_per_unit || 0) * Number(ri.quantity), 0);
}
function recipeUnitCostFromRaw(recipe) {
  const cost = recipeCostFromRaw(recipe);
  return recipe.yield_qty > 0 ? cost / recipe.yield_qty : 0;
}

// custo de UM item de precificação (ingrediente direto OU quantidade usada de uma receita)
function pricingItemCost(item) {
  if (item.item_type === "ingredient") {
    return Number(item.ingredients?.cost_per_unit || 0) * Number(item.quantity);
  }
  // item_type === "recipe": custo por unidade da receita × quantidade usada aqui
  const r = item.recipes;
  if (!r) return 0;
  const totalCost = (r.recipe_ingredients || []).reduce((s, ri) => s + Number(ri.ingredients?.cost_per_unit || 0) * Number(ri.quantity), 0);
  const unitCost = r.yield_qty > 0 ? totalCost / r.yield_qty : 0;
  return unitCost * Number(item.quantity);
}
function pricingBaseCost(pricing) {
  return (pricing.pricing_items || []).reduce((s, it) => s + pricingItemCost(it), 0);
}

/* Margem de lucro = lucro ÷ preço de venda × 100 (nunca sobre o custo) */
function pricingMetrics(base, producedQty, variablePct, markupPct, manual) {
  const adjusted = base * (1 + (Number(variablePct) || 0) / 100);
  const unitCost = Number(producedQty) > 0 ? adjusted / Number(producedQty) : 0;
  const markupSale = unitCost * (1 + (Number(markupPct) || 0) / 100);
  const sale = manual != null && manual !== "" && Number(manual) > 0 ? Number(manual) : markupSale;
  const profit = sale - unitCost;
  return { adjusted, unitCost, sale, profit, margin: sale > 0 ? (profit / sale) * 100 : null, usesManual: sale !== markupSale || (manual != null && manual !== "" && Number(manual) > 0) };
}
function fmtPct(v) { return v == null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%"; }
function marginColor(v) { return v == null ? "var(--muted)" : v < 0 ? "#B23434" : "#2E7D46"; }
function pricingLiveUpdate(pricingId) {
  const p = admin.data.pricings.find(x => x.id === pricingId); const box = document.getElementById("pcLive"); if (!p || !box) return;
  const m = pricingMetrics(pricingBaseCost(p), document.getElementById("pcProducedQty").value, document.getElementById("pcVariablePct").value, document.getElementById("pcMarkupPct").value, document.getElementById("pcManualPrice").value);
  box.innerHTML = pricingResultHtml(m);
}
function pricingResultHtml(m) {
  return `<div class="stat-grid" style="margin:0">
    <div class="stat-card"><div class="label">Custo unitário</div><div class="value">${fmt(m.unitCost)}</div></div>
    <div class="stat-card"><div class="label">Preço de venda${m.usesManual ? " (definido por você)" : " (pelo markup)"}</div><div class="value" style="color:var(--pink)">${fmt(m.sale)}</div></div>
    <div class="stat-card"><div class="label">Lucro por unidade</div><div class="value" style="color:${marginColor(m.margin)}">${fmt(m.profit)}</div></div>
    <div class="stat-card"><div class="label">Margem de lucro (sobre o preço)</div><div class="value" style="color:${marginColor(m.margin)}">${fmtPct(m.margin)}</div></div>
  </div>${m.margin != null && m.margin < 0 ? `<p style="color:#B23434;margin:8px 0 0">⚠️ Preço abaixo do custo — venda no prejuízo.</p>` : ""}
  <p class="hint" style="margin:8px 0 0">Margem = lucro ÷ preço de venda × 100. Atualiza ao digitar.</p>`;
}

function renderPrecificacaoList(main) {
  const pricings = admin.data.pricings;
  main.innerHTML = `
    <div class="admin-topbar"><h1>Precificação</h1><button class="btn btn-pink" onclick="openPricingForm()">+ Nova precificação</button></div>
    <p class="hint">Cada item pode ser um ingrediente direto ou uma receita/sub-receita já cadastrada.</p>
    <div id="pricingFormArea"></div>
    <div class="admin-card">
      ${pricings.length ? `
        <table>
          <thead><tr><th>Produto</th><th>Custo</th><th>Preço de venda</th><th>Lucro (R$)</th><th>Margem</th><th></th></tr></thead>
          <tbody>
            ${pricings.map(p => {
              const m = pricingMetrics(pricingBaseCost(p), p.produced_qty, p.variable_pct, p.markup_pct, p.manual_sale_price);
              return `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td>${fmt(m.unitCost)}/un.</td>
                  <td><strong>${fmt(m.sale)}</strong></td>
                  <td style="color:${marginColor(m.margin)}">${fmt(m.profit)}</td>
                  <td><strong style="color:${marginColor(m.margin)}">${fmtPct(m.margin)}</strong></td>
                  <td><button class="btn btn-outline btn-sm" onclick="openPricingDetail('${p.id}')">Abrir</button></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      ` : `<p class="center-msg">Nenhuma precificação cadastrada ainda.</p>`}
    </div>
  `;
}

function openPricingForm() {
  document.getElementById("pricingFormArea").innerHTML = `
    <div class="admin-card">
      <h2>Nova precificação</h2>
      <div class="form-grid">
        <label>Nome do produto<input type="text" id="pcName" placeholder="Ex: Bolo de chocolate"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="savePricing()">Salvar</button>
        <button class="btn btn-outline" onclick="document.getElementById('pricingFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>
  `;
}

async function savePricing() {
  const name = document.getElementById("pcName").value.trim();
  if (!name) { alert("Informe o nome do produto."); return; }
  const { error } = await sb.from("pricings").insert({ name });
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  document.getElementById("pricingFormArea").innerHTML = "";
  await loadPrecificacao(document.getElementById("adminMain"));
}

async function deletePricing(id) {
  if (!confirm("Excluir esta precificação? Essa ação não pode ser desfeita.")) return;
  const { error } = await sb.from("pricings").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir."); return; }
  document.getElementById("pricingFormArea").innerHTML = "";
  await loadPrecificacao(document.getElementById("adminMain"));
}

function openPricingDetail(pricingId) {
  const p = admin.data.pricings.find(p => p.id === pricingId);
  if (!p) return;
  const ingredients = admin.data.ingredients;
  const recipes = admin.data.recipes;

  const base = pricingBaseCost(p);
  const variablePct = Number(p.variable_pct) || 0;
  const adjusted = base * (1 + variablePct / 100);
  const unitCost = p.produced_qty > 0 ? adjusted / p.produced_qty : 0;
  const markupPct = Number(p.markup_pct) || 0;
  const sale = unitCost * (1 + markupPct / 100);
  const profit = sale - unitCost;

  document.getElementById("pricingFormArea").innerHTML = `
    <div class="admin-card">
      <div class="admin-topbar" style="margin-bottom:6px"><h2 style="margin:0">${p.name}</h2><button class="btn btn-outline btn-sm" onclick="document.getElementById('pricingFormArea').innerHTML=''">Fechar</button></div>

      <table>
        <thead><tr><th>Tipo</th><th>Item</th><th>Quantidade</th><th>Custo</th><th></th></tr></thead>
        <tbody>
          ${(p.pricing_items || []).map(it => `
            <tr>
              <td>${it.item_type === "ingredient" ? "Ingrediente" : "Receita"}</td>
              <td>${it.item_type === "ingredient" ? (it.ingredients?.name || "—") : (it.recipes?.name || "—")}</td>
              <td>${it.quantity} ${it.item_type === "ingredient" ? (it.ingredients?.unit || "") : (it.recipes?.yield_unit || "")}</td>
              <td>${fmt(pricingItemCost(it))}</td>
              <td><button class="btn btn-outline btn-sm" onclick="removePricingItem('${it.id}', '${pricingId}')">Remover</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
        <label style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:var(--muted)">Tipo
          <select id="piType" onchange="renderPricingItemPicker()" style="border:1.5px solid var(--border);border-radius:10px;padding:9px 11px">
            <option value="ingredient">Ingrediente</option>
            <option value="recipe">Receita</option>
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:var(--muted)">Item
          <select id="piItem" style="border:1.5px solid var(--border);border-radius:10px;padding:9px 11px">
            ${ingredients.map(i => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join("")}
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:var(--muted)">Quantidade
          <input type="number" step="0.001" id="piQuantity" style="border:1.5px solid var(--border);border-radius:10px;padding:9px 11px;width:110px">
        </label>
        <button class="btn btn-pink btn-sm" onclick="addPricingItem('${pricingId}')">+ Adicionar item</button>
      </div>

      <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border)">
        <div class="form-grid">
          <label>Quantidade produzida<input type="number" step="0.01" id="pcProducedQty" oninput="pricingLiveUpdate('${pricingId}')" value="${p.produced_qty}"></label>
          <label>Custos variáveis (%)<input type="number" step="1" id="pcVariablePct" oninput="pricingLiveUpdate('${pricingId}')" value="${p.variable_pct}"></label>
          <label>Markup sobre o custo (%)<input type="number" step="1" id="pcMarkupPct" oninput="pricingLiveUpdate('${pricingId}')" value="${p.markup_pct}"></label>
          <label>Preço de venda manual (R$, opcional)<input type="number" step="0.01" id="pcManualPrice" oninput="pricingLiveUpdate('${pricingId}')" value="${p.manual_sale_price ?? ""}" placeholder="Deixe em branco pra usar o markup"></label>
        </div>
        <button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="savePricingCalc('${pricingId}')">Recalcular e salvar</button>

        <div id="pcLive" style="margin-top:16px">${pricingResultHtml(pricingMetrics(base, p.produced_qty, p.variable_pct, p.markup_pct, p.manual_sale_price))}</div>
        <div class="callout" style="margin-top:16px">
          Custo dos ingredientes/receitas: <strong>${fmt(base)}</strong><br>
          Custos variáveis (${variablePct}%): <strong>${fmt(base * variablePct / 100)}</strong><br>
          Custo total ajustado: <strong>${fmt(adjusted)}</strong><br>
          Quantidade produzida: <strong>${p.produced_qty}</strong><br>
          Custo unitário: <strong>${fmt(unitCost)}</strong><br>
          <span style="font-size:15px">Preço de venda (markup de ${markupPct}% sobre o custo): <strong style="color:var(--pink)">${fmt(sale)}</strong></span><br>
          Lucro por unidade (com markup): <strong>${fmt(profit)}</strong>
          ${p.manual_sale_price ? `
            <hr style="border:none;border-top:1px solid var(--border);margin:10px 0">
            <span style="font-size:15px">Preço de venda que <u>você</u> definiu: <strong style="color:var(--pink)">${fmt(p.manual_sale_price)}</strong></span><br>
            Lucro por unidade com esse preço: <strong style="color:${(p.manual_sale_price - unitCost) < 0 ? "#B23434" : "#2E7D46"}">${fmt(p.manual_sale_price - unitCost)}</strong>
            ${p.manual_sale_price < unitCost ? `<br><span style="color:#B23434">⚠️ Esse preço está abaixo do custo unitário — você estaria vendendo no prejuízo.</span>` : ""}
          ` : ""}
        </div>
      </div>

      <div style="margin-top:16px;text-align:right">
        <button class="btn btn-danger btn-sm" onclick="deletePricing('${pricingId}')">Excluir precificação</button>
      </div>
    </div>
  `;
}

function renderPricingItemPicker() {
  const type = document.getElementById("piType").value;
  const select = document.getElementById("piItem");
  if (type === "ingredient") {
    select.innerHTML = admin.data.ingredients.map(i => `<option value="${i.id}">${i.name} (${i.unit})</option>`).join("");
  } else {
    select.innerHTML = admin.data.recipes.map(r => `<option value="${r.id}">${r.name} (${r.yield_unit})</option>`).join("");
  }
}

async function addPricingItem(pricingId) {
  const type = document.getElementById("piType").value;
  const itemId = document.getElementById("piItem").value;
  const quantity = Number(document.getElementById("piQuantity").value);
  if (!itemId || !quantity || quantity <= 0) { alert("Escolha um item e uma quantidade válida."); return; }
  const payload = { pricing_id: pricingId, item_type: type, quantity };
  if (type === "ingredient") payload.ingredient_id = itemId; else payload.recipe_id = itemId;
  const { error } = await sb.from("pricing_items").insert(payload);
  if (error) { console.error(error); alert("Não foi possível adicionar o item."); return; }
  await loadPrecificacao(document.getElementById("adminMain"));
  openPricingDetail(pricingId);
}

async function removePricingItem(itemId, pricingId) {
  const { error } = await sb.from("pricing_items").delete().eq("id", itemId);
  if (error) { console.error(error); alert("Não foi possível remover."); return; }
  await loadPrecificacao(document.getElementById("adminMain"));
  openPricingDetail(pricingId);
}

async function savePricingCalc(pricingId) {
  const manualPriceRaw = document.getElementById("pcManualPrice").value;
  const payload = {
    produced_qty: Number(document.getElementById("pcProducedQty").value) || 1,
    variable_pct: Math.max(0, Number(document.getElementById("pcVariablePct").value) || 0),
    markup_pct: Math.max(0, Number(document.getElementById("pcMarkupPct").value) || 0), // nunca negativo: preço nunca fica abaixo do custo
    manual_sale_price: manualPriceRaw === "" ? null : Number(manualPriceRaw),
  };
  const { error } = await sb.from("pricings").update(payload).eq("id", pricingId);
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  await loadPrecificacao(document.getElementById("adminMain"));
  openPricingDetail(pricingId);
}

/* ---------------- CALENDÁRIO DE PRODUÇÃO (100% manual) ---------------- */

async function loadCalendario(main) {
  const { data: events, error } = await sb.from("production_events").select("*").order("event_date", { ascending: true }).order("event_time", { ascending: true });
  if (error) throw error;
  admin.data.productionEvents = events || [];
  const cc = await sb.from("calendar_categories").select("*").order("sort_order").order("created_at");
  admin.data.calCatsOk = !cc.error;
  admin.data.calCats = cc.error ? [] : (cc.data || []);
  if (admin.data.calCats.length) applyCalCats(admin.data.calCats);
  await loadHolidayPlans();
  const now = new Date();
  admin.data.calYear = admin.data.calYear || now.getFullYear();
  admin.data.calMonth = admin.data.calMonth ?? now.getMonth(); // 0-11
  renderCalendario(main);
}

const MONTH_NAMES_CAL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function changeCalMonth(delta) {
  let m = admin.data.calMonth + delta;
  let y = admin.data.calYear;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0; y++; }
  admin.data.calMonth = m;
  admin.data.calYear = y;
  renderCalendario(document.getElementById("adminMain"));
}

function changeCalYear(delta) {
  admin.data.calYear += delta;
  renderCalendario(document.getElementById("adminMain"));
}

const CAL_CATEGORY_COLOR = { encomenda: "#F06292", producao: "#6A9BD8", outro: "#8C6B76" };
const CAL_CATEGORY_LABEL = { encomenda: "Encomenda", producao: "Produção", outro: "Outro" };
function applyCalCats(list) {
  Object.keys(CAL_CATEGORY_COLOR).forEach(k => delete CAL_CATEGORY_COLOR[k]);
  Object.keys(CAL_CATEGORY_LABEL).forEach(k => delete CAL_CATEGORY_LABEL[k]);
  list.forEach(c => { CAL_CATEGORY_COLOR[c.key] = c.color; CAL_CATEGORY_LABEL[c.key] = c.name; });
  if (!CAL_CATEGORY_COLOR.outro) { CAL_CATEGORY_COLOR.outro = "#8C6B76"; CAL_CATEGORY_LABEL.outro = "Outro"; }
}
function calColor(k) { return CAL_CATEGORY_COLOR[k] || CAL_CATEGORY_COLOR.outro; }
const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function eventTimeLabel(e) {
  if (!e.event_time) return "";
  const start = e.event_time.slice(0, 5);
  const end = e.event_time_end ? e.event_time_end.slice(0, 5) : "";
  return end ? `${start}–${end} ` : `${start} `;
}

function goToCalToday() {
  const now = new Date();
  admin.data.calYear = now.getFullYear();
  admin.data.calMonth = now.getMonth();
  renderCalendario(document.getElementById("adminMain"));
}

function renderCalendario(main) {
  const year = admin.data.calYear;
  const month = admin.data.calMonth;
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const events = admin.data.productionEvents.filter(e => e.event_date.startsWith(monthKey));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Dom
  const byDay = {};
  events.forEach(e => {
    const day = Number(e.event_date.split("-")[2]);
    (byDay[day] = byDay[day] || []).push(e);
  });

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const hmap = holidaysByIso(year);
  const monthHolidays = Object.values(hmap).flat().filter(h => h.date.getMonth() === month).sort((a, b) => a.date - b.date);

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push("");
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  main.innerHTML = `
    <div class="admin-topbar"><h1>Calendário de Produção</h1><button class="btn btn-pink" onclick="openEventForm()">+ Novo evento</button></div>
    <p class="hint">Seus eventos são manuais — nada é preenchido pelos pedidos. As datas comemorativas (★) aparecem sozinhas todo ano.</p>

    <div class="admin-card">
      <div class="admin-topbar" style="margin-bottom:14px">
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-outline btn-sm" onclick="changeCalYear(-1)">«</button>
          <button class="btn btn-outline btn-sm" onclick="changeCalMonth(-1)">‹</button>
          <h2 style="margin:0;min-width:170px;text-align:center">${MONTH_NAMES_CAL[month]} ${year}</h2>
          <button class="btn btn-outline btn-sm" onclick="changeCalMonth(1)">›</button>
          <button class="btn btn-outline btn-sm" onclick="changeCalYear(1)">»</button>
        </div>
        <div style="display:flex;gap:8px"><button class="btn btn-outline btn-sm" onclick="toggleCalCats()">Categorias e cores</button><button class="btn btn-outline btn-sm" onclick="goToCalToday()">Hoje</button></div>
      </div>
      <div id="calCatsArea">${admin.data.showCalCats ? renderCalCats() : ""}</div>

      <div style="display:flex;gap:14px;margin-bottom:14px;flex-wrap:wrap">
        ${Object.entries(CAL_CATEGORY_LABEL).map(([k, v]) => `
          <span style="display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--muted)">
            <span style="width:10px;height:10px;border-radius:50%;background:${CAL_CATEGORY_COLOR[k]};display:inline-block"></span>${v}
          </span>
        `).join("")}
      </div>

      <div class="cal-grid">
        ${WEEKDAY_NAMES.map(w => `<div class="cal-weekday">${w}</div>`).join("")}
        ${cells.map(d => {
          if (!d) return `<div class="cal-cell cal-cell-empty"></div>`;
          const dayEvents = byDay[d] || [];
          const isToday = isCurrentMonth && today.getDate() === d;
          return `
            <div class="cal-cell ${isToday ? "cal-cell-today" : ""}">
              <span class="cal-day-num">${d}</span>
              ${(hmap[`${monthKey}-${String(d).padStart(2, "0")}`] || []).map(h => `<div class="cal-event cal-holiday" title="Data comemorativa">★ ${h.name}</div>`).join("")}
              ${dayEvents.map(e => `
                <div class="cal-event" style="background:${calColor(e.category)};${e.done ? "opacity:.45;text-decoration:line-through" : ""}" onclick="openEventForm('${e.id}')" title="${e.title}">
                  ${eventTimeLabel(e)}${e.title}
                </div>
              `).join("")}
            </div>
          `;
        }).join("")}
      </div>
    </div>

    <div id="eventFormArea"></div>

    <div class="admin-card">
      <h2>Datas comemorativas de ${MONTH_NAMES_CAL[month]}</h2>
      ${monthHolidays.length ? monthHolidays.map(h => { const p = holidayPlan(h.key, h.year); const dd = daysUntil(h.date);
        return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">
          <span><span class="cal-holiday-dot"></span><strong>${h.date.getDate()}/${String(month + 1).padStart(2, "0")} · ${h.name}</strong>
            <span class="hint" style="margin-left:6px">${dd > 0 ? `faltam ${dd} dias` : dd === 0 ? "hoje" : "já passou"}</span></span>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" ${p.done ? "checked" : ""} onchange="setHolidayPlan('${h.key}', ${h.year}, { done: this.checked, dismissed: false })" style="width:18px;height:18px"> Planejamento concluído</label>
        </div>`; }).join("") : `<p class="hint">Nenhuma data comemorativa neste mês.</p>`}
    </div>

    <div class="admin-card">
      <h2>Eventos de ${MONTH_NAMES_CAL[month]}</h2>
      ${events.length ? (() => {
        const sorted = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date) || String(a.event_time || "").localeCompare(String(b.event_time || "")));
        const todo = sorted.filter(e => !e.done);
        const done = sorted.filter(e => e.done);
        const row = e => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);${e.done ? "opacity:.55" : ""}">
          <div style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" ${e.done ? "checked" : ""} onchange="toggleEventDone('${e.id}', this.checked)" title="Marcar como concluído" style="width:18px;height:18px;flex-shrink:0;cursor:pointer">
            <span style="width:10px;height:10px;border-radius:50%;background:${calColor(e.category)};display:inline-block;flex-shrink:0"></span>
            <div>
              <strong style="${e.done ? "text-decoration:line-through" : ""}">${new Date(e.event_date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}${e.event_time ? " — " + eventTimeLabel(e).trim() : ""} · ${e.title}</strong>
              ${e.description ? `<div class="hint" style="margin:2px 0 0;white-space:pre-line">${escapeHtml(e.description)}</div>` : ""}
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="openEventForm('${e.id}')">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="deleteEvent('${e.id}')">Excluir</button>
          </div>
        </div>`;
        return (todo.length ? todo.map(row).join("") : `<p class="center-msg">Nada pendente em ${MONTH_NAMES_CAL[month]} 🎉</p>`)
          + (done.length ? `<p class="cart-section-title" style="margin:18px 0 4px">Concluídos (${done.length})</p>` + done.map(row).join("") : "");
      })() : `<p class="center-msg">Nenhum evento cadastrado para ${MONTH_NAMES_CAL[month]}/${year}.</p>`}
    </div>
  `;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function openEventForm(eventId, duplicateFrom) {
  const e = eventId ? admin.data.productionEvents.find(e => e.id === eventId) : (duplicateFrom ? admin.data.productionEvents.find(e => e.id === duplicateFrom) : null);
  const isDuplicate = !!duplicateFrom;
  const defaultDate = `${admin.data.calYear}-${String(admin.data.calMonth + 1).padStart(2, "0")}-01`;
  document.getElementById("eventFormArea").innerHTML = `
    <div class="admin-card">
      <h2>${isDuplicate ? "Duplicar evento" : e ? "Editar evento" : "Novo evento"}</h2>
      <div class="form-grid">
        <label>Data<input type="date" id="evDate" value="${e ? e.event_date : defaultDate}"></label>
        <label>Horário início (opcional)<input type="time" id="evTime" value="${e && e.event_time ? e.event_time.slice(0, 5) : ""}"></label>
        <label>Horário fim (opcional, pra intervalo)<input type="time" id="evTimeEnd" value="${e && e.event_time_end ? e.event_time_end.slice(0, 5) : ""}"></label>
        <label>Categoria
          <select id="evCategory">
            ${Object.entries(CAL_CATEGORY_LABEL).map(([k, v]) => `<option value="${k}" ${e && e.category === k ? "selected" : ""}>${v}</option>`).join("")}
          </select>
        </label>
        <label class="span-2">Título<input type="text" id="evTitle" value="${e ? e.title : ""}" placeholder="Ex: Fazer massa do bolo da Ana"></label>
        <label class="span-2">Descrição (opcional)<textarea id="evDescription" rows="4" placeholder="Pode usar Enter pra separar em tópicos/parágrafos">${e ? escapeHtml(e.description || "") : ""}</textarea></label>
        <label class="span-2">Observação (opcional)<input type="text" id="evNote" value="${e ? e.note || "" : ""}"></label>
        <label class="span-2">Avisar no Dashboard com quantos dias de antecedência? (opcional)<input type="number" min="0" id="evRemind" value="${e && e.remind_days != null ? e.remind_days : ""}" placeholder="Ex: 15 (deixe vazio para não avisar)"></label>
        ${!eventId ? `<label class="span-2">Repetir também nestes dias (opcional)<input type="text" id="evRepeatDates" placeholder="Ex: 2026-09-20, 2026-09-27, 2026-10-04"></label>` : ""}
      </div>
      ${!eventId ? `<p class="hint">Coloque outras datas separadas por vírgula, no formato AAAA-MM-DD, se quiser criar o mesmo evento em vários dias de uma vez.</p>` : ""}
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveEvent(${eventId ? `'${eventId}'` : "null"})">Salvar</button>
        ${e && !isDuplicate ? `<button class="btn btn-outline" onclick="openEventForm(null, '${e.id}')">Duplicar</button>` : ""}
        ${eventId ? `<button class="btn btn-danger" onclick="deleteEvent('${eventId}')">Excluir</button>` : ""}
        <button class="btn btn-outline" onclick="document.getElementById('eventFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>
  `;
}

async function saveEvent(eventId) {
  const basePayload = {
    event_time: document.getElementById("evTime").value || null,
    event_time_end: document.getElementById("evTimeEnd").value || null,
    category: document.getElementById("evCategory").value,
    title: document.getElementById("evTitle").value.trim(),
    description: document.getElementById("evDescription").value.trim() || null,
    note: document.getElementById("evNote").value.trim() || null,
  };
  const remindVal = document.getElementById("evRemind").value;
  if (remindVal !== "") basePayload.remind_days = Math.max(0, parseInt(remindVal, 10) || 0);
  else if (eventId) basePayload.remind_days = null;
  const mainDate = document.getElementById("evDate").value;
  if (!mainDate || !basePayload.title) { alert("Preencha data e título."); return; }

  if (eventId) {
    const { error } = await sb.from("production_events").update({ ...basePayload, event_date: mainDate }).eq("id", eventId);
    if (error) { console.error(error); alert("Não foi possível salvar o evento."); return; }
  } else {
    const repeatField = document.getElementById("evRepeatDates");
    const extraDates = repeatField && repeatField.value.trim()
      ? repeatField.value.split(",").map(d => d.trim()).filter(Boolean)
      : [];
    const allDates = [mainDate, ...extraDates];
    const rows = allDates.map(d => ({ ...basePayload, event_date: d }));
    const { error } = await sb.from("production_events").insert(rows);
    if (error) { console.error(error); alert("Não foi possível salvar o evento: " + (error.message || JSON.stringify(error))); return; }
  }
  document.getElementById("eventFormArea").innerHTML = "";
  await loadCalendario(document.getElementById("adminMain"));
}

async function toggleEventDone(eventId, done) {
  const { error } = await sb.from("production_events").update({ done }).eq("id", eventId);
  if (error) { console.error(error); alert("Não foi possível atualizar: " + (error.message || "") + "\n\nRode o script add_pedidos_mensal_delivery.sql no Supabase."); return; }
  const ev = admin.data.productionEvents.find(e => e.id === eventId);
  if (ev) ev.done = done;
  renderCalendario(document.getElementById("adminMain"));
}

async function deleteEvent(eventId) {
  if (!confirm("Excluir este evento?")) return;
  const { error } = await sb.from("production_events").delete().eq("id", eventId);
  if (error) { console.error(error); alert("Não foi possível excluir."); return; }
  document.getElementById("eventFormArea").innerHTML = "";
  await loadCalendario(document.getElementById("adminMain"));
}


/* ---------------- FIDELIDADE ---------------- */

async function loadLoyalty(main) {
  const [{ data: customers, error: customersError }, { data: cards, error: cardsError }] =
    await Promise.all([
      sb.from("customers").select("id, full_name, email, phone"),
      sb.from("loyalty_cards").select("*")
    ]);

  if (customersError) throw customersError;
  if (cardsError) throw cardsError;

  admin.data.customers = customers || [];
  admin.data.loyalty = cards || [];

  renderLoyaltyTable(main);
}

function renderLoyaltyTable(main) {
  const rows = admin.data.customers.map(c => {
    const card = admin.data.loyalty.find(
      l => l.customer_id === c.id
    );

    return {
      customer: c,
      points: card ? Number(card.points || 0) : 0,
      completed: card ? Number(card.completed_orders || 0) : 0,
      claimed: card ? Number(card.rewards_claimed || 0) : 0,
      hasCard: !!card
    };
  });

  main.innerHTML = `
    <div class="admin-topbar">
      <h1>Programa de Fidelidade</h1>
    </div>

    <div class="admin-card">

      <div style="
        padding:14px;
        border-radius:12px;
        background:#fff5f8;
        margin-bottom:18px;
      ">
        <strong>Regra do Clube Fidelidade</strong>
        <div style="margin-top:5px;color:var(--muted)">
          Cada R$ 1,00 gasto = 1 ponto.
          Os pontos são creditados quando o pedido fica concluído ou entregue.
        </div>
      </div>

      ${rows.length ? `
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Pontos</th>
                <th>Pedidos concluídos</th>
                <th>Resgates</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              ${rows.map(r => `
                <tr>
                  <td><strong>${r.customer.full_name}</strong></td>

                  <td>
                    ${r.customer.email || "—"}
                  </td>

                  <td>
                    ${r.customer.phone || "—"}
                  </td>

                  <td>
                    <strong style="font-size:18px">
                      ${r.points}
                    </strong>
                    <small> pontos</small>
                  </td>

                  <td>
                    ${r.completed}
                  </td>

                  <td>
                    ${r.claimed}
                  </td>

                  <td>
                    ${r.hasCard ? `
                      <button
                        class="btn btn-outline btn-sm"
                        onclick="resetLoyaltyPoints('${r.customer.id}')"
                      >
                        Zerar pontos
                      </button>
                    ` : "—"}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `
        <p class="center-msg">
          Nenhum cliente cadastrado.
        </p>
      `}
    </div>
  `;
}

async function resetLoyaltyPoints(customerId) {
  if (!confirm(
    "Tem certeza que deseja zerar os pontos desse cliente?"
  )) return;

  const { error } = await sb
    .from("loyalty_cards")
    .update({
      points: 0
    })
    .eq("customer_id", customerId);

  if (error) {
    console.error(error);
    alert("Não foi possível zerar os pontos.");
    return;
  }

  await loadLoyalty(
    document.getElementById("adminMain")
  );
}
/* ---------------- MIMOS / RECOMPENSAS ---------------- */

async function loadRewards(main) {
  const { data: rewards, error } = await sb
    .from("rewards")
    .select("*")
    .order("points_required", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  admin.data.rewards = rewards || [];
  renderRewardsTable(main);
}

function renderRewardsTable(main) {
  const rewards = admin.data.rewards || [];

  main.innerHTML = `
    <div class="admin-topbar">
      <h1>Mimos</h1>
      <button class="btn btn-pink" onclick="openRewardForm()">
        + Novo mimo
      </button>
    </div>

    <div id="rewardFormArea"></div>

    <div class="admin-card">
      ${
        rewards.length
          ? `
            <div style="overflow-x:auto">
              <table>
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>Mimo</th>
                    <th>Descrição</th>
                    <th>Pontos necessários</th>
                    <th>Ativo</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  ${rewards.map(r => `
                    <tr>
                      <td>
                        ${
                          r.image_url
                            ? `<img
                                class="img-thumb"
                                src="${r.image_url}"
                                onerror="this.style.display='none'"
                              >`
                            : "—"
                        }
                      </td>

                      <td>
                        <strong>${r.name}</strong>
                      </td>

                      <td>
                        ${r.description || "—"}
                      </td>

                      <td>
                        <strong style="font-size:18px">
                          ${Number(r.points_required || 0)}
                        </strong>
                        pontos
                      </td>

                      <td>
                        ${r.active ? "Sim" : "Não"}
                      </td>

                      <td style="white-space:nowrap">
                        <button
                          class="btn btn-outline btn-sm"
                          onclick="openRewardForm('${r.id}')"
                        >
                          Editar
                        </button>

                        <button
                          class="btn btn-danger btn-sm"
                          onclick="deleteReward('${r.id}')"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `
          : `
            <p class="center-msg">
              Nenhum mimo cadastrado.
            </p>
          `
      }
    </div>
  `;
}

function openRewardForm(id) {
  const reward = id
    ? admin.data.rewards.find(r => r.id === id)
    : null;

  document.getElementById("rewardFormArea").innerHTML = `
    <div class="admin-card">
      <h2>${reward ? "Editar mimo" : "Novo mimo"}</h2>

      <div class="form-grid">

        <label>
          Nome
          <input
            id="rfName"
            value="${reward ? reward.name || "" : ""}"
          >
        </label>

        <label>
          Pontos necessários
          <input
            id="rfPoints"
            type="number"
            min="1"
            step="1"
            value="${reward ? Number(reward.points_required || 1) : 100}"
          >
        </label>

      </div>

      <label style="display:block;margin-top:10px">
        Descrição
        <textarea id="rfDescription" rows="3">${reward ? reward.description || "" : ""}</textarea>
      </label>

      <div class="photo-upload-box" style="margin-top:10px">
        <p class="photo-upload-label">Foto do mimo</p>
        <div id="rfImagePreview" class="photo-preview">${reward && reward.image_url ? `<img src="${reward.image_url}" alt="Pré-visualização da imagem" style="--img-scale:1;--img-x:50%;--img-y:50%">` : "Sem foto"}</div>
        <input type="hidden" id="rfImage" value="${reward ? reward.image_url || "" : ""}">
        <input type="file" accept="image/*" onchange="handleRewardPhoto(this)">
        <p id="rfImageStatus" class="photo-status"></p>
      </div>

      <label style="
        display:flex;
        flex-direction:row;
        align-items:center;
        gap:8px;
        margin-top:14px;
      ">
        <input
          type="checkbox"
          id="rfActive"
          ${!reward || reward.active ? "checked" : ""}
          style="width:auto"
        >
        Ativo
      </label>

      <div style="
        margin-top:14px;
        display:flex;
        gap:10px;
      ">
        <button
          class="btn btn-pink"
          onclick="saveReward(${reward ? `'${reward.id}'` : "null"})"
        >
          Salvar
        </button>

        <button
          class="btn btn-outline"
          onclick="document.getElementById('rewardFormArea').innerHTML=''"
        >
          Cancelar
        </button>
      </div>
    </div>
  `;
}

async function handleRewardPhoto(inputEl) {
  const file = inputEl.files[0];
  if (!file) return;
  const statusEl = document.getElementById("rfImageStatus");
  statusEl.textContent = "Comprimindo...";
  try {
    const compressed = await compressImage(file);
    statusEl.textContent = "Enviando...";
    const fileName = `rewards/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await sb.storage.from("photos").upload(fileName, compressed, { contentType: "image/jpeg" });
    if (error) throw error;
    const { data: urlData } = sb.storage.from("photos").getPublicUrl(fileName);
    document.getElementById("rfImage").value = urlData.publicUrl;
    document.getElementById("rfImagePreview").innerHTML = `<img src="${urlData.publicUrl}" alt="Pré-visualização da imagem" style="--img-scale:1;--img-x:50%;--img-y:50%">`;
    statusEl.textContent = `Pronto (${(compressed.size / 1024).toFixed(0)} KB)`;
  } catch (e) {
    console.error(e);
    statusEl.textContent = `Não foi possível enviar: ${e.message || "tente novamente."}`;
  } finally {
    inputEl.value = "";
  }
}

async function saveReward(id) {
  const name = document.getElementById("rfName").value.trim();
  const description = document.getElementById("rfDescription").value.trim();
  const image_url = document.getElementById("rfImage").value.trim();
  const points_required = parseInt(
    document.getElementById("rfPoints").value,
    10
  ) || 0;

  const active = document.getElementById("rfActive").checked;

  if (!name) {
    alert("Digite o nome do mimo.");
    return;
  }

  if (points_required <= 0) {
    alert("A quantidade de pontos deve ser maior que zero.");
    return;
  }

  const payload = {
    name,
    description,
    image_url,
    points_required,
    active
  };

  const result = id
    ? await sb.from("rewards").update(payload).eq("id", id)
    : await sb.from("rewards").insert(payload);

  if (result.error) {
    console.error(result.error);
    alert("Não foi possível salvar o mimo: " + result.error.message);
    return;
  }

  document.getElementById("rewardFormArea").innerHTML = "";

  await loadRewards(
    document.getElementById("adminMain")
  );
}

async function deleteReward(id) {
  const reward = admin.data.rewards.find(r => r.id === id);

  if (!reward) return;

  if (
    !confirm(
      `Excluir o mimo "${reward.name}"?\n\nEssa ação não pode ser desfeita.`
    )
  ) {
    return;
  }

  const { error } = await sb
    .from("rewards")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Não foi possível excluir o mimo: " + error.message);
    return;
  }

  admin.data.rewards = admin.data.rewards.filter(
    r => r.id !== id
  );

  renderRewardsTable(
    document.getElementById("adminMain")
  );
}


/* ---------------- Acabamento visual: ícones nas ações e nos indicadores ---------------- */
const SVG_ATTR = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';
const ICON_PENCIL = `<svg ${SVG_ATTR}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
const ICON_TRASH = `<svg ${SVG_ATTR}><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>`;
const STAT_ICONS = [
  [/pendente/i, "#B77B00", "#FFF1CF", '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
  [/confirmad/i, "#2F6FD6", "#E1ECFF", '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'],
  [/produ[cç][aã]o/i, "#7B3FD1", "#EEE3FF", '<path d="M6 8h12l1 13H5L6 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>'],
  [/conclu|entregue/i, "#1F8A4C", "#DDF5E7", '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'],
  [/cancelad/i, "#D0405A", "#FFE3E8", '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>'],
  [/fidelidade/i, "#D58A12", "#FFF0D2", '<path d="M5 16L3 7l5.5 4L12 5l3.5 6L21 7l-2 9H5zM5 19h14"/>'],
  [/cliente/i, "#16917F", "#D9F5F0", '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0M16 4a3 3 0 010 6M21 20a6 6 0 00-4-5.6"/>'],
  [/produto|estoque|itens/i, "#E0762B", "#FFE9D8", '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4 7.5L12 12l8-4.5M12 12v9"/>'],
  [/pedidos/i, "#2F6FD6", "#E1ECFF", '<path d="M6 8h12l1 13H5L6 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>'],
  [/despesa|gasto|sa[ií]da|retirada|fatura/i, "#C0394F", "#FFE6EA", '<path d="M3 17l6-6 4 4 8-8M21 7v6h-6"/>'],
  [/receita|faturamento|lucro|resultado|entrada|ticket|valor|saldo/i, "#1F8A4C", "#DDF5E7", '<path d="M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 2.8 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3"/>'],
];
function decorateAdminUI() {
  const main = document.getElementById("adminMain");
  if (!main) return;
  main.querySelectorAll("button:not(.icon-btn)").forEach(b => {
    const t = b.textContent.trim();
    if (t === "Editar") { b.innerHTML = ICON_PENCIL; b.title = "Editar"; b.className = (b.className + " icon-btn").trim(); }
    else if (t === "Excluir") { b.innerHTML = ICON_TRASH; b.title = "Excluir"; b.className = (b.className + " icon-btn danger").trim(); }
  });
  main.querySelectorAll(".stat-card .label:not([data-ic])").forEach(l => {
    l.dataset.ic = "1";
    const name = l.textContent;
    const hit = STAT_ICONS.find(([re]) => re.test(name)) || [null, "#EC5A8A", "#FCE4EC", '<circle cx="12" cy="12" r="4"/>'];
    l.insertAdjacentHTML("afterbegin", `<span class="stat-ic" style="color:${hit[1]};background:${hit[2]}"><svg ${SVG_ATTR}>${hit[3]}</svg></span>`);
  });
}
new MutationObserver(() => { clearTimeout(window.__decT); window.__decT = setTimeout(decorateAdminUI, 30); })
  .observe(document.body, { childList: true, subtree: true });


/* ---------------- CUPONS ---------------- */
const COUPON_TYPE_LABEL = { percent: "Percentual", fixed: "Valor fixo", free_shipping: "Entrega grátis" };
const COUPON_SCOPE_LABEL = { all: "Todos os pedidos", encomenda: "Só encomendas", delivery: "Só delivery" };

async function loadCupons(main) {
  const [c, r] = await Promise.all([
    sb.from("coupons").select("*").order("created_at", { ascending: false }),
    sb.from("coupon_redemptions").select("*, coupons(code), orders(order_number, customer_name)").order("created_at", { ascending: false }).limit(30),
  ]);
  if (c.error) throw c.error;
  if (r.error) throw r.error;
  admin.data.coupons = c.data || [];
  admin.data.redemptions = r.data || [];
  renderCupons(main);
}

function couponStatus(c) {
  const today = new Date().toISOString().slice(0, 10);
  if (!c.active) return ["Pausado", "pending"];
  if (c.expires_at && today > c.expires_at) return ["Expirado", "cancelled"];
  if (c.starts_at && today < c.starts_at) return ["Agendado", "confirmed"];
  if (c.max_uses != null && c.uses_count >= c.max_uses) return ["Esgotado", "cancelled"];
  return ["Ativo", "delivered"];
}
function couponRule(c) {
  const v = c.type === "percent" ? `${Number(c.value)}% OFF` : c.type === "fixed" ? `${fmt(Number(c.value))} OFF` : "Entrega grátis";
  const parts = [v];
  if (c.type === "percent" && c.max_discount != null) parts.push(`até ${fmt(Number(c.max_discount))}`);
  if (Number(c.min_order) > 0) parts.push(`pedido mín. ${fmt(Number(c.min_order))}`);
  parts.push(COUPON_SCOPE_LABEL[c.applies_to]);
  if (c.first_order_only) parts.push("1º pedido");
  return parts.join(" · ");
}

function renderCupons(main) {
  const coupons = admin.data.coupons;
  const activeCount = coupons.filter(c => couponStatus(c)[0] === "Ativo").length;
  const uses = coupons.reduce((t, c) => t + Number(c.uses_count || 0), 0);
  const granted = admin.data.redemptions.reduce((t, r) => t + Number(r.discount || 0), 0);
  main.innerHTML = `
    <div class="admin-topbar"><h1>Cupons</h1><button class="btn btn-pink" onclick="openCouponForm()">+ Novo cupom</button></div>
    <p class="hint">Crie cupons de desconto, defina limites de uso e validade. O cliente digita o código na sacola; o sistema confere tudo automaticamente.</p>
    <div class="stat-grid">
      <div class="stat-card"><div class="label">Cupons ativos</div><div class="value">${activeCount}</div></div>
      <div class="stat-card"><div class="label">Usos totais</div><div class="value">${uses}</div></div>
      <div class="stat-card"><div class="label">Desconto concedido (últimos usos)</div><div class="value">${fmt(granted)}</div></div>
    </div>
    <div id="couponFormArea"></div>
    ${coupons.length ? coupons.map(c => {
      const [st, cls] = couponStatus(c);
      const pct = c.max_uses ? Math.min(100, Math.round(c.uses_count / c.max_uses * 100)) : null;
      const validity = c.starts_at || c.expires_at
        ? `${c.starts_at ? new Date(c.starts_at + "T00:00:00").toLocaleDateString("pt-BR") : "—"} até ${c.expires_at ? new Date(c.expires_at + "T00:00:00").toLocaleDateString("pt-BR") : "sem fim"}` : "Sem prazo";
      return `
      <div class="admin-card coupon-card">
        <div class="coupon-main">
          <span class="coupon-code">${escapeHtml(c.code)}</span>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:13.5px">${escapeHtml(c.description || COUPON_TYPE_LABEL[c.type])}</div>
            <div class="hint" style="margin:2px 0 0">${couponRule(c)}</div>
            <div class="hint" style="margin:2px 0 0">Validade: ${validity} · ${c.max_uses_per_customer ? `${c.max_uses_per_customer} uso(s) por cliente` : "sem limite por cliente"}</div>
          </div>
          <div class="coupon-usage">
            <strong>${c.uses_count}${c.max_uses ? ` / ${c.max_uses}` : ""}</strong><small>usos</small>
            ${pct != null ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ""}
          </div>
          <span class="badge ${cls}">${st}</span>
          <div class="lp-actions">
            <button class="icon-btn" title="${c.active ? "Pausar" : "Ativar"}" onclick="toggleCoupon('${c.id}', ${!c.active})">${c.active
              ? `<svg ${SVG_ATTR}><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>`
              : `<svg ${SVG_ATTR}><path d="M7 4l13 8-13 8V4z"/></svg>`}</button>
            <button class="icon-btn" title="Duplicar" onclick="openCouponForm('${c.id}', true)"><svg ${SVG_ATTR}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/></svg></button>
            <button class="icon-btn" title="Editar" onclick="openCouponForm('${c.id}')">${ICON_PENCIL}</button>
            <button class="icon-btn danger" title="Excluir" onclick="deleteCoupon('${c.id}')">${ICON_TRASH}</button>
          </div>
        </div>
      </div>`;
    }).join("") : `<div class="admin-card"><p class="center-msg">Nenhum cupom criado ainda. Clique em "+ Novo cupom".</p></div>`}

    <div class="admin-card">
      <h2>Últimos usos</h2>
      ${admin.data.redemptions.length ? `<table><thead><tr><th>Data</th><th>Cupom</th><th>Pedido</th><th>Cliente</th><th>Desconto</th></tr></thead><tbody>
        ${admin.data.redemptions.map(r => `<tr><td>${new Date(r.created_at).toLocaleString("pt-BR")}</td><td><strong>${r.coupons ? r.coupons.code : "—"}</strong></td><td>${r.orders ? r.orders.order_number : "—"}</td><td>${r.orders ? r.orders.customer_name : (r.phone || "—")}</td><td>${fmt(Number(r.discount))}</td></tr>`).join("")}
      </tbody></table>` : `<p class="center-msg">Nenhum cupom foi usado ainda.</p>`}
    </div>`;
}

function randomCouponCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function openCouponForm(id, duplicate) {
  const c = id ? admin.data.coupons.find(x => x.id === id) : null;
  const editing = c && !duplicate;
  const v = k => (c && c[k] != null ? c[k] : "");
  document.getElementById("couponFormArea").innerHTML = `
    <div class="admin-card">
      <h2>${editing ? "Editar cupom" : duplicate ? "Duplicar cupom" : "Novo cupom"}</h2>
      <div class="form-grid">
        <label>Código
          <div style="display:flex;gap:6px"><input id="cfCode" style="flex:1;text-transform:uppercase" value="${editing ? escapeHtml(c.code) : ""}" placeholder="Ex: BEMVINDO10">
          <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('cfCode').value = randomCouponCode()">Gerar</button></div>
        </label>
        <label>Descrição (aparece para o cliente)<input id="cfDesc" value="${escapeHtml(v("description"))}" placeholder="Ex: 10% na primeira compra"></label>
        <label>Tipo
          <select id="cfType" onchange="toggleCouponType()">
            ${Object.entries(COUPON_TYPE_LABEL).map(([k, l]) => `<option value="${k}" ${c && c.type === k ? "selected" : ""}>${l}</option>`).join("")}
          </select>
        </label>
        <label id="cfValueWrap"><span id="cfValueLabel">Valor</span><input id="cfValue" type="number" min="0" step="0.01" value="${v("value")}"></label>
        <label id="cfMaxWrap">Desconto máximo (R$, opcional)<input id="cfMax" type="number" min="0" step="0.01" value="${v("max_discount")}"></label>
        <label>Pedido mínimo (R$)<input id="cfMin" type="number" min="0" step="0.01" value="${v("min_order") === "" ? 0 : v("min_order")}"></label>
        <label>Vale para
          <select id="cfScope">${Object.entries(COUPON_SCOPE_LABEL).map(([k, l]) => `<option value="${k}" ${c && c.applies_to === k ? "selected" : ""}>${l}</option>`).join("")}</select>
        </label>
        <label>Limite total de usos (vazio = ilimitado)<input id="cfMaxUses" type="number" min="1" step="1" value="${v("max_uses")}"></label>
        <label>Usos por cliente<input id="cfPerCustomer" type="number" min="1" step="1" value="${c ? (c.max_uses_per_customer ?? 1) : 1}"></label>
        <label>Começa em<input id="cfStart" type="date" value="${v("starts_at")}"></label>
        <label>Termina em<input id="cfEnd" type="date" value="${v("expires_at")}"></label>
      </div>
      <label style="display:flex;flex-direction:row;align-items:center;gap:8px;margin-top:12px"><input type="checkbox" id="cfFirst" ${c && c.first_order_only ? "checked" : ""} style="width:auto"> Válido só para o primeiro pedido do cliente</label>
      <label style="display:flex;flex-direction:row;align-items:center;gap:8px;margin-top:8px"><input type="checkbox" id="cfActive" ${!c || c.active ? "checked" : ""} style="width:auto"> Cupom ativo</label>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn btn-pink" onclick="saveCoupon('${editing ? c.id : ""}')">Salvar cupom</button>
        <button class="btn btn-outline" onclick="document.getElementById('couponFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>`;
  toggleCouponType();
  window.scrollTo(0, 0);
}
function toggleCouponType() {
  const t = document.getElementById("cfType").value;
  document.getElementById("cfValueWrap").style.display = t === "free_shipping" ? "none" : "";
  document.getElementById("cfMaxWrap").style.display = t === "percent" ? "" : "none";
  document.getElementById("cfValueLabel").textContent = t === "percent" ? "Percentual (%)" : "Valor do desconto (R$)";
}

async function saveCoupon(id) {
  const g = x => document.getElementById(x).value.trim();
  const type = g("cfType");
  const code = g("cfCode").toUpperCase().replace(/\s+/g, "");
  const value = Number(g("cfValue")) || 0;
  if (!code) { alert("Informe o código do cupom."); return; }
  if (type !== "free_shipping" && value <= 0) { alert("Informe o valor do desconto."); return; }
  if (type === "percent" && value > 100) { alert("O percentual não pode passar de 100%."); return; }
  const payload = {
    code, description: g("cfDesc") || null, type,
    value: type === "free_shipping" ? 0 : value,
    max_discount: type === "percent" && g("cfMax") ? Number(g("cfMax")) : null,
    min_order: Number(g("cfMin")) || 0,
    applies_to: g("cfScope"),
    max_uses: g("cfMaxUses") ? parseInt(g("cfMaxUses"), 10) : null,
    max_uses_per_customer: g("cfPerCustomer") ? parseInt(g("cfPerCustomer"), 10) : null,
    starts_at: g("cfStart") || null, expires_at: g("cfEnd") || null,
    first_order_only: document.getElementById("cfFirst").checked,
    active: document.getElementById("cfActive").checked,
  };
  if (payload.starts_at && payload.expires_at && payload.expires_at < payload.starts_at) { alert("A data final é anterior à inicial."); return; }
  const { error } = id ? await sb.from("coupons").update(payload).eq("id", id) : await sb.from("coupons").insert(payload);
  if (error) {
    console.error(error);
    alert(/duplicate|unique/i.test(error.message || "") ? "Já existe um cupom com esse código." : "Não foi possível salvar: " + (error.message || "") + "\n\nRode o script add_cupons_entrega.sql no Supabase.");
    return;
  }
  await loadCupons(document.getElementById("adminMain"));
}
async function toggleCoupon(id, active) {
  const { error } = await sb.from("coupons").update({ active }).eq("id", id);
  if (error) { console.error(error); alert("Não foi possível atualizar."); return; }
  await loadCupons(document.getElementById("adminMain"));
}
async function deleteCoupon(id) {
  if (!confirm("Excluir este cupom? O histórico de usos dele também será apagado.")) return;
  const { error } = await sb.from("coupons").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir."); return; }
  await loadCupons(document.getElementById("adminMain"));
}

/* ---------------- ENTREGA (taxa estimada) ---------------- */
async function loadEntrega(main) {
  const { data, error } = await sb.from("delivery_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  admin.data.shipCfg = data;
  if (!data) { main.innerHTML = `<div class="error-box">Rode o script add_cupons_entrega.sql no Supabase para ativar a entrega.</div>`; return; }
  renderEntrega(main);
}

function shipFeeFor(km, cfg) {
  if (km > Number(cfg.max_km)) return null;
  const mins = km / (Number(cfg.avg_speed_kmh) || 30) * 60;
  return Math.ceil(Math.max(Number(cfg.min_fee), Number(cfg.base_fee) + Number(cfg.per_km) * km + Number(cfg.per_minute || 0) * mins) * 2) / 2;
}

function renderEntrega(main) {
  const c = admin.data.shipCfg;
  main.innerHTML = `
    <div class="admin-topbar"><h1>Entrega</h1><button class="btn btn-pink" onclick="saveEntrega()">Salvar</button></div>
    <p class="hint">Como as entregas são feitas pelo 99, o site mostra ao cliente uma <strong>estimativa</strong> calculada pela distância até o endereço. Ajuste os valores abaixo para ficarem próximos do que o 99 costuma cobrar. Se precisar corrigir um pedido, use o campo "Ajuste (frete/desconto)" ao editá-lo.</p>
    <div class="admin-card">
      <h2>Ponto de saída</h2>
      <label style="display:flex;flex-direction:row;align-items:center;gap:8px;margin-bottom:12px"><input type="checkbox" id="seEnabled" ${c.enabled ? "checked" : ""} style="width:auto"> Calcular entrega no site</label>
      <div class="form-grid">
        <label class="span-2">Endereço de onde saem os pedidos
          <div style="display:flex;gap:6px"><input id="seAddress" style="flex:1" value="${escapeHtml(c.origin_address)}">
          <button type="button" class="btn btn-outline btn-sm" onclick="geocodeOrigin()">Buscar coordenadas</button></div>
        </label>
        <label>Latitude<input id="seLat" type="number" step="any" value="${c.origin_lat ?? ""}"></label>
        <label>Longitude<input id="seLng" type="number" step="any" value="${c.origin_lng ?? ""}"></label>
      </div>
      <p class="hint" id="seGeoStatus">${c.origin_lat == null ? "⚠️ Clique em “Buscar coordenadas” para o site conseguir calcular a distância." : `✓ Coordenadas salvas. <a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${c.origin_lat},${c.origin_lng}">Conferir no mapa</a> — se o ponto não for a casa/loja, apague latitude e longitude e salve (o site acha sozinho) ou corrija à mão.`}</p>
    </div>
    <div class="admin-card">
      <h2>Tabela de valores</h2>
      <div class="form-grid">
        <label>Taxa base (R$)<input id="seBase" type="number" min="0" step="0.01" value="${c.base_fee}"></label>
        <label>Valor por km (R$)<input id="sePerKm" type="number" min="0" step="0.01" value="${c.per_km}"></label>
        <label>Valor por minuto (R$)<input id="sePerMin" type="number" min="0" step="0.01" value="${c.per_minute ?? 0}"></label>
        <label>Velocidade média (km/h) para estimar o tempo<input id="seSpeed" type="number" min="5" step="1" value="${c.avg_speed_kmh ?? 30}"></label>
        <label>Taxa mínima (R$)<input id="seMin" type="number" min="0" step="0.01" value="${c.min_fee}"></label>
        <label>Distância máxima (km)<input id="seMax" type="number" min="1" step="0.5" value="${c.max_km}"></label>
        <label>Fator de rota (distância real ≈ linha reta × fator)<input id="seCirc" type="number" min="1" max="2" step="0.05" value="${c.circuity}"></label>
        <label>Entrega grátis acima de (R$, opcional)<input id="seFree" type="number" min="0" step="0.01" value="${c.free_above ?? ""}"></label>
        <label class="span-2">Aviso mostrado ao cliente<input id="seNote" value="${escapeHtml(c.note)}"></label>
      </div>
    </div>
    <div class="admin-card">
      <h2>Simulador</h2>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <input id="seSimKm" type="number" min="0" step="0.5" value="5" style="width:110px" oninput="simulateShipping()"> km
        <strong id="seSimOut"></strong>
      </div>
    </div>`;
  simulateShipping();
}
function currentShipForm() {
  const n = id => Number(document.getElementById(id).value);
  return { base_fee: n("seBase"), per_km: n("sePerKm"), per_minute: n("sePerMin"), avg_speed_kmh: n("seSpeed"), min_fee: n("seMin"), max_km: n("seMax") };
}
function simulateShipping() {
  const km = Number(document.getElementById("seSimKm").value) || 0;
  const fee = shipFeeFor(km, currentShipForm());
  document.getElementById("seSimOut").textContent = fee == null ? "Fora da área" : `≈ ${fmt(fee)}`;
}
async function geocodeOrigin() {
  const st = document.getElementById("seGeoStatus");
  st.textContent = "Buscando...";
  try {
    const addr = document.getElementById("seAddress").value;
    const cm = addr.match(/([^,\/\-]+?)\s*\/\s*([A-Za-z]{2})\s*$/);
    const head = addr.split(/\s+-\s+/)[0];
    const p = new URLSearchParams({ format: "json", limit: "1", countrycodes: "br", street: head.replace(/,\s*(\d+)/, " $1").replace(/^(.*?)\s(\d+)$/, "$2 $1"), city: cm ? cm[1].trim() : "", state: cm ? cm[2].toUpperCase() : "", country: "Brasil" });
    let r = await fetch(`https://nominatim.openstreetmap.org/search?${p}`);
    let d = await r.json();
    if (!d[0]) { r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(addr + ", Brasil")}`); d = await r.json(); }
    if (!d[0]) { st.textContent = "Endereço não encontrado. Tente incluir cidade e estado, ou digite latitude/longitude à mão."; return; }
    document.getElementById("seLat").value = d[0].lat;
    document.getElementById("seLng").value = d[0].lon;
    st.textContent = `✓ Encontrado: ${d[0].display_name}`;
  } catch (e) { console.error(e); st.textContent = "Não foi possível buscar agora. Digite latitude/longitude à mão."; }
}
async function saveEntrega() {
  const n = id => document.getElementById(id).value === "" ? null : Number(document.getElementById(id).value);
  const payload = {
    enabled: document.getElementById("seEnabled").checked,
    origin_address: document.getElementById("seAddress").value.trim(),
    origin_lat: n("seLat"), origin_lng: n("seLng"),
    base_fee: n("seBase") ?? 0, per_km: n("sePerKm") ?? 0, per_minute: n("sePerMin") ?? 0, avg_speed_kmh: n("seSpeed") ?? 30, min_fee: n("seMin") ?? 0, max_km: n("seMax") ?? 25,
    circuity: n("seCirc") ?? 1.3, free_above: n("seFree"),
    note: document.getElementById("seNote").value.trim(), updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from("delivery_settings").update(payload).eq("id", 1);
  if (error) { console.error(error); alert("Não foi possível salvar: " + (error.message || "")); return; }
  await loadEntrega(document.getElementById("adminMain"));
  alert("Configurações de entrega salvas.");
}


/* ---------------- DELIVERY: abrir/fechar, avisos e baixa rápida ---------------- */
function renderDeliverySwitch() {
  const st = admin.data.dSettings;
  if (!st || !("delivery_open" in st)) {
    return `<div class="error-box">Para abrir e fechar o delivery, rode o script <strong>add_delivery_aberto.sql</strong> no Supabase.</div>`;
  }
  const open = !!st.delivery_open;
  return `
    <div class="admin-card delivery-switch ${open ? "is-open" : ""}">
      <div class="ds-row">
        <div class="ds-info">
          <span class="ds-dot"></span>
          <div><strong>${open ? "Delivery aberto" : "Delivery fechado"}</strong>
          <small>${open ? "Os clientes já podem pedir no site." : "No site aparece “Delivery fechado” e ninguém consegue pedir."}</small></div>
        </div>
        <label class="ds-toggle"><input type="checkbox" ${open ? "checked" : ""} onchange="toggleDeliveryOpen(this.checked)"><span></span></label>
      </div>
      <div class="ds-extra">
        <label>Mensagem exibida quando fechado
          <input id="dsClosedMsg" value="${escapeHtml(st.closed_message || "")}"></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="saveClosedMessage()">Salvar mensagem</button>
          <button class="btn btn-pink btn-sm" onclick="toggleNotifyPanel()">Avisar clientes</button>
        </div>
      </div>
    </div>`;
}
async function toggleDeliveryOpen(open) {
  const payload = { delivery_open: open, updated_at: new Date().toISOString() };
  if (open) payload.delivery_opened_at = new Date().toISOString();
  const { error } = await sb.from("delivery_settings").update(payload).eq("id", 1);
  if (error) { console.error(error); alert("Não foi possível alterar: " + (error.message || "") + "\n\nRode o script add_delivery_aberto.sql no Supabase."); await loadEstoqueProdutos(document.getElementById("adminMain")); return; }
  admin.data.showNotify = open;
  admin.data.notified = new Set();
  admin.data.notifyMsg = null; admin.data.notifyEdited = false;
  await loadEstoqueProdutos(document.getElementById("adminMain"));
}
async function saveClosedMessage() {
  const v = document.getElementById("dsClosedMsg").value.trim();
  const { error } = await sb.from("delivery_settings").update({ closed_message: v || "O delivery está fechado no momento." }).eq("id", 1);
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  alert("Mensagem salva.");
}
function toggleNotifyPanel() {
  admin.data.showNotify = !admin.data.showNotify;
  document.getElementById("notifyArea").innerHTML = admin.data.showNotify ? renderNotifyPanel() : "";
}
function siteUrl() { return location.origin + location.pathname.replace(/\/admin\/?.*$/, "/"); }
function defaultNotifyMessage() {
  const rows = deliveryStockRows().filter(r => r.stock > 0);
  const list = rows.map(r => `- ${r.p.name}: ${fmt(Number(r.p.price))} (${r.stock} ${r.stock === 1 ? "unidade" : "unidades"})`).join("\n");
  return `Oi! O delivery da Gizona Doces está ABERTO!\n\n${list ? "Temos hoje:\n" + list + "\n\n" : ""}Garanta o seu enquanto tem estoque:\n${siteUrl()}`;
}
function notifyPhone(p) {
  const d = String(p || "").replace(/\D/g, "");
  if (d.length < 10) return "";
  return d.length <= 11 ? "55" + d : d;
}
function renderNotifyPanel() {
  if (admin.data.notifyMsg == null || !admin.data.notifyEdited) admin.data.notifyMsg = defaultNotifyMessage();
  const cs = admin.data.dCustomers || [];
  const withPhone = cs.filter(c => notifyPhone(c.phone));
  const withMail = cs.filter(c => c.email);
  const done = admin.data.notified || (admin.data.notified = new Set());
  return `
    <div class="admin-card">
      <h2>Avisar clientes cadastrados</h2>
      <p class="hint">Edite a mensagem e envie. O WhatsApp abre já com o texto pronto e o nome de cada cliente — é só tocar em enviar. <strong>A mensagem sai do WhatsApp que estiver aberto neste aparelho</strong>: para sair pelo (19) 99748-9773, use este painel no computador com o WhatsApp Web desse número conectado (ou no celular dele). (O envio 100% automático e em massa exige um serviço pago de WhatsApp/e-mail; aqui o envio é com um toque por cliente.)</p>
      <label>Mensagem
        <textarea id="notifyMsg" rows="9" oninput="admin.data.notifyMsg = this.value; admin.data.notifyEdited = true">${escapeHtml(admin.data.notifyMsg)}</textarea></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
        <button class="btn btn-outline btn-sm" onclick="copyNotifyMsg()">Copiar mensagem</button>
        <button class="btn btn-outline btn-sm" onclick="resetNotifyMsg()">Refazer com o estoque atual</button>
        <button class="btn btn-outline btn-sm" onclick="mailNotify()">E-mail para todos (${withMail.length})</button>
        <button class="btn btn-outline btn-sm" onclick="copyNotifyEmails()">Copiar e-mails</button>
      </div>
      <p class="hint" style="margin:6px 0">WhatsApp — ${withPhone.length} cliente(s) com telefone · ${done.size} já aberto(s)</p>
      <div class="notify-list">
        ${withPhone.length ? withPhone.map(c => `
          <div class="notify-row ${done.has(c.id) ? "done" : ""}" id="nr-${c.id}">
            <span>${escapeHtml(c.full_name || "Cliente")}<small>${escapeHtml(c.phone || "")}</small></span>
            <button class="btn btn-pink btn-sm" onclick="sendNotifyWa('${c.id}')">${done.has(c.id) ? "Reenviar" : "WhatsApp"}</button>
          </div>`).join("") : `<p class="center-msg">Nenhum cliente com telefone cadastrado.</p>`}
      </div>
    </div>`;
}
function notifyText(name) {
  const first = String(name || "").trim().split(/\s+/)[0];
  const base = (document.getElementById("notifyMsg") || { value: admin.data.notifyMsg }).value;
  return first ? base.replace(/^Oi!/, `Oi, ${first}!`) : base;
}
function sendNotifyWa(id) {
  const c = (admin.data.dCustomers || []).find(x => x.id === id);
  if (!c) return;
  window.open(`https://wa.me/${notifyPhone(c.phone)}?text=${encodeURIComponent(notifyText(c.full_name))}`, "_blank");
  admin.data.notified.add(id);
  const row = document.getElementById("nr-" + id);
  if (row) { row.classList.add("done"); row.querySelector("button").textContent = "Reenviar"; }
}
async function copyNotifyMsg() {
  try { await navigator.clipboard.writeText(document.getElementById("notifyMsg").value); alert("Mensagem copiada."); }
  catch (e) { document.getElementById("notifyMsg").select(); alert("Selecione e copie a mensagem (Ctrl+C)."); }
}
function resetNotifyMsg() { admin.data.notifyEdited = false; admin.data.notifyMsg = defaultNotifyMessage(); document.getElementById("notifyMsg").value = admin.data.notifyMsg; }
function mailList() { return (admin.data.dCustomers || []).map(c => c.email).filter(Boolean); }
function mailNotify() {
  const list = mailList();
  if (!list.length) { alert("Nenhum cliente com e-mail."); return; }
  const body = document.getElementById("notifyMsg").value;
  location.href = `mailto:?bcc=${encodeURIComponent(list.join(","))}&subject=${encodeURIComponent("Delivery aberto — Gizona Doces")}&body=${encodeURIComponent(body)}`;
}
async function copyNotifyEmails() {
  const txt = mailList().join(", ");
  try { await navigator.clipboard.writeText(txt); alert("E-mails copiados. Cole no campo CCO do seu e-mail."); } catch (e) { prompt("Copie os e-mails:", txt); }
}

function openQuickSale() {
  if (!admin.data.dProducts.length) { alert("Cadastre antes um produto em Produtos → Delivery."); return; }
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("stockFormArea").innerHTML = `
    <div class="admin-card"><h2>Venda rápida</h2>
      <p class="hint">Para vendas feitas por fora do site. Cria um pedido de delivery já entregue (aparece em Pedidos e no Financeiro) e o estoque diminui também no site.</p>
      <div class="form-grid">
        <label>Produto<select id="qsProduct" onchange="qsFill()">${admin.data.dProducts.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name}</option>`).join("")}</select></label>
        <label>Quantidade<input type="number" min="1" step="1" id="qsQty" value="1"></label>
        <label>Valor unitário (R$)<input type="number" min="0" step="0.01" id="qsPrice"></label>
        <label>Pagamento<select id="qsPay">${PAYMENT_OPTIONS.map(o => `<option>${o}</option>`).join("")}</select></label>
        <label>Cliente (opcional)<input id="qsName" placeholder="Venda avulsa"></label>
        <label>Data<input type="date" id="qsDate" value="${today}"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveQuickSale()">Registrar baixa</button>
        <button class="btn btn-outline" onclick="document.getElementById('stockFormArea').innerHTML=''">Cancelar</button>
      </div></div>`;
  qsFill();
}
function qsFill() {
  const sel = document.getElementById("qsProduct");
  const opt = sel && sel.options[sel.selectedIndex];
  if (opt) document.getElementById("qsPrice").value = opt.dataset.price || "";
}
async function saveQuickSale() {
  const pid = document.getElementById("qsProduct").value;
  const qty = parseInt(document.getElementById("qsQty").value);
  const price = Number(document.getElementById("qsPrice").value) || 0;
  if (!pid || !qty || qty <= 0) { alert("Informe o produto e a quantidade."); return; }
  const prod = admin.data.dProducts.find(p => p.id === pid);
  const row = deliveryStockRows().find(r => r.p.id === pid);
  if (row && qty > row.stock) { alert(`Só há ${row.stock} em estoque. Registre antes uma nova leva.`); return; }
  const total = Number((qty * price).toFixed(2));
  const pay = document.getElementById("qsPay").value;
  const { data, error } = await sb.from("orders").insert({
    order_date: document.getElementById("qsDate").value || null,
    origin: "manual", order_type: "delivery", status: "delivered",
    customer_name: document.getElementById("qsName").value.trim() || "Venda avulsa", customer_phone: "—",
    items: [{ id: pid, product_name: prod.name, category: "delivery", quantity: qty, unit_price: price, subtotal: total }],
    total, subtotal: total, payment_method_1: pay, payment_amount_1: total, observations: "Baixa rápida (venda por fora do site)",
  }).select().single();
  if (error) { console.error(error); alert(/Estoque insuficiente/i.test(error.message || "") ? "Estoque insuficiente." : "Não foi possível registrar: " + (error.message || "") + (/indispon|batch_item|request_id/i.test(error.message || "") ? "\n\nRode o script fix_delivery_venda_manual.sql no Supabase." : "")); return; }
  await ensureRevenueForOrderQuiet(data);
  await loadEstoqueProdutos(document.getElementById("adminMain"));
}
async function ensureRevenueForOrderQuiet(order) {
  const { data: existing } = await sb.from("revenue_entries").select("id").eq("order_id", order.id).maybeSingle();
  if (existing) return;
  const { error } = await sb.from("revenue_entries").insert({ entry_date: new Date().toISOString().slice(0, 10), description: "Pedido " + order.order_number, amount: Number((Number(order.total || 0) + Number(order.delivery_fee || 0)).toFixed(2)), source: "site", order_id: order.id });
  if (error) { console.error(error); alert("A baixa foi registrada, mas a receita não entrou no Financeiro: " + (error.message || "")); }
}


/* ---------------- CALENDÁRIO: categorias e cores ---------------- */
function toggleCalCats() {
  admin.data.showCalCats = !admin.data.showCalCats;
  document.getElementById("calCatsArea").innerHTML = admin.data.showCalCats ? renderCalCats() : "";
}
function renderCalCats() {
  if (!admin.data.calCatsOk) return `<div class="error-box">Para criar categorias, rode o script <strong>add_ajustes_admin.sql</strong> no Supabase.</div>`;
  const cats = admin.data.calCats;
  return `
    <div class="cat-panel">
      <p class="hint" style="margin:0 0 10px">Crie suas categorias e escolha a cor de cada uma. Elas aparecem ao criar um evento.</p>
      ${cats.map(c => `
        <div class="cat-row">
          <input type="color" value="${c.color}" onchange="saveCalCat('${c.id}', 'color', this.value)" title="Escolher cor">
          <input type="text" value="${escapeHtml(c.name)}" onchange="saveCalCat('${c.id}', 'name', this.value)">
          <button class="btn btn-danger btn-sm" onclick="deleteCalCat('${c.id}')">Excluir</button>
        </div>`).join("")}
      <div class="cat-row new">
        <input type="color" id="ncColor" value="#F06292" title="Escolher cor">
        <input type="text" id="ncName" placeholder="Nome da nova categoria" onkeydown="if(event.key==='Enter')addCalCat()">
        <button class="btn btn-pink btn-sm" onclick="addCalCat()">+ Adicionar</button>
      </div>
    </div>`;
}
async function addCalCat() {
  const name = document.getElementById("ncName").value.trim();
  if (!name) { alert("Digite o nome da categoria."); return; }
  const color = document.getElementById("ncColor").value;
  const key = "c_" + Date.now().toString(36);
  const sort_order = (admin.data.calCats.reduce((m, c) => Math.max(m, c.sort_order || 0), 0)) + 1;
  const { error } = await sb.from("calendar_categories").insert({ key, name, color, sort_order });
  if (error) { console.error(error); alert("Não foi possível criar: " + (error.message || "")); return; }
  await loadCalendario(document.getElementById("adminMain"));
}
async function saveCalCat(id, field, value) {
  value = String(value).trim();
  if (field === "name" && !value) { alert("O nome não pode ficar vazio."); await loadCalendario(document.getElementById("adminMain")); return; }
  const { error } = await sb.from("calendar_categories").update({ [field]: value }).eq("id", id);
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  await loadCalendario(document.getElementById("adminMain"));
}
async function deleteCalCat(id) {
  const c = admin.data.calCats.find(x => x.id === id);
  if (!c) return;
  if (c.key === "outro") { alert("A categoria “Outro” é a padrão e não pode ser excluída."); return; }
  const used = admin.data.productionEvents.filter(e => e.category === c.key).length;
  if (!confirm(`Excluir “${c.name}”?${used ? ` ${used} evento(s) dela passarão a aparecer como “Outro”.` : ""}`)) return;
  if (used) await sb.from("production_events").update({ category: "outro" }).eq("category", c.key);
  const { error } = await sb.from("calendar_categories").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir."); return; }
  await loadCalendario(document.getElementById("adminMain"));
}

/* ---------------- RECEITAS: edição, observações ---------------- */
function setRecipeTab(id, tab) { admin.data.recipeTab = tab; openRecipeDetail(id); }
async function saveRecipeBasics(recipeId) {
  const name = document.getElementById("rpEditName").value.trim();
  const yieldQty = Number(document.getElementById("rpEditYieldQty").value) || 1;
  const yieldUnit = document.getElementById("rpEditYieldUnit").value;
  if (!name) { alert("O título da receita não pode ficar vazio."); return; }
  const { error } = await sb.from("recipes").update({ name, yield_qty: yieldQty, yield_unit: yieldUnit }).eq("id", recipeId);
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  await loadReceitas(document.getElementById("adminMain"));
  openRecipeDetail(recipeId);
}
async function saveRecipeIngredientQty(riId, recipeId, value) {
  const q = Number(String(value).replace(",", "."));
  if (!q || q <= 0) { alert("Informe uma quantidade válida."); openRecipeDetail(recipeId); return; }
  const { error } = await sb.from("recipe_ingredients").update({ quantity: q }).eq("id", riId);
  if (error) { console.error(error); alert("Não foi possível salvar a quantidade."); return; }
  await loadReceitas(document.getElementById("adminMain"));
  openRecipeDetail(recipeId);
}
async function saveRecipeNotes(recipeId) {
  const notes = document.getElementById("rpNotes").value;
  const { error } = await sb.from("recipes").update({ notes: notes.trim() || null }).eq("id", recipeId);
  if (error) { console.error(error); alert("Não foi possível salvar as observações.\n\nRode o script add_ajustes_admin.sql no Supabase."); return; }
  const r = admin.data.recipes.find(x => x.id === recipeId); if (r) r.notes = notes.trim() || null;
  const st = document.getElementById("rpNotesStatus"); if (st) { st.textContent = "✓ Salvo"; setTimeout(() => { st.textContent = ""; }, 1800); }
}

/* ---------------- FICHA TÉCNICA ---------------- */
async function loadFichas(main) {
  const { data, error } = await sb.from("tech_sheets").select("*, tech_sheet_rows(*)").order("title", { ascending: true });
  if (error) {
    console.error(error);
    main.innerHTML = `<div class="error-box">Para usar a Ficha técnica, rode o script <strong>add_ajustes_admin.sql</strong> no Supabase.</div>`;
    return;
  }
  admin.data.sheets = (data || []).map(x => ({ ...x, tech_sheet_rows: (x.tech_sheet_rows || []).sort((a, b) => a.sort_order - b.sort_order || String(a.created_at).localeCompare(String(b.created_at))) }));
  renderFichas(main);
}
function renderFichas(main) {
  const sheets = admin.data.sheets;
  const open = admin.data.sheetOpen && sheets.find(x => x.id === admin.data.sheetOpen);
  if (open) { renderFichaDetail(main, open); return; }
  main.innerHTML = `
    <div class="admin-topbar"><h1>Ficha técnica</h1></div>
    <p class="hint">Como montar cada produto: ingrediente, quantidade e descrição. Tudo é editável à mão.</p>
    <div class="admin-card">
      <div class="cat-row new" style="margin:0">
        <input type="text" id="nsTitle" placeholder="Título da ficha (ex: Bolo gelado de cocada cremosa)" onkeydown="if(event.key==='Enter')createSheet()">
        <button class="btn btn-pink btn-sm" onclick="createSheet()">+ Nova ficha</button>
      </div>
    </div>
    <div class="admin-card">
      ${sheets.length ? sheets.map(x => `
        <div class="sheet-item">
          <div><strong>${escapeHtml(x.title)}</strong><small>${x.tech_sheet_rows.length} ${x.tech_sheet_rows.length === 1 ? "linha" : "linhas"}</small></div>
          <button class="btn btn-outline btn-sm" onclick="openSheet('${x.id}')">Abrir</button>
        </div>`).join("") : `<p class="center-msg">Nenhuma ficha ainda. Digite o título acima para criar a primeira.</p>`}
    </div>`;
}
async function createSheet() {
  const title = document.getElementById("nsTitle").value.trim();
  if (!title) { alert("Digite o título da ficha."); return; }
  const { data, error } = await sb.from("tech_sheets").insert({ title }).select().single();
  if (error) { console.error(error); alert("Não foi possível criar: " + (error.message || "")); return; }
  admin.data.sheetOpen = data.id;
  await loadFichas(document.getElementById("adminMain"));
}
function openSheet(id) { admin.data.sheetOpen = id; renderFichas(document.getElementById("adminMain")); window.scrollTo(0, 0); }
function closeSheet() { admin.data.sheetOpen = null; renderFichas(document.getElementById("adminMain")); }
function renderFichaDetail(main, x) {
  main.innerHTML = `
    <div class="admin-topbar"><h1>Ficha técnica</h1><button class="btn btn-outline" onclick="closeSheet()">← Voltar</button></div>
    <div class="admin-card">
      <label>Título<input type="text" class="sheet-title" value="${escapeHtml(x.title)}" onchange="saveSheetTitle('${x.id}', this.value)"></label>
      <div class="sheet-table-wrap">
      <table class="sheet-table">
        <thead><tr><th>Ingrediente</th><th style="width:150px">Quantidade</th><th>Descrição</th><th style="width:48px"></th></tr></thead>
        <tbody>
          ${x.tech_sheet_rows.map(r => `
            <tr>
              <td><input value="${escapeHtml(r.ingredient)}" onchange="saveSheetRow('${r.id}', 'ingredient', this.value)" placeholder="Ex: Massa de chocolate"></td>
              <td><input value="${escapeHtml(r.quantity)}" onchange="saveSheetRow('${r.id}', 'quantity', this.value)" placeholder="Ex: 1,5"></td>
              <td><input value="${escapeHtml(r.description)}" onchange="saveSheetRow('${r.id}', 'description', this.value)" placeholder="Ex: forma 25x25cm"></td>
              <td><button class="btn btn-danger btn-sm" onclick="deleteSheetRow('${r.id}')" title="Remover linha">✕</button></td>
            </tr>`).join("")}
        </tbody>
      </table></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;justify-content:space-between">
        <button class="btn btn-pink btn-sm" onclick="addSheetRow('${x.id}')">+ Adicionar linha</button>
        <button class="btn btn-danger btn-sm" onclick="deleteSheet('${x.id}')">Excluir ficha</button>
      </div>
      <p class="hint" style="margin-top:10px">As alterações são salvas automaticamente ao sair de cada campo.</p>
    </div>`;
}
async function saveSheetTitle(id, value) {
  value = value.trim();
  if (!value) { alert("O título não pode ficar vazio."); await loadFichas(document.getElementById("adminMain")); return; }
  const { error } = await sb.from("tech_sheets").update({ title: value }).eq("id", id);
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  const x = admin.data.sheets.find(s => s.id === id); if (x) x.title = value;
}
async function saveSheetRow(id, field, value) {
  const { error } = await sb.from("tech_sheet_rows").update({ [field]: value }).eq("id", id);
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  admin.data.sheets.forEach(x => x.tech_sheet_rows.forEach(r => { if (r.id === id) r[field] = value; }));
}
async function addSheetRow(sheetId) {
  const x = admin.data.sheets.find(s => s.id === sheetId);
  const sort_order = x.tech_sheet_rows.reduce((m, r) => Math.max(m, r.sort_order || 0), 0) + 1;
  const { data, error } = await sb.from("tech_sheet_rows").insert({ sheet_id: sheetId, sort_order }).select().single();
  if (error) { console.error(error); alert("Não foi possível adicionar a linha."); return; }
  x.tech_sheet_rows.push(data);
  renderFichaDetail(document.getElementById("adminMain"), x);
  const inputs = document.querySelectorAll(".sheet-table tbody tr:last-child input");
  if (inputs[0]) inputs[0].focus();
}
async function deleteSheetRow(id) {
  const { error } = await sb.from("tech_sheet_rows").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível remover."); return; }
  admin.data.sheets.forEach(x => { x.tech_sheet_rows = x.tech_sheet_rows.filter(r => r.id !== id); });
  renderFichas(document.getElementById("adminMain"));
}
async function deleteSheet(id) {
  if (!confirm("Excluir esta ficha técnica inteira?")) return;
  const { error } = await sb.from("tech_sheets").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir."); return; }
  admin.data.sheetOpen = null;
  await loadFichas(document.getElementById("adminMain"));
}


// só pede compra se há um mínimo definido (> 0): item com mínimo 0 e estoque 0 (ex.: margarina de casa) não conta
function isLowStock(i) { return Number(i.min_stock) > 0 && Number(i.current_stock) <= Number(i.min_stock); }


/* ---------------- Fotos do menu de encomendas ---------------- */
const SITE_MEDIA_SLOTS = [["brigadeiro", "Brigadeiro Gourmet"], ["geladinho", "Geladinho Gourmet"], ["bolo", "Bolos Decorados"]];
function renderSiteMediaCard() {
  if (!admin.data.mediaOk) return `<div class="error-box">Para colocar as fotos do menu, rode o script <strong>add_site_media_bolos.sql</strong> no Supabase.</div>`;
  return `
    <div class="admin-card">
      <h2>Fotos do menu de encomendas</h2>
      <p class="hint">Uma foto para cada categoria. Ela aparece no site na tela “O que você deseja pedir?”, no lugar do ícone.</p>
      <div class="media-slots">
        ${SITE_MEDIA_SLOTS.map(([key, label]) => `
          <div class="media-slot">
            <div class="media-prev">${admin.data.media[key] ? `<img src="${admin.data.media[key]}" alt="${label}">` : "Sem foto"}</div>
            <strong>${label}</strong>
            <input type="file" accept="image/*" onchange="uploadSiteMedia('${key}', this)">
            <p class="photo-status" id="media-st-${key}"></p>
            ${admin.data.media[key] ? `<button class="btn btn-outline btn-sm" onclick="removeSiteMedia('${key}')">Remover foto</button>` : ""}
          </div>`).join("")}
      </div>
    </div>`;
}
async function uploadSiteMedia(key, input) {
  const file = input.files[0]; if (!file) return;
  const st = document.getElementById("media-st-" + key);
  try {
    st.textContent = "Comprimindo...";
    const compressed = await compressImage(file);
    st.textContent = "Enviando...";
    const fileName = `site/${key}-${Date.now()}.jpg`;
    const { error } = await sb.storage.from("photos").upload(fileName, compressed, { contentType: "image/jpeg" });
    if (error) throw error;
    const url = sb.storage.from("photos").getPublicUrl(fileName).data.publicUrl;
    const { error: e2 } = await sb.from("site_media").upsert({ key, image_url: url, updated_at: new Date().toISOString() });
    if (e2) throw e2;
    admin.data.media[key] = url;
    renderProductsTable(document.getElementById("adminMain"));
  } catch (e) { console.error(e); st.textContent = "Não foi possível enviar: " + (e.message || "tente novamente."); }
  finally { input.value = ""; }
}
async function removeSiteMedia(key) {
  if (!confirm("Remover a foto? O site volta a mostrar o ícone.")) return;
  const { error } = await sb.from("site_media").delete().eq("key", key);
  if (error) { console.error(error); alert("Não foi possível remover."); return; }
  delete admin.data.media[key];
  renderProductsTable(document.getElementById("adminMain"));
}

/* ---------------- Novos pedidos: aviso persistente + notificação ---------------- */
const NEW_ORDER_POLL_MS = 20000;
function seenOrderIds() { try { const v = localStorage.getItem("gz_seen_orders"); return v === null ? null : JSON.parse(v); } catch (e) { return []; } }
function saveSeenOrderIds(ids) { try { localStorage.setItem("gz_seen_orders", JSON.stringify(ids.slice(-300))); } catch (e) {} }

async function fetchPendingSiteOrders() {
  const { data, error } = await sb.from("orders")
    .select("id,order_number,customer_name,customer_phone,total,delivery_fee,created_at,order_type,status")
    .eq("status", "pending").eq("origin", "site").order("created_at", { ascending: false });
  return error ? null : (data || []);
}

function playNewOrderBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.15, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.22);
    });
  } catch (e) {}
}

async function notifyDevice(title, body, tag) {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  try {
    const reg = ("serviceWorker" in navigator) ? await navigator.serviceWorker.getRegistration() : null;
    const opts = { body, tag, icon: "../images/brand/icon.png", requireInteraction: true, data: { url: location.pathname + "#/orders" } };
    if (reg) await reg.showNotification(title, opts); else new Notification(title, opts);
    return true;
  } catch (e) { console.error(e); return false; }
}

async function enableDeviceNotifications() {
  if (!("Notification" in window)) { alert("Este navegador não suporta notificações."); return; }
  try { if ("serviceWorker" in navigator) await navigator.serviceWorker.register("sw.js"); } catch (e) { console.error(e); }
  const perm = await Notification.requestPermission();
  if (perm === "granted") await notifyDevice("Notificações ativadas", "Você será avisado quando chegar um novo pedido.", "gz-test");
  renderNewOrdersAlert();
}

function newOrderTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function renderNewOrdersAlert() {
  const box = document.getElementById("dashNewOrders"); if (!box) return;
  const list = admin.data.pendingNew || [];
  const perm = ("Notification" in window) ? Notification.permission : "unsupported";
  const permLine = perm === "granted" ? `✓ Notificações ativas neste aparelho (chegam enquanto o painel estiver aberto no navegador).`
    : perm === "denied" ? `Notificações bloqueadas neste navegador. Libere nas configurações do site para receber avisos.`
    : perm === "unsupported" ? `Este navegador não suporta notificações.`
    : `<button class="btn btn-outline btn-sm" onclick="enableDeviceNotifications()">🔔 Ativar notificações neste aparelho</button>`;
  box.innerHTML = `
    ${list.length ? `<div class="new-order-alert">
      <h2 class="dash-title" style="margin-top:0">🔔 ${list.length === 1 ? "1 novo pedido aguardando confirmação" : list.length + " novos pedidos aguardando confirmação"}</h2>
      ${list.map(o => `
        <div class="new-order-row">
          <div style="flex:1"><strong>Pedido ${escapeHtml(String(o.order_number || ""))}</strong> · ${escapeHtml(o.customer_name || "")}
            <div class="hint" style="margin:2px 0 0">Recebido em ${newOrderTime(o.created_at)} · ${o.order_type === "delivery" ? "Delivery" : "Encomenda"} · ${fmt(Number(o.total || 0) + Number(o.delivery_fee || 0))}</div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-pink btn-sm" onclick="confirmNewOrder('${o.id}')">Confirmar pedido</button>
            <button class="btn btn-outline btn-sm" onclick="setTab('orders')">Ver pedidos</button>
          </div>
        </div>`).join("")}
    </div>` : ""}
    <p class="hint" style="margin:6px 0 10px">${permLine}</p>`;
}

function updateNewOrdersUI() {
  const n = (admin.data.pendingNew || []).length;
  document.querySelectorAll('.admin-nav button[onclick="setTab(\'orders\')"]').forEach(b => {
    const old = b.querySelector(".nav-badge"); if (old) old.remove();
    if (n) { const sp = document.createElement("span"); sp.className = "nav-badge"; sp.textContent = n; b.appendChild(sp); }
  });
  renderNewOrdersAlert();
}

async function confirmNewOrder(id) {
  const o = (admin.data.pendingNew || []).find(x => x.id === id);
  const { error } = await sb.from("orders").update({ status: "confirmed" }).eq("id", id);
  if (error) {
    console.error(error);
    alert(/Estoque insuficiente/i.test(error.message || "") ? "Estoque insuficiente para confirmar este pedido. Registre uma nova leva no Estoque de Produtos." : "Não foi possível confirmar: " + (error.message || ""));
    return;
  }
  if (o) await ensureRevenueForOrderQuiet(o);
  await pollNewOrders(true);
  if (admin.tab === "orders") loadTab(); // atualiza a lista de pedidos se estiver nela
}

async function pollNewOrders(silent) {
  if (!admin.session || !admin.isAdmin) return;
  const list = await fetchPendingSiteOrders();
  if (list === null) return;
  admin.data.pendingNew = list;
  const seen = seenOrderIds();
  const ids = list.map(o => o.id);
  if (seen === null) { saveSeenOrderIds(ids); } // 1ª vez neste aparelho: não dispara aviso dos que já existem (o aviso do dashboard continua)
  else {
    const fresh = list.filter(o => !seen.includes(o.id));
    if (fresh.length) {
      saveSeenOrderIds(seen.concat(fresh.map(o => o.id)));
      if (!silent) {
        playNewOrderBeep();
        const o = fresh[0];
        notifyDevice(fresh.length === 1 ? `Novo pedido ${o.order_number}` : `${fresh.length} novos pedidos`,
          fresh.length === 1 ? `${o.customer_name} — recebido às ${new Date(o.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Aguardando confirmação", "gz-new-order");
      }
    }
  }
  updateNewOrdersUI();
}

function startNewOrderPolling() {
  if (admin.pollTimer) return;
  pollNewOrders(false);
  admin.pollTimer = setInterval(() => pollNewOrders(false), NEW_ORDER_POLL_MS);
}
