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
function renderShell() {
  root.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-logo"><img class="seal" src="../images/brand/icon.png" alt="Gizona Doces"><span>Painel Admin<br>Gizona Doces</span></div>
        <nav class="admin-nav">
          <button class="${admin.tab === 'dashboard' ? 'active' : ''}" onclick="setTab('dashboard')">Dashboard</button>
          <button class="${admin.tab === 'orders' ? 'active' : ''}" onclick="setTab('orders')">Pedidos</button>
          <button class="${admin.tab === 'products' ? 'active' : ''}" onclick="setTab('products')">Produtos</button>
          <button class="${admin.tab === 'loyalty' ? 'active' : ''}" onclick="setTab('loyalty')">Fidelidade</button>
          <button class="${admin.tab === 'rewards' ? 'active' : ''}" onclick="setTab('rewards')">Mimos</button>
        </nav>
        <a href="../index.html" target="_blank" style="margin:0 12px 8px;color:#F1D9E1;font-size:12.5px;text-align:center;text-decoration:underline;">Ver site</a>
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

  // Calendário simples: pedidos agrupados por data do evento
  const byDate = {};
  active.forEach(o => { if (o.event_date) byDate[o.event_date] = (byDate[o.event_date] || 0) + 1; });
  const dates = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(0, 10);

  main.innerHTML = `
    <div class="admin-topbar"><h1>Dashboard</h1></div>
    <div class="stat-grid">
      ${stats.map(([label, value]) => `<div class="stat-card"><div class="label">${label}</div><div class="value">${value}</div></div>`).join("")}
    </div>
    <div class="admin-card">
      <h2>Calendário de produção</h2>
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
  renderOrdersTable(main);
}
function renderOrdersTable(main) {
  const orders = admin.data.orders;
  main.innerHTML = `
    <div class="admin-topbar"><h1>Pedidos</h1></div>
    <div class="admin-card">
      ${orders.length ? `
        <table>
          <thead><tr><th>Nº</th><th>Cliente</th><th>Data evento</th><th>Total</th><th>Status</th><th>Pagamento</th><th></th></tr></thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td>${o.order_number}</td>
                <td>${o.customer_name}<br><small style="color:var(--muted)">${o.customer_phone}</small></td>
                <td>${o.event_date ? new Date(o.event_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                <td>${fmt(o.total)}</td>
                <td>
                  <select onchange="updateOrderStatus('${o.id}', this.value)">
                    ${Object.entries(STATUS_LABEL).map(([k, v]) => `<option value="${k}" ${o.status === k ? "selected" : ""}>${v}</option>`).join("")}
                  </select>
                </td>
                <td>${o.payment_method === "pix" ? "PIX" : o.payment_method === "credito" ? "Crédito" : "—"}</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteOrder('${o.id}')">Excluir</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `<p class="center-msg">Nenhum pedido ainda.</p>`}
    </div>
  `;
}
async function updateOrderStatus(id, status) {
  await sb.from("orders").update({ status }).eq("id", id);
  const o = admin.data.orders.find(o => o.id === id);
  if (o) o.status = status;
}
async function deleteOrder(id) {
  if (!confirm("Tem certeza que deseja excluir este pedido? Essa ação não pode ser desfeita.")) return;
  await sb.from("orders").delete().eq("id", id);
  admin.data.orders = admin.data.orders.filter(o => o.id !== id);
  renderOrdersTable(document.getElementById("adminMain"));
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
          <div id="pfImagePreview" class="photo-preview">${p && p.image_url ? `<img src="${p.image_url}">` : "Sem foto"}</div>
          <input type="hidden" id="pfImage" value="${p ? p.image_url || "" : ""}">
          <input type="file" accept="image/*" id="pfImageFile" onchange="handlePhotoUpload(this, 'pfImage')">
          <p id="pfImageStatus" class="photo-status"></p>
        </div>
        <div class="photo-upload-box">
          <p class="photo-upload-label">Foto mordida</p>
          <div id="pfImage2Preview" class="photo-preview">${p && p.image_url_2 ? `<img src="${p.image_url_2}">` : "Sem foto"}</div>
          <input type="hidden" id="pfImage2" value="${p ? p.image_url_2 || "" : ""}">
          <input type="file" accept="image/*" id="pfImage2File" onchange="handlePhotoUpload(this, 'pfImage2')">
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

/* ---------------- Recortador de foto (moldura + zoom + arrastar) ---------------- */
const CROP_VIEWPORT = 280;
const CROP_OUTPUT = 800;
let cropState = null;

function handlePhotoUpload(inputEl, targetFieldId) {
  const file = inputEl.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => openCropper(e.target.result, targetFieldId);
  reader.readAsDataURL(file);
  inputEl.value = "";
}

function openCropper(dataUrl, targetFieldId) {
  const img = new Image();
  img.onload = () => {
    const baseScale = Math.max(CROP_VIEWPORT / img.naturalWidth, CROP_VIEWPORT / img.naturalHeight);
    cropState = { img, targetFieldId, baseScale, zoom: 1, offsetX: 0, offsetY: 0, dragging: false };
    renderCropperModal();
  };
  img.src = dataUrl;
}

function renderCropperModal() {
  const old = document.getElementById("cropperModal");
  if (old) old.remove();
  const modal = document.createElement("div");
  modal.id = "cropperModal";
  modal.className = "cropper-overlay";
  modal.innerHTML = `
    <div class="cropper-box">
      <h3>Ajuste a foto</h3>
      <p class="cropper-hint">Arraste pra posicionar e use o controle abaixo pra dar zoom. A área dentro da moldura é o que vai aparecer no site.</p>
      <div class="cropper-viewport" id="cropperViewport">
        <img id="cropperImg" src="${cropState.img.src}" draggable="false">
        <div class="cropper-guide"></div>
      </div>
      <input type="range" id="cropperZoom" min="1" max="3" step="0.01" value="1">
      <div class="cropper-actions">
        <button class="btn btn-outline" onclick="closeCropper()">Cancelar</button>
        <button class="btn btn-pink" onclick="confirmCrop()">Usar essa foto</button>
      </div>
      <p id="cropperStatus" class="photo-status"></p>
    </div>
  `;
  document.body.appendChild(modal);
  updateCropperTransform();
  setupCropperDrag();
  document.getElementById("cropperZoom").addEventListener("input", (e) => {
    cropState.zoom = parseFloat(e.target.value);
    clampCropOffset();
    updateCropperTransform();
  });
}

function updateCropperTransform() {
  const { img, baseScale, zoom, offsetX, offsetY } = cropState;
  const scale = baseScale * zoom;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const el = document.getElementById("cropperImg");
  el.style.width = w + "px";
  el.style.height = h + "px";
  el.style.left = `calc(50% + ${offsetX}px)`;
  el.style.top = `calc(50% + ${offsetY}px)`;
}

function clampCropOffset() {
  const { img, baseScale, zoom } = cropState;
  const scale = baseScale * zoom;
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const maxX = Math.max(0, (w - CROP_VIEWPORT) / 2);
  const maxY = Math.max(0, (h - CROP_VIEWPORT) / 2);
  cropState.offsetX = Math.max(-maxX, Math.min(maxX, cropState.offsetX));
  cropState.offsetY = Math.max(-maxY, Math.min(maxY, cropState.offsetY));
}

function setupCropperDrag() {
  const viewport = document.getElementById("cropperViewport");
  let startX, startY, startOffsetX, startOffsetY;
  const onDown = (clientX, clientY) => {
    cropState.dragging = true;
    startX = clientX; startY = clientY;
    startOffsetX = cropState.offsetX; startOffsetY = cropState.offsetY;
  };
  const onMove = (clientX, clientY) => {
    if (!cropState.dragging) return;
    cropState.offsetX = startOffsetX + (clientX - startX);
    cropState.offsetY = startOffsetY + (clientY - startY);
    clampCropOffset();
    updateCropperTransform();
  };
  const onUp = () => { cropState.dragging = false; };
  viewport.addEventListener("mousedown", (e) => { e.preventDefault(); onDown(e.clientX, e.clientY); });
  window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
  window.addEventListener("mouseup", onUp);
  viewport.addEventListener("touchstart", (e) => { const t = e.touches[0]; onDown(t.clientX, t.clientY); }, { passive: true });
  viewport.addEventListener("touchmove", (e) => { const t = e.touches[0]; onMove(t.clientX, t.clientY); }, { passive: true });
  viewport.addEventListener("touchend", onUp);
}

function closeCropper() {
  const modal = document.getElementById("cropperModal");
  if (modal) modal.remove();
  cropState = null;
}

async function confirmCrop() {
  const { img, baseScale, zoom, offsetX, offsetY, targetFieldId } = cropState;
  const scale = baseScale * zoom;
  const dispW = img.naturalWidth * scale;
  const dispH = img.naturalHeight * scale;
  const imgTopLeftX = CROP_VIEWPORT / 2 + offsetX - dispW / 2;
  const imgTopLeftY = CROP_VIEWPORT / 2 + offsetY - dispH / 2;
  const sx = (0 - imgTopLeftX) / scale;
  const sy = (0 - imgTopLeftY) / scale;
  const sSize = CROP_VIEWPORT / scale;
  const canvas = document.createElement("canvas");
  canvas.width = CROP_OUTPUT; canvas.height = CROP_OUTPUT;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, CROP_OUTPUT, CROP_OUTPUT);
  ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, CROP_OUTPUT, CROP_OUTPUT);
  const statusEl = document.getElementById("cropperStatus");
  statusEl.textContent = "Enviando...";
  canvas.toBlob(async (blob) => {
    try {
      const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await sb.storage.from("photos").upload(fileName, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const { data: urlData } = sb.storage.from("photos").getPublicUrl(fileName);
      document.getElementById(targetFieldId).value = urlData.publicUrl;
      document.getElementById(targetFieldId + "Preview").innerHTML = `<img src="${urlData.publicUrl}">`;
      document.getElementById(targetFieldId + "Status").textContent = `Pronto (${(blob.size / 1024).toFixed(0)} KB)`;
      closeCropper();
    } catch (e) {
      console.error(e);
      statusEl.textContent = "Erro ao enviar. Tente de novo.";
    }
  }, "image/jpeg", 0.85);
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

/* ---------------- FIDELIDADE ---------------- */
async function loadLoyalty(main) {
  const { data: customers } = await sb.from("customers").select("id, full_name, email, phone");
  const { data: cards } = await sb.from("loyalty_cards").select("*");
  admin.data.customers = customers || [];
  admin.data.loyalty = cards || [];
  renderLoyaltyTable(main);
}
function renderLoyaltyTable(main) {
  const rows = admin.data.customers.map(c => {
    const card = admin.data.loyalty.find(l => l.customer_id === c.id);
    return { customer: c, completed: card ? card.completed_orders : 0, hasCard: !!card };
  });
  main.innerHTML = `
    <div class="admin-topbar"><h1>Programa de Fidelidade</h1></div>
    <div class="admin-card">
      ${rows.length ? `
        <table>
          <thead><tr><th>Cliente</th><th>Contato</th><th>Pedidos concluídos</th><th></th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${r.customer.full_name}</td>
                <td>${r.customer.email}<br><small style="color:var(--muted)">${r.customer.phone}</small></td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="adjustLoyalty('${r.customer.id}', -1)">–</button>
                  <strong style="margin:0 8px">${r.completed}</strong>
                  <button class="btn btn-outline btn-sm" onclick="adjustLoyalty('${r.customer.id}', 1)">+</button>
                </td>
                <td>${r.hasCard ? `<button class="btn btn-danger btn-sm" onclick="removeLoyalty('${r.customer.id}')">Zerar</button>` : ""}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `<p class="center-msg">Nenhum cliente cadastrado ainda.</p>`}
    </div>
  `;
}
async function adjustLoyalty(customerId, delta) {
  const card = admin.data.loyalty.find(l => l.customer_id === customerId);
  const newCount = Math.max(0, (card ? card.completed_orders : 0) + delta);
  await sb.from("loyalty_cards").upsert({ customer_id: customerId, completed_orders: newCount }, { onConflict: "customer_id" });
  await loadLoyalty(document.getElementById("adminMain"));
}
async function removeLoyalty(customerId) {
  if (!confirm("Zerar os pontos de fidelidade desse cliente?")) return;
  await sb.from("loyalty_cards").update({ completed_orders: 0 }).eq("customer_id", customerId);
  await loadLoyalty(document.getElementById("adminMain"));
}

/* ---------------- MIMOS ---------------- */
async function loadRewards(main) {
  const { data: rewards } = await sb.from("rewards").select("*");
  admin.data.rewards = rewards || [];
  renderRewardsTable(main);
}
function renderRewardsTable(main) {
  const rewards = admin.data.rewards;
  main.innerHTML = `
    <div class="admin-topbar"><h1>Mimos</h1><button class="btn btn-pink" onclick="openRewardForm()">+ Novo mimo</button></div>
    <div id="rewardFormArea"></div>
    <div class="admin-card">
      ${rewards.length ? `
        <table>
          <thead><tr><th></th><th>Nome</th><th>Pontos necessários</th><th>Ativo</th><th></th></tr></thead>
          <tbody>
            ${rewards.map(r => `
              <tr>
                <td>${r.image_url ? `<img class="img-thumb" src="${r.image_url}" onerror="this.style.display='none'">` : ""}</td>
                <td>${r.name}</td>
                <td>${r.points_required}</td>
                <td>${r.active ? "Sim" : "Não"}</td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="openRewardForm('${r.id}')">Editar</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteReward('${r.id}')">Excluir</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `<p class="center-msg">Nenhum mimo cadastrado.</p>`}
    </div>
  `;
}
function openRewardForm(id) {
  const r = id ? admin.data.rewards.find(r => r.id === id) : null;
  document.getElementById("rewardFormArea").innerHTML = `
    <div class="admin-card">
      <h2>${r ? "Editar mimo" : "Novo mimo"}</h2>
      <div class="form-grid">
        <label>Nome<input id="rfName" value="${r ? r.name : ""}"></label>
        <label>Pontos necessários<input id="rfPoints" type="number" value="${r ? r.points_required : 10}"></label>
      </div>
      <label style="display:block;margin-top:10px">Descrição<textarea id="rfDesc" rows="2">${r ? r.description || "" : ""}</textarea></label>
      <label style="display:block;margin-top:10px">URL da foto<input id="rfImage" value="${r ? r.image_url || "" : ""}"></label>
      <label style="display:flex;flex-direction:row;align-items:center;gap:8px;margin-top:10px">
        <input type="checkbox" id="rfActive" ${!r || r.active ? "checked" : ""} style="width:auto"> Ativo
      </label>
      <div style="margin-top:14px;display:flex;gap:10px">
        <button class="btn btn-pink" onclick="saveReward(${r ? `'${r.id}'` : "null"})">Salvar</button>
        <button class="btn btn-outline" onclick="document.getElementById('rewardFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>
  `;
}
async function saveReward(id) {
  const payload = {
    name: document.getElementById("rfName").value.trim(),
    points_required: parseInt(document.getElementById("rfPoints").value) || 10,
    description: document.getElementById("rfDesc").value.trim(),
    image_url: document.getElementById("rfImage").value.trim(),
    active: document.getElementById("rfActive").checked,
  };
  if (id) await sb.from("rewards").update(payload).eq("id", id);
  else await sb.from("rewards").insert(payload);
  document.getElementById("rewardFormArea").innerHTML = "";
  await loadRewards(document.getElementById("adminMain"));
}
async function deleteReward(id) {
  if (!confirm("Excluir este mimo?")) return;
  await sb.from("rewards").delete().eq("id", id);
  admin.data.rewards = admin.data.rewards.filter(r => r.id !== id);
  renderRewardsTable(document.getElementById("adminMain"));
}
