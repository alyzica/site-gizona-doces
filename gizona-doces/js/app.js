/* ============================================================
   GIZONA DOCES — fluxo de encomenda (sem backend, tudo estático)
   Pra trocar o WhatsApp, mexa só na linha abaixo.
============================================================ */
const WHATSAPP_NUMBER = "5519997489773";
const ADDRESS = "Rua das Oliveiras, 74 – Vale das Nogueiras, Americana/SP";

const state = {
  step: "loading",
  authMode: "welcome",     // welcome | login | register
  guest: false,             // true quando "continuar sem cadastro"
  category: null,        // "brigadeiro" | "geladinho"
  box: null,              // { boxId, optionId, flavorsOption, boxConfig }
  flavors: {},             // brigadeiro: { productId: qty }
  geladinho: {},           // { productId: qty }
  wantsArt: null,
  personalization: { birthday_name: "", age: "", theme: "", colors: "", custom_text: "", art_description: "" },
  customer: { name: "", phone: "", eventDate: "", payment: "" },
  formError: "",
  loyaltyCard: null,
  rewardsList: [],
  isoporBox: false,
  suggestQty: {},
};

const app = document.getElementById("app");

function fmt(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
async function go(step) {
  state.step = step;
  if (["dashboard", "loyalty"].includes(step) && auth.customer) {
    await loadLoyaltyData();
  }
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------------- RENDER ROUTER ---------------- */
function render() {
  app.innerHTML = "";
  const view = {
    loading: renderLoading,
    welcome: renderWelcome,
    login: renderLogin,
    "forgot-password": renderForgotPassword,
    register: renderRegister,
    "guest-warning": renderGuestWarning,
    dashboard: renderDashboard,
    profile: renderProfile,
    orders: renderOrdersHistory,
    loyalty: renderLoyaltyClub,
    cover: renderCover,
    guide: renderGuide,
    category: renderCategory,
    "brigadeiro-box": renderBrigadeiroBox,
    "brigadeiro-flavors": renderBrigadeiroFlavors,
    personalization: renderPersonalization,
    "geladinho-info": renderGeladinhoInfo,
    "geladinho-flavors": renderGeladinhoFlavors,
    cart: renderCart,
  }[state.step];
  view();
}

/* ---------------- LOADING ---------------- */
function renderLoading() {
  app.innerHTML = `<section class="screen center-screen"><img class="cover-seal" src="images/brand/icon.png" alt="Gizona Doces"><p class="hint">Carregando...</p></section>`;
}

/* ---------------- WELCOME (boas-vindas / escolha de acesso) ---------------- */
function renderWelcome() {
  app.innerHTML = `
    <section class="screen cover-screen">
      <img class="cover-logo" src="images/brand/logo.png" alt="Gizona Doces">
      <p class="cover-sub center-text" style="font-weight:700;font-size:19px">Seja bem-vindo ao Guia de Encomendas!</p>

      <div class="welcome-benefits">
        <p class="welcome-benefits-title">Benefícios do cadastro:</p>
        <ul>
          <li><span class="welcome-benefit-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l2.6 5.6L21 9.4l-4.5 4.3 1.1 6.3L12 17l-5.6 3 1.1-6.3L3 9.4l6.4-.8L12 3z" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg></span>Acúmulo de pontos no programa fidelidade</li>
          <li><span class="welcome-benefit-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21a9 9 0 100-18 9 9 0 000 18z" stroke="#fff" stroke-width="1.6"/><path d="M12 7v5l3.5 2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg></span>Histórico de pedidos</li>
          <li><span class="welcome-benefit-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 3L4 14h6l-1 7 9-11h-6l1-7z" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg></span>Processo de compra mais rápido</li>
          <li><span class="welcome-benefit-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.6 12.3L12.7 4.4a2 2 0 00-1.4-.6H5a1 1 0 00-1 1v6.3c0 .5.2 1 .6 1.4l7.9 7.9a2 2 0 002.8 0l5.3-5.3a2 2 0 000-2.8z" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.2" fill="#fff"/></svg></span>Promoções e benefícios exclusivos</li>
        </ul>
      </div>

      <div class="welcome-actions">
        <button class="btn btn-white btn-block btn-lg" onclick="go('login')" style="display:inline-flex;align-items:center;justify-content:center;gap:8px">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#F06292" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Já tenho cadastro
        </button>
        <button class="btn btn-outline-white btn-block btn-lg" onclick="go('register')" style="display:inline-flex;align-items:center;justify-content:center;gap:8px">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none"><path d="M9 12a4 4 0 100-8 4 4 0 000 8zM3 21a6 6 0 0112 0M18 8v6M15 11h6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>Criar meu cadastro
        </button>
        <button class="btn btn-link-white" onclick="go('guest-warning')">Continuar sem cadastro</button>
      </div>
    </section>
  `;
}

/* ---------------- LOGIN ---------------- */
function renderLogin() {
  app.innerHTML = `
    <section class="screen login-screen">
      <img class="login-logo" src="images/brand/icon.png" alt="Gizona Doces">
      <div class="login-title">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#F06292" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <h2>Entrar na minha conta</h2>
      </div>
      ${state.formError ? `<div class="form-error">${state.formError}</div>` : ""}
      <div class="login-field">
        <label for="loginEmail"><svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M4 6h16v12H4V6z" stroke="#3D1A24" stroke-width="1.6"/><path d="M4 7l8 6 8-6" stroke="#3D1A24" stroke-width="1.6"/></svg>E-mail</label>
        <input type="email" id="loginEmail" placeholder="seu@email.com">
      </div>
      <div class="login-field">
        <div class="login-field-head">
          <label for="loginPassword"><svg viewBox="0 0 24 24" width="15" height="15" fill="none"><rect x="5" y="10" width="14" height="10" rx="2" stroke="#3D1A24" stroke-width="1.6"/><path d="M8 10V7a4 4 0 018 0v3" stroke="#3D1A24" stroke-width="1.6"/></svg>Senha</label>
          <button class="login-forgot" onclick="go('forgot-password')">Esqueci minha senha</button>
        </div>
        <input type="password" id="loginPassword" placeholder="••••••••">
      </div>
      <button class="btn btn-primary btn-block btn-lg" id="loginBtn" onclick="handleLogin()" style="display:inline-flex;align-items:center;justify-content:center;gap:8px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none"><path d="M9 6l6 6-6 6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Entrar
      </button>
      <button class="login-back" onclick="go('welcome')">Voltar</button>
    </section>
  `;
}
async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const btn = document.getElementById("loginBtn");
  btn.disabled = true; btn.textContent = "Entrando...";
  try {
    await auth_login({ email, password });
    syncOrderCustomerFromProfile();
    state.formError = "";
    go("dashboard");
  } catch (e) {
    state.formError = "E-mail ou senha incorretos.";
    render();
  }
}

/* ---------------- ESQUECI MINHA SENHA ---------------- */
function renderForgotPassword() {
  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Esqueci minha senha</h2><p>Vamos te enviar um link</p></div>
      ${state.formError ? `<div class="form-error">${state.formError}</div>` : ""}
      <div id="forgotSuccess"></div>
      <div class="art-form">
        <label>E-mail<input type="email" id="forgotEmail" placeholder="seu@email.com"></label>
      </div>
      <button class="btn btn-primary btn-block btn-lg" id="forgotBtn" onclick="handleForgotPassword()">Enviar link de redefinição</button>
      ${navButtons({ back: "login" })}
    </section>
  `;
}
async function handleForgotPassword() {
  const email = document.getElementById("forgotEmail").value.trim();
  const btn = document.getElementById("forgotBtn");
  if (!email) { state.formError = "Digite seu e-mail."; render(); return; }
  btn.disabled = true; btn.textContent = "Enviando...";
  try {
    await auth_resetPassword(email);
    state.formError = "";
    app.querySelector("#forgotSuccess").innerHTML = `<div class="form-success">Link enviado! Confira sua caixa de entrada (e o spam) em ${email}.</div>`;
    btn.disabled = true; btn.textContent = "Enviado ✓";
  } catch (e) {
    state.formError = "Não foi possível enviar. Confira o e-mail digitado.";
    render();
  }
}

/* ---------------- REGISTER (cadastro) ---------------- */
function renderRegister() {
  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Criar cadastro</h2><p>Preencha seus dados</p></div>
      ${state.formError ? `<div class="form-error">${state.formError}</div>` : ""}
      <div class="art-form">
        <label>Nome completo *<input type="text" id="regName"></label>
        <label>CPF *<input type="text" id="regCpf" placeholder="000.000.000-00" maxlength="14" oninput="maskCpf(this)"></label>
        <label>Telefone / WhatsApp *<input type="text" id="regPhone" placeholder="(19) 99999-9999" maxlength="15" oninput="maskPhone(this)"></label>
        <label>E-mail *<input type="email" id="regEmail"></label>
        <label>Senha *<input type="password" id="regPassword" placeholder="Mínimo 6 caracteres"></label>
        <div class="two-col">
          <label>CEP *<input type="text" id="regCep" placeholder="00000-000" maxlength="9" oninput="handleCepInput(this)"></label>
          <label>Número *<input type="text" id="regNumber"></label>
        </div>
        <label>Complemento (opcional)<input type="text" id="regComplement"></label>
        <div id="regAddressPreview" class="hint"></div>
      </div>
      <button class="btn btn-primary btn-block btn-lg" id="registerBtn" onclick="handleRegister()">Criar Cadastro</button>
      ${navButtons({ back: "welcome" })}
    </section>
  `;
}

let regAddress = { street: "", neighborhood: "", city: "", state: "" };

function maskCpf(el) {
  let v = el.value.replace(/\D/g, "").slice(0, 11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{0,3})/, "$1.$2");
  el.value = v;
}
function maskPhone(el) {
  let v = el.value.replace(/\D/g, "").slice(0, 11);
  if (v.length > 6) v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, "($1) $2");
  el.value = v;
}
async function handleCepInput(el) {
  let v = el.value.replace(/\D/g, "").slice(0, 8);
  el.value = v.length > 5 ? v.replace(/(\d{5})(\d{0,3})/, "$1-$2") : v;
  if (v.length === 8) {
    const addr = await auth_fetchCep(v);
    if (addr) {
      regAddress = addr;
      document.getElementById("regAddressPreview").textContent = `${addr.street}, ${addr.neighborhood} — ${addr.city}/${addr.state}`;
    }
  }
}

async function handleRegister() {
  const name = document.getElementById("regName").value.trim();
  const cpf = document.getElementById("regCpf").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const cep = document.getElementById("regCep").value.trim();
  const number = document.getElementById("regNumber").value.trim();
  const complement = document.getElementById("regComplement").value.trim();

  if (!name || !cpf || !phone || !email || !password || !cep || !number) {
    state.formError = "Preencha todos os campos obrigatórios.";
    render();
    return;
  }

  const btn = document.getElementById("registerBtn");
  btn.disabled = true; btn.textContent = "Criando...";
  try {
    await auth_register({
      name, cpf, phone, email, password, number, complement,
      cep: cep.replace(/\D/g, ""),
      street: regAddress.street, neighborhood: regAddress.neighborhood,
      city: regAddress.city, state: regAddress.state,
    });
    syncOrderCustomerFromProfile();
    state.formError = "";
    go("dashboard");
  } catch (e) {
    state.formError = e.message || "Erro ao criar cadastro.";
    render();
  }
}

/* ---------------- CONTINUAR SEM CADASTRO (aviso) ---------------- */
function renderGuestWarning() {
  app.innerHTML = `
    <section class="guest-warning-screen">
      <div class="guest-warning-card">
        <div class="guest-warning-head">
          <span class="guest-warning-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M12 3.5L2 20h20L12 3.5z" stroke="#C98A1E" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v4" stroke="#C98A1E" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="#C98A1E"/></svg>
          </span>
          <h2>Atenção</h2>
        </div>
        <p class="guest-warning-text">Ao continuar sem cadastro, suas compras <strong>não serão contabilizadas</strong> no programa de fidelidade. Você não acumulará pontos nem benefícios referentes a este pedido.</p>
        <p class="guest-warning-question">Deseja continuar mesmo assim?</p>
        <button class="btn btn-primary btn-block btn-lg" onclick="continueAsGuest()">Continuar sem cadastro</button>
        <button class="btn btn-ghost btn-block btn-lg" onclick="go('register')">Fazer cadastro</button>
      </div>
    </section>
  `;
}
function continueAsGuest() {
  state.guest = true;
  go("guide");
}

function syncOrderCustomerFromProfile() {
  if (!auth.customer) return;
  state.customer.name = auth.customer.full_name || "";
  state.customer.phone = auth.customer.phone || "";
}

/* ---------------- DASHBOARD (cliente logado) ---------------- */
function renderDashboard() {
  const c = auth.customer;
  const points = Number(state.loyaltyCard?.points || 0);
  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Gizona Doces</h2><p>Olá, ${c ? c.full_name.split(" ")[0] : ""}!</p></div>
      <div class="cart-summary">
        <p class="cart-section-title">${c ? c.full_name : ""}</p>
        <p class="small-line">${c ? c.email : ""}</p>
      </div>
      <div class="cart-summary center-text">
        <div class="card-head" style="justify-content:center">
          <span class="card-icon gold">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8z" stroke="#C98A1E" stroke-width="1.8" stroke-linejoin="round"/></svg>
          </span>
          <p class="cart-section-title">Clube Fidelidade</p>
        </div>
        <div style="font-size:42px;font-weight:800;color:var(--pink)">${points}</div>
        <div style="font-weight:700">pontos</div>
        <button class="btn btn-ghost" onclick="go('loyalty')">Ver Clube Fidelidade</button>
      </div>
      <button class="btn btn-primary btn-block btn-lg" onclick="go('guide')">Fazer uma encomenda</button>
      <div class="dash-links">
        <button class="btn btn-outline-pill" onclick="go('profile')" style="display:inline-flex;align-items:center;justify-content:center;gap:5px">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M12 15a5 5 0 100-10 5 5 0 000 10zM4 21a8 8 0 0116 0" stroke="#F06292" stroke-width="2" stroke-linecap="round"/></svg>Meu Perfil
        </button>
        <button class="btn btn-outline-pill" onclick="go('orders')" style="display:inline-flex;align-items:center;justify-content:center;gap:5px">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M4 8h16l-1.5 11a2 2 0 01-2 1.8H7.5a2 2 0 01-2-1.8L4 8z" stroke="#F06292" stroke-width="2" stroke-linejoin="round"/><path d="M8 8V6a4 4 0 018 0v2" stroke="#F06292" stroke-width="2"/></svg>Meus Pedidos
        </button>
        <button class="btn btn-outline-pill" onclick="go('loyalty')" style="display:inline-flex;align-items:center;justify-content:center;gap:5px">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8z" stroke="#F06292" stroke-width="2" stroke-linejoin="round"/></svg>Fidelidade
        </button>
      </div>
      <button class="btn btn-ghost btn-block" onclick="handleLogout()">Sair da conta</button>
    </section>
  `;
}
async function handleLogout() {
  await auth_logout();
  go("welcome");
}

/* ---------------- Dados de fidelidade / pedidos / perfil ---------------- */
async function loadProductsFromDB() {
  if (!sb) return; // sem conexão, mantém a lista fixa de products.js
  try {
    const { data, error } = await sb.from("products").select("*").eq("active", true).order("sort_order");
    if (error || !data || !data.length) return;
    const mapItem = p => ({
      id: p.id, name: p.name, price: Number(p.price), desc: p.description || "",
      image: p.image_url || "", image2: p.image_url_2 || "",
      imageScale: Number(p.image_scale) || 1, imageX: Number(p.image_position_x) || 50, imageY: Number(p.image_position_y) || 50,
      image2Scale: Number(p.image2_scale) || 1, image2X: Number(p.image2_position_x) || 50, image2Y: Number(p.image2_position_y) || 50
    });
    const brig = data.filter(p => p.category === "brigadeiro").map(mapItem);
    const gela = data.filter(p => p.category === "geladinho").map(mapItem);
    if (brig.length) { BRIGADEIRO_PRODUCTS.length = 0; BRIGADEIRO_PRODUCTS.push(...brig); }
    if (gela.length) { GELADINHO_PRODUCTS.length = 0; GELADINHO_PRODUCTS.push(...gela); }
  } catch (e) {
    console.error("Erro ao carregar produtos do banco, usando lista local:", e);
  }
}

async function loadLoyaltyData() {
  if (!sb || !auth.customer) return;
  try {
    const [{ data: card }, { data: rewards }] = await Promise.all([
      sb.from("loyalty_cards").select("*").eq("customer_id", auth.customer.id).maybeSingle(),
      sb.from("rewards").select("*").eq("active", true).order("points_required"),
    ]);
    state.loyaltyCard = card || { completed_orders: 0, rewards_claimed: 0 };
    state.rewardsList = rewards || [];
  } catch (e) {
    console.error("Erro ao carregar fidelidade:", e);
  }
}

/* ---------------- MEU PERFIL ---------------- */
function renderProfile() {
  const c = auth.customer || {};
  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Meu Perfil</h2></div>
      ${state.formError ? `<div class="form-error">${state.formError}</div>` : ""}
      <div class="art-form">
        <label>Nome completo<input type="text" id="prName" value="${c.full_name || ""}"></label>
        <label>CPF (não editável)<input type="text" value="${(c.cpf || "").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}" disabled></label>
        <label>Telefone / WhatsApp<input type="text" id="prPhone" value="${c.phone || ""}" oninput="maskPhone(this)"></label>
        <label>E-mail (não editável)<input type="email" value="${c.email || ""}" disabled></label>
        <div class="two-col">
          <label>CEP<input type="text" id="prCep" value="${c.cep || ""}" oninput="handleCepInput(this)"></label>
          <label>Número<input type="text" id="prNumber" value="${c.number || ""}"></label>
        </div>
        <label>Complemento<input type="text" id="prComplement" value="${c.complement || ""}"></label>
        <div id="regAddressPreview" class="hint">${c.street ? `${c.street}, ${c.neighborhood} — ${c.city}/${c.state}` : ""}</div>
      </div>
      <button class="btn btn-primary btn-block btn-lg" id="profileSaveBtn" onclick="handleProfileSave()">Salvar alterações</button>
      <button class="btn btn-link-pink" onclick="go('forgot-password')">Alterar senha</button>
      ${navButtons({ back: "dashboard" })}
    </section>
  `;
  regAddress = { street: c.street || "", neighborhood: c.neighborhood || "", city: c.city || "", state: c.state || "" };
}
async function handleProfileSave() {
  const btn = document.getElementById("profileSaveBtn");
  btn.disabled = true; btn.textContent = "Salvando...";
  const payload = {
    full_name: document.getElementById("prName").value.trim(),
    phone: document.getElementById("prPhone").value.trim(),
    cep: document.getElementById("prCep").value.replace(/\D/g, ""),
    number: document.getElementById("prNumber").value.trim(),
    complement: document.getElementById("prComplement").value.trim(),
    street: regAddress.street, neighborhood: regAddress.neighborhood,
    city: regAddress.city, state: regAddress.state,
  };
  try {
    await sb.from("customers").update(payload).eq("id", auth.customer.id);
    await auth_loadCustomer();
    state.formError = "";
    go("dashboard");
  } catch (e) {
    state.formError = "Erro ao salvar. Tente novamente.";
    render();
  }
}

/* ---------------- MEUS PEDIDOS ---------------- */
async function renderOrdersHistory() {
  app.innerHTML = `<section class="screen"><div class="screen-head pink"><h2>Meus Pedidos</h2></div><p class="hint center">Carregando...</p></section>`;
  const { data: orders } = await sb.from("orders").select("*").eq("customer_id", auth.customer.id).order("created_at", { ascending: false });
  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Meus Pedidos</h2></div>
      ${orders && orders.length ? orders.map(o => `
        <div class="cart-summary">
          <div class="order-row-head">
            <strong>${o.order_number}</strong>
            <span class="badge-status ${o.status}">${STATUS_LABEL[o.status] || o.status}</span>
          </div>
          <p class="small-line">${new Date(o.created_at).toLocaleDateString("pt-BR")} — ${fmt(o.total)}</p>
        </div>
      `).join("") : `<p class="hint center">Nenhum pedido ainda.</p>`}
      ${navButtons({ back: "dashboard" })}
    </section>
  `;
}
const STATUS_LABEL = { pending: "Pendente", confirmed: "Confirmado", production: "Em Produção", completed: "Concluído", delivered: "Entregue", cancelled: "Cancelado" };

/* Clube Fidelidade (tela + resgate) fica em js/loyalty-points.js — sistema por pontos. */

/* ---------------- COVER ---------------- */
function renderCover() {
  app.innerHTML = `
    <section class="screen cover-screen">
      <img class="cover-logo" src="images/brand/logo.png" alt="Gizona Doces">
      <p class="cover-sub">Brigadeiro Gourmet e Geladinho Gourmet para festas — feitos à mão, encomenda a encomenda.</p>
      <button class="btn btn-primary btn-lg" onclick="go('guide')">Fazer minha encomenda</button>
      <p class="cover-insta">@gizonadoces</p>
    </section>
  `;
}

/* ---------------- GUIDE ---------------- */
function renderGuide() {
  const items = [
    "Os pedidos devem ser feitos com no mínimo 5 dias de antecedência, sujeitos à disponibilidade da agenda.",
    "Para confirmar a encomenda, é necessário pagar 50% do valor total no ato do pedido. Os 50% restantes até 1 dia antes da retirada.",
    "A encomenda é entregue somente após a confirmação do pagamento integral.",
    "Aceitamos Pix e cartão de crédito, parcelado em até 2x com acréscimo da taxa.",
  ];
  app.innerHTML = `
    <section class="screen">
      <div class="screen-head">
        <img class="brand-seal" src="images/brand/icon.png" alt="Gizona Doces">
        <h2>Guia para encomendas</h2>
      </div>
      <ul class="guide-list">
        ${items.map(i => `<li>${i}</li>`).join("")}
      </ul>
      <div class="callout">Os valores do cardápio são por unidade e não mudam conforme a quantidade — são produtos artesanais.</div>
      <p class="address-block"><strong>Endereço para retirada:</strong><br>${ADDRESS}</p>
      ${navButtons({ back: state.guest ? "welcome" : "dashboard", next: "category", nextLabel: "Ver cardápio" })}
    </section>
  `;
}

/* ---------------- CATEGORY ---------------- */
function renderCategory() {
  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink">
        <h2>O que deseja encomendar?</h2>
      </div>
      <div class="cat-choices">
        <button class="cat-card" onclick="selectCategory('brigadeiro')">
          <span class="cat-emoji">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 19l-6.5-4.5v19L13 29" stroke="var(--pink)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M35 19l6.5-4.5v19L35 29" stroke="var(--pink)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="13" y="15" width="22" height="18" rx="9" stroke="var(--pink)" stroke-width="2.5"/>
            </svg>
          </span>
          <span class="cat-info">
            <strong>Brigadeiro Gourmet</strong>
            <small>18 a 20g cada - caixas com 50 ou 100 unidades</small>
          </span>
        </button>
        <button class="cat-card" onclick="selectCategory('geladinho')">
          <span class="cat-emoji">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 21c0-6.6 4-11 9-11s9 4.4 9 11" stroke="var(--pink)" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M15 21h18l-6.6 17a3 3 0 01-4.8 0L15 21z" stroke="var(--pink)" stroke-width="2.5" stroke-linejoin="round"/>
              <path d="M15 21h18" stroke="var(--pink)" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="cat-info">
            <strong>Geladinho Gourmet</strong>
            <small>Tamanho festa 8cm - mín. 30 unidades</small>
          </span>
        </button>
      </div>
      ${navButtons({ back: "guide" })}
    </section>
  `;
}
function selectCategory(cat) {
  state.category = cat;
  go(cat === "brigadeiro" ? "brigadeiro-box" : "geladinho-info");
}

/* ---------------- BRIGADEIRO: BOX ---------------- */
function renderBrigadeiroBox() {
  const b = state.box;
  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Brigadeiro Gourmet</h2><p>18 a 20g cada - escolha sua caixa</p></div>
      <div class="box-list">
        ${BRIGADEIRO_BOXES.map(box => `
          <div class="box-card ${b?.boxId === box.id ? "active" : ""}">
            <button class="box-main" onclick="pickBox('${box.id}')">
              <div>
                <strong>${box.title}</strong>
                <small>${box.subtitle}</small>
                <span class="badge">${box.badge}</span>
              </div>
              <span class="radio-dot ${b?.boxId === box.id ? "on" : ""}"></span>
            </button>
            ${b?.boxId === box.id ? `
              <div class="sub-options">
                ${box.flavorsOptions.map(opt => `
                  <button class="sub-option ${b?.optionId === opt.id ? "active" : ""}" onclick="pickBoxOption('${opt.id}')">
                    <span class="radio-dot small ${b?.optionId === opt.id ? "on" : ""}"></span>
                    ${opt.label}
                  </button>
                `).join("")}
              </div>` : ""}
          </div>
        `).join("")}
      </div>
      ${navButtons({ back: "category", next: b?.optionId ? "brigadeiro-flavors" : null, nextLabel: "Ver sabores" })}
    </section>
  `;
}
function pickBox(boxId) {
  const boxConfig = BRIGADEIRO_BOXES.find(b => b.id === boxId);
  state.box = { boxId, optionId: null, flavorsOption: null, boxConfig };
  state.flavors = {};
  render();
}
function pickBoxOption(optId) {
  const option = state.box.boxConfig.flavorsOptions.find(o => o.id === optId);
  state.box.optionId = optId;
  state.box.flavorsOption = option;
  state.flavors = {};
  render();
}

/* ---------------- BRIGADEIRO: FLAVORS ---------------- */
function renderBrigadeiroFlavors() {
  const { count } = state.box.flavorsOption;
  const selected = Object.keys(state.flavors);
  const isComplete = selected.length === count;
  const subtotal = state.box.boxConfig.fixedPrice
    ? state.box.boxConfig.fixedPrice
    : Object.entries(state.flavors).reduce((s, [id, qty]) => {
        const p = BRIGADEIRO_PRODUCTS.find(p => p.id === id);
        return s + p.price * qty;
      }, 0);

  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Brigadeiro Gourmet</h2><p>${state.box.boxConfig.title} — escolha ${count} ${count === 1 ? "sabor" : "sabores"}</p></div>
      <div class="counter-pill ${isComplete ? "done" : ""}">
        <span>Sabores selecionados</span><strong>${selected.length}/${count}</strong>
      </div>
      <div class="flavor-list">
        ${BRIGADEIRO_PRODUCTS.map(p => {
          const isSel = !!state.flavors[p.id];
          const canSel = !isSel && selected.length < count;
          return `
            <button class="flavor-row ${isSel ? "active" : ""} ${!isSel && !canSel ? "disabled" : ""}"
                    onclick="toggleBrigFlavor('${p.id}')" ${!isSel && !canSel ? "disabled" : ""}>
              <span class="flavor-thumb-pair">
                <span class="flavor-thumb"><img src="${p.image}" alt="${p.name}" style="--img-scale:${p.imageScale};--img-x:${p.imageX}%;--img-y:${p.imageY}%" onerror="this.parentElement.classList.add('no-photo'); this.remove()"></span>
                <span class="flavor-thumb"><img src="${p.image2}" alt="${p.name} mordido" style="--img-scale:${p.image2Scale};--img-x:${p.image2X}%;--img-y:${p.image2Y}%" onerror="this.parentElement.classList.add('no-photo'); this.remove()"></span>
              </span>
              <span class="flavor-info">
                <strong>${p.name}</strong>
                <small>${p.desc}</small>
                <span class="badge small">${fmt(p.price)}</span>
              </span>
              <span class="check-box ${isSel ? "on" : ""}">${isSel ? "✓" : ""}</span>
            </button>
          `;
        }).join("")}
      </div>
      ${isComplete ? `<div class="subtotal-box"><span>Subtotal brigadeiros</span><strong>${fmt(subtotal)}</strong></div>` : ""}
      ${navButtons({ back: "brigadeiro-box", next: isComplete ? "cart" : null, nextLabel: "Ir para o carrinho" })}
    </section>
  `;
}
function toggleBrigFlavor(id) {
  const { count, qty } = state.box.flavorsOption;
  if (state.flavors[id]) delete state.flavors[id];
  else if (Object.keys(state.flavors).length < count) state.flavors[id] = qty;
  render();
}

/* ---------------- PERSONALIZAÇÃO ---------------- */
function renderPersonalization() {
  const p = state.personalization;
  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Arte Personalizada</h2><p>Deseja personalizar a arte da caixa?</p></div>
      <div class="yn-row">
        <button class="yn-btn ${state.wantsArt === true ? "active" : ""}" onclick="setWantsArt(true)">Sim</button>
        <button class="yn-btn ${state.wantsArt === false ? "active" : ""}" onclick="setWantsArt(false)">Não</button>
      </div>
      ${state.wantsArt === true ? `
        <div class="art-form">
          <label>Nome do aniversariante<input type="text" value="${p.birthday_name}" oninput="p_update('birthday_name', this.value)"></label>
          <label>Idade<input type="text" value="${p.age}" oninput="p_update('age', this.value)"></label>
          <label>Tema<input type="text" placeholder="Ex: Princesas, Safari..." value="${p.theme}" oninput="p_update('theme', this.value)"></label>
          <label>Cores desejadas<input type="text" placeholder="Ex: Rosa, dourado e branco" value="${p.colors}" oninput="p_update('colors', this.value)"></label>
          <label>Texto personalizado<input type="text" placeholder="Ex: Parabéns Maria!" value="${p.custom_text}" oninput="p_update('custom_text', this.value)"></label>
          <label>Descrição da arte<textarea rows="2" placeholder="Descreva como gostaria..." oninput="p_update('art_description', this.value)">${p.art_description}</textarea></label>
          <p class="hint">Fotos de referência podem ser enviadas direto no WhatsApp depois de enviar o pedido.</p>
        </div>
      ` : state.wantsArt === false ? `<p class="hint center">Sem personalização — seguirá com a arte padrão.</p>` : ""}
      ${navButtons({
        back: "geladinho-info",
        next: state.wantsArt !== null ? "geladinho-flavors" : null,
        nextLabel: "Continuar",
      })}
    </section>
  `;
}
function setWantsArt(v) { state.wantsArt = v; render(); }
function p_update(key, value) { state.personalization[key] = value; }

/* ---------------- GELADINHO: INFO ---------------- */
function renderGeladinhoInfo() {
  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Geladinho Gourmet</h2><p>Tamanho Festa</p></div>
      <div class="info-card">
        <p><strong>Nossos geladinhos tamanho festa possuem 8 cm.</strong></p>
        <p>Ideal para aniversários, festas corporativas, chá de bebê e outras comemorações.</p>
      </div>
      <div class="rule-card">
        <p>Quantidade mínima por sabor: <u>${GELADINHO_RULES.minPerFlavor} unidades</u></p>
        <p>Pedido mínimo total: <strong>${GELADINHO_RULES.minTotal} unidades</strong></p>
      </div>
      <div class="info-card">
        <p><strong>Caixa de isopor</strong></p>
        <p>A caixa de isopor personalizada é <strong>opcional</strong>. Você poderá adicioná-la no carrinho.</p>
        <p>Ela ajuda na conservação e no transporte, e a arte é gratuita e personalizada conforme o tema (até 3 alterações sem custo). O valor é combinado diretamente pelo WhatsApp.</p>
      </div>
      ${navButtons({ back: "category", next: "geladinho-flavors", nextLabel: "Ver sabores" })}
    </section>
  `;
}

/* ---------------- GELADINHO: FLAVORS ---------------- */
function renderGeladinhoFlavors() {
  const totalUnits = Object.values(state.geladinho).reduce((s, q) => s + q, 0);
  const hasErrors = Object.values(state.geladinho).some(q => q > 0 && q < GELADINHO_RULES.minPerFlavor);
  const isValid = totalUnits >= GELADINHO_RULES.minTotal && !hasErrors;
  const subtotal = Object.entries(state.geladinho).reduce((s, [id, qty]) => {
    const p = GELADINHO_PRODUCTS.find(p => p.id === id);
    return s + p.price * qty;
  }, 0);

  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Geladinho Gourmet</h2><p>Escolha os sabores</p></div>
      <div class="counter-pill ${isValid ? "done" : ""}">
        <span>Total: ${totalUnits} unidades</span><strong>${isValid ? "Mínimo atingido" : `Mín. ${GELADINHO_RULES.minTotal} un.`}</strong>
      </div>
      <div class="flavor-list">
        ${GELADINHO_PRODUCTS.map(p => {
          const qty = state.geladinho[p.id] || 0;
          const err = qty > 0 && qty < GELADINHO_RULES.minPerFlavor;
          return `
            <div class="flavor-row wide">
              <span class="flavor-thumb"><img src="${p.image}" alt="${p.name}" style="--img-scale:${p.imageScale};--img-x:${p.imageX}%;--img-y:${p.imageY}%" onerror="this.parentElement.classList.add('no-photo'); this.remove()"></span>
              <span class="flavor-info">
                <strong>${p.name}</strong>
                <small>${p.desc}</small>
                <span class="badge small">${fmt(p.price)}</span>
                ${err ? `<small class="error">Mínimo ${GELADINHO_RULES.minPerFlavor} por sabor</small>` : ""}
              </span>
              <span class="stepper">
                <button onclick="changeGeladinho('${p.id}', -1)">–</button>
                <span>${qty}</span>
                <button onclick="changeGeladinho('${p.id}', 1)">+</button>
              </span>
            </div>
          `;
        }).join("")}
      </div>
      ${isValid ? `<div class="subtotal-box"><span>Subtotal geladinhos</span><strong>${fmt(subtotal)}</strong></div>` : ""}
      ${navButtons({ back: "geladinho-info", next: isValid ? "cart" : null, nextLabel: "Ir para o carrinho" })}
    </section>
  `;
}
function changeGeladinho(id, direction) {
  const current = state.geladinho[id] || 0;
  let next;
  if (current === 0 && direction > 0) {
    next = GELADINHO_RULES.minPerFlavor;
  } else if (direction > 0) {
    // sobe de 1 em 1 até o limite, depois de 5 em 5
    next = current < GELADINHO_RULES.smallStepLimit ? current + 1 : current + 5;
  } else {
    // desce de 1 em 1 até o limite, depois de 5 em 5
    next = current <= GELADINHO_RULES.smallStepLimit ? current - 1 : current - 5;
  }
  next = Math.max(0, next);
  if (next < GELADINHO_RULES.minPerFlavor) next = 0; // não fica "preso" abaixo do mínimo
  if (next === 0) delete state.geladinho[id];
  else state.geladinho[id] = next;
  render();
}

/* ---------------- CARRINHO ---------------- */
function renderCart() {
  const brigItems = Object.keys(state.flavors).length
    ? Object.entries(state.flavors).map(([id, qty]) => ({ ...BRIGADEIRO_PRODUCTS.find(p => p.id === id), qty }))
    : [];
  const gelaItems = Object.keys(state.geladinho).length
    ? Object.entries(state.geladinho).map(([id, qty]) => ({ ...GELADINHO_PRODUCTS.find(p => p.id === id), qty }))
    : [];

  const brigSubtotal = state.box?.boxConfig?.fixedPrice
    ? state.box.boxConfig.fixedPrice
    : brigItems.reduce((s, i) => s + i.price * i.qty, 0);
  const gelaSubtotal = gelaItems.reduce((s, i) => s + i.price * i.qty, 0);
  // A caixa de isopor não entra no valor estimado: o preço é combinado direto pelo WhatsApp.
  const total = brigSubtotal + gelaSubtotal;
  const c = auth.customer
    ? { ...state.customer, name: auth.customer.full_name || state.customer.name, phone: auth.customer.phone || state.customer.phone }
    : state.customer;
  const isGuestOrder = state.guest || !auth.customer;
  const canSubmit = (!isGuestOrder || (c.name.trim() && c.phone.trim())) && (brigItems.length || gelaItems.length);

  // sabores de brigadeiro ainda não escolhidos, pra trocar
  const unusedBrigFlavors = BRIGADEIRO_PRODUCTS.filter(p => !state.flavors[p.id]);

  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Carrinho</h2><p>Revise seu pedido</p></div>

      ${brigItems.length ? `
        <div class="cart-summary">
          <p class="cart-section-title">${state.box.boxConfig.title}</p>
          ${brigItems.map(i => `
            <div class="cart-line-edit">
              <span>${i.name}</span>
              <span class="stepper">
                <button onclick="cartChangeBrig('${i.id}', -1)">–</button>
                <span>${i.qty}</span>
                <button onclick="cartChangeBrig('${i.id}', 1)">+</button>
              </span>
              <select class="swap-select" onchange="swapBrigFlavor('${i.id}', this.value)">
                <option value="">Trocar sabor...</option>
                ${unusedBrigFlavors.map(p => `<option value="${p.id}">${p.name}</option>`).join("")}
              </select>
              <button class="btn-remove" onclick="cartRemoveBrig('${i.id}')" title="Remover">✕</button>
            </div>
          `).join("")}
          <div class="cart-line total"><span>Subtotal brigadeiros</span><strong>${fmt(brigSubtotal)}</strong></div>
        </div>
      ` : ""}

      ${gelaItems.length ? `
        <div class="cart-summary">
          <p class="cart-section-title">Geladinhos Gourmet</p>
          ${gelaItems.map(i => `
            <div class="cart-line-edit">
              <span>${i.name}</span>
              <span class="stepper">
                <button onclick="cartChangeGeladinho('${i.id}', -1)">–</button>
                <span>${i.qty}</span>
                <button onclick="cartChangeGeladinho('${i.id}', 1)">+</button>
              </span>
              <button class="btn-remove" onclick="cartRemoveGeladinho('${i.id}')" title="Remover">✕</button>
            </div>
          `).join("")}
          <div class="cart-line total"><span>Subtotal geladinhos</span><strong>${fmt(gelaSubtotal)}</strong></div>
        </div>

        <div class="cart-summary">
          <label class="isopor-toggle">
            <input type="checkbox" ${state.isoporBox ? "checked" : ""} onchange="toggleIsoporBox(this.checked)">
            <span>Adicionar caixa de isopor personalizada</span>
          </label>
          <p class="hint">O cliente pode optar por adicionar uma caixa de isopor personalizada, que garante maior conservação dos geladinhos, segurança no transporte e uma apresentação ainda mais especial. A arte é gratuita e personalizada conforme o tema do evento (até 3 alterações sem custo). A caixa é adquirida separadamente e <strong>o valor é combinado diretamente pelo WhatsApp</strong>.</p>
        </div>
      ` : ""}

      <div class="total-box"><span>Valor estimado total</span><strong>${fmt(total)}</strong></div>

      ${renderSuggestions()}

      <div class="cart-summary">
        <p class="cart-section-title">Continuar explorando</p>
        <p class="hint">Quer conhecer as outras opções antes de finalizar?</p>
        <button class="btn btn-outline btn-block" onclick="go('category')">Ver outros produtos</button>
      </div>

      ${state.wantsArt ? `
        <div class="cart-summary">
          <p class="cart-section-title">Arte personalizada</p>
          ${state.personalization.birthday_name ? `<p class="small-line">Nome: ${state.personalization.birthday_name}${state.personalization.age ? `, ${state.personalization.age}` : ""}</p>` : ""}
          ${state.personalization.theme ? `<p class="small-line">Tema: ${state.personalization.theme}</p>` : ""}
          ${state.personalization.colors ? `<p class="small-line">Cores: ${state.personalization.colors}</p>` : ""}
        </div>
      ` : ""}

      <div class="cart-form-block">
        <p class="cart-section-title">${isGuestOrder ? "Seus dados para contato" : "Dados do pedido"}</p>
        ${isGuestOrder ? `
          <label>Nome completo<input type="text" value="${c.name}" oninput="c_update('name', this.value)"></label>
          <label>Telefone / WhatsApp<input type="text" placeholder="(19) 99999-9999" value="${c.phone}" oninput="c_update('phone', this.value)"></label>
        ` : `<p class="hint">Usaremos automaticamente os dados do seu perfil: <strong>${auth.customer.full_name}</strong>.</p>`}
        <label>Data do evento<input type="date" id="eventDateInput" min="${minEventDate()}" value="${c.eventDate}" oninput="handleEventDateInput(this)"></label>
        <p class="hint" style="margin-top:-6px">Trabalhamos com antecedência mínima de 5 dias.</p>
        <label>Forma de pagamento
          <select onchange="c_update('payment', this.value)">
            <option value="">Selecione (opcional)</option>
            <option value="Pix" ${c.payment === "Pix" ? "selected" : ""}>PIX</option>
            <option value="Crédito" ${c.payment === "Crédito" ? "selected" : ""}>Crédito</option>
          </select>
        </label>
      </div>

      ${navButtons({
        back: state.category === "brigadeiro" ? "brigadeiro-flavors" : "geladinho-flavors",
      })}
      <button class="btn btn-primary btn-block btn-lg" ${canSubmit ? "" : "disabled"} onclick="submitOrder(${total})">Enviar pelo WhatsApp</button>
    </section>
  `;
}

/* ---------------- Sugestões "Você também pode gostar" ---------------- */
function renderSuggestions() {
  const gelaChosen = new Set(Object.keys(state.geladinho));
  const suggestions = [];
  const gelaCandidate = GELADINHO_PRODUCTS.find(p => !gelaChosen.has(p.id));
  if (gelaCandidate) suggestions.push({ ...gelaCandidate, type: "geladinho" });

  if (!suggestions.length) return "";

  return `
    <div class="cart-summary">
      <p class="cart-section-title">Você também pode gostar</p>
      ${suggestions.map(p => {
        const qty = state.suggestQty[p.id] || (p.type === "geladinho" ? GELADINHO_RULES.minPerFlavor : 1);
        return `
          <div class="suggest-card">
            <span class="suggest-thumb"><img src="${p.image}" alt="${p.name}" onerror="this.parentElement.classList.add('no-photo'); this.remove()"></span>
            <div class="suggest-info">
              <strong>${p.name}</strong>
              <span class="suggest-price">${fmt(p.price)}</span>
              <span class="stepper small">
                <button onclick="adjustSuggestQty('${p.id}', '${p.type}', -1)">–</button>
                <span>${qty}</span>
                <button onclick="adjustSuggestQty('${p.id}', '${p.type}', 1)">+</button>
              </span>
            </div>
            <button class="suggest-add" onclick="addSuggestion('${p.id}', '${p.type}')" title="Adicionar ao carrinho">🛒</button>
          </div>
        `;
      }).join("")}
    </div>
  `;
}
function adjustSuggestQty(id, type, direction) {
  const step = type === "geladinho" ? 1 : 1; // geladinho usa a mesma regra visual simples aqui; validação de mínimo ocorre ao adicionar
  const current = state.suggestQty[id] || (type === "geladinho" ? GELADINHO_RULES.minPerFlavor : 1);
  const min = type === "geladinho" ? GELADINHO_RULES.minPerFlavor : 1;
  state.suggestQty[id] = Math.max(min, current + direction * step);
  render();
}
function addSuggestion(id, type) {
  const qty = state.suggestQty[id] || (type === "geladinho" ? GELADINHO_RULES.minPerFlavor : 1);
  state.geladinho[id] = qty;
  delete state.suggestQty[id];
  render();
}

/* ---------------- Edição direto no carrinho ---------------- */
function swapBrigFlavor(oldId, newId) {
  if (!newId) return;
  const qty = state.flavors[oldId];
  delete state.flavors[oldId];
  state.flavors[newId] = qty;
  render();
}
function cartChangeBrig(id, direction) {
  const current = state.flavors[id] || 0;
  const next = Math.max(0, current + direction);
  if (next === 0) delete state.flavors[id];
  else state.flavors[id] = next;
  render();
}
function cartRemoveBrig(id) {
  delete state.flavors[id];
  render();
}
function cartChangeGeladinho(id, direction) {
  changeGeladinho(id, direction); // reaproveita a mesma regra de passo (1 até 15, depois 5)
}
function cartRemoveGeladinho(id) {
  delete state.geladinho[id];
  render();
}
function toggleIsoporBox(checked) {
  state.isoporBox = checked;
  render();
}

function c_update(key, value) { state.customer[key] = value; }

/* Data mínima: hoje + 5 dias, no formato YYYY-MM-DD pro atributo min do input */
function dateKeyLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minEventDate() {
  const d = new Date();
  // Meio-dia evita que uma mudança de fuso ou horário de verão desloque o dia.
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + 5);
  return dateKeyLocal(d);
}

function formatDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
}
function handleEventDateInput(el) {
  const min = minEventDate();
  if (el.value && el.value < min) {
    alert(`Para garantir o preparo da sua encomenda, trabalhamos com antecedência mínima de 5 dias. A primeira data disponível é ${formatDateKey(min)}.`);
    el.value = "";
    state.customer.eventDate = "";
    return;
  }
  state.customer.eventDate = el.value;
}

async function submitOrder(total) {
  // A aba precisa abrir durante o toque no botão; se esperar o banco responder,
  // navegadores móveis podem bloqueá-la como pop-up.
  const whatsappWindow = window.open("about:blank", "_blank");
  const c = auth.customer
    ? { ...state.customer, name: auth.customer.full_name || state.customer.name, phone: auth.customer.phone || state.customer.phone }
    : state.customer;
  let msg = `Olá! Gostaria de fazer uma encomenda na Gizona Doces.\n\n`;
  msg += `Nome: ${c.name}\nTelefone: ${c.phone}\n`;
  if (c.eventDate) msg += `Data do evento: ${new Date(c.eventDate + "T00:00:00").toLocaleDateString("pt-BR")}\n`;
  if (c.payment) msg += `Forma de pagamento: ${c.payment}\n`;
  msg += `\n`;

  const items = [];

  if (Object.keys(state.flavors).length) {
    msg += `${state.box.boxConfig.title}\n`;
    Object.entries(state.flavors).forEach(([id, qty]) => {
      const p = BRIGADEIRO_PRODUCTS.find(p => p.id === id);
      msg += `  - ${p.name}: ${qty} unidades\n`;
      items.push({ product_name: p.name, category: "brigadeiro", quantity: qty, unit_price: p.price, subtotal: p.price * qty });
    });
    const subtotal = state.box.boxConfig.fixedPrice || Object.entries(state.flavors).reduce((s, [id, qty]) => s + BRIGADEIRO_PRODUCTS.find(p => p.id === id).price * qty, 0);
    msg += `  Subtotal: ${fmt(subtotal)}\n\n`;
  }
  if (Object.keys(state.geladinho).length) {
    msg += `Geladinhos Gourmet Tamanho Festa\n`;
    Object.entries(state.geladinho).forEach(([id, qty]) => {
      const p = GELADINHO_PRODUCTS.find(p => p.id === id);
      msg += `  - ${p.name}: ${qty} unidades x ${fmt(p.price)} = ${fmt(p.price * qty)}\n`;
      items.push({ product_name: p.name, category: "geladinho", quantity: qty, unit_price: p.price, subtotal: p.price * qty });
    });
    if (state.isoporBox) {
      msg += `  Caixa de isopor personalizada: valor a combinar\n`;
      items.push({ product_name: "Caixa de isopor personalizada", category: "geladinho", quantity: 1, unit_price: null, subtotal: null });
    }
    msg += `\n`;
  }

  if (state.wantsArt) {
    const p = state.personalization;
    msg += `Personalização de arte:\n`;
    if (p.birthday_name) msg += `  Nome: ${p.birthday_name}\n`;
    if (p.age) msg += `  Idade: ${p.age}\n`;
    if (p.theme) msg += `  Tema: ${p.theme}\n`;
    if (p.colors) msg += `  Cores: ${p.colors}\n`;
    if (p.custom_text) msg += `  Texto: ${p.custom_text}\n`;
    if (p.art_description) msg += `  Descrição: ${p.art_description}\n`;
    msg += `\n`;
  }

  msg += `Valor estimado: ${fmt(total)}\n\nAguardo retorno sobre disponibilidade.`;

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  if (whatsappWindow) whatsappWindow.location.href = whatsappUrl;
  else window.location.href = whatsappUrl;

  // Salva o pedido no banco (fica no histórico e conta ponto de fidelidade se logado)
  try {
    const paymentMap = { "Pix": "pix", "Crédito": "credito" };
    await sb.from("orders").insert({
      customer_id: auth.customer ? auth.customer.id : null,
      customer_name: c.name,
      customer_phone: c.phone,
      customer_email: auth.customer ? auth.customer.email : null,
      event_date: c.eventDate || null,
      items,
      personalization: state.wantsArt ? state.personalization : {},
      payment_method: paymentMap[c.payment] || null,
      total,
      observations: "",
    });
  } catch (e) {
    console.error("Erro ao salvar pedido:", e);
  }

  renderConfirmation();
}

function renderConfirmation() {
  app.innerHTML = `
    <section class="screen center-screen">
      <img class="cover-seal" src="images/brand/icon.png" alt="Gizona Doces">
      <h2 class="confirm-title">Pedido enviado!</h2>
      <p class="hint">Seu pedido foi enviado pelo WhatsApp. A Gizona vai confirmar disponibilidade e pagamento por lá.</p>
      <button class="btn btn-ghost" onclick="resetOrder()">Fazer nova encomenda</button>
    </section>
  `;
}
function resetOrder() {
  state.category = null;
  state.box = null;
  state.flavors = {};
  state.geladinho = {};
  state.wantsArt = null;
  state.isoporBox = false;
  state.suggestQty = {};
  state.personalization = { birthday_name: "", age: "", theme: "", colors: "", custom_text: "", art_description: "" };
  go(state.guest ? "welcome" : "dashboard");
}

/* ---------------- HELPERS ---------------- */
function navButtons({ back, next, nextLabel }) {
  return `
    <div class="nav-row">
      ${back ? `<button class="btn btn-ghost" onclick="go('${back}')">← Voltar</button>` : "<span></span>"}
      ${next ? `<button class="btn btn-primary" onclick="go('${next}')">${nextLabel} →</button>` : ""}
    </div>
  `;
}

/* ---------------- Init ---------------- */
(async function init() {
  try {
    await auth_init();
  } catch (e) {
    console.error("Erro ao verificar login:", e);
  }
  await loadProductsFromDB();
  if (auth.session && auth.customer) {
    syncOrderCustomerFromProfile();
    state.step = "dashboard";
    await loadLoyaltyData();
  } else {
    state.step = "welcome";
  }
  render();
})();
