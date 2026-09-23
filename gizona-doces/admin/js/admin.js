/* ============================================================
   GIZONA DOCES — Painel Administrativo
============================================================ */
const root = document.getElementById("adminApp");
const admin = { session: null, isAdmin: false, tab: "dashboard", data: {} };

function fmt(v) { return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

const STATUS_LABEL = { pending: "Pendente", confirmed: "Confirmado", production: "Em Produção", completed: "Concluído", delivered: "Entregue", cancelled: "Cancelado" };

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
    home: `<path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-9z"/>`,
    bag: `<path d="M6 8h12l1 13H5L6 8z" fill="none"/><path d="M8 8V6a4 4 0 018 0v2" fill="none"/>`,
    cube: `<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" fill="none"/><path d="M4 7.5L12 12l8-4.5M12 12v9" fill="none"/>`,
    users: `<circle cx="9" cy="8" r="3" fill="none"/><path d="M3 20a6 6 0 0112 0" fill="none"/><path d="M15 8a3 3 0 110-6M21 20a6 6 0 00-6-6" fill="none"/>`,
    wallet: `<rect x="3" y="6" width="18" height="13" rx="2" fill="none"/><path d="M16 12h2" /><path d="M3 9h18" fill="none"/>`,
    chart: `<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" fill="none"/>`,
    box: `<path d="M3 8l9-5 9 5-9 5-9-5z" fill="none"/><path d="M3 8v8l9 5 9-5V8M12 13v8" fill="none"/>`,
    book: `<path d="M5 4h9a3 3 0 013 3v13H8a3 3 0 00-3 3V4z" fill="none"/><path d="M17 4v16" fill="none"/>`,
    calc: `<rect x="5" y="3" width="14" height="18" rx="2" fill="none"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" fill="none"/>`,
    calendar: `<rect x="3" y="5" width="18" height="16" rx="2" fill="none"/><path d="M3 10h18M8 3v4M16 3v4" fill="none"/>`,
    crown: `<path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8z" fill="currentColor" stroke="none"/>`,
    gift: `<rect x="4" y="9" width="16" height="11" rx="1" fill="none"/><path d="M4 13h16M12 9v11M12 9c-1.5-4-6-4-6-1.5S9 9 12 9zm0 0c1.5-4 6-4 6-1.5S15 9 12 9z" fill="none"/>`,
  };
  return `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ""}</svg>`;
}

function renderShell() {
  root.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-logo"><img class="seal" src="../images/brand/icon.png" alt="Gizona Doces"><span>Painel Admin<br>Gizona Doces</span></div>
        <nav class="admin-nav">
          <button class="${admin.tab === 'dashboard' ? 'active' : ''}" onclick="setTab('dashboard')">${navIcon("home")}Dashboard</button>
          <button class="${admin.tab === 'orders' ? 'active' : ''}" onclick="setTab('orders')">${navIcon("bag")}Pedidos</button>
          <button class="${admin.tab === 'products' ? 'active' : ''}" onclick="setTab('products')">${navIcon("cube")}Produtos</button>
          <button class="${admin.tab === 'customers' ? 'active' : ''}" onclick="setTab('customers')">${navIcon("users")}Clientes</button>
          <button class="${admin.tab === 'caixa' ? 'active' : ''}" onclick="setTab('caixa')">${navIcon("wallet")}Caixa</button>
          <button class="${admin.tab === 'financeiro' ? 'active' : ''}" onclick="setTab('financeiro')">${navIcon("chart")}Financeiro</button>
          <button class="${admin.tab === 'estoque' ? 'active' : ''}" onclick="setTab('estoque')">${navIcon("box")}Estoque</button>
          <button class="${admin.tab === 'receitas' ? 'active' : ''}" onclick="setTab('receitas')">${navIcon("book")}Receitas</button>
          <button class="${admin.tab === 'precificacao' ? 'active' : ''}" onclick="setTab('precificacao')">${navIcon("calc")}Precificação</button>
          <button class="${admin.tab === 'calendario' ? 'active' : ''}" onclick="setTab('calendario')">${navIcon("calendar")}Calendário</button>
          <button class="${admin.tab === 'loyalty' ? 'active' : ''}" onclick="setTab('loyalty')">${navIcon("crown")}Fidelidade</button>
          <button class="${admin.tab === 'rewards' ? 'active' : ''}" onclick="setTab('rewards')">${navIcon("gift")}Mimos</button>
        </nav>
        <a href="../index.html" target="_blank" style="margin:0 12px 8px;color:var(--muted);font-size:12.5px;text-align:center;text-decoration:underline;">Ver site</a>
        <button class="admin-logout" onclick="handleAdminLogout()">Sair</button>
      </aside>
      <main class="admin-main" id="adminMain"><div class="center-msg">Carregando...</div></main>
    </div>
  `;
  loadTab();
}
function setTab(tab) { admin.tab = tab; renderShell(); }

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
    else if (admin.tab === "receitas") await loadReceitas(main);
    else if (admin.tab === "precificacao") await loadPrecificacao(main);
    else if (admin.tab === "calendario") await loadCalendario(main);
    else if (admin.tab === "loyalty") await loadLoyalty(main);
    else if (admin.tab === "rewards") await loadRewards(main);
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="error-box">Erro ao carregar: ${e.message}</div>`;
  }
}

/* ---------------- DASHBOARD ---------------- */
async function loadDashboard(main) {
  const { data: orders } = await sb.from("orders").select("*");
  const { data: customers } = await sb.from("customers").select("id");
  const { data: loyalty } = await sb.from("loyalty_cards").select("customer_id");
  const { data: ingredients } = await sb.from("ingredients").select("name, unit, current_stock, min_stock");

  const active = (orders || []).filter(o => o.status !== "cancelled");
  const now = new Date();
  const monthOrders = active.filter(o => {
    const d = new Date(o.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalRevenue = active.reduce((s, o) => s + Number(o.total || 0), 0);
  const monthRevenue = monthOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const avgTicket = active.length ? totalRevenue / active.length : 0;
  const countByStatus = (s) => (orders || []).filter(o => o.status === s).length;
  const lowStock = (ingredients || []).filter(i => Number(i.current_stock) <= Number(i.min_stock));

  const stats = [
    ["Receita do mês", fmt(monthRevenue)],
    ["Receita total", fmt(totalRevenue)],
    ["Total de pedidos", (orders || []).length],
    ["Ticket médio", fmt(avgTicket)],
    ["Clientes cadastrados", (customers || []).length],
    ["Clientes fidelidade", (loyalty || []).length],
    ["Pendentes", countByStatus("pending")],
    ["Confirmados", countByStatus("confirmed")],
    ["Em produção", countByStatus("production")],
    ["Concluídos", countByStatus("completed") + countByStatus("delivered")],
    ["Cancelados", countByStatus("cancelled")],
  ];

  const byDate = {};
  active.forEach(o => { if (o.event_date) byDate[o.event_date] = (byDate[o.event_date] || 0) + 1; });
  const dates = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(0, 10);

  main.innerHTML = `
    <div class="admin-topbar"><h1>Dashboard</h1></div>

    ${lowStock.length ? `
      <div class="admin-card" style="border:1.5px solid #F3C0C0;background:#FDEDED">
        <h2 style="color:#B23434;display:flex;align-items:center;gap:8px">⚠️ Estoque baixo</h2>
        <p class="hint" style="margin-bottom:12px">${lowStock.length} item${lowStock.length > 1 ? "ns" : ""} precisa${lowStock.length > 1 ? "m" : ""} de reposição:</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${lowStock.map(i => `
            <div style="background:#fff;border:1px solid #F3C0C0;border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
              <strong>${i.name}</strong>
              <span style="color:#B23434">${i.current_stock} ${i.unit} restantes <span style="color:var(--muted)">(mín. ${i.min_stock} ${i.unit})</span></span>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}

    <div class="stat-grid">
      ${stats.map(([label, value]) => `<div class="stat-card"><div class="label">${label}</div><div class="value">${value}</div></div>`).join("")}
    </div>
    <div class="admin-card">
      <h2>Pedidos por data de entrega</h2>
      ${dates.length ? `
        <table><thead><tr><th>Data do evento</th><th>Pedidos</th></tr></thead><tbody>
          ${dates.map(([d, c]) => `<tr><td>${new Date(d + "T00:00:00").toLocaleDateString("pt-BR")}</td><td>${c} pedido${c > 1 ? "s" : ""}</td></tr>`).join("")}
        </tbody></table>
      ` : `<p class="center-msg">Nenhum evento com data agendada ainda.</p>`}
    </div>
  `;
}

/* ---------------- PEDIDOS ---------------- */
async function loadOrders(main) {
  const { data: orders } = await sb.from("orders").select("*").order("created_at", { ascending: false });
  admin.data.orders = orders || [];
  admin.data.orderFilter = admin.data.orderFilter || "all";
  renderOrdersTable(main);
}

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
  const orders = admin.data.orders.filter(o => filter === "all" ? true : (o.origin || "site") === filter);
  main.innerHTML = `
    <div class="admin-topbar"><h1>Pedidos</h1><button class="btn btn-pink" onclick="openManualOrderForm()">+ Lançar pedido manual</button></div>
    <p class="hint">Pedidos do site e pedidos lançados manualmente (WhatsApp, Instagram, presencial etc). Tudo editável.</p>
    <div class="tabs-row" style="display:flex;gap:8px;margin-bottom:14px">
      <button class="btn ${filter === "all" ? "btn-pink" : "btn-outline"} btn-sm" onclick="setOrderFilter('all')">Todos</button>
      <button class="btn ${filter === "site" ? "btn-pink" : "btn-outline"} btn-sm" onclick="setOrderFilter('site')">Site</button>
      <button class="btn ${filter === "manual" ? "btn-pink" : "btn-outline"} btn-sm" onclick="setOrderFilter('manual')">Manual</button>
    </div>
    <div id="orderFormArea"></div>
    <div class="admin-card">
      ${orders.length ? `
        <table>
          <thead><tr><th>Nº</th><th>Cliente</th><th>Origem</th><th>Total</th><th>Pagamento</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td>${o.order_number}</td>
                <td>${o.customer_name}<br><small style="color:var(--muted)">${o.customer_phone}</small></td>
                <td><span class="badge-status ${o.origin === "manual" ? "pending" : "confirmed"}">${o.origin === "manual" ? "Manual" : "Site"}</span></td>
                <td>${fmt(o.total)}</td>
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
      ` : `<p class="center-msg">Nenhum pedido ainda.</p>`}
    </div>
  `;
}

async function updateOrderStatus(id, status) {
  const { error } = await sb.from("orders").update({ status }).eq("id", id);
  if (error) { console.error(error); alert("Não foi possível atualizar o status."); return; }
  const o = admin.data.orders.find(o => o.id === id);
  if (o) o.status = status;
  if (status === "completed") {
    // a receita automática é criada por um trigger no banco (sem duplicar).
    // só avisamos o usuário aqui.
    setTimeout(() => alert("Pedido marcado como concluído — a receita entra automaticamente no Financeiro."), 50);
  }
}

async function deleteOrder(id) {
  if (!confirm("Tem certeza que deseja excluir este pedido? Essa ação não pode ser desfeita.")) return;
  await sb.from("orders").delete().eq("id", id);
  admin.data.orders = admin.data.orders.filter(o => o.id !== id);
  renderOrdersTable(document.getElementById("adminMain"));
}

const PAYMENT_OPTIONS = ["Pix", "Cartão", "Dinheiro", "Outro"];

function orderFormFields(o) {
  o = o || {};
  return `
    <div class="form-grid">
      <label>Cliente<input type="text" id="ofName" value="${o.customer_name || ""}"></label>
      <label>Telefone/WhatsApp<input type="text" id="ofPhone" value="${o.customer_phone || ""}"></label>
      <label>Produto / descrição<input type="text" id="ofProduct" value="${o.product_desc || (o.items && o.items[0] ? o.items[0].product_name : "") || ""}" placeholder="Ex: 2 caixas de brigadeiro"></label>
      <label>Valor total do pedido (R$)<input type="number" step="0.01" id="ofTotal" value="${o.total || ""}"></label>
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

function checkPaymentSum() {
  const total = Number(document.getElementById("ofTotal").value) || 0;
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
  ["ofTotal", "ofPay1Amount", "ofPay2Amount"].forEach(id => document.getElementById(id).addEventListener("input", checkPaymentSum));
}

async function saveManualOrder() {
  const name = document.getElementById("ofName").value.trim();
  const phone = document.getElementById("ofPhone").value.trim();
  const product = document.getElementById("ofProduct").value.trim();
  const total = Number(document.getElementById("ofTotal").value);
  if (!name || !phone || !total) { alert("Preencha ao menos cliente, telefone e valor total."); return; }

  const payload = {
    origin: "manual",
    customer_name: name,
    customer_phone: phone,
    items: [{ product_name: product || "Pedido manual", category: "manual", quantity: 1, unit_price: total, subtotal: total }],
    total,
    status: document.getElementById("ofStatus").value,
    payment_method_1: document.getElementById("ofPay1").value || null,
    payment_amount_1: Number(document.getElementById("ofPay1Amount").value) || null,
    payment_method_2: document.getElementById("ofPay2").value || null,
    payment_amount_2: Number(document.getElementById("ofPay2Amount").value) || null,
    observations: document.getElementById("ofObs").value.trim() || null,
  };
  const { error } = await sb.from("orders").insert(payload);
  if (error) { console.error(error); alert("Não foi possível salvar o pedido."); return; }
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
  ["ofTotal", "ofPay1Amount", "ofPay2Amount"].forEach(idAttr => document.getElementById(idAttr).addEventListener("input", checkPaymentSum));
}

async function saveOrderEdit(id) {
  const payload = {
    customer_name: document.getElementById("ofName").value.trim(),
    customer_phone: document.getElementById("ofPhone").value.trim(),
    total: Number(document.getElementById("ofTotal").value),
    status: document.getElementById("ofStatus").value,
    payment_method_1: document.getElementById("ofPay1").value || null,
    payment_amount_1: Number(document.getElementById("ofPay1Amount").value) || null,
    payment_method_2: document.getElementById("ofPay2").value || null,
    payment_amount_2: Number(document.getElementById("ofPay2Amount").value) || null,
    observations: document.getElementById("ofObs").value.trim() || null,
  };
  const { error } = await sb.from("orders").update(payload).eq("id", id);
  if (error) { console.error(error); alert("Não foi possível salvar as alterações."); return; }
  document.getElementById("orderFormArea").innerHTML = "";
  await loadOrders(document.getElementById("adminMain"));
}

/* ---------------- PRODUTOS ---------------- */
async function loadProducts(main) {
  const { data: products } = await sb.from("products").select("*").order("category").order("sort_order");
  admin.data.products = products || [];
  renderProductsTable(main);
}
function renderProductsTable(main) {
  const products = admin.data.products;
  main.innerHTML = `
    <div class="admin-topbar"><h1>Produtos</h1><button class="btn btn-pink" onclick="openProductForm()">+ Novo produto</button></div>
    <div id="productFormArea"></div>
    <div class="admin-card">
      ${products.length ? `
        <table>
          <thead><tr><th></th><th>Nome</th><th>Categoria</th><th>Preço</th><th>Ativo</th><th></th></tr></thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td>${p.image_url ? `<img class="img-thumb" src="${p.image_url}" onerror="this.style.display='none'">` : ""}</td>
                <td>${p.name}</td>
                <td>${p.category === "brigadeiro" ? "Brigadeiro" : "Geladinho"}</td>
                <td>${fmt(p.price)}</td>
                <td>${p.active ? "Sim" : "Não"}</td>
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
function openProductForm(id) {
  const p = id ? admin.data.products.find(p => p.id === id) : null;
  document.getElementById("productFormArea").innerHTML = `
    <div class="admin-card">
      <h2>${p ? "Editar produto" : "Novo produto"}</h2>
      <div class="form-grid">
        <label>Nome<input id="pfName" value="${p ? p.name : ""}"></label>
        <label>Categoria
          <select id="pfCategory">
            <option value="brigadeiro" ${p && p.category === "brigadeiro" ? "selected" : ""}>Brigadeiro</option>
            <option value="geladinho" ${p && p.category === "geladinho" ? "selected" : ""}>Geladinho</option>
          </select>
        </label>
        <label>Preço (R$)<input id="pfPrice" type="number" step="0.10" value="${p ? p.price : ""}"></label>
        <label>Ordem de exibição<input id="pfSort" type="number" value="${p ? p.sort_order : 0}"></label>
      </div>
      <label style="display:block;margin-top:10px">Descrição<textarea id="pfDesc" rows="2">${p ? p.description || "" : ""}</textarea></label>

      <div class="photo-upload-row">
        <div class="photo-upload-box">
          <p class="photo-upload-label">Foto inteira</p>
          <div id="pfImagePreview" class="photo-preview">${p && p.image_url ? productImagePreviewHTML(p.image_url, p, "primary") : "Sem foto"}</div>
          <input type="hidden" id="pfImage" value="${p ? p.image_url || "" : ""}">
          <input type="file" accept="image/*" id="pfImageFile" onchange="handlePhotoUpload(this, 'pfImage')">
          <button type="button" class="btn btn-outline btn-sm crop-open-btn" onclick="openImageCropper('pfImage','Foto inteira')" ${p && p.image_url ? "" : "disabled"}>✂ Ajustar foto</button>
          ${imageAdjustControlsHTML(p, "primary")}
          <p id="pfImageStatus" class="photo-status"></p>
        </div>
        <div class="photo-upload-box">
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
        <input id="${prefix}Scale" type="range" min="0.5" max="2" step="0.01" value="${scale}" oninput="updateProductImagePreview('${prefix}')">
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
  return `<img src="${url}" style="--img-scale:${scale};--img-x:${x}%;--img-y:${y}%">`;
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
  imageCropper.scale = imageSetting(p, scaleKey, 1);
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
          <input id="cropperZoom" type="range" min="0.5" max="3" step="0.01" value="${imageCropper.scale}">
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
    previewEl.innerHTML = `<img src="${urlData.publicUrl}" style="--img-scale:1;--img-x:50%;--img-y:50%">`;
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
    image_url_2: document.getElementById("pfImage2").value.trim(),
    image_scale: Number(document.getElementById("pfImageScale")?.value) || 1,
    image_position_x: Number(document.getElementById("pfImageX")?.value) || 50,
    image_position_y: Number(document.getElementById("pfImageY")?.value) || 50,
    image2_scale: Number(document.getElementById("pfImage2Scale")?.value) || 1,
    image2_position_x: Number(document.getElementById("pfImage2X")?.value) || 50,
    image2_position_y: Number(document.getElementById("pfImage2Y")?.value) || 50,
    active: document.getElementById("pfActive").checked,
  };
  if (id) await sb.from("products").update(payload).eq("id", id);
  else await sb.from("products").insert(payload);
  document.getElementById("productFormArea").innerHTML = "";
  await loadProducts(document.getElementById("adminMain"));
}
async function deleteProduct(id) {
  if (!confirm("Excluir este produto?")) return;
  await sb.from("products").delete().eq("id", id);
  admin.data.products = admin.data.products.filter(p => p.id !== id);
  renderProductsTable(document.getElementById("adminMain"));
}

/* ---------------- CLIENTES ---------------- */

async function loadCustomers(main) {
  const [{ data: customers, error: cErr }, { data: cards, error: lErr }] = await Promise.all([
    sb.from("customers").select("*").order("full_name", { ascending: true }),
    sb.from("loyalty_cards").select("*"),
  ]);
  if (cErr) throw cErr;
  if (lErr) throw lErr;
  admin.data.allCustomers = customers || [];
  admin.data.loyalty = cards || [];
  renderCustomersTable(main);
}

function renderCustomersTable(main) {
  const list = admin.data.allCustomers;
  main.innerHTML = `
    <div class="admin-topbar"><h1>Clientes</h1></div>
    <div id="customerFormArea"></div>
    <div class="admin-card">
      ${list.length ? `
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Pontos</th><th></th></tr></thead>
          <tbody>
            ${list.map(c => {
              const card = admin.data.loyalty.find(l => l.customer_id === c.id);
              const points = card ? Number(card.points || 0) : 0;
              return `
                <tr>
                  <td><strong>${c.full_name || "—"}</strong></td>
                  <td>${c.email || "—"}</td>
                  <td>${c.phone || "—"}</td>
                  <td><strong>${points}</strong> <small>pontos</small></td>
                  <td><button class="btn btn-outline btn-sm" onclick="openCustomerForm('${c.id}')">Gerenciar</button></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      ` : `<p class="center-msg">Nenhum cliente cadastrado.</p>`}
    </div>
  `;
}

function openCustomerForm(id) {
  const c = admin.data.allCustomers.find(c => c.id === id);
  if (!c) return;
  const card = admin.data.loyalty.find(l => l.customer_id === c.id);
  const points = card ? Number(card.points || 0) : 0;
  document.getElementById("customerFormArea").innerHTML = `
    <div class="admin-card">
      <h2>Gerenciar cliente</h2>
      <div class="form-grid">
        <label>Nome completo<input id="cfName" value="${c.full_name || ""}"></label>
        <label>Gênero
          <select id="cfGender">
            <option value="" ${!c.gender ? "selected" : ""}>Prefiro não informar</option>
            <option value="feminino" ${c.gender === "feminino" ? "selected" : ""}>Feminino</option>
            <option value="masculino" ${c.gender === "masculino" ? "selected" : ""}>Masculino</option>
          </select>
        </label>
        <label>E-mail (não editável aqui)<input value="${c.email || ""}" disabled></label>
        <label>Telefone<input id="cfPhone" value="${c.phone || ""}"></label>
        <label>CEP<input id="cfCep" value="${c.cep || ""}"></label>
        <label>Rua<input id="cfStreet" value="${c.street || ""}"></label>
        <label>Número<input id="cfNumber" value="${c.number || ""}"></label>
        <label>Complemento<input id="cfComplement" value="${c.complement || ""}"></label>
        <label>Bairro<input id="cfNeighborhood" value="${c.neighborhood || ""}"></label>
        <label>Cidade<input id="cfCity" value="${c.city || ""}"></label>
        <label>Estado<input id="cfState" value="${c.state || ""}" maxlength="2"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveCustomerProfile('${c.id}')">Salvar alterações</button>
        <button class="btn btn-outline" onclick="document.getElementById('customerFormArea').innerHTML=''">Cancelar</button>
      </div>

      <div style="margin-top:22px;padding-top:18px;border-top:1px solid var(--border)">
        <strong>Pontos de fidelidade — saldo atual: ${points}</strong>
        <div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap">
          <input id="cfPointsDelta" type="number" placeholder="Quantidade" style="width:120px;border:1.5px solid var(--border);border-radius:10px;padding:9px 11px;">
          <button class="btn btn-pink btn-sm" onclick="adjustCustomerPoints('${c.id}', 1)">+ Adicionar</button>
          <button class="btn btn-outline btn-sm" onclick="adjustCustomerPoints('${c.id}', -1)">− Remover</button>
          <button class="btn btn-outline btn-sm" onclick="resetLoyaltyPoints('${c.id}')">Zerar pontos</button>
        </div>
      </div>

      <div style="margin-top:22px;padding-top:18px;border-top:1px solid var(--border)">
        <strong>Senha de acesso</strong>
        <div style="margin-top:8px;color:var(--muted);font-size:13px">
          Por segurança, não é possível definir a senha diretamente por aqui. Você pode enviar um e-mail pro cliente com um link pra ele criar uma nova senha.
        </div>
        <button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="sendCustomerPasswordReset('${c.email}')">Enviar link de redefinição de senha</button>
      </div>
    </div>
  `;
}

async function saveCustomerProfile(id) {
  const payload = {
    full_name: document.getElementById("cfName").value.trim(),
    gender: document.getElementById("cfGender").value || null,
    phone: document.getElementById("cfPhone").value.trim(),
    cep: document.getElementById("cfCep").value.trim(),
    street: document.getElementById("cfStreet").value.trim(),
    number: document.getElementById("cfNumber").value.trim(),
    complement: document.getElementById("cfComplement").value.trim(),
    neighborhood: document.getElementById("cfNeighborhood").value.trim(),
    city: document.getElementById("cfCity").value.trim(),
    state: document.getElementById("cfState").value.trim(),
  };
  const { error } = await sb.from("customers").update(payload).eq("id", id);
  if (error) {
    console.error(error);
    alert("Não foi possível salvar as alterações.");
    return;
  }
  alert("Dados do cliente atualizados.");
  await loadCustomers(document.getElementById("adminMain"));
}

async function adjustCustomerPoints(customerId, sign) {
  const raw = Number(document.getElementById("cfPointsDelta").value);
  if (!raw || raw <= 0) {
    alert("Informe uma quantidade de pontos maior que zero.");
    return;
  }
  const card = admin.data.loyalty.find(l => l.customer_id === customerId);
  const current = card ? Number(card.points || 0) : 0;
  const next = Math.max(0, current + sign * raw);

  if (card) {
    const { error } = await sb.from("loyalty_cards").update({ points: next }).eq("customer_id", customerId);
    if (error) { console.error(error); alert("Não foi possível atualizar os pontos."); return; }
  } else {
    const { error } = await sb.from("loyalty_cards").insert({ customer_id: customerId, points: next });
    if (error) { console.error(error); alert("Não foi possível criar a carteira de pontos."); return; }
  }
  await loadCustomers(document.getElementById("adminMain"));
  openCustomerForm(customerId);
}

async function sendCustomerPasswordReset(email) {
  if (!email) { alert("Cliente sem e-mail cadastrado."); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/",
  });
  if (error) {
    console.error(error);
    alert("Não foi possível enviar o e-mail de redefinição.");
    return;
  }
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

  main.innerHTML = `
    <div class="admin-topbar"><h1>Caixa</h1><button class="btn btn-pink" onclick="openCashForm()">+ Nova movimentação</button></div>
    <p class="hint">Controle 100% manual — nada aqui é lançado sozinho pelo sistema.</p>

    <div class="stat-grid">
      <div class="stat-card"><div class="label">Entradas</div><div class="value" style="color:#2E7D46">${fmt(totalEntradas)}</div></div>
      <div class="stat-card"><div class="label">Saídas</div><div class="value" style="color:#B23434">${fmt(totalSaidas)}</div></div>
      <div class="stat-card"><div class="label">Retiradas</div><div class="value" style="color:#6A2CC4">${fmt(totalRetiradas)}</div></div>
      <div class="stat-card"><div class="label">Saldo</div><div class="value">${fmt(saldo)}</div></div>
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
  if (!confirm(`Excluir ${ids.length} movimentação(ões) selecionada(s)? Essa ação não pode ser desfeita.`)) return;
  const { error } = await sb.from("cash_entries").delete().in("id", ids);
  if (error) { console.error(error); alert("Não foi possível excluir as movimentações selecionadas."); return; }
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
  renderFinanceiro(main);
}

function renderFinanceiro(main) {
  const revenue = admin.data.revenueEntries;
  const expenses = admin.data.expenseEntries;
  const totalFaturamento = revenue.reduce((s, r) => s + Number(r.amount), 0);
  const totalDespesas = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const resultado = totalFaturamento - totalDespesas;

  main.innerHTML = `
    <div class="admin-topbar"><h1>Financeiro</h1><button class="btn btn-pink" onclick="openFinanceForm()">+ Lançamento manual</button></div>
    <p class="hint">Quando um pedido do site é marcado como "Concluído", a receita entra aqui sozinha — sem duplicar. Pedidos de fora do site e despesas são lançados manualmente.</p>

    <div class="stat-grid">
      <div class="stat-card"><div class="label">Faturamento</div><div class="value" style="color:#2E7D46">${fmt(totalFaturamento)}</div></div>
      <div class="stat-card"><div class="label">Despesas</div><div class="value" style="color:#B23434">${fmt(totalDespesas)}</div></div>
      <div class="stat-card"><div class="label">Resultado</div><div class="value">${fmt(resultado)}</div></div>
    </div>

    <div id="financeFormArea"></div>

    <div class="admin-card">
      <h2>Faturamento</h2>
      ${revenue.length ? `
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Origem</th><th>Valor</th><th></th></tr></thead>
          <tbody>
            ${revenue.map(r => `
              <tr>
                <td>${new Date(r.entry_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                <td>${r.description}</td>
                <td><span class="badge-status ${r.source === "site" ? "confirmed" : "pending"}">${r.source === "site" ? "Automático (site)" : "Manual"}</span></td>
                <td><strong style="color:#2E7D46">${fmt(r.amount)}</strong></td>
                <td>${r.source === "manual" ? `<button class="btn btn-outline btn-sm" onclick="deleteRevenueEntry('${r.id}')">Excluir</button>` : ""}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `<p class="center-msg">Nenhuma receita ainda.</p>`}
    </div>

    <div class="admin-card">
      <h2>Despesas</h2>
      ${expenses.length ? `
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th></th></tr></thead>
          <tbody>
            ${expenses.map(e => `
              <tr>
                <td>${new Date(e.entry_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                <td>${e.description}</td>
                <td>${e.category || "—"}</td>
                <td><strong style="color:#B23434">${fmt(e.amount)}</strong></td>
                <td><button class="btn btn-outline btn-sm" onclick="deleteExpenseEntry('${e.id}')">Excluir</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `<p class="center-msg">Nenhuma despesa ainda.</p>`}
    </div>
  `;
}

function openFinanceForm() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("financeFormArea").innerHTML = `
    <div class="admin-card">
      <h2>Lançamento financeiro manual</h2>
      <div class="form-grid">
        <label>Tipo
          <select id="feType">
            <option value="receita">Receita (venda fora do site)</option>
            <option value="despesa">Despesa</option>
          </select>
        </label>
        <label>Data<input type="date" id="feDate" value="${today}"></label>
        <label>Categoria (opcional, só despesa)<input type="text" id="feCategory" placeholder="Ex: Ingredientes, Embalagem"></label>
        <label>Valor (R$)<input type="number" step="0.01" min="0" id="feAmount" placeholder="0,00"></label>
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

  if (type === "receita") {
    const { error } = await sb.from("revenue_entries").insert({ entry_date, description, amount, source: "manual" });
    if (error) { console.error(error); alert("Não foi possível salvar a receita."); return; }
  } else {
    const category = document.getElementById("feCategory").value.trim() || null;
    const { error } = await sb.from("expense_entries").insert({ entry_date, description, amount, category });
    if (error) { console.error(error); alert("Não foi possível salvar a despesa."); return; }
  }
  document.getElementById("financeFormArea").innerHTML = "";
  await loadFinanceiro(document.getElementById("adminMain"));
}

async function deleteRevenueEntry(id) {
  if (!confirm("Excluir esta receita manual?")) return;
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
    <div class="admin-topbar"><h1>Estoque</h1><button class="btn btn-pink" onclick="openIngredientForm()">+ Novo ingrediente</button></div>

    <div class="stat-grid">
      <div class="stat-card"><div class="label">Valor em estoque</div><div class="value" style="font-size:24px">${fmt(valorTotalEstoque)}</div></div>
      <div class="stat-card"><div class="label">Itens cadastrados</div><div class="value">${ingredients.length}</div></div>
      <div class="stat-card"><div class="label">Abaixo do mínimo</div><div class="value" style="color:#B23434">${ingredients.filter(i => Number(i.current_stock) <= Number(i.min_stock)).length}</div></div>
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
              const low = Number(i.current_stock) <= Number(i.min_stock);
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
      <div class="admin-topbar" style="margin-bottom:6px"><h2 style="margin:0">${recipe.name}</h2><button class="btn btn-outline btn-sm" onclick="document.getElementById('recipeFormArea').innerHTML=''">Fechar</button></div>

      <div class="form-grid" style="margin-bottom:14px">
        <label>Rendimento (quantidade)<input type="number" step="0.01" id="rpEditYieldQty" value="${recipe.yield_qty}"></label>
        <label>Unidade do rendimento
          <select id="rpEditYieldUnit">${YIELD_UNITS.map(u => `<option value="${u}" ${u === recipe.yield_unit ? "selected" : ""}>${u}</option>`).join("")}</select>
        </label>
        <button class="btn btn-outline btn-sm" style="align-self:end" onclick="saveRecipeYield('${recipeId}')">Salvar rendimento</button>
      </div>

      <table>
        <thead><tr><th>Ingrediente</th><th>Quantidade</th><th>Custo</th><th></th></tr></thead>
        <tbody>
          ${(recipe.recipe_ingredients || []).map(ri => `
            <tr>
              <td>${ri.ingredients ? ri.ingredients.name : "—"}</td>
              <td>${ri.quantity} ${ri.ingredients ? ri.ingredients.unit : ""}</td>
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
      </div>
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

function renderPrecificacaoList(main) {
  const pricings = admin.data.pricings;
  main.innerHTML = `
    <div class="admin-topbar"><h1>Precificação</h1><button class="btn btn-pink" onclick="openPricingForm()">+ Nova precificação</button></div>
    <p class="hint">Cada item pode ser um ingrediente direto ou uma receita/sub-receita já cadastrada.</p>
    <div id="pricingFormArea"></div>
    <div class="admin-card">
      ${pricings.length ? `
        <table>
          <thead><tr><th>Produto</th><th>Custo base</th><th>Markup</th><th>Preço de venda</th><th></th></tr></thead>
          <tbody>
            ${pricings.map(p => {
              const base = pricingBaseCost(p);
              const adjusted = base * (1 + Number(p.variable_pct) / 100);
              const unitCost = p.produced_qty > 0 ? adjusted / p.produced_qty : 0;
              const sale = unitCost * (1 + Number(p.markup_pct) / 100);
              return `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td>${fmt(unitCost)}/un.</td>
                  <td>${p.markup_pct}%</td>
                  <td><strong>${fmt(sale)}</strong></td>
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
          <label>Quantidade produzida<input type="number" step="0.01" id="pcProducedQty" value="${p.produced_qty}"></label>
          <label>Custos variáveis (%)<input type="number" step="1" id="pcVariablePct" value="${p.variable_pct}"></label>
          <label>Markup sobre o custo (%)<input type="number" step="1" id="pcMarkupPct" value="${p.markup_pct}"></label>
          <label>Preço de venda manual (R$, opcional)<input type="number" step="0.01" id="pcManualPrice" value="${p.manual_sale_price ?? ""}" placeholder="Deixe em branco pra usar o markup"></label>
        </div>
        <button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="savePricingCalc('${pricingId}')">Recalcular e salvar</button>

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
const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push("");
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  main.innerHTML = `
    <div class="admin-topbar"><h1>Calendário de Produção</h1><button class="btn btn-pink" onclick="openEventForm()">+ Novo evento</button></div>
    <p class="hint">Planner 100% manual — nada aqui é preenchido automaticamente pelos pedidos.</p>

    <div class="admin-card">
      <div class="admin-topbar" style="margin-bottom:14px">
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-outline btn-sm" onclick="changeCalYear(-1)">«</button>
          <button class="btn btn-outline btn-sm" onclick="changeCalMonth(-1)">‹</button>
          <h2 style="margin:0;min-width:170px;text-align:center">${MONTH_NAMES_CAL[month]} ${year}</h2>
          <button class="btn btn-outline btn-sm" onclick="changeCalMonth(1)">›</button>
          <button class="btn btn-outline btn-sm" onclick="changeCalYear(1)">»</button>
        </div>
        <button class="btn btn-outline btn-sm" onclick="goToCalToday()">Hoje</button>
      </div>

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
              ${dayEvents.map(e => `
                <div class="cal-event" style="background:${CAL_CATEGORY_COLOR[e.category] || CAL_CATEGORY_COLOR.outro}" onclick="openEventForm('${e.id}')" title="${e.title}">
                  ${e.event_time ? e.event_time.slice(0, 5) + " " : ""}${e.title}
                </div>
              `).join("")}
            </div>
          `;
        }).join("")}
      </div>
    </div>

    <div id="eventFormArea"></div>

    <div class="admin-card">
      <h2>Eventos de ${MONTH_NAMES_CAL[month]}</h2>
      ${events.length ? events.sort((a, b) => a.event_date.localeCompare(b.event_date)).map(e => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="width:10px;height:10px;border-radius:50%;background:${CAL_CATEGORY_COLOR[e.category] || CAL_CATEGORY_COLOR.outro};display:inline-block;flex-shrink:0"></span>
            <div>
              <strong>${new Date(e.event_date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}${e.event_time ? " — " + e.event_time.slice(0, 5) : ""} · ${e.title}</strong>
              ${e.description ? `<div class="hint" style="margin:2px 0 0">${e.description}</div>` : ""}
            </div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="openEventForm('${e.id}')">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="deleteEvent('${e.id}')">Excluir</button>
          </div>
        </div>
      `).join("") : `<p class="center-msg">Nenhum evento cadastrado para ${MONTH_NAMES_CAL[month]}/${year}.</p>`}
    </div>
  `;
}

function openEventForm(eventId) {
  const e = eventId ? admin.data.productionEvents.find(e => e.id === eventId) : null;
  const defaultDate = `${admin.data.calYear}-${String(admin.data.calMonth + 1).padStart(2, "0")}-01`;
  document.getElementById("eventFormArea").innerHTML = `
    <div class="admin-card">
      <h2>${e ? "Editar evento" : "Novo evento"}</h2>
      <div class="form-grid">
        <label>Data<input type="date" id="evDate" value="${e ? e.event_date : defaultDate}"></label>
        <label>Horário (opcional)<input type="time" id="evTime" value="${e && e.event_time ? e.event_time.slice(0, 5) : ""}"></label>
        <label>Categoria
          <select id="evCategory">
            ${Object.entries(CAL_CATEGORY_LABEL).map(([k, v]) => `<option value="${k}" ${e && e.category === k ? "selected" : ""}>${v}</option>`).join("")}
          </select>
        </label>
        <label class="span-2">Título<input type="text" id="evTitle" value="${e ? e.title : ""}" placeholder="Ex: Fazer massa do bolo da Ana"></label>
        <label class="span-2">Descrição (opcional)<input type="text" id="evDescription" value="${e ? e.description || "" : ""}"></label>
        <label class="span-2">Observação (opcional)<input type="text" id="evNote" value="${e ? e.note || "" : ""}"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveEvent(${e ? `'${e.id}'` : "null"})">Salvar</button>
        ${e ? `<button class="btn btn-danger" onclick="deleteEvent('${e.id}')">Excluir</button>` : ""}
        <button class="btn btn-outline" onclick="document.getElementById('eventFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>
  `;
}

async function saveEvent(eventId) {
  const payload = {
    event_date: document.getElementById("evDate").value,
    event_time: document.getElementById("evTime").value || null,
    category: document.getElementById("evCategory").value,
    title: document.getElementById("evTitle").value.trim(),
    description: document.getElementById("evDescription").value.trim() || null,
    note: document.getElementById("evNote").value.trim() || null,
  };
  if (!payload.event_date || !payload.title) { alert("Preencha data e título."); return; }

  const { error } = eventId
    ? await sb.from("production_events").update(payload).eq("id", eventId)
    : await sb.from("production_events").insert(payload);
  if (error) { console.error(error); alert("Não foi possível salvar o evento."); return; }
  document.getElementById("eventFormArea").innerHTML = "";
  await loadCalendario(document.getElementById("adminMain"));
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

      <label style="display:block;margin-top:10px">
        URL da imagem
        <input
          id="rfImage"
          value="${reward ? reward.image_url || "" : ""}"
          placeholder="https://..."
        >
      </label>

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
