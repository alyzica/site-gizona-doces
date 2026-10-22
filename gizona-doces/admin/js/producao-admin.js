/* ============================================================
   GIZONA DOCES — Baixa por perda/vencimento, validade, congelados e
   planejamento de produção (painel admin).
   Depende do script supabase/add_baixa_congelados_planejamento.sql.
============================================================ */
const WO_REASON = { vencido: "Vencido", avaria: "Avaria / quebra", erro_producao: "Erro de produção", outro: "Outro" };
const woFmtDate = d => d ? new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("pt-BR") : "—";
const woProdName = id => ([...(admin.data.pAllProducts || []), ...(admin.data.dProducts || [])].find(p => p.id === id) || {}).name || "—";
const woNeedScript = () => `<div class="error-box">Para usar baixas, validade e congelados, rode o script <strong>add_baixa_congelados_planejamento.sql</strong> no SQL Editor do Supabase.</div>`;

/* ---------- Estimativa de sobra por leva (FIFO: vende/baixa primeiro da leva mais antiga) ---------- */
function batchRemainingMap() {
  const out = {};
  (admin.data.dProducts || []).forEach(p => {
    const sold = (admin.data.dSales || []).filter(x => x.product_id === p.id && !x.reversed).reduce((t, x) => t + Number(x.quantity), 0);
    const wasted = (admin.data.dWriteoffs || []).filter(w => w.product_id === p.id).reduce((t, w) => t + Number(w.quantity), 0);
    let consumed = sold + wasted;
    (admin.data.dBatches || []).filter(b => b.product_id === p.id)
      .sort((a, b) => String(a.produced_at).localeCompare(String(b.produced_at)) || String(a.created_at).localeCompare(String(b.created_at)))
      .forEach(b => { const q = Number(b.quantity); const used = Math.min(q, consumed); consumed -= used; out[b.id] = q - used; });
  });
  return out;
}

/* ---------- Card: validade das levas ---------- */
function renderValidityCard() {
  if (!admin.data.woOk) return `<div class="admin-card"><h2>Validade e perdas</h2>${woNeedScript()}</div>`;
  const days = admin.data.woAlertDays == null ? 3 : admin.data.woAlertDays;
  const today = spToday();
  const limit = new Date(today + "T00:00:00"); limit.setDate(limit.getDate() + days);
  const lim = limit.toLocaleDateString("sv-SE");
  const rem = batchRemainingMap();
  const rows = (admin.data.dBatches || []).filter(b => b.expires_at && rem[b.id] > 0 && String(b.expires_at) <= lim)
    .sort((a, b) => String(a.expires_at).localeCompare(String(b.expires_at)));
  return `<div class="admin-card">
    <h2>Validade das levas</h2>
    <p class="hint">Mostra levas vencidas ou que vencem em até
      <input type="number" min="0" max="60" value="${days}" style="width:60px" onchange="admin.data.woAlertDays=Math.max(0,parseInt(this.value)||0);renderEstoqueProdutos(document.getElementById('adminMain'))"> dias.
      A sobra por leva é uma <strong>estimativa</strong> (as vendas saem primeiro da leva mais antiga).</p>
    ${rows.length ? `<table><thead><tr><th>Produto</th><th>Leva</th><th>Validade</th><th>Situação</th><th>Sobra (estim.)</th><th></th></tr></thead><tbody>
      ${rows.map(b => { const exp = b.expires_at < today, dd = Math.round((new Date(b.expires_at + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000);
        return `<tr style="${exp ? "background:#FDECEC" : "background:#FFF6E0"}"><td><strong>${escapeHtml(woProdName(b.product_id))}</strong></td><td>${woFmtDate(b.produced_at)}${b.origin === "descongelado" ? " <small>(descongelado)</small>" : ""}</td>
        <td>${woFmtDate(b.expires_at)}</td><td>${exp ? `<strong style="color:#B23434">Vencido</strong>` : dd === 0 ? "Vence hoje" : `Vence em ${dd} dia${dd > 1 ? "s" : ""}`}</td><td><strong>${rem[b.id]}</strong></td>
        <td><button class="btn btn-danger btn-sm" onclick="openWriteoffForm('${b.product_id}',${rem[b.id]},'${b.id}','vencido')">Dar baixa</button></td></tr>`; }).join("")}
    </tbody></table>` : `<p class="hint">Nenhuma leva vencida ou perto de vencer. Informe a validade ao criar a leva ou ao descongelar para aparecer aqui.</p>`}
  </div>`;
}

/* ---------- Card: perdas do mês ---------- */
function renderWasteCard(key) {
  if (!admin.data.woOk) return "";
  const all = admin.data.dWriteoffs || [];
  const list = all.filter(w => String(w.written_off_at).slice(0, 7) === key);
  const val = w => Number(w.quantity) * Number(w.unit_value || 0);
  const tot = l => ({ q: l.reduce((t, w) => t + Number(w.quantity), 0), v: l.reduce((t, w) => t + val(w), 0) });
  const m = tot(list), a = tot(all);
  const byReason = Object.keys(WO_REASON).map(k => ({ k, ...tot(list.filter(w => w.reason === k)) })).filter(x => x.q > 0);
  const byProd = {}; list.forEach(w => { (byProd[w.product_id] = byProd[w.product_id] || []).push(w); });
  return `<div class="admin-card">
    <h2>Perdas e desperdício — ${monthGroupLabel(key)}</h2>
    <p class="hint" style="margin:0 0 8px">No mês: <strong style="color:#B23434">${m.q} un.</strong> · valor a preço de venda: <strong style="color:#B23434">${fmt(m.v)}</strong>
      &nbsp;|&nbsp; Acumulado (todos os meses): <strong>${a.q} un.</strong> · ${fmt(a.v)}</p>
    ${byReason.length ? `<p class="hint" style="margin:0 0 8px">${byReason.map(x => `${WO_REASON[x.k]}: <strong>${x.q}</strong> (${fmt(x.v)})`).join(" · ")}</p>` : ""}
    ${list.length ? `<table><thead><tr><th>Data</th><th>Produto</th><th>Qtd</th><th>Motivo</th><th>Valor</th><th>Obs.</th><th></th></tr></thead><tbody>
      ${list.map(w => `<tr><td>${woFmtDate(w.written_off_at)}</td><td>${escapeHtml(woProdName(w.product_id))}</td><td>−${w.quantity}</td><td>${WO_REASON[w.reason] || w.reason}</td><td>${fmt(val(w))}</td><td>${escapeHtml(w.note || "")}</td>
        <td><button class="btn btn-outline btn-sm" onclick="deleteWriteoff('${w.id}')">Desfazer</button></td></tr>`).join("")}
    </tbody></table>` : `<p class="hint">Nenhuma baixa por perda em ${monthGroupLabel(key)}.</p>`}
    <p class="hint" style="margin-top:8px">Baixa por perda <strong>não é venda</strong>: não gera pedido nem faturamento. O valor mostrado é só uma referência (preço de venda no dia da baixa).</p>
  </div>`;
}

/* ---------- Formulário de baixa ---------- */
function openWriteoffForm(productId, qty, batchId, reason) {
  if (!admin.data.woOk) { alert("Rode primeiro o script add_baixa_congelados_planejamento.sql no Supabase."); return; }
  if (!admin.data.dProducts.length) { alert("Cadastre antes um produto em Produtos → Delivery."); return; }
  const stock = {}; deliveryStockRows().forEach(r => { stock[r.p.id] = r.stock; });
  const area = document.getElementById("stockFormArea");
  area.innerHTML = `<div class="admin-card"><h2>Baixa por perda / vencimento</h2>
    <p class="hint">Use quando um produto <strong>não foi vendido</strong> e precisa sair do estoque (vencido, estragou, caiu...). Não cria pedido nem entra no Financeiro como venda.</p>
    <div class="form-grid">
      <label>Produto<select id="woProduct" onchange="woFillBatches()">${admin.data.dProducts.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (estoque: ${stock[p.id] ?? 0})</option>`).join("")}</select></label>
      <label>Quantidade<input type="number" min="1" step="1" id="woQty" value="${qty || ""}"></label>
      <label>Motivo<select id="woReason">${Object.entries(WO_REASON).map(([k, v]) => `<option value="${k}" ${k === (reason || "vencido") ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <label>Leva (opcional)<select id="woBatch"></select></label>
      <label class="span-2">Observação (opcional)<input type="text" id="woNote" placeholder="Ex.: encontrado vencido no freezer"></label>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-pink" onclick="saveWriteoff()">Registrar baixa</button>
      <button class="btn btn-outline" onclick="document.getElementById('stockFormArea').innerHTML=''">Cancelar</button>
    </div></div>`;
  if (productId) document.getElementById("woProduct").value = productId;
  woFillBatches(batchId);
  area.scrollIntoView({ behavior: "smooth", block: "start" });
}
function woFillBatches(selected) {
  const pid = document.getElementById("woProduct").value;
  const rem = batchRemainingMap();
  const opts = (admin.data.dBatches || []).filter(b => b.product_id === pid).sort((a, b) => String(b.produced_at).localeCompare(String(a.produced_at)))
    .map(b => `<option value="${b.id}">Leva ${woFmtDate(b.produced_at)}${b.expires_at ? " · val. " + woFmtDate(b.expires_at) : ""} (sobra est.: ${rem[b.id] ?? 0})</option>`);
  document.getElementById("woBatch").innerHTML = `<option value="">— não informar —</option>` + opts.join("");
  if (selected) document.getElementById("woBatch").value = selected;
}
async function saveWriteoff() {
  const product_id = document.getElementById("woProduct").value;
  const quantity = parseInt(document.getElementById("woQty").value);
  if (!product_id || !quantity || quantity <= 0) { alert("Informe o produto e a quantidade."); return; }
  const row = deliveryStockRows().find(r => r.p.id === product_id);
  if (row && quantity > row.stock) { alert(`Só há ${row.stock} em estoque desse produto. Ajuste a quantidade.`); return; }
  const reason = document.getElementById("woReason").value;
  const prod = admin.data.dProducts.find(p => p.id === product_id);
  const { error } = await sb.from("delivery_stock_writeoffs").insert({
    product_id, quantity, reason, batch_id: document.getElementById("woBatch").value || null,
    note: document.getElementById("woNote").value.trim() || null,
    unit_value: Number(prod ? prod.price : 0) || 0, written_off_at: spToday(),
  });
  if (error) { console.error(error); alert(/insuficiente/i.test(error.message || "") ? "Estoque insuficiente para essa baixa." : "Não foi possível registrar a baixa: " + (error.message || "")); return; }
  await loadEstoqueProdutos(document.getElementById("adminMain"));
}
async function deleteWriteoff(id) {
  if (!confirm("Desfazer esta baixa? O produto volta para o estoque.")) return;
  const { error } = await sb.from("delivery_stock_writeoffs").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível desfazer."); return; }
  await loadEstoqueProdutos(document.getElementById("adminMain"));
}

/* ============================================================
   PRODUÇÃO E CONGELADOS (aba)
============================================================ */
async function loadPlanejamento(main) {
  const [pl, pr, rc, fb, ft, ing] = await Promise.all([
    sb.from("production_plans").select("*").order("created_at", { ascending: true }),
    sb.from("products").select("id,name,price,active").eq("category", "delivery").order("name"),
    sb.from("recipes").select("id,name,yield_qty,yield_unit, recipe_ingredients(quantity, ingredient_id, ingredients(name, unit, current_stock, package_qty, package_cost))").order("name"),
    sb.from("frozen_batches").select("*").order("frozen_at", { ascending: false }),
    sb.from("frozen_thaws").select("*").order("thawed_at", { ascending: false }),
    sb.from("ingredients").select("id,name,unit,current_stock").order("name"),
  ]);
  admin.data.planOk = !(pl.error || fb.error || ft.error);
  admin.data.plans = pl.error ? [] : (pl.data || []);
  admin.data.pAllProducts = pr.data || [];
  admin.data.pRecipes = rc.error ? [] : (rc.data || []);
  admin.data.frozen = fb.error ? [] : (fb.data || []);
  admin.data.thaws = ft.error ? [] : (ft.data || []);
  if (!admin.data.dProducts) admin.data.dProducts = admin.data.pAllProducts;
  renderPlanejamento(main);
}

const frozenLeft = b => Number(b.quantity) - (admin.data.thaws || []).filter(t => t.frozen_batch_id === b.id).reduce((s, t) => s + Number(t.quantity), 0);

function renderPlanejamento(main) {
  if (!admin.data.planOk) { main.innerHTML = `<div class="admin-topbar"><h1>Produção e congelados</h1></div>${woNeedScript()}`; return; }
  const prods = admin.data.pAllProducts, recs = admin.data.pRecipes;
  const frozen = admin.data.frozen.filter(b => frozenLeft(b) > 0);
  const frozenByProd = {}; frozen.forEach(b => { frozenByProd[b.product_id] = (frozenByProd[b.product_id] || 0) + frozenLeft(b); });
  const today = spToday();
  main.innerHTML = `
    <div class="admin-topbar"><h1>Produção e congelados</h1>
      <div style="display:flex;gap:8px"><button class="btn btn-outline" onclick="openFreezeForm()">+ Registrar congelamento</button><button class="btn btn-pink" onclick="addPlanItem()">+ Item no plano</button></div></div>
    <div id="planFormArea"></div>

    <div class="admin-card"><h2>No freezer</h2>
      <p class="hint">Congelados <strong>não entram no estoque de venda</strong>. Ao descongelar, você informa a validade e as unidades passam para o Estoque de Produtos com essa validade.</p>
      ${frozen.length ? `<table><thead><tr><th>Produto</th><th>Congelado em</th><th>Quantidade</th><th>No freezer</th><th></th></tr></thead><tbody>
        ${frozen.map(b => `<tr><td><strong>${escapeHtml(woProdName(b.product_id))}</strong>${b.note ? `<br><small style="color:var(--muted)">${escapeHtml(b.note)}</small>` : ""}</td><td>${woFmtDate(b.frozen_at)}</td><td>${b.quantity}</td><td><strong>${frozenLeft(b)}</strong></td>
          <td style="display:flex;gap:6px"><button class="btn btn-pink btn-sm" onclick="openThawForm('${b.id}')">Descongelar</button><button class="btn btn-outline btn-sm" onclick="deleteFrozen('${b.id}')">Excluir</button></td></tr>`).join("")}
      </tbody></table>
      <p class="hint" style="margin-top:8px">Total por produto: ${Object.entries(frozenByProd).map(([id, q]) => `${escapeHtml(woProdName(id))}: <strong>${q}</strong>`).join(" · ")}</p>` : `<p class="hint">Nada no freezer. Use "+ Registrar congelamento" quando produzir para congelar.</p>`}
      <div id="thawArea"></div>
    </div>

    <div class="admin-card"><h2>Descongelados recentemente</h2>
      ${admin.data.thaws.length ? `<table><thead><tr><th>Descongelado em</th><th>Produto</th><th>Qtd</th><th>Validade</th><th></th></tr></thead><tbody>
        ${admin.data.thaws.slice(0, 15).map(t => { const b = admin.data.frozen.find(x => x.id === t.frozen_batch_id); const exp = t.expires_at < today;
          return `<tr><td>${woFmtDate(t.thawed_at)}</td><td>${escapeHtml(b ? woProdName(b.product_id) : "—")}</td><td>${t.quantity}</td><td style="${exp ? "color:#B23434;font-weight:700" : ""}">${woFmtDate(t.expires_at)}${exp ? " (vencido)" : ""}</td>
          <td><button class="btn btn-outline btn-sm" onclick="undoThaw('${t.id}')">Desfazer</button></td></tr>`; }).join("")}
      </tbody></table>` : `<p class="hint">Nenhum descongelamento ainda.</p>`}
    </div>

    <div class="admin-card"><h2>Plano de produção</h2>
      <p class="hint">Escolha o produto, a receita, quantas vezes ela será feita e a data. A receita define a lista de compras; o calendário recebe o lembrete de produção.
        Produtos sem receita cadastrada aparecem sem lista de compras: cadastre em <a href="#/receitas" onclick="setTab('receitas');return false">Receitas</a> e depois vincule aqui.</p>
      ${admin.data.plans.length ? admin.data.plans.map(p => planRowHtml(p, prods, recs)).join("") : `<p class="hint">Nenhum item. Clique em "+ Item no plano".</p>`}
    </div>
    ${renderShoppingList()}
  `;
}

function planRowHtml(p, prods, recs) {
  const st = { planejado: "Planejado", comprado: "Ingredientes comprados", produzido: "Produzido" };
  const done = p.status === "produzido";
  return `<div class="plan-row" style="border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;${done ? "opacity:.65" : ""}">
    <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center">
      <strong>${escapeHtml(p.title)}</strong>
      <span class="badge ${p.kind === "congelado" ? "confirmed" : "pending"}">${p.kind === "congelado" ? "Congelado" : "Fresco"}</span>
    </div>
    ${p.note ? `<p class="hint" style="margin:4px 0 8px">${escapeHtml(p.note)}</p>` : ""}
    <div class="form-grid" style="margin-top:8px">
      <label>Produto (estoque)<select id="pl_prod_${p.id}"><option value="">— sem vínculo —</option>${prods.map(x => `<option value="${x.id}" ${x.id === p.product_id ? "selected" : ""}>${escapeHtml(x.name)}</option>`).join("")}</select></label>
      <label>Receita<select id="pl_rec_${p.id}"><option value="">— sem receita —</option>${recs.map(x => `<option value="${x.id}" ${x.id === p.recipe_id ? "selected" : ""}>${escapeHtml(x.name)}</option>`).join("")}</select></label>
      <label>Quantas vezes a receita<input type="number" min="0.5" step="0.5" id="pl_bat_${p.id}" value="${p.recipe_batches}"></label>
      <label>Unidades a sair (opcional)<input type="number" min="1" step="1" id="pl_qty_${p.id}" value="${p.target_qty || ""}"></label>
      <label>Data de produção<input type="date" id="pl_date_${p.id}" value="${p.planned_date || ""}"></label>
      <label>Situação<select id="pl_st_${p.id}">${Object.entries(st).map(([k, v]) => `<option value="${k}" ${k === p.status ? "selected" : ""}>${v}</option>`).join("")}</select></label>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
      <button class="btn btn-pink btn-sm" onclick="savePlan('${p.id}')">Salvar</button>
      <button class="btn btn-outline btn-sm" onclick="planToCalendar('${p.id}')">${(p.event_ids || []).length ? "Atualizar no calendário" : "Colocar no calendário"}</button>
      ${p.kind === "congelado" && !done ? `<button class="btn btn-outline btn-sm" onclick="planProduced('${p.id}')">Produzi e congelei</button>` : ""}
      <button class="btn btn-outline btn-sm" onclick="deletePlan('${p.id}')">Excluir</button>
    </div>
  </div>`;
}

/* ---------- Plano: salvar / calendário / produzido ---------- */
function planFields(id) {
  const g = k => document.getElementById(`pl_${k}_${id}`).value;
  return { product_id: g("prod") || null, recipe_id: g("rec") || null, recipe_batches: Number(g("bat")) || 1, target_qty: parseInt(g("qty")) || null, planned_date: g("date") || null, status: g("st") };
}
async function savePlan(id) {
  const { error } = await sb.from("production_plans").update(planFields(id)).eq("id", id);
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  await loadPlanejamento(document.getElementById("adminMain"));
}
async function addPlanItem() {
  const title = (prompt("Nome do item (ex.: Bolo de pote Choconinho):") || "").trim();
  if (!title) return;
  const kind = confirm("É um produto para CONGELAR?\n\nOK = congelado · Cancelar = fresco") ? "congelado" : "fresco";
  const { error } = await sb.from("production_plans").insert({ title, kind });
  if (error) { console.error(error); alert("Não foi possível adicionar."); return; }
  await loadPlanejamento(document.getElementById("adminMain"));
}
async function deletePlan(id) {
  if (!confirm("Excluir este item do plano? Os eventos já criados no calendário continuam lá.")) return;
  const { error } = await sb.from("production_plans").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir."); return; }
  await loadPlanejamento(document.getElementById("adminMain"));
}
async function planToCalendar(id) {
  const f = planFields(id);
  const p = admin.data.plans.find(x => x.id === id);
  if (!f.planned_date) { alert("Escolha a data de produção antes."); return; }
  await sb.from("production_plans").update(f).eq("id", id);
  const title = `Produzir: ${p.title}${f.target_qty ? ` (${f.target_qty} un.)` : ""}`;
  const ids = Array.isArray(p.event_ids) ? p.event_ids : [];
  let res;
  if (ids.length) res = await sb.from("production_events").update({ event_date: f.planned_date, title }).eq("id", ids[0]);
  else {
    res = await sb.from("production_events").insert({ event_date: f.planned_date, title, category: "encomenda", description: p.note || null }).select("id").single();
    if (!res.error) await sb.from("production_plans").update({ event_ids: [res.data.id] }).eq("id", id);
  }
  if (res.error) { console.error(res.error); alert("Não foi possível criar o evento no calendário."); return; }
  alert("Pronto! O calendário está atualizado.");
  await loadPlanejamento(document.getElementById("adminMain"));
}
async function planProduced(id) {
  const f = planFields(id);
  if (!f.product_id) { alert("Vincule antes o produto do estoque (se ele ainda não existe, cadastre em Produtos → Delivery)."); return; }
  const q = parseInt(prompt("Quantas unidades foram para o freezer?", f.target_qty || "") || "");
  if (!q || q <= 0) return;
  const r1 = await sb.from("frozen_batches").insert({ product_id: f.product_id, quantity: q, frozen_at: spToday(), note: "Do plano de produção" });
  if (r1.error) { console.error(r1.error); alert("Não foi possível registrar o congelamento."); return; }
  await sb.from("production_plans").update({ ...f, status: "produzido" }).eq("id", id);
  await loadPlanejamento(document.getElementById("adminMain"));
}

/* ---------- Congelados: registrar / descongelar / desfazer ---------- */
function openFreezeForm() {
  const prods = admin.data.pAllProducts;
  document.getElementById("planFormArea").innerHTML = `<div class="admin-card"><h2>Registrar congelamento</h2>
    <p class="hint">Produto não aparece? Cadastre em Produtos → Delivery (pode ficar inativo no site).</p>
    <div class="form-grid">
      <label>Produto<select id="fzProd">${prods.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}</select></label>
      <label>Quantidade<input type="number" min="1" step="1" id="fzQty"></label>
      <label>Data<input type="date" id="fzDate" value="${spToday()}"></label>
      <label>Observação (opcional)<input type="text" id="fzNote"></label>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-pink" onclick="saveFreeze()">Salvar</button>
    <button class="btn btn-outline" onclick="document.getElementById('planFormArea').innerHTML=''">Cancelar</button></div></div>`;
}
async function saveFreeze() {
  const quantity = parseInt(document.getElementById("fzQty").value);
  if (!quantity || quantity <= 0) { alert("Informe a quantidade."); return; }
  const { error } = await sb.from("frozen_batches").insert({ product_id: document.getElementById("fzProd").value, quantity, frozen_at: document.getElementById("fzDate").value || spToday(), note: document.getElementById("fzNote").value.trim() || null });
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  await loadPlanejamento(document.getElementById("adminMain"));
}
async function deleteFrozen(id) {
  if (!confirm("Excluir este registro de congelamento? Descongelamentos já feitos continuam no estoque.")) return;
  const { error } = await sb.from("frozen_batches").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir."); return; }
  await loadPlanejamento(document.getElementById("adminMain"));
}
function openThawForm(id) {
  const b = admin.data.frozen.find(x => x.id === id); if (!b) return;
  document.getElementById("thawArea").innerHTML = `<div style="border:1.5px solid var(--pink);border-radius:12px;padding:12px;margin-top:12px">
    <strong>Descongelar — ${escapeHtml(woProdName(b.product_id))}</strong> <small>(no freezer: ${frozenLeft(b)})</small>
    <div class="form-grid" style="margin-top:8px">
      <label>Quantidade a descongelar<input type="number" min="1" max="${frozenLeft(b)}" step="1" id="thQty" value="${frozenLeft(b)}"></label>
      <label>Data de descongelamento<input type="date" id="thDate" value="${spToday()}"></label>
      <label>Validade após descongelar *<input type="date" id="thExp"></label>
    </div>
    <p class="hint">Defina a validade conforme a sua regra de segurança alimentar para esse produto. As unidades entram no Estoque de Produtos com essa data.</p>
    <div style="display:flex;gap:8px"><button class="btn btn-pink btn-sm" onclick="saveThaw('${id}')">Descongelar e levar ao estoque</button>
    <button class="btn btn-outline btn-sm" onclick="document.getElementById('thawArea').innerHTML=''">Cancelar</button></div></div>`;
}
async function saveThaw(id) {
  const qty = parseInt(document.getElementById("thQty").value), exp = document.getElementById("thExp").value, dt = document.getElementById("thDate").value || spToday();
  if (!qty || qty <= 0) { alert("Informe a quantidade."); return; }
  if (!exp) { alert("Informe a validade."); return; }
  if (exp < dt) { alert("A validade não pode ser anterior à data de descongelamento."); return; }
  const { error } = await sb.rpc("thaw_frozen_batch", { p_frozen: id, p_qty: qty, p_expires: exp, p_thawed: dt });
  if (error) { console.error(error); alert("Não foi possível descongelar: " + (error.message || "")); return; }
  await loadPlanejamento(document.getElementById("adminMain"));
}
async function undoThaw(id) {
  if (!confirm("Desfazer este descongelamento? As unidades saem do estoque e voltam ao freezer.")) return;
  const { error } = await sb.rpc("undo_thaw", { p_thaw: id });
  if (error) { console.error(error); alert(error.message || "Não foi possível desfazer."); return; }
  await loadPlanejamento(document.getElementById("adminMain"));
}

/* ---------- Lista de compras (a partir das receitas do plano) ---------- */
function shoppingNeeds() {
  const plans = admin.data.plans.filter(p => p.status === "planejado" && p.recipe_id);
  const need = {};
  plans.forEach(p => {
    const rec = admin.data.pRecipes.find(r => r.id === p.recipe_id); if (!rec) return;
    (rec.recipe_ingredients || []).forEach(ri => {
      const ing = ri.ingredients || {}; const k = ri.ingredient_id;
      const n = need[k] = need[k] || { name: ing.name || "—", unit: ing.unit || "", stock: Number(ing.current_stock || 0), pkgQty: Number(ing.package_qty || 0), pkgCost: Number(ing.package_cost || 0), need: 0, from: [] };
      n.need += Number(ri.quantity) * Number(p.recipe_batches || 1);
      if (!n.from.includes(p.title)) n.from.push(p.title);
    });
  });
  return { plans, rows: Object.values(need).sort((a, b) => a.name.localeCompare(b.name)) };
}
function renderShoppingList() {
  const { plans, rows } = shoppingNeeds();
  const noRecipe = admin.data.plans.filter(p => p.status === "planejado" && !p.recipe_id);
  const r2 = v => Number(v.toFixed(2)).toString().replace(".", ",");
  let total = 0;
  const body = rows.map(n => {
    const buy = Math.max(0, n.need - n.stock);
    const packs = buy > 0 && n.pkgQty > 0 ? Math.ceil(buy / n.pkgQty) : 0;
    const cost = packs * n.pkgCost; total += cost;
    return `<tr><td><strong>${escapeHtml(n.name)}</strong><br><small style="color:var(--muted)">${escapeHtml(n.from.join(", "))}</small></td><td>${r2(n.need)} ${n.unit}</td><td>${r2(n.stock)} ${n.unit}</td>
      <td style="${buy > 0 ? "color:#B23434;font-weight:700" : "color:#2E7D46"}">${buy > 0 ? r2(buy) + " " + n.unit : "ok"}</td><td>${packs ? `${packs} emb. <small>(${r2(n.pkgQty)} ${n.unit})</small>` : "—"}</td><td>${cost ? fmt(cost) : "—"}</td></tr>`;
  }).join("");
  const dates = plans.map(p => p.planned_date).filter(Boolean).sort();
  return `<div class="admin-card"><h2>Lista de compras</h2>
    <p class="hint">Soma os ingredientes das receitas dos itens <strong>Planejados</strong>, desconta o que já tem em Estoque de Insumos e estima as embalagens. Os valores são estimativas com base nos preços cadastrados.</p>
    ${rows.length ? `<table><thead><tr><th>Ingrediente</th><th>Precisa</th><th>Tem</th><th>Comprar</th><th>Embalagens</th><th>Custo est.</th></tr></thead><tbody>${body}</tbody></table>
      <p class="hint" style="margin-top:8px">Custo estimado das compras: <strong>${fmt(total)}</strong></p>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px">
        <label style="display:flex;gap:6px;align-items:center;font-size:12.5px">Data da compra <input type="date" id="shopDate" value="${dates[0] ? shiftDate(dates[0], -1) : spToday()}"></label>
        <button class="btn btn-outline btn-sm" onclick="shopToCalendar()">Colocar compra no calendário</button>
      </div>` : `<p class="hint">Nenhum item planejado com receita vinculada.</p>`}
    ${noRecipe.length ? `<p class="hint" style="margin-top:10px;color:#8A5A00">⚠ Sem receita vinculada (fora da lista de compras): <strong>${noRecipe.map(p => escapeHtml(p.title)).join(", ")}</strong>.</p>` : ""}
  </div>`;
}
function shiftDate(iso, n) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv-SE"); }
async function shopToCalendar() {
  const date = document.getElementById("shopDate").value;
  if (!date) { alert("Escolha a data da compra."); return; }
  const { plans, rows } = shoppingNeeds();
  const items = rows.filter(n => n.need > n.stock).map(n => n.name);
  const { error } = await sb.from("production_events").insert({ event_date: date, title: "Comprar ingredientes (produção)", category: "outro", description: (items.length ? items.join(", ") : "Conferir lista de compras") + ` — para: ${plans.map(p => p.title).join(", ")}` });
  if (error) { console.error(error); alert("Não foi possível criar o lembrete."); return; }
  alert("Lembrete de compra criado no calendário.");
}
