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
/* =====================================================================
   PRODUÇÃO E CONGELADOS — 3 seções na mesma aba
   ① Planejamento de produção (usa a composição da Precificação)
   ② Estoque de congelados (lotes, validades, alertas, prazos por produto)
   ③ Retirada do freezer (baixa no lote + entrada no Estoque de produtos)
   ===================================================================== */
const pcNeedScript = () => `<div class="error-box">Para usar esta aba, rode no SQL Editor do Supabase, nesta ordem: <strong>add_baixa_congelados_planejamento.sql</strong> (se ainda não rodou) e <strong>add_producao_congelados_v2.sql</strong>. Depois recarregue o painel.</div>`;
const frozenLeft = b => Number(b.quantity) - (admin.data.thaws || []).filter(t => t.frozen_batch_id === b.id).reduce((s, t) => s + Number(t.quantity), 0);
const pcAddDays = (iso, n) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv-SE"); };
const pcDiffDays = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
const pcNum = v => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const pcSetting = pricingId => (admin.data.pcSettings || []).find(s => s.pricing_id === pricingId) || {};
const pcSettingByProduct = productId => (admin.data.pcSettings || []).find(s => s.product_id === productId) || {};
const pcAlertDays = () => Number((admin.data.pcConfig || {}).alert_days ?? 7);
const pcPricingName = id => ((admin.data.pcPricings || []).find(p => p.id === id) || {}).name || "—";
const pcPricing = id => (admin.data.pcPricings || []).find(p => p.id === id);

async function loadPlanejamento(main) {
  const [pl, pr, fb, ft, ps, st, cf, rn] = await Promise.all([
    sb.from("production_plans").select("*").order("created_at", { ascending: false }),
    sb.from("products").select("id,name,price,active").eq("category", "delivery").order("name"),
    sb.from("frozen_batches").select("*").order("frozen_at", { ascending: false }),
    sb.from("frozen_thaws").select("*").order("thawed_at", { ascending: false }),
    sb.from("pricings").select("id,name,produced_qty").order("name"),
    sb.from("production_settings").select("*"),
    sb.from("production_config").select("*").eq("id", 1).maybeSingle(),
    sb.from("production_runs").select("*").order("created_at", { ascending: false }).limit(20),
  ]);
  admin.data.planOk = !(pl.error || fb.error || ft.error || st.error || cf.error || rn.error);
  admin.data.plans = pl.error ? [] : (pl.data || []);
  admin.data.pAllProducts = pr.data || [];
  admin.data.pcPricings = ps.error ? [] : (ps.data || []);
  admin.data.pcSettings = st.error ? [] : (st.data || []);
  admin.data.pcConfig = cf.error ? {} : (cf.data || {});
  admin.data.pcRuns = rn.error ? [] : (rn.data || []);
  admin.data.frozen = fb.error ? [] : (fb.data || []);
  admin.data.thaws = ft.error ? [] : (ft.data || []);
  if (!admin.data.dProducts) admin.data.dProducts = admin.data.pAllProducts;
  admin.data.pcReq = admin.data.pcReq || {};
  renderPlanejamento(main);
}
const pcReload = () => loadPlanejamento(document.getElementById("adminMain"));

function pcLotStatus(b) {
  const left = frozenLeft(b), today = spToday();
  if (left <= 0) return { key: "esgotado", label: "Esgotado", color: "var(--muted)", left };
  if (!b.expires_at) return { key: "semval", label: "Sem validade informada", color: "var(--muted)", left };
  const d = pcDiffDays(today, b.expires_at);
  if (d < 0) return { key: "vencido", label: `Vencido há ${-d} dia${d === -1 ? "" : "s"}`, color: "#B23434", left };
  if (d <= pcAlertDays()) return { key: "vence", label: d === 0 ? "Vence hoje" : `Vence em ${d} dia${d === 1 ? "" : "s"}`, color: "#B26A00", left };
  return { key: "ok", label: "Válido", color: "#2E7D46", left };
}

function renderPlanejamento(main) {
  const head = `<div class="admin-topbar"><h1>Produção e congelados</h1></div>`;
  if (!admin.data.planOk) { main.innerHTML = head + pcNeedScript(); return; }
  main.innerHTML = `${head}
    <p class="hint">Três etapas, uma de cada vez: <strong>① planejar</strong> (só cálculo, nada é descontado), <strong>② conferir o freezer</strong> e <strong>③ retirar para a venda</strong>.</p>
    <section class="pc-sec" id="pcSec1">${pcSec1Html()}</section>
    <section class="pc-sec" id="pcSec2">${pcSec2Html()}</section>
    <section class="pc-sec" id="pcSec3">${pcSec3Html()}</section>`;
  pcCalcNew();
  pcFillThaw(true);
}

/* ---------------- ① PLANEJAMENTO ---------------- */
function pcReqTable(rows, opts = {}) {
  if (!rows) return `<p class="hint">Calculando…</p>`;
  if (!rows.length) return `<p class="hint">Este produto não tem insumos cadastrados na Precificação.</p>`;
  const miss = rows.filter(r => Number(r.missing) > 0);
  return `<div class="pc-tablewrap"><table class="pc-req"><thead><tr><th>Ingrediente / material</th><th>Necessário</th><th>No estoque</th><th>Falta comprar</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${escapeHtml(r.ingredient_name)}</td><td>${pcNum(r.needed)} ${escapeHtml(r.unit)}</td><td>${pcNum(r.in_stock)} ${escapeHtml(r.unit)}</td>
      <td>${Number(r.missing) > 0 ? `<strong style="color:#B23434">${pcNum(r.missing)} ${escapeHtml(r.unit)}</strong>` : `<span style="color:#2E7D46">ok</span>`}</td></tr>`).join("")}
  </tbody></table></div>
  <p class="hint" style="margin-top:6px">${miss.length ? `<strong>${miss.length}</strong> item(ns) para comprar. ` : "Tudo em estoque. "}${opts.confirm ? "Estes insumos serão descontados do estoque ao confirmar a produção." : "Planejamento apenas: nada é descontado do estoque enquanto você não confirmar a produção."}</p>`;
}
async function pcFetchReq(pricingId, batches) {
  const { data, error } = await sb.rpc("production_requirements", { p_pricing: pricingId, p_batches: batches });
  if (error) { console.error(error); return { error: error.message || "Não foi possível calcular." }; }
  return { rows: data || [] };
}
function pcYieldLine(pricingId, batches) {
  const p = pcPricing(pricingId); if (!p) return "";
  const per = Number(p.produced_qty || 0);
  return `<p class="pc-yield">1 receita de produção rende <strong>${pcNum(per)}</strong> · ${pcNum(batches)} receita(s) = <strong>${pcNum(per * batches)}</strong> unidades</p>`;
}
function pcSec1Html() {
  const pricings = admin.data.pcPricings;
  const pending = admin.data.plans.filter(p => p.status !== "produzido");
  const runs = admin.data.pcRuns || [];
  return `<h2 class="pc-h"><span class="pc-n">1</span> Planejamento de produção</h2>
    <p class="hint">Escolha o produto: os ingredientes e receitas vêm da <strong>Precificação</strong> (nada é cadastrado de novo). O cálculo usa o número de <em>receitas de produção</em> e as proporções cadastradas.</p>
    <div class="admin-card pc-new">
      <h3>Novo planejamento</h3>
      ${pricings.length ? `<div class="form-grid">
        <label>Produto (Precificação)<select id="pcnPricing" onchange="pcCalcNew()">${pricings.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}</select></label>
        <label>Receitas de produção<input type="number" min="0.5" step="0.5" id="pcnBatches" value="1" oninput="pcCalcNew()"></label>
        <label>Data prevista (opcional)<input type="date" id="pcnDate"></label>
      </div>
      <div id="pcnYield"></div>
      <div id="pcnReq"></div>
      <div class="pc-actions"><button class="btn btn-pink" onclick="pcSavePlan()">Salvar planejamento</button></div>` : `<p class="hint">Nenhum produto na Precificação ainda. Cadastre em <a href="#/precificacao" onclick="setTab('precificacao');return false">Precificação</a>.</p>`}
    </div>
    <h3 class="pc-sub">Planejamentos em aberto</h3>
    ${pending.length ? pending.map(pcPlanCard).join("") : `<p class="hint">Nenhum planejamento em aberto.</p>`}
    ${runs.length ? `<details class="pc-details"><summary>Produções já confirmadas (${runs.length})</summary>
      <div class="pc-tablewrap"><table><thead><tr><th>Data</th><th>Produto</th><th>Receitas</th><th>Produzido</th><th>Congelado</th><th>Para venda</th></tr></thead><tbody>
      ${runs.map(r => `<tr><td>${woFmtDate(r.produced_at)}</td><td>${escapeHtml(pcPricingName(r.pricing_id))}</td><td>${pcNum(r.recipe_batches)}</td><td>${r.produced_qty}</td><td>${r.frozen_qty}</td><td>${r.stock_qty}</td></tr>`).join("")}
      </tbody></table></div></details>` : ""}`;
}
let pcCalcTimer = null;
function pcCalcNew() {
  const sel = document.getElementById("pcnPricing"); if (!sel) return;
  const b = Number(document.getElementById("pcnBatches").value);
  document.getElementById("pcnYield").innerHTML = b > 0 ? pcYieldLine(sel.value, b) : "";
  const box = document.getElementById("pcnReq");
  if (!(b > 0)) { box.innerHTML = `<p class="hint">Informe a quantidade de receitas.</p>`; return; }
  box.innerHTML = `<p class="hint">Calculando…</p>`;
  clearTimeout(pcCalcTimer);
  pcCalcTimer = setTimeout(async () => {
    const r = await pcFetchReq(sel.value, b);
    if (!document.getElementById("pcnReq")) return;
    document.getElementById("pcnReq").innerHTML = r.error ? `<div class="error-box">${escapeHtml(r.error)}</div>` : pcReqTable(r.rows);
  }, 250);
}
async function pcSavePlan() {
  const pricingId = document.getElementById("pcnPricing").value, batches = Number(document.getElementById("pcnBatches").value);
  if (!pricingId || !(batches > 0)) { alert("Escolha o produto e a quantidade de receitas."); return; }
  const set = pcSetting(pricingId);
  const { error } = await sb.from("production_plans").insert({
    title: pcPricingName(pricingId), pricing_id: pricingId, product_id: set.product_id || null, recipe_batches: batches,
    planned_date: document.getElementById("pcnDate").value || null, kind: "congelado", status: "planejado",
  });
  if (error) { console.error(error); alert("Não foi possível salvar o planejamento."); return; }
  await pcReload();
}
function pcPlanCard(p) {
  const pr = pcPricing(p.pricing_id);
  const exp = pr ? Number(pr.produced_qty || 0) * Number(p.recipe_batches) : null;
  const pricings = admin.data.pcPricings;
  return `<div class="pc-plan" id="pcPlan_${p.id}">
    <div class="pc-plan-head"><strong>${escapeHtml(p.pricing_id ? pcPricingName(p.pricing_id) : p.title)}</strong>
      <span class="pc-chip">${p.planned_date ? "Previsto: " + woFmtDate(p.planned_date) : "Sem data"}</span></div>
    ${!p.pricing_id ? `<p class="hint" style="color:#B26A00">Este item é antigo e ainda não está ligado a um produto da Precificação. Escolha abaixo para calcular os insumos.</p>` : ""}
    <div class="form-grid">
      <label>Produto (Precificação)<select id="pp_pr_${p.id}"><option value="">— escolher —</option>${pricings.map(x => `<option value="${x.id}" ${x.id === p.pricing_id ? "selected" : ""}>${escapeHtml(x.name)}</option>`).join("")}</select></label>
      <label>Receitas de produção<input type="number" min="0.5" step="0.5" id="pp_bat_${p.id}" value="${p.recipe_batches}"></label>
      <label>Data prevista<input type="date" id="pp_date_${p.id}" value="${p.planned_date || ""}"></label>
    </div>
    ${exp != null ? `<p class="pc-yield">${pcNum(p.recipe_batches)} receita(s) × ${pcNum(pr.produced_qty)} = <strong>${pcNum(exp)}</strong> unidades esperadas</p>` : ""}
    <div id="ppReq_${p.id}">${admin.data.pcReq[p.id] ? pcReqTable(admin.data.pcReq[p.id]) : ""}</div>
    <div id="ppConf_${p.id}"></div>
    <div class="pc-actions">
      <button class="btn btn-outline btn-sm" onclick="pcSavePlanEdit('${p.id}')">Salvar alterações</button>
      <button class="btn btn-outline btn-sm" onclick="pcShowReq('${p.id}')">Ver insumos e compras</button>
      <button class="btn btn-pink btn-sm" onclick="pcOpenConfirm('${p.id}')">Confirmar produção</button>
      <button class="btn btn-outline btn-sm" onclick="planToCalendar('${p.id}')">${(p.event_ids || []).length ? "Atualizar no calendário" : "Colocar no calendário"}</button>
      <button class="btn btn-outline btn-sm" onclick="pcShopReminder('${p.id}')">Lembrete de compra</button>
      <button class="btn btn-outline btn-sm" onclick="deletePlan('${p.id}')">Excluir</button>
    </div>
  </div>`;
}
function pcPlanFields(id) {
  const g = k => document.getElementById(`pp_${k}_${id}`).value;
  const pricingId = g("pr") || null;
  return { pricing_id: pricingId, product_id: pricingId ? (pcSetting(pricingId).product_id || null) : null, title: pricingId ? pcPricingName(pricingId) : (admin.data.plans.find(x => x.id === id) || {}).title,
    recipe_batches: Number(g("bat")) || 1, planned_date: g("date") || null };
}
async function pcSavePlanEdit(id) {
  const { error } = await sb.from("production_plans").update(pcPlanFields(id)).eq("id", id);
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  delete admin.data.pcReq[id];
  await pcReload();
}
async function pcShowReq(id) {
  const f = pcPlanFields(id);
  if (!f.pricing_id) { alert("Escolha o produto da Precificação primeiro."); return; }
  const box = document.getElementById("ppReq_" + id); box.innerHTML = `<p class="hint">Calculando…</p>`;
  const r = await pcFetchReq(f.pricing_id, f.recipe_batches);
  if (r.error) { box.innerHTML = `<div class="error-box">${escapeHtml(r.error)}</div>`; return; }
  admin.data.pcReq[id] = r.rows;
  box.innerHTML = pcReqTable(r.rows);
}
async function deletePlan(id) {
  if (!confirm("Excluir este planejamento? Eventos já criados no calendário continuam lá. Produções já confirmadas não são afetadas.")) return;
  const { error } = await sb.from("production_plans").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir."); return; }
  await pcReload();
}
async function planToCalendar(id) {
  const f = pcPlanFields(id), p = admin.data.plans.find(x => x.id === id);
  if (!f.planned_date) { alert("Escolha a data prevista antes."); return; }
  await sb.from("production_plans").update(f).eq("id", id);
  const pr = pcPricing(f.pricing_id);
  const qty = pr ? Number(pr.produced_qty || 0) * f.recipe_batches : null;
  const title = `Produzir: ${f.title}${qty ? ` (${pcNum(qty)} un.)` : ""}`;
  const ids = Array.isArray(p.event_ids) ? p.event_ids : [];
  let res;
  if (ids.length) res = await sb.from("production_events").update({ event_date: f.planned_date, title }).eq("id", ids[0]);
  else {
    res = await sb.from("production_events").insert({ event_date: f.planned_date, title, category: "encomenda", description: p.note || null }).select("id").single();
    if (!res.error) await sb.from("production_plans").update({ event_ids: [res.data.id] }).eq("id", id);
  }
  if (res.error) { console.error(res.error); alert("Não foi possível criar o evento no calendário."); return; }
  alert("Pronto! O calendário está atualizado.");
  await pcReload();
}
async function pcShopReminder(id) {
  const f = pcPlanFields(id);
  if (!f.pricing_id) { alert("Escolha o produto da Precificação primeiro."); return; }
  const date = prompt("Data do lembrete de compra (AAAA-MM-DD):", spToday());
  if (!date) return;
  const r = await pcFetchReq(f.pricing_id, f.recipe_batches);
  if (r.error) { alert(r.error); return; }
  const items = r.rows.filter(x => Number(x.missing) > 0).map(x => `${x.ingredient_name} (${pcNum(x.missing)} ${x.unit})`);
  const { error } = await sb.from("production_events").insert({ event_date: date, title: "Comprar ingredientes: " + f.title, category: "outro", description: items.length ? items.join(", ") : "Conferir lista de compras" });
  if (error) { console.error(error); alert("Não foi possível criar o lembrete."); return; }
  alert("Lembrete de compra criado no calendário.");
}

/* ---- Confirmação da produção ---- */
async function pcOpenConfirm(id) {
  const f = pcPlanFields(id), box = document.getElementById("ppConf_" + id);
  if (!f.pricing_id) { alert("Escolha o produto da Precificação primeiro."); return; }
  await sb.from("production_plans").update(f).eq("id", id);
  const set = pcSetting(f.pricing_id);
  if (!set.product_id) { box.innerHTML = `<div class="error-box">Este produto ainda não está ligado a um produto do <strong>Estoque de produtos</strong>. Ligue em "Prazos e vínculo por produto" (seção ②) e volte aqui.</div>`; return; }
  const pr = pcPricing(f.pricing_id), exp = Number(pr.produced_qty || 0) * f.recipe_batches, today = spToday();
  box.innerHTML = `<div class="pc-confirm"><h4>Confirmar o que foi realmente produzido</h4><div id="pcfReq" data-id="${id}"><p class="hint">Calculando insumos…</p></div>
    <div class="form-grid">
      <label>Quantidade produzida *<input type="number" min="1" step="1" id="pcfProd" value="${exp || ""}" oninput="pcfCalc('${id}')"></label>
      <label>Quantidade congelada *<input type="number" min="0" step="1" id="pcfFroz" value="${exp || ""}" oninput="pcfCalc('${id}')"></label>
      <label>Data da produção<input type="date" id="pcfPDate" value="${today}" onchange="pcfCalc('${id}',true)"></label>
      <label>Data do congelamento<input type="date" id="pcfFDate" value="${today}" onchange="pcfCalc('${id}',true)"></label>
      <label>Validade no freezer<input type="date" id="pcfFExp"></label>
      <label>Validade do que fica para venda<input type="date" id="pcfSExp"></label>
    </div>
    <p class="hint" id="pcfInfo"></p>
    <div class="pc-actions"><button class="btn btn-pink" id="pcfBtn" onclick="pcConfirmRun('${id}')">Confirmar produção e descontar insumos</button>
    <button class="btn btn-outline" onclick="document.getElementById('ppConf_${id}').innerHTML=''">Cancelar</button></div></div>`;
  pcfCalc(id, true);
  const r = await pcFetchReq(f.pricing_id, f.recipe_batches);
  const rb = document.getElementById("pcfReq"); if (rb) rb.innerHTML = r.error ? `<div class="error-box">${escapeHtml(r.error)}</div>` : pcReqTable(r.rows, { confirm: true });
}
function pcfCalc(id, refreshDates) {
  const p = admin.data.plans.find(x => x.id === id); const set = pcSetting(p.pricing_id);
  const prod = parseInt(document.getElementById("pcfProd").value) || 0, froz = parseInt(document.getElementById("pcfFroz").value) || 0;
  if (refreshDates) {
    const fd = document.getElementById("pcfFDate").value, pd = document.getElementById("pcfPDate").value;
    document.getElementById("pcfFExp").value = fd && set.freezer_days ? pcAddDays(fd, set.freezer_days) : "";
    document.getElementById("pcfSExp").value = pd && set.thaw_days ? pcAddDays(pd, set.thaw_days) : "";
  }
  const stock = prod - froz;
  const warn = [];
  if (froz > prod) warn.push("A quantidade congelada não pode passar da produzida.");
  if (froz > 0 && !set.freezer_days) warn.push("Defina a validade do freezer deste produto em \"Prazos e vínculo\" (ou preencha a data manualmente).");
  if (stock > 0 && !set.thaw_days) warn.push("Defina a validade após descongelar deste produto em \"Prazos e vínculo\" (ou preencha a data manualmente).");
  document.getElementById("pcfInfo").innerHTML = `Vão para o <strong>freezer</strong>: ${Math.max(0, Math.min(froz, prod))} · vão direto para o <strong>estoque de produtos</strong>: ${Math.max(0, stock)}` + (warn.length ? `<br><span style="color:#B23434">${warn.join("<br>")}</span>` : "");
}
async function pcConfirmRun(id) {
  const g = k => document.getElementById(k).value;
  const prod = parseInt(g("pcfProd")), froz = parseInt(g("pcfFroz") || "0");
  if (!(prod > 0)) { alert("Informe a quantidade produzida."); return; }
  if (isNaN(froz) || froz < 0 || froz > prod) { alert("A quantidade congelada deve estar entre 0 e a produzida."); return; }
  if (froz > 0 && !g("pcfFExp")) { alert("Informe a validade no freezer."); return; }
  if (prod - froz > 0 && !g("pcfSExp")) { alert("Informe a validade das unidades que ficam para venda."); return; }
  if (!confirm(`Confirmar?\n\n• Os insumos do planejamento serão descontados do estoque\n• ${froz} unidade(s) entram no freezer\n• ${prod - froz} unidade(s) entram no estoque de produtos`)) return;
  const btn = document.getElementById("pcfBtn"); btn.disabled = true; btn.textContent = "Confirmando…";
  const { error } = await sb.rpc("confirm_production", { p_plan: id, p_produced: prod, p_frozen: froz, p_produced_at: g("pcfPDate"), p_frozen_at: g("pcfFDate") || null, p_freezer_expires: g("pcfFExp") || null, p_fresh_expires: g("pcfSExp") || null, p_note: null });
  if (error) { console.error(error); alert("Não foi possível confirmar: " + (error.message || "")); btn.disabled = false; btn.textContent = "Confirmar produção e descontar insumos"; return; }
  await pcReload();
}

/* ---------------- ② ESTOQUE DE CONGELADOS ---------------- */
function pcSec2Html() {
  const all = admin.data.frozen, showAll = !!admin.data.pcShowAll;
  const lots = all.filter(b => showAll || frozenLeft(b) > 0)
    .sort((a, b) => (woProdName(a.product_id)).localeCompare(woProdName(b.product_id)) || String(a.frozen_at).localeCompare(String(b.frozen_at)));
  const alerts = all.map(b => ({ b, s: pcLotStatus(b) })).filter(x => x.s.key === "vencido" || x.s.key === "vence");
  const byProd = {}; all.forEach(b => { const l = frozenLeft(b); if (l > 0) byProd[b.product_id] = (byProd[b.product_id] || 0) + l; });
  return `<h2 class="pc-h"><span class="pc-n">2</span> Estoque de congelados</h2>
    <p class="hint">Produtos já produzidos que estão no freezer. <strong>Não entram no estoque de venda</strong> até serem retirados (seção ③).</p>
    ${alerts.length ? `<div class="pc-alert">${alerts.map(x => `<div>⚠ <strong>${escapeHtml(woProdName(x.b.product_id))}</strong> (lote ${escapeHtml(x.b.lot_code || woFmtDate(x.b.frozen_at))}, ${frozenLeft(x.b)} un.): <span style="color:${x.s.color};font-weight:700">${x.s.label}</span></div>`).join("")}</div>` : ""}
    <div class="admin-card">
      <div class="pc-actions" style="margin:0 0 10px"><label class="pc-check"><input type="checkbox" ${showAll ? "checked" : ""} onchange="admin.data.pcShowAll=this.checked;pcReload()"> Mostrar lotes esgotados</label>
        <button class="btn btn-outline btn-sm" onclick="openFreezeForm()">+ Lançar lote manualmente</button></div>
      <div id="pcFreezeForm"></div>
      ${lots.length ? `<div class="pc-tablewrap"><table><thead><tr><th>Produto</th><th>Lote</th><th>Congelado</th><th>Produção / congelamento</th><th>Validade no freezer</th><th>Situação</th><th></th></tr></thead><tbody>
        ${lots.map(b => { const s = pcLotStatus(b); return `<tr>
          <td><strong>${escapeHtml(woProdName(b.product_id))}</strong></td>
          <td>${escapeHtml(b.lot_code || "—")}</td>
          <td><strong>${s.left}</strong> <small style="color:var(--muted)">de ${b.quantity}</small></td>
          <td>${woFmtDate(b.produced_at || b.frozen_at)}${b.produced_at && b.produced_at !== b.frozen_at ? ` / ${woFmtDate(b.frozen_at)}` : ""}</td>
          <td>${b.expires_at ? woFmtDate(b.expires_at) : "—"}</td>
          <td><span class="pc-badge" style="color:${s.color};border-color:${s.color}">${s.label}</span></td>
          <td class="pc-rowact"><button class="btn btn-pink btn-sm" ${s.left <= 0 || s.key === "vencido" ? "disabled" : ""} onclick="pcPickLot('${b.id}')">Retirar</button>
            <button class="btn btn-outline btn-sm" onclick="pcToggleLot('${b.id}')">Detalhes</button></td></tr>
          <tr id="pcLotDet_${b.id}" style="display:none"><td colspan="7">${pcLotDetails(b)}</td></tr>`; }).join("")}
      </tbody></table></div>
      <p class="hint" style="margin-top:8px">Total por produto: ${Object.entries(byProd).map(([id, q]) => `${escapeHtml(woProdName(id))}: <strong>${q}</strong>`).join(" · ") || "—"}</p>` : `<p class="hint">Nada no freezer. Confirme uma produção na seção ① para criar um lote.</p>`}
    </div>
    ${pcSettingsHtml()}`;
}
function pcLotDetails(b) {
  const th = admin.data.thaws.filter(t => t.frozen_batch_id === b.id);
  const run = (admin.data.pcRuns || []).find(r => r.id === b.production_run_id);
  return `<div class="pc-lotdet">
    ${run ? `<p class="hint">Veio da produção de ${woFmtDate(run.produced_at)}: ${pcNum(run.recipe_batches)} receita(s), ${run.produced_qty} produzidas, ${run.frozen_qty} congeladas${run.stock_qty ? `, ${run.stock_qty} foram direto para o estoque de produtos` : ""}.</p>` : `<p class="hint">Lote lançado manualmente${b.note ? ": " + escapeHtml(b.note) : ""}.</p>`}
    <div class="pc-actions" style="margin:4px 0"><label style="font-size:12.5px">Ajustar validade no freezer <input type="date" id="pcExp_${b.id}" value="${b.expires_at || ""}"></label>
      <button class="btn btn-outline btn-sm" onclick="pcSaveLotExp('${b.id}')">Salvar validade</button>
      <button class="btn btn-outline btn-sm" onclick="deleteFrozen('${b.id}')">Excluir lote</button></div>
    ${th.length ? `<div class="pc-tablewrap"><table><thead><tr><th>Retirado em</th><th>Qtd</th><th>Validade após descongelar</th><th></th></tr></thead><tbody>
      ${th.map(t => `<tr><td>${woFmtDate(t.thawed_at)}</td><td>${t.quantity}</td><td>${woFmtDate(t.expires_at)}</td><td><button class="btn btn-outline btn-sm" onclick="undoThaw('${t.id}')">Desfazer</button></td></tr>`).join("")}</tbody></table></div>` : `<p class="hint">Nenhuma retirada deste lote.</p>`}
  </div>`;
}
function pcToggleLot(id) { const r = document.getElementById("pcLotDet_" + id); if (r) r.style.display = r.style.display === "none" ? "" : "none"; }
async function pcSaveLotExp(id) {
  const v = document.getElementById("pcExp_" + id).value || null;
  const { error } = await sb.from("frozen_batches").update({ expires_at: v }).eq("id", id);
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  await pcReload();
}
function pcSettingsHtml() {
  const pricings = admin.data.pcPricings, prods = admin.data.pAllProducts;
  return `<details class="pc-details" ${admin.data.pcSetOpen ? "open" : ""} ontoggle="admin.data.pcSetOpen=this.open"><summary>Prazos e vínculo por produto</summary>
    <p class="hint">Para cada produto: qual item do <strong>Estoque de produtos</strong> ele abastece e os prazos em dias. Os prazos ficam em branco até você preencher: o sistema não assume nenhum valor. Use os prazos reais e seguros de cada preparação.</p>
    ${pricings.length ? `<div class="pc-tablewrap"><table><thead><tr><th>Produto (Precificação)</th><th>Produto no estoque</th><th>Validade no freezer (dias)</th><th>Validade após descongelar (dias)</th><th></th></tr></thead><tbody>
    ${pricings.map(p => { const s = pcSetting(p.id); return `<tr><td>${escapeHtml(p.name)}</td>
      <td><select id="ps_prod_${p.id}"><option value="">— escolher —</option>${prods.map(x => `<option value="${x.id}" ${x.id === s.product_id ? "selected" : ""}>${escapeHtml(x.name)}</option>`).join("")}</select></td>
      <td><input type="number" min="1" step="1" id="ps_fz_${p.id}" value="${s.freezer_days || ""}" style="width:90px"></td>
      <td><input type="number" min="1" step="1" id="ps_th_${p.id}" value="${s.thaw_days || ""}" style="width:90px"></td>
      <td><button class="btn btn-outline btn-sm" onclick="pcSaveSetting('${p.id}')">Salvar</button></td></tr>`; }).join("")}
    </tbody></table></div>` : `<p class="hint">Cadastre os produtos na Precificação primeiro.</p>`}
    <div class="pc-actions" style="margin-top:10px"><label style="font-size:13px">Avisar lotes que vencem em até <input type="number" min="0" step="1" id="pcAlertDays" value="${pcAlertDays()}" style="width:70px"> dias</label>
      <button class="btn btn-outline btn-sm" onclick="pcSaveAlert()">Salvar aviso</button></div>
  </details>`;
}
async function pcSaveSetting(pricingId) {
  const g = k => document.getElementById(`ps_${k}_${pricingId}`).value;
  const row = { pricing_id: pricingId, product_id: g("prod") || null, freezer_days: parseInt(g("fz")) || null, thaw_days: parseInt(g("th")) || null, updated_at: new Date().toISOString() };
  const { error } = await sb.from("production_settings").upsert(row, { onConflict: "pricing_id" });
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  admin.data.pcSetOpen = true;
  await pcReload();
}
async function pcSaveAlert() {
  const v = parseInt(document.getElementById("pcAlertDays").value);
  if (isNaN(v) || v < 0) { alert("Informe um número de dias."); return; }
  const { error } = await sb.from("production_config").upsert({ id: 1, alert_days: v }, { onConflict: "id" });
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  admin.data.pcSetOpen = true;
  await pcReload();
}
/* lançar lote manualmente (mantido) */
function openFreezeForm() {
  const prods = admin.data.pAllProducts;
  document.getElementById("pcFreezeForm").innerHTML = `<div class="pc-confirm"><h4>Lançar lote manualmente</h4>
    <p class="hint">Use para algo que já estava no freezer. Produto não aparece? Cadastre em Produtos → Delivery (pode ficar inativo no site).</p>
    <div class="form-grid">
      <label>Produto<select id="fzProd">${prods.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}</select></label>
      <label>Quantidade<input type="number" min="1" step="1" id="fzQty"></label>
      <label>Data do congelamento<input type="date" id="fzDate" value="${spToday()}"></label>
      <label>Validade no freezer<input type="date" id="fzExp"></label>
      <label>Observação (opcional)<input type="text" id="fzNote"></label>
    </div>
    <div class="pc-actions"><button class="btn btn-pink" onclick="saveFreeze()">Salvar</button>
    <button class="btn btn-outline" onclick="document.getElementById('pcFreezeForm').innerHTML=''">Cancelar</button></div></div>`;
}
async function saveFreeze() {
  const quantity = parseInt(document.getElementById("fzQty").value);
  if (!quantity || quantity <= 0) { alert("Informe a quantidade."); return; }
  const date = document.getElementById("fzDate").value || spToday();
  const { error } = await sb.from("frozen_batches").insert({ product_id: document.getElementById("fzProd").value, quantity, frozen_at: date, produced_at: date, expires_at: document.getElementById("fzExp").value || null, note: document.getElementById("fzNote").value.trim() || null });
  if (error) { console.error(error); alert("Não foi possível salvar."); return; }
  await pcReload();
}
async function deleteFrozen(id) {
  if (!confirm("Excluir este lote do freezer? Retiradas já feitas continuam no estoque de produtos.")) return;
  const { error } = await sb.from("frozen_batches").delete().eq("id", id);
  if (error) { console.error(error); alert("Não foi possível excluir."); return; }
  await pcReload();
}

/* ---------------- ③ RETIRADA DO FREEZER ---------------- */
function pcSec3Html() {
  const lots = admin.data.frozen.filter(b => frozenLeft(b) > 0).sort((a, b) => String(a.expires_at || "9999").localeCompare(String(b.expires_at || "9999")));
  const today = spToday(), thaws = admin.data.thaws.slice(0, 15);
  return `<h2 class="pc-h"><span class="pc-n">3</span> Retirada do freezer</h2>
    <p class="hint">Ao confirmar, as unidades <strong>saem do lote congelado</strong> e <strong>entram no Estoque de produtos</strong> com a validade abaixo. Elas passam a pertencer a um só estoque.</p>
    <div class="admin-card" id="pcThawCard">
      ${lots.length ? `<div class="form-grid">
        <label>Lote<select id="rtLot" onchange="pcFillThaw(true)">${lots.map(b => { const s = pcLotStatus(b); return `<option value="${b.id}" ${s.key === "vencido" ? "disabled" : ""}>${escapeHtml(woProdName(b.product_id))} · ${escapeHtml(b.lot_code || woFmtDate(b.frozen_at))} · restam ${s.left}${b.expires_at ? " · vence " + woFmtDate(b.expires_at) : ""}${s.key === "vencido" ? " (VENCIDO)" : ""}</option>`; }).join("")}</select></label>
        <label>Quantidade a retirar<input type="number" min="1" step="1" id="rtQty" oninput="pcFillThaw()"></label>
        <label>Data da retirada<input type="date" id="rtDate" value="${today}" onchange="pcFillThaw(true)"></label>
        <label>Validade após descongelar *<input type="date" id="rtExp"></label>
      </div>
      <p class="hint" id="rtInfo"></p>
      <div class="pc-actions"><button class="btn btn-pink" onclick="pcConfirmThaw()">Confirmar retirada e transferir para o estoque de produtos</button></div>` : `<p class="hint">Nenhum lote disponível no freezer.</p>`}
    </div>
    <h3 class="pc-sub">Retiradas recentes</h3>
    <div class="admin-card">${thaws.length ? `<div class="pc-tablewrap"><table><thead><tr><th>Retirado em</th><th>Produto</th><th>Lote</th><th>Qtd</th><th>Validade</th><th></th></tr></thead><tbody>
      ${thaws.map(t => { const b = admin.data.frozen.find(x => x.id === t.frozen_batch_id); const exp = t.expires_at < today;
        return `<tr><td>${woFmtDate(t.thawed_at)}</td><td>${escapeHtml(b ? woProdName(b.product_id) : "—")}</td><td>${escapeHtml(b ? (b.lot_code || woFmtDate(b.frozen_at)) : "—")}</td><td>${t.quantity}</td>
        <td style="${exp ? "color:#B23434;font-weight:700" : ""}">${woFmtDate(t.expires_at)}${exp ? " (vencido)" : ""}</td>
        <td><button class="btn btn-outline btn-sm" onclick="undoThaw('${t.id}')">Desfazer</button></td></tr>`; }).join("")}</tbody></table></div>` : `<p class="hint">Nenhuma retirada ainda.</p>`}</div>`;
}
function pcPickLot(id) {
  const sel = document.getElementById("rtLot"); if (!sel) return;
  sel.value = id; pcFillThaw(true);
  document.getElementById("pcSec3").scrollIntoView({ behavior: "smooth", block: "start" });
  const q = document.getElementById("rtQty"); if (q) q.focus();
}
function pcFillThaw(refreshDate) {
  const sel = document.getElementById("rtLot"); if (!sel) return;
  const b = admin.data.frozen.find(x => x.id === sel.value); if (!b) return;
  const left = frozenLeft(b), set = pcSettingByProduct(b.product_id);
  const q = document.getElementById("rtQty"); q.max = left;
  if (refreshDate) {
    const d = document.getElementById("rtDate").value;
    document.getElementById("rtExp").value = d && set.thaw_days ? pcAddDays(d, set.thaw_days) : "";
  }
  const qty = parseInt(q.value) || 0;
  document.getElementById("rtInfo").innerHTML = `No lote: <strong>${left}</strong> un.` + (qty > 0 && qty <= left ? ` → ficam <strong>${left - qty}</strong> no freezer e <strong>${qty}</strong> vão para o estoque de produtos.` : "")
    + (set.thaw_days ? ` Prazo configurado: ${set.thaw_days} dia(s) após a retirada (a contagem começa no dia seguinte à retirada).` : ` <span style="color:#B23434">Sem prazo configurado para este produto: informe a validade manualmente ou preencha em "Prazos e vínculo".</span>`);
}
async function pcConfirmThaw() {
  const id = document.getElementById("rtLot").value, qty = parseInt(document.getElementById("rtQty").value), exp = document.getElementById("rtExp").value, dt = document.getElementById("rtDate").value || spToday();
  const b = admin.data.frozen.find(x => x.id === id); if (!b) return;
  if (!(qty > 0)) { alert("Informe a quantidade a retirar."); return; }
  if (qty > frozenLeft(b)) { alert(`Só restam ${frozenLeft(b)} no lote.`); return; }
  if (!exp) { alert("Informe a validade após descongelar."); return; }
  if (exp < dt) { alert("A validade não pode ser anterior à data da retirada."); return; }
  if (b.expires_at && b.expires_at < dt) { alert("Este lote está vencido e não pode ser transferido para venda."); return; }
  const { error } = await sb.rpc("thaw_frozen_batch", { p_frozen: id, p_qty: qty, p_expires: exp, p_thawed: dt });
  if (error) { console.error(error); alert("Não foi possível retirar: " + (error.message || "")); return; }
  await pcReload();
}
async function undoThaw(id) {
  if (!confirm("Desfazer esta retirada? As unidades saem do estoque de produtos e voltam ao lote congelado.")) return;
  const { error } = await sb.rpc("undo_thaw", { p_thaw: id });
  if (error) { console.error(error); alert(error.message || "Não foi possível desfazer."); return; }
  await pcReload();
}
