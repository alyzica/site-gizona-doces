/* GIZONA DOCES — visão administrativa do Clube Fidelidade por pontos */

async function loadLoyalty(main) {
  const [{ data: customers, error: customersError }, { data: cards, error: cardsError }] = await Promise.all([
    sb.from("customers").select("id, full_name, email, phone"),
    sb.from("loyalty_cards").select("*")
  ]);
  if (customersError) throw customersError;
  if (cardsError) throw cardsError;
  admin.data.customers = customers || [];
  admin.data.loyalty = cards || [];
  renderLoyaltyTable(main);
}

function loyaltyRows() {
  return admin.data.customers.map(c => {
    const card = admin.data.loyalty.find(l => l.customer_id === c.id);
    return { customer: c, points: card ? Number(card.points || 0) : 0, completed: card ? Number(card.completed_orders || 0) : 0, hasCard: !!card };
  });
}

function renderLoyaltyTable(main) {
  const rows = loyaltyRows();
  const star = `<svg ${SVG_ATTR} width="13" height="13"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/></svg>`;
  const stepper = (fn, id, value, big) => `
    <span class="lp-stepper ${big ? "big" : ""}">
      <button onclick="${fn}('${id}', -1)" aria-label="Diminuir">−</button>
      <strong>${value}</strong>
      <button class="plus" onclick="${fn}('${id}', 1)" aria-label="Aumentar">+</button>
    </span>`;
  main.innerHTML = `
    <div class="admin-topbar">
      <h1>Programa de Fidelidade</h1>
      <button class="btn btn-pink" onclick="setTab('customers')">+ Novo Cliente</button>
    </div>
    <div id="loyaltyFormArea"></div>
    ${rows.length ? rows.map(r => `
      <div class="admin-card lp-card">
        <div class="lp-head">
          <div>
            <div class="lp-name">${r.customer.full_name || "—"}</div>
            <div class="lp-sub">${r.customer.email || r.customer.phone || "—"}</div>
            <div class="lp-sub">${r.completed} pedido${r.completed === 1 ? "" : "s"} concluído${r.completed === 1 ? "" : "s"}</div>
          </div>
          <div class="lp-actions">
            ${stepper("adjustLoyaltyOrders", r.customer.id, r.completed, false)}
            <button class="icon-btn" title="Editar" onclick="openLoyaltyEdit('${r.customer.id}')">${ICON_PENCIL}</button>
            <button class="icon-btn danger" title="Zerar pontos e pedidos" onclick="resetLoyaltyPoints('${r.customer.id}')">${ICON_TRASH}</button>
          </div>
        </div>
        <div class="lp-points">
          <div><div class="lp-points-t">${star} Pontos</div><div class="lp-sub">R$ 1,00 = 1 ponto</div></div>
          ${stepper("adjustLoyaltyPoints", r.customer.id, r.points, true)}
        </div>
      </div>`).join("") : `<div class="admin-card"><p class="center-msg">Nenhum cliente cadastrado.</p></div>`}
  `;
}

async function saveLoyaltyFields(customerId, fields) {
  const existing = admin.data.loyalty.find(l => l.customer_id === customerId);
  const res = existing
    ? await sb.from("loyalty_cards").update(fields).eq("customer_id", customerId)
    : await sb.from("loyalty_cards").insert({ customer_id: customerId, points: 0, completed_orders: 0, rewards_claimed: 0, ...fields });
  if (res.error) { console.error(res.error); alert("Não foi possível salvar: " + (res.error.message || "")); return false; }
  await loadLoyalty(document.getElementById("adminMain"));
  return true;
}

async function adjustLoyaltyPoints(customerId, delta) {
  const r = loyaltyRows().find(x => x.customer.id === customerId);
  await saveLoyaltyFields(customerId, { points: Math.max(0, r.points + delta * 1) });
}
async function adjustLoyaltyOrders(customerId, delta) {
  const r = loyaltyRows().find(x => x.customer.id === customerId);
  await saveLoyaltyFields(customerId, { completed_orders: Math.max(0, r.completed + delta) });
}

function openLoyaltyEdit(customerId) {
  const r = loyaltyRows().find(x => x.customer.id === customerId);
  if (!r) return;
  document.getElementById("loyaltyFormArea").innerHTML = `
    <div class="admin-card">
      <h2>Editar ${r.customer.full_name || "cliente"}</h2>
      <div class="form-grid">
        <label>Pontos<input type="number" min="0" step="1" id="lfPoints" value="${r.points}"></label>
        <label>Pedidos concluídos<input type="number" min="0" step="1" id="lfOrders" value="${r.completed}"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-pink" onclick="saveLoyaltyEdit('${customerId}')">Salvar</button>
        <button class="btn btn-outline" onclick="document.getElementById('loyaltyFormArea').innerHTML=''">Cancelar</button>
      </div>
    </div>`;
  window.scrollTo(0, 0);
}
async function saveLoyaltyEdit(customerId) {
  await saveLoyaltyFields(customerId, {
    points: Math.max(0, parseInt(document.getElementById("lfPoints").value, 10) || 0),
    completed_orders: Math.max(0, parseInt(document.getElementById("lfOrders").value, 10) || 0),
  });
}

async function resetLoyaltyPoints(customerId) {
  if (!confirm("Zerar os pontos e os pedidos concluídos desse cliente?")) return;
  await saveLoyaltyFields(customerId, { points: 0, completed_orders: 0 });
}
