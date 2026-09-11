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
          <button class="${admin.tab === 'customers' ? 'active' : ''}" onclick="setTab('customers')">Clientes</button>
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
    else if (admin.tab === "customers") await loadCustomers(main);
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
