/* ============================================================
   GIZONA DOCES — fluxo de encomenda (sem backend, tudo estático)
   Pra trocar o WhatsApp, mexa só na linha abaixo.
============================================================ */
const WHATSAPP_NUMBER = "5519997489773";
const INSTAGRAM_URL = "https://www.instagram.com/gizonadoces/"; // confirme o @ do Instagram
/* FRETE NO SITE: false = o cliente NÃO vê valor de entrega (só o aviso abaixo).
   Para reativar o cálculo/exibição, troque para true — nada foi removido. */
const SHOW_SHIPPING = false;
const SHIPPING_NOTICE = "A entrega é realizada por motoboys parceiros. O valor será calculado de acordo com o endereço informado e confirmado pelo WhatsApp.";
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
  orderTab: "encomendas", // "encomendas" | "delivery"
  delivery: {},            // delivery: { productId: qty }
  coupon: null, couponInput: "", couponMsg: "", couponSig: "",
  shipping: { status: "idle" }, shipCfg: null,
  deliveryCatalog: null,   // produtos de delivery com estoque (RPC delivery_catalog)
  deliveryStatus: null,    // { open, message } (RPC delivery_status); null = ainda não carregou / script não rodado
  fulfillment: null,       // "delivery" | "pickup" (null = padrão conforme a sacola)
  originCoords: null, geoCache: {}, bagNotice: "",
  media: {},               // fotos do menu de encomendas (tabela site_media)
  cakes: [], cakeDraft: null,
  addrMode: null, otherAddr: { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
};

const app = document.getElementById("app");

function fmt(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
const NAV_STACK = [];
async function go(step, opts) {
  if (!(opts && opts.tab) && state.step && state.step !== step && state.step !== "loading") NAV_STACK.push(state.step);
  if (opts && opts.tab) NAV_STACK.length = 0;
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
    loyalty: () => renderLoyaltyClub(),
    cover: renderCover,
    category: renderCategory,
    "brigadeiro-box": renderBrigadeiroBox,
    "brigadeiro-flavors": renderBrigadeiroFlavors,
    personalization: renderPersonalization,
    "geladinho-info": renderGeladinhoInfo,
    "geladinho-flavors": renderGeladinhoFlavors,
    bolo: renderBolo,
    cart: renderCart,
  }[state.step];
  const stepAtRender = state.step;
  Promise.resolve(view()).then(() => { if (state.step === stepAtRender) decorateScreen(); });
}

/* ---------------- Barra superior, rodapé e menu inferior ---------------- */
const NAV_STEPS = ["dashboard", "profile", "orders", "loyalty", "category", "brigadeiro-box", "brigadeiro-flavors", "personalization", "geladinho-info", "geladinho-flavors", "bolo", "cart"];
const STEP_TITLE = { dashboard: "Início", profile: "Perfil", orders: "Pedidos", loyalty: "Fidelidade", category: "Faça seu pedido", "brigadeiro-box": "Brigadeiro Gourmet", "brigadeiro-flavors": "Brigadeiro Gourmet", personalization: "Personalização", "geladinho-info": "Geladinho Gourmet", "geladinho-flavors": "Geladinho Gourmet", bolo: "Bolos Decorados", cart: "Sacola" };

function cartCount() {
  const sum = o => Object.values(o || {}).reduce((t, q) => t + (Number(q) || 0), 0);
  return sum(state.flavors) + sum(state.geladinho) + sum(state.delivery) + state.cakes.length;
}
function goBack() {
  const prev = NAV_STACK.pop();
  state.step = prev || (auth.customer ? "dashboard" : "welcome");
  render();
  window.scrollTo({ top: 0 });
}
function goTab(tab) {
  const loggedIn = !!auth.customer;
  if (tab === "home") return go(loggedIn ? "dashboard" : "welcome", { tab: true });
  if (!loggedIn) return go("login", { tab: true });
  return go(tab, { tab: true });
}
function openCart() { go(cartCount() ? "cart" : "category"); }

function decorateScreen() {
  const step = state.step;
  app.querySelectorAll(".app-topbar,.site-footer,.bottom-nav").forEach(el => el.remove());
  app.classList.toggle("has-nav", NAV_STEPS.includes(step));
  const footer = `
    <footer class="site-footer">
      <div class="footer-social">
        <a class="footer-btn" href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener" aria-label="WhatsApp">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4z"/></svg>WhatsApp</a>
        <a class="footer-btn" href="${INSTAGRAM_URL}" target="_blank" rel="noopener" aria-label="Instagram">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>Instagram</a>
      </div>
      <p class="footer-copy">© ${new Date().getFullYear()} Gizona Doces · Todos os direitos reservados</p>
    </footer>`;
  if (!NAV_STEPS.includes(step)) { app.insertAdjacentHTML("beforeend", footer); return; }
  const n = cartCount();
  const top = `
    <header class="app-topbar">
      <button onclick="goBack()" aria-label="Voltar"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M11 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <strong>${STEP_TITLE[step] || ""}</strong>
      <div class="topbar-right">
      ${auth.customer ? `<button onclick="handleLogout()" aria-label="Sair da conta" title="Sair da conta"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg></button>` : ""}
      <button class="cart-btn" onclick="openCart()" aria-label="Carrinho">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8h12l-1 12H7L6 8z" stroke-linejoin="round"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>
        ${n ? `<span class="cart-badge">${n}</span>` : ""}
      </button>
      </div>
    </header>`;
  const active = { dashboard: "home", orders: "orders", loyalty: "loyalty", profile: "profile" }[step] || (["category", "brigadeiro-box", "brigadeiro-flavors", "personalization", "geladinho-info", "geladinho-flavors", "bolo", "cart"].includes(step) ? "home" : "");
  const tab = (id, label, icon) => `<button class="${active === id ? "active" : ""}" onclick="goTab('${id}')">${icon}<span>${label}</span></button>`;
  const ic = p => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const nav = `
    <nav class="bottom-nav">
      ${tab("home", "Início", ic('<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>'))}
      ${tab("orders", "Pedidos", ic('<path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.7L3 8"/><path d="M3 3v5h5M12 8v4l3 2"/>'))}
      ${tab("loyalty", "Fidelidade", ic('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M7.5 8a2.5 2.5 0 010-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 010 5"/>'))}
      ${tab("profile", "Perfil", ic('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'))}
    </nav>`;
  app.insertAdjacentHTML("afterbegin", top);
  app.insertAdjacentHTML("beforeend", footer + nav);
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
        <label>Gênero
          <select id="regGender">
            <option value="">Prefiro não informar</option>
            <option value="feminino">Feminino</option>
            <option value="masculino">Masculino</option>
          </select>
        </label>
        <label>CPF *<input type="text" id="regCpf" placeholder="000.000.000-00" maxlength="14" oninput="maskCpf(this)"></label>
        <label>Telefone / WhatsApp *<input type="text" id="regPhone" placeholder="(19) 99999-9999" maxlength="15" oninput="maskPhone(this)"></label>
        <label>E-mail *<input type="email" id="regEmail"></label>
        <label>Senha *<input type="password" id="regPassword" placeholder="Mínimo 6 caracteres"></label>
        <div class="two-col">
          <label>CEP (opcional)<input type="text" id="regCep" placeholder="00000-000" maxlength="9" oninput="handleCepInput(this)"></label>
          <label>Número *<input type="text" id="regNumber"></label>
        </div>
        <p class="hint" style="margin:-4px 0 0">Não lembra o CEP? Sem problema, é só escrever o endereço abaixo.</p>
        <label>Rua / Avenida *<input type="text" id="regStreet"></label>
        <label>Bairro<input type="text" id="regNeighborhood"></label>
        <div class="two-col">
          <label>Cidade<input type="text" id="regCity"></label>
          <label>UF<input type="text" id="regState" maxlength="2" style="text-transform:uppercase"></label>
        </div>
        <label>Complemento (opcional)<input type="text" id="regComplement"></label>
      </div>
      <button class="btn btn-primary btn-block btn-lg" id="registerBtn" onclick="handleRegister()">Criar Cadastro</button>
      ${navButtons({ back: "welcome" })}
    </section>
  `;
}

function readAddressFields(prefix) {
  const g = id => (document.getElementById(prefix + id)?.value || "").trim();
  return { street: g("Street"), neighborhood: g("Neighborhood"), city: g("City"), state: g("State").toUpperCase() };
}
function formatAddress(c) {
  if (!c || !c.street) return "";
  return `${c.street}${c.number ? ", " + c.number : ""}${c.complement ? " (" + c.complement + ")" : ""}${c.neighborhood ? " – " + c.neighborhood : ""}${c.city ? ", " + c.city : ""}${c.state ? "/" + c.state : ""}`;
}

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
      const prefix = el.id === "prCep" ? "pr" : "reg";
      const set = (id, val) => { const f = document.getElementById(prefix + id); if (f && val) f.value = val; };
      set("Street", addr.street); set("Neighborhood", addr.neighborhood); set("City", addr.city); set("State", addr.state);
    }
  }
}

async function handleRegister() {
  const name = document.getElementById("regName").value.trim();
  const gender = document.getElementById("regGender").value;
  const cpf = document.getElementById("regCpf").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const cep = document.getElementById("regCep").value.trim();
  const number = document.getElementById("regNumber").value.trim();
  const complement = document.getElementById("regComplement").value.trim();

  const addrFields = readAddressFields("reg");
  if (!name || !cpf || !phone || !email || !password || !addrFields.street || !number) {
    state.formError = "Preencha todos os campos obrigatórios.";
    render();
    return;
  }

  const btn = document.getElementById("registerBtn");
  btn.disabled = true; btn.textContent = "Criando...";
  try {
    await auth_register({
      name, gender, cpf, phone, email, password, number, complement,
      cep: cep.replace(/\D/g, ""),
      ...addrFields,
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
  go("category");
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
  const greeting = c?.gender === "masculino" ? "Bem-vindo" : c?.gender === "feminino" ? "Bem-vinda" : "Olá";
  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink center-text">
        <img src="images/brand/logo.png" alt="Gizona Doces" style="width:130px;margin:0 auto 8px;display:block">
        <p>${greeting}, ${c ? c.full_name.split(" ")[0] : ""}!</p>
      </div>
      <div class="cart-summary" style="display:flex;flex-direction:row;align-items:center;gap:12px">
        <span class="card-icon pink" style="width:40px;height:40px;border-radius:50%">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M12 15a5 5 0 100-10 5 5 0 000 10zM4 21a8 8 0 0116 0" stroke="#F06292" stroke-width="1.8" stroke-linecap="round"/></svg>
        </span>
        <div>
          <p class="cart-section-title" style="font-family:var(--font-body);font-size:15px">${c ? c.full_name : ""}</p>
          <p class="small-line">${c ? c.email : ""}</p>
        </div>
      </div>
      <div class="cart-summary">
        <div class="card-head">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#E8A33D" d="M5 16L3 7l5.5 4L12 5l3.5 6L21 7l-2 9H5zm0 2h14v2H5v-2z"/></svg>
          <p class="cart-section-title" style="font-family:var(--font-body);font-size:15px">Clube Fidelidade</p>
        </div>
        <div class="center-text" style="margin-top:4px">
          <div style="font-size:42px;font-weight:800;color:var(--pink)">${points}</div>
          <div style="font-weight:700;margin-bottom:10px">pontos</div>
          <button class="btn btn-ghost" onclick="go('loyalty')">Ver Clube Fidelidade</button>
        </div>
      </div>
      <button class="btn btn-primary btn-block btn-lg" onclick="go('category')" style="display:inline-flex;align-items:center;justify-content:center;gap:8px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none"><path d="M6 8h12l-1 12H7L6 8z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8V6a3 3 0 016 0v2" stroke="#fff" stroke-width="1.8"/></svg>Faça seu pedido
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
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
        <label>Gênero
          <select id="prGender">
            <option value="" ${!c.gender ? "selected" : ""}>Prefiro não informar</option>
            <option value="feminino" ${c.gender === "feminino" ? "selected" : ""}>Feminino</option>
            <option value="masculino" ${c.gender === "masculino" ? "selected" : ""}>Masculino</option>
          </select>
        </label>
        <label>CPF (não editável)<input type="text" value="${(c.cpf || "").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}" disabled></label>
        <label>Telefone / WhatsApp<input type="text" id="prPhone" value="${c.phone || ""}" oninput="maskPhone(this)"></label>
        <label>E-mail (não editável)<input type="email" value="${c.email || ""}" disabled></label>
        <div class="two-col">
          <label>CEP (opcional)<input type="text" id="prCep" value="${c.cep || ""}" oninput="handleCepInput(this)"></label>
          <label>Número<input type="text" id="prNumber" value="${c.number || ""}"></label>
        </div>
        <label>Rua / Avenida<input type="text" id="prStreet" value="${c.street || ""}"></label>
        <label>Bairro<input type="text" id="prNeighborhood" value="${c.neighborhood || ""}"></label>
        <div class="two-col">
          <label>Cidade<input type="text" id="prCity" value="${c.city || ""}"></label>
          <label>UF<input type="text" id="prState" maxlength="2" value="${c.state || ""}" style="text-transform:uppercase"></label>
        </div>
        <label>Complemento<input type="text" id="prComplement" value="${c.complement || ""}"></label>
      </div>
      <button class="btn btn-primary btn-block btn-lg" id="profileSaveBtn" onclick="handleProfileSave()">Salvar alterações</button>
      <button class="btn btn-link-pink" onclick="go('forgot-password')">Alterar senha</button>
      ${navButtons({ back: "dashboard" })}
    </section>
  `;
}
async function handleProfileSave() {
  const btn = document.getElementById("profileSaveBtn");
  btn.disabled = true; btn.textContent = "Salvando...";
  const payload = {
    full_name: document.getElementById("prName").value.trim(),
    gender: document.getElementById("prGender").value || null,
    phone: document.getElementById("prPhone").value.trim(),
    cep: document.getElementById("prCep").value.replace(/\D/g, ""),
    number: document.getElementById("prNumber").value.trim(),
    complement: document.getElementById("prComplement").value.trim(),
    ...readAddressFields("pr"),
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
            <strong>Pedido ${o.order_number}</strong>
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
      <button class="btn btn-primary btn-lg" onclick="go('category')">Faça seu pedido</button>
      <p class="cover-insta">@gizonadoces</p>
    </section>
  `;
}

/* ---------------- GUIDE ---------------- */
/* ---------------- CATEGORY ---------------- */
function renderCategory() {
  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink center-text">
        <img src="images/brand/logo.png" alt="Gizona Doces" style="width:110px;margin:0 auto 10px;display:block">
        <h2 style="font-size:24px">O que você deseja pedir?</h2>
      </div>

      <div class="order-tabs">
        <button class="order-tab ${state.orderTab === "delivery" ? "active" : ""}" onclick="setOrderTab('delivery')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M3 7h11v9H3V7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 10h4l3 3v3h-7v-6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7" cy="18" r="1.6" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="18" r="1.6" stroke="currentColor" stroke-width="1.6"/></svg>
          Delivery
        </button>
        <button class="order-tab ${state.orderTab === "encomendas" ? "active" : ""}" onclick="setOrderTab('encomendas')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          Encomendas
        </button>
      </div>

      ${state.orderTab === "delivery" ? renderDeliveryList() : `
      <div class="cat-choices">
        ${[
          { key: "brigadeiro", title: "Brigadeiro Gourmet", sub: "18 a 20g cada - caixas com 50 ou 100 unidades", icon: `<img src="images/icons/icon-brigadeiro.png" alt="Brigadeiro">` },
          { key: "geladinho", title: "Geladinho Gourmet", sub: "Tamanho festa 7cm - mín. 10 por sabor", icon: `<img src="images/icons/icon-geladinho.png" alt="Geladinho">` },
          { key: "bolo", title: "Bolos Decorados", sub: "3 tamanhos - monte com 1 massa e até 2 recheios", icon: cakeIcon() },
        ].map(c => `
        <button class="cat-card" onclick="selectCategory('${c.key}')">
          ${state.media[c.key] ? `<span class="cat-photo"><img src="${escapeAttr(state.media[c.key])}" alt="${c.title}" onerror="this.parentElement.classList.add('no-photo');this.remove()"></span>` : `<span class="cat-emoji">${c.icon}</span>`}
          <span class="cat-info">
            <strong>${c.title}</strong>
            <small>${c.sub}</small>
          </span>
        </button>`).join("")}
      </div>
      `}

      ${state.orderTab === "encomendas" ? `
      <div class="order-info-block">
        <p class="order-info-title">Informações importantes</p>
        <ul class="guide-list">
          <li>Para confirmar a encomenda, é necessário pagar 50% do valor total no ato do pedido. Os 50% restantes até 1 dia antes da retirada.</li>
          <li>A encomenda é entregue somente após a confirmação do pagamento integral.</li>
        </ul>
        <p class="address-block"><strong>Endereço para retirada:</strong><br>${ADDRESS}</p>
      </div>
      ` : ""}

      ${navButtons({ back: state.guest ? "welcome" : "dashboard" })}
    </section>
  `;
}
async function setOrderTab(tab) {
  state.orderTab = tab;
  renderCategory();
  decorateScreen();
  if (tab === "delivery") {
    await loadDeliveryCatalog();
    if (state.step === "category" && state.orderTab === "delivery") { renderCategory(); decorateScreen(); }
  }
}

/* ---------------- Fotos do menu (admin sobe em Produtos) ---------------- */
async function loadSiteMedia() {
  if (!sb) return;
  try {
    const { data, error } = await sb.from("site_media").select("key, image_url");
    if (error || !data) return;
    state.media = {};
    data.forEach(r => { if (r.image_url) state.media[r.key] = r.image_url; });
  } catch (e) { /* sem a tabela ainda: segue com os ícones */ }
}
function cakeIcon() {
  return `<svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="var(--pink)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 34h40v18a3 3 0 01-3 3H15a3 3 0 01-3-3V34z"/><path d="M12 42c5 4 9 4 13 0s9-4 14 0 9 4 13 0"/><path d="M12 34c0-5 4-8 9-8h22c5 0 9 3 9 8"/><path d="M32 26v-8M32 14c-2 2-2 4 0 5 2-1 2-3 0-5z"/></svg>`;
}

/* ---------------- BOLOS DECORADOS ---------------- */
const BOLO_SIZES = [
  { id: "P", slices: "13 a 15 fatias", price: 165 },
  { id: "M", slices: "23 a 30 fatias", price: 250 },
  { id: "G", slices: "40 a 45 fatias", price: 330 },
];
const BOLO_MASSAS = ["Chocolate", "Baunilha"];
const BOLO_RECHEIOS = ["Brigadeiro tradicional", "Ninho", "Cocada cremosa", "Doce de leite", "Maracujá", "Mousse de limão"];
const BOLO_ADICIONAIS = ["Morango", "Abacaxi", "Coco em flocos", "Geleia de morango", "Nutella", "Gotas de chocolate branco", "Gotas de chocolate ao leite"];
const BOLO_MAX_RECHEIOS = 2;

function newCakeDraft() { return { size: null, massa: null, recheios: [], adicionais: [], obs: "" }; }
function boloSize(id) { return BOLO_SIZES.find(x => x.id === id); }
function cakeTitle(c) { return `Bolo Decorado ${c.size}`; }
function cakeDetails(c) {
  const sz = boloSize(c.size);
  return [`${sz ? sz.slices : ""}`, `Massa ${c.massa.toLowerCase()}`, `Recheio${c.recheios.length > 1 ? "s" : ""}: ${c.recheios.join(" + ")}`,
    c.adicionais.length ? `Adicionais: ${c.adicionais.join(", ")} (valor a combinar)` : "", c.obs ? `Decoração/obs.: ${c.obs}` : ""].filter(Boolean);
}
function renderBolo() {
  if (!state.cakeDraft) state.cakeDraft = newCakeDraft();
  const d = state.cakeDraft;
  const ok = d.size && d.massa && d.recheios.length >= 1;
  const price = d.size ? boloSize(d.size).price : 0;
  const chip = (label, on, fn, disabled) => `<button type="button" class="opt-chip ${on ? "on" : ""}" ${disabled ? "disabled" : ""} onclick="${fn}">${on ? "✓ " : ""}${escapeAttr(label)}</button>`;
  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Bolos Decorados</h2><p>Monte o seu bolo</p></div>
      <div class="info-card">
        <p>Nossos bolos são finalizados com cobertura de chantininho. O valor inclui caixa para transporte e decoração básica.</p>
        <p>Topper e outros elementos decorativos podem ser adicionados à parte, mediante consulta pelo WhatsApp.</p>
      </div>

      <div class="cart-summary">
        <p class="cart-section-title">1. Tamanho</p>
        <div class="size-grid">
          ${BOLO_SIZES.map(sz => `
            <button type="button" class="size-card ${d.size === sz.id ? "on" : ""}" onclick="boloSet('size','${sz.id}')">
              <b>${sz.id}</b><span>${sz.slices}</span><strong>${fmt(sz.price)}</strong>
            </button>`).join("")}
        </div>
        <p class="hint" style="margin:8px 0 0">Rendimento aproximado.</p>
      </div>

      <div class="cart-summary">
        <p class="cart-section-title">2. Massa <small style="font-weight:500">(escolha 1)</small></p>
        <div class="chip-row">${BOLO_MASSAS.map(m => chip(m, d.massa === m, `boloSet('massa','${m}')`)).join("")}</div>
      </div>

      <div class="cart-summary">
        <p class="cart-section-title">3. Recheios <small style="font-weight:500">(até ${BOLO_MAX_RECHEIOS})</small></p>
        <div class="chip-row">${BOLO_RECHEIOS.map(r => chip(r, d.recheios.includes(r), `boloToggle('recheios','${r}')`, !d.recheios.includes(r) && d.recheios.length >= BOLO_MAX_RECHEIOS)).join("")}</div>
      </div>

      <div class="cart-summary">
        <p class="cart-section-title">4. Adicionais <small style="font-weight:500">(opcional)</small></p>
        <p class="hint" style="margin:0 0 10px">Consulte o valor do adicional conforme o tamanho do bolo — combinamos pelo WhatsApp.</p>
        <div class="chip-row">${BOLO_ADICIONAIS.map(r => chip(r, d.adicionais.includes(r), `boloToggle('adicionais','${r}')`)).join("")}</div>
      </div>

      <div class="cart-summary">
        <p class="cart-section-title">5. Decoração / observações <small style="font-weight:500">(opcional)</small></p>
        <textarea rows="3" class="bolo-obs" placeholder="Tema, topper, cores, mensagem no bolo..." oninput="state.cakeDraft.obs = this.value">${escapeAttr(d.obs)}</textarea>
      </div>

      <div class="sticky-subtotal">
        <strong>${d.size ? "Bolo " + d.size + ": " + fmt(price) : "Escolha o tamanho"}</strong>
        <button ${ok ? `onclick="addCakeToBag()"` : "disabled"}>Adicionar à sacola</button>
      </div>
      <button class="btn btn-ghost sticky-back" onclick="goBack()">← Voltar</button>
    </section>`;
}
function boloSet(key, val) { state.cakeDraft[key] = val; renderBolo(); decorateScreen(); }
function boloToggle(key, val) {
  const arr = state.cakeDraft[key], i = arr.indexOf(val);
  if (i >= 0) arr.splice(i, 1);
  else if (key !== "recheios" || arr.length < BOLO_MAX_RECHEIOS) arr.push(val);
  renderBolo(); decorateScreen();
}
function addCakeToBag() {
  const d = state.cakeDraft;
  if (!(d.size && d.massa && d.recheios.length)) return;
  state.cakes.push({ ...d, recheios: [...d.recheios], adicionais: [...d.adicionais], price: boloSize(d.size).price });
  state.cakeDraft = null;
  go("cart");
}
function cartRemoveCake(i) { state.cakes.splice(i, 1); render(); }

/* ---------------- CARD DE PRODUTO (Delivery + Geladinho) e FOTO AMPLIADA ---------------- */
function productCard(o) {
  const photos = (o.photos || []).filter(Boolean);
  const listAttr = escapeAttr(JSON.stringify(photos)).replace(/"/g, "&quot;");
  const one = (src, idx) => `<span class="pc-thumb" onclick="openPhoto(${listAttr}, ${idx})" role="button" aria-label="Ampliar foto ${idx + 1} de ${escapeAttr(o.name)}">
      <img src="${escapeAttr(src)}" alt="${escapeAttr(o.name)}" style="--img-scale:${idx === 0 ? (o.scale || 1) : (o.scale2 || 1)};--img-x:${idx === 0 ? (o.x || 50) : (o.x2 || 50)}%;--img-y:${idx === 0 ? (o.y || 50) : (o.y2 || 50)}%" onerror="this.parentElement.remove()">
      <i class="pc-zoom"><svg viewBox="0 0 24 24" width="13" height="13" fill="none"><circle cx="11" cy="11" r="6" stroke="#fff" stroke-width="2"/><path d="M16 16l4 4M11 8.5v5M8.5 11h5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></i>
    </span>`;
  // 2 fotos do mesmo produto ficam uma embaixo da outra
  const thumb = photos.length
    ? `<span class="pc-photos">${photos.map(one).join("")}</span>`
    : `<span class="pc-photos"><span class="pc-thumb no-photo" role="img" aria-label="${escapeAttr(o.name)}"></span></span>`;
  return `
  <div class="pcard ${o.out ? "disabled" : ""}">
    <div class="pc-top">
      ${thumb}
      <div class="pc-info">
        ${o.badge ? `<span class="best-badge">★ ${o.badge}</span>` : ""}
        <strong class="pc-title">${o.name}</strong>
        ${o.desc ? `<p class="pc-desc">${o.desc}</p>` : ""}
        <span class="pc-price">${fmt(o.price)}</span>
      </div>
    </div>
    <div class="pc-bottom">
      <span class="stepper">
        <button onclick="${o.minus}" ${o.minusOff ? "disabled" : ""}>–</button>
        <span>${o.qty}</span>
        <button onclick="${o.plus}" ${o.plusOff ? "disabled" : ""}>+</button>
      </span>
      ${o.note ? `<span class="pc-note ${o.noteClass || ""}">${o.note}</span>` : ""}
    </div>
  </div>`;
}
let photoViewer = { list: [], i: 0 };
function openPhoto(list, i) {
  photoViewer = { list: (list || []).filter(Boolean), i: i || 0 };
  if (!photoViewer.list.length) return;
  let el = document.getElementById("photoViewer");
  if (!el) {
    el = document.createElement("div");
    el.id = "photoViewer"; el.className = "photo-viewer";
    el.onclick = e => { if (e.target === el || e.target.dataset.close) closePhoto(); };
    document.body.appendChild(el);
    document.addEventListener("keydown", photoKey);
  }
  paintPhoto();
}
function paintPhoto() {
  const el = document.getElementById("photoViewer"); if (!el) return;
  const { list, i } = photoViewer, multi = list.length > 1;
  el.innerHTML = `
    <button class="pv-close" data-close="1" aria-label="Fechar">✕</button>
    ${multi ? `<button class="pv-nav prev" onclick="photoStep(-1)" aria-label="Anterior">‹</button><button class="pv-nav next" onclick="photoStep(1)" aria-label="Próxima">›</button>` : ""}
    <img src="${escapeAttr(list[i])}" alt="Foto ampliada">
    ${multi ? `<span class="pv-count">${i + 1} / ${list.length}</span>` : ""}`;
}
function photoStep(d) { const n = photoViewer.list.length; photoViewer.i = (photoViewer.i + d + n) % n; paintPhoto(); }
function photoKey(e) {
  if (!document.getElementById("photoViewer")) return;
  if (e.key === "Escape") closePhoto();
  else if (e.key === "ArrowLeft" && photoViewer.list.length > 1) photoStep(-1);
  else if (e.key === "ArrowRight" && photoViewer.list.length > 1) photoStep(1);
}
function closePhoto() { const el = document.getElementById("photoViewer"); if (el) el.remove(); }

/* Delivery: agrupa por tipo (1ª palavra do nome), mais vendidos no topo de cada grupo, esgotados no fim */
function deliveryGroupKey(name) {
  const w = String(name || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/)[0] || "";
  return w.replace(/(oes|aes)$/, m => (m === "oes" ? "ao" : "ao")).replace(/s$/, "");
}
function sortDeliveryCatalog(list) {
  const groups = new Map(); // mantém a ordem de primeira aparição (sort_order do admin)
  list.forEach(p => { const k = deliveryGroupKey(p.name); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); });
  const rank = p => (p.stock > 0 ? 0 : 1);
  const avail = [], gone = [];
  groups.forEach(arr => {
    const sorted = arr.map((p, i) => ({ p, i })).sort((a, b) =>
      (rank(a.p) - rank(b.p)) || ((b.p.best_seller ? 1 : 0) - (a.p.best_seller ? 1 : 0)) || (a.i - b.i)).map(x => x.p);
    sorted.forEach(p => (p.stock > 0 ? avail : gone).push(p));
  });
  return avail.concat(gone); // disponíveis agrupados primeiro; esgotados sempre depois de todos
}

/* ---------------- DELIVERY ---------------- */
async function loadDeliveryStatus() {
  try {
    const { data, error } = await sb.rpc("delivery_status");
    state.deliveryStatus = error || !data ? null : data;
  } catch (e) { state.deliveryStatus = null; }
}
function deliveryClosed() { return !!(state.deliveryStatus && state.deliveryStatus.open === false); }
async function loadDeliveryCatalog() {
  if (!sb) { state.deliveryCatalog = []; return; }
  try {
    const hadItems = Object.keys(state.delivery).length > 0;
    const [{ data, error }] = await Promise.all([sb.rpc("delivery_catalog"), loadDeliveryStatus()]);
    state.deliveryCatalog = error ? [] : (data || []);
    if (hadItems && deliveryClosed()) { state.delivery = {}; state.bagNotice = "O delivery foi fechado e os itens de delivery saíram da sua sacola."; }
    // remove do carrinho o que acabou ou passou do estoque
    Object.keys(state.delivery).forEach(id => {
      const p = state.deliveryCatalog.find(x => x.id === id);
      if (!p || p.stock <= 0) delete state.delivery[id];
      else if (state.delivery[id] > p.stock) state.delivery[id] = p.stock;
    });
  } catch (e) { console.error(e); state.deliveryCatalog = []; }
}
function deliveryTotal() {
  return Object.entries(state.delivery).reduce((t, [id, q]) => {
    const p = (state.deliveryCatalog || []).find(x => x.id === id);
    return t + (p ? Number(p.price) * q : 0);
  }, 0);
}
function renderDeliveryList() {
  const cat = state.deliveryCatalog;
  if (cat === null) return `<p class="hint center">Carregando...</p>`;
  if (deliveryClosed()) return `
    <div class="delivery-soon">
      <svg viewBox="0 0 24 24" width="34" height="34" fill="none"><path d="M3 7h11v9H3V7z" stroke="var(--pink)" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 10h4l3 3v3h-7v-6z" stroke="var(--pink)" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7" cy="18" r="1.6" stroke="var(--pink)" stroke-width="1.4"/><circle cx="17" cy="18" r="1.6" stroke="var(--pink)" stroke-width="1.4"/></svg>
      <p class="delivery-soon-title">Delivery fechado</p>
      <p class="delivery-soon-text">${escapeAttr((state.deliveryStatus && state.deliveryStatus.message) || "O delivery está fechado no momento. Assim que abrirmos uma nova fornada você será avisado!")}</p>
      <p class="delivery-soon-text">As encomendas continuam abertas — é só escolher na aba Encomendas.</p>
    </div>`;
  if (!cat.length) return `
    <div class="delivery-soon">
      <svg viewBox="0 0 24 24" width="34" height="34" fill="none"><path d="M3 7h11v9H3V7z" stroke="var(--pink)" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 10h4l3 3v3h-7v-6z" stroke="var(--pink)" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7" cy="18" r="1.6" stroke="var(--pink)" stroke-width="1.4"/><circle cx="17" cy="18" r="1.6" stroke="var(--pink)" stroke-width="1.4"/></svg>
      <p class="delivery-soon-title">Delivery em breve</p>
      <p class="delivery-soon-text">Estamos preparando essa novidade. Por enquanto, siga com as encomendas — combinamos tudo pelo WhatsApp.</p>
    </div>`;
  const total = deliveryTotal();
  const has = Object.keys(state.delivery).length > 0;
  return `
    ${state.deliveryStatus && state.deliveryStatus.open ? `<p class="open-pill"><i></i>Delivery aberto</p>` : ""}
    <div class="flavor-list">
      ${sortDeliveryCatalog(cat).map(p => {
        const qty = state.delivery[p.id] || 0;
        const out = p.stock <= 0;
        return productCard({
          name: p.name, desc: p.description, price: Number(p.price), photos: [p.image_url],
          scale: Number(p.image_scale) || 1, x: Number(p.image_position_x) || 50, y: Number(p.image_position_y) || 50,
          out, badge: p.best_seller && !out ? "Mais vendido" : "", qty,
          minus: `changeDelivery('${p.id}', -1)`, minusOff: !qty,
          plus: `changeDelivery('${p.id}', 1)`, plusOff: out || qty >= p.stock,
          note: out ? "Esgotado" : `Restam ${p.stock} ${p.stock === 1 ? "unidade" : "unidades"}`, noteClass: out ? "error" : ""
        });
      }).join("")}
    </div>
    <div class="sticky-subtotal">
      <strong>Subtotal: ${fmt(total)}</strong>
      <button ${has ? `onclick="go('cart')"` : "disabled"}>Ir para o carrinho</button>
    </div>`;
}
function changeDelivery(id, dir) {
  const p = (state.deliveryCatalog || []).find(x => x.id === id);
  if (!p) return;
  const next = Math.max(0, Math.min(p.stock, (state.delivery[id] || 0) + dir));
  if (next) state.delivery[id] = next; else delete state.delivery[id];
  renderCategory();
  decorateScreen();
}


function selectCategory(cat) {
  state.category = cat;
  if (cat === "bolo") { state.cakeDraft = newCakeDraft(); return go("bolo"); }
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
                ${p.image2 ? `<span class="flavor-thumb"><img src="${p.image2}" alt="${p.name} mordido" style="--img-scale:${p.image2Scale};--img-x:${p.image2X}%;--img-y:${p.image2Y}%" onerror="this.parentElement.remove()"></span>` : ""}
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
      ${stickySubtotal({ back: "brigadeiro-box", total: isComplete ? subtotal : 0, enabled: isComplete })}
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
        <p><strong>Nossos geladinhos tamanho festa possuem 7 cm.</strong></p>
        <p>Ideal para aniversários, festas corporativas, chá de bebê e outras comemorações.</p>
      </div>
      <div class="rule-card">
        <p>Quantidade mínima por sabor: <u>${GELADINHO_RULES.minPerFlavor} unidades</u></p>
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
  const isValid = totalUnits > 0 && !hasErrors;
  const subtotal = Object.entries(state.geladinho).reduce((s, [id, qty]) => {
    const p = GELADINHO_PRODUCTS.find(p => p.id === id);
    return s + p.price * qty;
  }, 0);

  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Geladinho Gourmet</h2><p>Escolha os sabores</p></div>
      <div class="counter-pill ${isValid ? "done" : ""}">
        <span>Total: ${totalUnits} unidades</span><strong>${isValid ? "Mínimo atingido" : `Escolha os sabores`}</strong>
      </div>
      <div class="flavor-list">
        ${GELADINHO_PRODUCTS.map(p => {
          const qty = state.geladinho[p.id] || 0;
          const err = qty > 0 && qty < GELADINHO_RULES.minPerFlavor;
          return productCard({
            name: p.name, desc: p.desc, price: p.price, photos: [p.image, p.image2],
            scale: p.imageScale, x: p.imageX, y: p.imageY, scale2: p.image2Scale, x2: p.image2X, y2: p.image2Y, qty,
            minus: `changeGeladinho('${p.id}', -1)`, plus: `changeGeladinho('${p.id}', 1)`,
            note: err ? `Mínimo ${GELADINHO_RULES.minPerFlavor} por sabor` : "", noteClass: err ? "error" : ""
          });
        }).join("")}
      </div>
      ${stickySubtotal({ back: "geladinho-info", total: subtotal, enabled: isValid })}
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
/* ============================================================
   SACOLA ÚNICA — encomenda + delivery no mesmo carrinho
   Resumo de valores, cupom e estimativa de entrega
============================================================ */
function bagData() {
  const brigItems = Object.keys(state.flavors).length
    ? Object.entries(state.flavors).map(([id, qty]) => ({ ...BRIGADEIRO_PRODUCTS.find(p => p.id === id), qty }))
    : [];
  const gelaItems = Object.keys(state.geladinho).length
    ? Object.entries(state.geladinho).map(([id, qty]) => ({ ...GELADINHO_PRODUCTS.find(p => p.id === id), qty }))
    : [];
  const delItems = Object.entries(state.delivery)
    .map(([id, qty]) => ({ ...(state.deliveryCatalog || []).find(p => p.id === id), qty })).filter(i => i.id);
  const brigSubtotal = state.box?.boxConfig?.fixedPrice
    ? state.box.boxConfig.fixedPrice
    : brigItems.reduce((s, i) => s + i.price * i.qty, 0);
  const gelaSubtotal = gelaItems.reduce((s, i) => s + i.price * i.qty, 0);
  const cakeItems = state.cakes.map((c, i) => ({ ...c, idx: i }));
  const cakeSubtotal = cakeItems.reduce((t, c) => t + c.price, 0);
  const encSub = brigSubtotal + gelaSubtotal + cakeSubtotal;
  const delSub = delItems.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const itemCount = brigItems.reduce((s, i) => s + i.qty, 0) + gelaItems.reduce((s, i) => s + i.qty, 0) + delItems.reduce((s, i) => s + i.qty, 0) + cakeItems.length;
  return { brigItems, gelaItems, cakeItems, cakeSubtotal, delItems, brigSubtotal, gelaSubtotal, encSub, delSub, itemCount, hasEnc: brigItems.length + gelaItems.length + cakeItems.length > 0, hasDel: delItems.length > 0 };
}

function fulfillMode(b) {
  b = b || bagData();
  return state.fulfillment || (b.hasDel ? "delivery" : "pickup");
}
function setFulfillment(mode) {
  state.fulfillment = mode;
  state.shipping = { status: "idle" };
  render();
}
function pickupAddress() {
  return (state.shipCfg && state.shipCfg.origin_address) || "";
}

function bagMoney(b) {
  b = b || bagData();
  const itemsTotal = b.encSub + b.delSub;
  const coupon = state.coupon && state.coupon.valid ? state.coupon : null;
  const discount = coupon ? Math.min(Number(coupon.discount) || 0, itemsTotal) : 0;
  const cfg = state.shipCfg;
  const sh = state.shipping;
  let fee = null, feeFree = false, feeNote = "";
  if (SHOW_SHIPPING && wantsShip(b)) {
    if (coupon && coupon.free_shipping) { feeFree = true; fee = 0; }
    else if (cfg && cfg.free_above != null && itemsTotal - discount >= Number(cfg.free_above)) { feeFree = true; fee = 0; feeNote = "acima de " + fmt(Number(cfg.free_above)); }
    else if (sh.status === "ok") fee = sh.fee;
  }
  const grand = itemsTotal - discount + (fee || 0);
  return { itemsTotal, discount, fee, feeFree, feeNote, grand };
}

function paintBagTotals() {
  const sumEl = document.getElementById("bagSummary");
  const barEl = document.getElementById("bagBar");
  if (!sumEl || !barEl) return;
  const b = bagData();
  const m = bagMoney(b);
  const sh = state.shipping;
  const cfg = state.shipCfg;
  let feeRow = "";
  const mode = fulfillMode(b);
  if ((b.hasDel || b.hasEnc) && mode === "pickup") {
    feeRow = `<div class="sum-row"><span>Retirada</span><span><strong class="free">Grátis</strong></span></div>`;
  } else if (wantsShip(b) && !SHOW_SHIPPING) {
    feeRow = `<p class="sum-note">${SHIPPING_NOTICE}</p>`;
  } else if (wantsShip(b)) {
    const hasAddr = addrReady();
    let val, note;
    if (m.feeFree) val = `<s style="color:var(--muted)">${sh.status === "ok" ? fmt(sh.fee) : ""}</s> <strong class="free">Grátis</strong>`;
    else if (sh.status === "loading" || (sh.status === "idle" && hasAddr)) val = `<span class="muted">calculando...</span>`;
    else if (sh.status === "ok") val = (sh.approx ? "≈ " : "") + fmt(sh.fee);
    else if (sh.status === "out") val = `<span class="muted">fora da área${sh.km ? " (" + Math.round(sh.km) + " km)" : ""}</span>`;
    else if (sh.status === "error" || sh.status === "off") val = `<span class="muted">a combinar</span>`;
    else val = `<span class="muted">${bagAddress().trim() ? "complete o endereço" : "informe o endereço"}</span>`;
    if (sh.status === "out") note = "Esse endereço fica fora da nossa área padrão — combinamos a entrega pelo WhatsApp.";
    else if (sh.status === "error") note = `Não conseguimos localizar esse endereço. Confira rua, número e cidade ou <a href="#" onclick="estimateShipping(true);return false">tente de novo</a> — se preferir, combinamos a entrega pelo WhatsApp.`;
    else if (sh.status === "off") note = "A entrega será combinada pelo WhatsApp.";
    else note = (sh.status === "ok" && sh.approx ? "Não localizamos o endereço exato; mostramos o valor mínimo da sua cidade. " : "") + (cfg ? cfg.note : "");
    feeRow = `<div class="sum-row"><span>Entrega <small>(estimativa${sh.status === "ok" && sh.km ? ` · ${sh.km.toFixed(1).replace(".", ",")} km` : ""})</small></span><span>${val}</span></div>
      <p class="sum-note">${note}</p>`;
  }
  sumEl.innerHTML = `
    <p class="cart-section-title">Resumo de valores</p>
    ${b.hasEnc ? `<div class="sum-row"><span>Encomendas</span><span>${fmt(b.encSub)}</span></div>` : ""}
    ${b.hasDel ? `<div class="sum-row"><span>Delivery</span><span>${fmt(b.delSub)}</span></div>` : ""}
    ${m.discount > 0 ? `<div class="sum-row"><span>Cupom ${state.coupon.code}</span><span class="free">- ${fmt(m.discount)}</span></div>` : ""}
    ${feeRow}
    <div class="sum-row total"><span>Total</span><span>${fmt(m.grand)}</span></div>
    ${b.hasEnc && b.hasDel ? `<p class="sum-note">Seu pedido será separado em <strong>delivery</strong> (entrega agora) e <strong>encomenda</strong> (para a data do evento), mas você finaliza tudo de uma vez.</p>` : ""}
    ${b.hasEnc && mode === "pickup" ? `<p class="sum-note">Retirada da encomenda no endereço combinado.</p>` : ""}
    ${b.hasEnc && mode === "delivery" ? `<p class="sum-note">A entrega da encomenda é combinada pelo WhatsApp e acontece somente após o pagamento total.</p>` : ""}`;
  barEl.innerHTML = `
    <div><small>Total${m.fee === 0 && wantsShip(b) ? " com <strong>entrega grátis</strong>" : ""}</small><strong>${fmt(m.grand)}</strong> <small>/ ${b.itemCount} ${b.itemCount === 1 ? "item" : "itens"}</small></div>
    <button id="bagSendBtn" ${bagCanSubmit(b) ? "" : "disabled"} onclick="submitBag()">Enviar pedido</button>`;
}

function bagCanSubmit(b) {
  b = b || bagData();
  if (!b.hasEnc && !b.hasDel) return false;
  const c = auth.customer ? { name: auth.customer.full_name || "", phone: auth.customer.phone || "" } : state.customer;
  if (!c.name.trim() || !c.phone.trim()) return false;
  if (fulfillMode(b) === "delivery" && !addrComplete()) return false;
  if (b.hasDel && deliveryClosed()) return false;
  return true;
}
function hasSavedAddress() { return !!(auth.customer && (auth.customer.street || auth.customer.cep)); }
function addrMode() { return state.addrMode || (hasSavedAddress() ? "saved" : "other"); }
function currentAddrObj() {
  if (addrMode() === "saved" && hasSavedAddress()) {
    const c = auth.customer;
    return { cep: String(c.cep || "").replace(/\D/g, ""), street: c.street || "", number: c.number || "", complement: c.complement || "", neighborhood: c.neighborhood || "", city: c.city || "", state: c.state || "" };
  }
  const o = state.otherAddr;
  return { ...o, cep: String(o.cep || "").replace(/\D/g, "") };
}
// basta CEP, ou rua + cidade, para estimar o frete
function addrReady(o) { o = o || currentAddrObj(); return o.cep.length === 8 || !!(o.street.trim() && o.city.trim()); }
// para enviar: endereço do cadastro vale como está; endereço novo precisa de rua, número e cidade
function addrComplete(o) {
  o = o || currentAddrObj();
  if (addrMode() === "saved" && hasSavedAddress()) return addrReady(o);
  return !!(o.street.trim() && String(o.number).trim() && o.city.trim());
}
function wantsShip(b) { b = b || bagData(); return fulfillMode(b) === "delivery" && (b.hasDel || b.hasEnc); }
function bagAddress() {
  const o = currentAddrObj();
  const cep = o.cep.length === 8 ? `CEP ${o.cep.slice(0, 5)}-${o.cep.slice(5)}` : "";
  if (!o.street.trim()) return [cep, o.neighborhood, [o.city, o.state].filter(Boolean).join("/")].filter(Boolean).join(", ");
  return formatAddress(o) + (cep ? " – " + cep : "");
}
function setAddrMode(m) { state.addrMode = m; state.shipping = { status: "idle" }; render(); }
function oaInput(key, val) { state.otherAddr[key] = val; if (key !== "complement") scheduleShipping(); }
async function oaCep(el) {
  let v = el.value.replace(/\D/g, "").slice(0, 8);
  el.value = v.length > 5 ? v.slice(0, 5) + "-" + v.slice(5) : v;
  state.otherAddr.cep = v;
  if (v.length !== 8) return;
  const a = await auth_fetchCep(v);
  if (a) {
    Object.assign(state.otherAddr, a);
    ["street", "neighborhood", "city", "state"].forEach(k => { const i = document.getElementById("oa_" + k); if (i) i.value = a[k] || ""; });
    const n = document.getElementById("oa_number"); if (n && !n.value) n.focus();
  }
  scheduleShipping();
}

function renderCart() {
  const b = bagData();
  const isGuestOrder = state.guest || !auth.customer;
  const c = auth.customer
    ? { ...state.customer, name: auth.customer.full_name || state.customer.name, phone: auth.customer.phone || state.customer.phone }
    : state.customer;
  const unusedBrigFlavors = BRIGADEIRO_PRODUCTS.filter(p => !state.flavors[p.id]);
  const empty = !b.hasEnc && !b.hasDel;
  const fm = fulfillMode(b);

  // dados auxiliares carregados em segundo plano
  if (state.deliveryCatalog === null) loadDeliveryCatalog().then(() => { if (state.step === "cart") render(); });
  if (!state.shipCfg) loadShipCfg().then(() => { if (state.step === "cart") paintBagTotals(); });

  app.innerHTML = `
    <section class="screen">
      <div class="screen-head pink"><h2>Sacola</h2><p>Revise seu pedido</p></div>
      ${state.bagNotice ? `<div class="cart-summary bag-notice">${escapeAttr(state.bagNotice)}</div>` : ""}
      ${empty ? `<div class="cart-summary"><p class="hint center">Sua sacola está vazia.</p><button class="btn btn-primary btn-block" onclick="go('category')">Ver produtos</button></div>` : ""}

      ${b.brigItems.length ? `
        <div class="cart-summary">
          <p class="cart-section-title">Encomenda · ${state.box.boxConfig.title}</p>
          ${b.brigItems.map(i => `
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
          <div class="cart-line total"><span>Subtotal brigadeiros</span><strong>${fmt(b.brigSubtotal)}</strong></div>
        </div>` : ""}

      ${b.cakeItems.map(c => `
        <div class="cart-summary">
          <p class="cart-section-title">Encomenda · ${cakeTitle(c)}</p>
          <div class="cart-line-edit"><span>${cakeDetails(c).map(escapeAttr).join("<br>")}</span>
            <button class="btn-remove" onclick="cartRemoveCake(${c.idx})" title="Remover">✕</button></div>
          <div class="cart-line total"><span>Valor do bolo</span><strong>${fmt(c.price)}</strong></div>
        </div>`).join("")}

      ${b.gelaItems.length ? `
        <div class="cart-summary">
          <p class="cart-section-title">Encomenda · Geladinhos Gourmet</p>
          ${b.gelaItems.map(i => `
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
          <div class="cart-line total"><span>Subtotal geladinhos</span><strong>${fmt(b.gelaSubtotal)}</strong></div>
        </div>
        <div class="cart-summary">
          <label class="isopor-toggle">
            <input type="checkbox" ${state.isoporBox ? "checked" : ""} onchange="toggleIsoporBox(this.checked)">
            <span>Adicionar caixa de isopor personalizada</span>
          </label>
          <p class="hint">A caixa de isopor garante maior conservação dos geladinhos, segurança no transporte e uma apresentação ainda mais especial. A arte é gratuita e personalizada conforme o tema do evento (até 3 alterações sem custo). A caixa é adquirida separadamente e <strong>o valor é combinado diretamente pelo WhatsApp</strong>.</p>
        </div>` : ""}

      ${b.hasDel ? `
        <div class="cart-summary">
          <p class="cart-section-title">Delivery</p>
          ${b.delItems.map(i => `
            <div class="cart-line-edit">
              <span>${i.name}<br><small class="muted">${fmt(Number(i.price))} / un.</small></span>
              <span class="stepper">
                <button onclick="cartChangeDelivery('${i.id}', -1)">–</button>
                <span>${i.qty}</span>
                <button onclick="cartChangeDelivery('${i.id}', 1)" ${i.qty >= i.stock ? "disabled" : ""}>+</button>
              </span>
              <button class="btn-remove" onclick="cartRemoveDelivery('${i.id}')" title="Remover">✕</button>
            </div>
          `).join("")}
          <div class="cart-line total"><span>Subtotal delivery</span><strong>${fmt(b.delSub)}</strong></div>
        </div>` : ""}

      ${!empty ? `<button class="btn btn-outline btn-block" onclick="go('category')">+ Adicionar mais itens</button>` : ""}

      ${state.wantsArt && b.hasEnc ? `
        <div class="cart-summary">
          <p class="cart-section-title">Arte personalizada</p>
          ${state.personalization.birthday_name ? `<p class="small-line">Nome: ${state.personalization.birthday_name}${state.personalization.age ? `, ${state.personalization.age}` : ""}</p>` : ""}
          ${state.personalization.theme ? `<p class="small-line">Tema: ${state.personalization.theme}</p>` : ""}
          ${state.personalization.colors ? `<p class="small-line">Cores: ${state.personalization.colors}</p>` : ""}
        </div>` : ""}

      ${!empty ? renderBagSuggestions(b) : ""}

      ${!empty ? `
      <div class="cart-summary fulfil-box">
        <p class="cart-section-title">Como você quer receber?</p>
        <div class="seg">
          <button class="${fm === "delivery" ? "on" : ""}" onclick="setFulfillment('delivery')"><svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M3 7h11v9H3V7z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 10h4l3 3v3h-7v-6z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7" cy="18" r="1.6" stroke="currentColor" stroke-width="1.5"/><circle cx="17" cy="18" r="1.6" stroke="currentColor" stroke-width="1.5"/></svg>Entrega</button>
          <button class="${fm === "pickup" ? "on" : ""}" onclick="setFulfillment('pickup')"><svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.800 12 21 12 21z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.5" stroke="currentColor" stroke-width="1.6"/></svg>Retirada</button>
        </div>
        ${fm === "pickup" ? `
          <div class="pickup-card"><strong>Retirar em</strong><span>${pickupAddress() ? escapeAttr(pickupAddress()) : "Endereço combinado pelo WhatsApp"}</span><small>Sem taxa de entrega. Avisamos pelo WhatsApp quando estiver pronto.</small></div>`
        : (wantsShip(b) ? `<p class="hint" style="margin:10px 0 0">${SHOW_SHIPPING ? "Entrega com taxa estimada pela distância até o endereço abaixo." : SHIPPING_NOTICE}</p>` : "")}
      </div>
      <div class="cart-form-block">
        <p class="cart-section-title">${isGuestOrder ? "Seus dados para contato" : "Dados do pedido"}</p>
        ${isGuestOrder ? `
          <label>Nome completo<input type="text" value="${c.name}" oninput="c_update('name', this.value); paintBagTotals()"></label>
          <label>Telefone / WhatsApp<input type="text" placeholder="(19) 99999-9999" value="${c.phone}" oninput="maskPhone(this); c_update('phone', this.value); paintBagTotals()"></label>
        ` : `<p class="hint">Usaremos os dados do seu perfil (nome e telefone): <strong>${auth.customer.full_name}</strong>.</p>`}
        ${fm === "delivery" ? renderAddressPicker() : ""}
        ${b.hasEnc ? `
        <label>Data do evento<input type="date" id="eventDateInput" min="${minEventDate()}" value="${c.eventDate}" onchange="handleEventDateInput(this)"></label>
        <p class="hint" style="margin-top:-6px">Trabalhamos com antecedência mínima de 5 dias.</p>` : ""}
        <label>Forma de pagamento
          <select onchange="c_update('payment', this.value)">
            <option value="">Selecione (opcional)</option>
            <option value="Pix" ${c.payment === "Pix" ? "selected" : ""}>PIX</option>
            <option value="Crédito" ${c.payment === "Crédito" ? "selected" : ""}>Crédito</option>
          </select>
        </label>
      </div>

      <div class="cart-summary coupon-box">
        <div class="coupon-head"><span class="coupon-ic">${couponIcon()}</span><div><strong>Cupom</strong><small>${state.coupon && state.coupon.valid ? "Cupom aplicado" : "Digite um código"}</small></div></div>
        ${state.coupon && state.coupon.valid ? `
          <div class="coupon-applied"><span>${state.coupon.code}${state.coupon.description ? ` · ${state.coupon.description}` : ""}</span><button onclick="removeCoupon()">Remover</button></div>
        ` : `
          <div class="coupon-form">
            <input type="text" id="couponInput" placeholder="CÓDIGO" value="${escapeAttr(state.couponInput || "")}" oninput="state.couponInput = this.value.toUpperCase(); this.value = state.couponInput" style="text-transform:uppercase">
            <button onclick="applyCoupon()">Adicionar</button>
          </div>`}
        ${state.couponMsg ? `<p class="coupon-msg ${state.coupon && state.coupon.valid ? "ok" : "bad"}">${state.couponMsg}</p>` : ""}
      </div>

      <div class="cart-summary sum-box" id="bagSummary"></div>
      <div class="sticky-subtotal bag-bar" id="bagBar"></div>
      ` : ""}
      <button class="btn btn-ghost sticky-back" onclick="goBack()">← Voltar</button>
    </section>
  `;
  if (!empty) {
    paintBagTotals();
    syncCouponWithBag();
    if (wantsShip(b) && state.shipping.status === "idle" && addrReady()) estimateShipping();
  }
  state.bagNotice = "";
}

function renderAddressPicker() {
  const saved = hasSavedAddress(), m = addrMode(), o = state.otherAddr;
  const cs = auth.customer;
  return `
    <p class="cart-section-title" style="margin-top:6px">Endereço de entrega *</p>
    <div class="addr-choice">
      ${saved ? `<label class="addr-opt ${m === "saved" ? "on" : ""}"><input type="radio" name="addrmode" ${m === "saved" ? "checked" : ""} onchange="setAddrMode('saved')"><span><strong>Meu endereço cadastrado</strong><small>${escapeAttr(formatAddress(cs))}${cs.cep ? " · CEP " + escapeAttr(cs.cep) : ""}</small></span></label>` : ""}
      <label class="addr-opt ${m === "other" ? "on" : ""}"><input type="radio" name="addrmode" ${m === "other" ? "checked" : ""} onchange="setAddrMode('other')"><span><strong>${saved ? "Entregar em outro endereço" : "Informe o endereço"}</strong>${saved ? "" : "<small>Digite o CEP e preenchemos o resto</small>"}</span></label>
      ${m === "other" ? `
        <div class="addr-fields">
          <label>CEP<input id="oa_cep" inputmode="numeric" placeholder="00000-000" maxlength="9" value="${escapeAttr(o.cep.length === 8 ? o.cep.slice(0, 5) + "-" + o.cep.slice(5) : o.cep)}" oninput="oaCep(this)"></label>
          <label>Rua<input id="oa_street" value="${escapeAttr(o.street)}" oninput="oaInput('street', this.value)"></label>
          <div class="addr-row"><label>Número<input id="oa_number" inputmode="numeric" value="${escapeAttr(o.number)}" oninput="oaInput('number', this.value)"></label>
          <label>Complemento<input id="oa_complement" value="${escapeAttr(o.complement)}" oninput="oaInput('complement', this.value)"></label></div>
          <label>Bairro<input id="oa_neighborhood" value="${escapeAttr(o.neighborhood)}" oninput="oaInput('neighborhood', this.value)"></label>
          <div class="addr-row"><label>Cidade<input id="oa_city" value="${escapeAttr(o.city)}" oninput="oaInput('city', this.value)"></label>
          <label style="max-width:80px">UF<input id="oa_state" maxlength="2" value="${escapeAttr(o.state)}" oninput="oaInput('state', this.value.toUpperCase())"></label></div>
        </div>` : ""}
    </div>`;
}
function escapeAttr(v) { return String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
function couponIcon() { return `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 100-4V8z"/></svg>`; }

/* ---- "Você também pode gostar" ---- */
function renderBagSuggestions(b) {
  const cat = (state.deliveryCatalog || []).filter(p => p.stock > 0 && !(state.delivery[p.id] >= p.stock));
  const delivSug = cat.filter(p => !state.delivery[p.id]);
  let html = "";
  if (b.hasEnc) html += renderSuggestions();
  if (delivSug.length) {
    html += `
      <div class="cart-summary">
        <p class="cart-section-title">${b.hasEnc ? "Aproveite e leve no delivery" : "Você também pode gostar"}</p>
        ${b.hasEnc ? `<p class="hint" style="margin-top:-4px">Delivery e encomenda ficam na mesma sacola, mas são pedidos separados.</p>` : ""}
        <div class="sug-scroll">
          ${delivSug.map(p => `
            <div class="sug-item">
              <div class="sug-img"><img src="${p.image_url || ""}" alt="${p.name}" onerror="this.remove()"><button onclick="addDeliveryFromBag('${p.id}')" aria-label="Adicionar">+</button></div>
              <strong>${fmt(Number(p.price))}</strong>
              <span>${p.name}</span>
            </div>`).join("")}
        </div>
      </div>`;
  }
  return html;
}
function addDeliveryFromBag(id) {
  const p = (state.deliveryCatalog || []).find(x => x.id === id);
  if (!p || p.stock <= 0) return;
  state.delivery[id] = Math.min(p.stock, (state.delivery[id] || 0) + 1);
  render();
}
function cartChangeDelivery(id, dir) {
  const p = (state.deliveryCatalog || []).find(x => x.id === id);
  if (!p) return;
  const next = Math.max(0, Math.min(p.stock, (state.delivery[id] || 0) + dir));
  if (next) state.delivery[id] = next; else delete state.delivery[id];
  render();
}
function cartRemoveDelivery(id) { delete state.delivery[id]; render(); }

/* ---- Cupom ---- */
async function loadShipCfg() {
  try { const { data } = await sb.rpc("shipping_config"); state.shipCfg = data || null; } catch (e) { state.shipCfg = null; }
}
function couponInputs() {
  const b = bagData();
  return [b.encSub, b.delSub, auth.customer ? auth.customer.id : null, auth.customer ? auth.customer.phone : state.customer.phone];
}
async function callValidateCoupon(code) {
  const [enc, del, cust, phone] = couponInputs();
  const { data, error } = await sb.rpc("validate_coupon", { p_code: code, p_sub_enc: enc, p_sub_del: del, p_customer: cust, p_phone: phone || "" });
  if (error) return { valid: false, message: "Não foi possível validar o cupom agora." };
  return data;
}
async function applyCoupon() {
  const code = (state.couponInput || "").trim();
  if (!code) { state.couponMsg = "Digite o código do cupom."; return render(); }
  const r = await callValidateCoupon(code);
  state.coupon = r.valid ? r : null;
  state.couponMsg = r.message || "";
  state.couponSig = r.valid ? bagSignature() : "";
  if (r.valid) state.couponInput = "";
  render();
}
function removeCoupon() { state.coupon = null; state.couponMsg = ""; state.couponSig = ""; render(); }
function bagSignature() { const b = bagData(); return `${b.encSub}|${b.delSub}`; }
// o valor do desconto depende do que está na sacola: revalida quando ela muda
async function syncCouponWithBag() {
  if (!state.coupon || state.couponSig === bagSignature()) return;
  const sig = bagSignature();
  const r = await callValidateCoupon(state.coupon.code);
  if (state.step !== "cart") return;
  state.couponSig = sig;
  if (r.valid) { state.coupon = r; state.couponMsg = ""; paintBagTotals(); }
  else { state.coupon = null; state.couponMsg = r.message; render(); }
}

/* ---- Estimativa de entrega ---- */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
async function jget(url) {
  try { const r = await fetch(url); if (r.ok) return await r.json(); } catch (e) { /* sem rede / bloqueado */ }
  return null;
}
async function nominatim(q) {
  const d = await jget(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`);
  return d && d[0] ? { lat: Number(d[0].lat), lng: Number(d[0].lon) } : null;
}
async function nominatimStruct(o) {
  const p = new URLSearchParams({ format: "json", limit: "1", countrycodes: "br", street: `${o.number} ${o.street}`.trim(), city: o.city || "", state: o.state || "", country: "Brasil" });
  const d = await jget(`https://nominatim.openstreetmap.org/search?${p}`);
  return d && d[0] ? { lat: Number(d[0].lat), lng: Number(d[0].lon) } : null;
}
async function photon(q) {
  const d = await jget(`https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(q)}`);
  const f = d && d.features && d.features[0];
  return f ? { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] } : null;
}
async function geocodeByCep(cep) {
  if (!cep || cep.length !== 8) return null;
  const br = await jget(`https://brasilapi.com.br/api/cep/v2/${cep}`);
  const bc = br && br.location && br.location.coordinates;
  if (bc && bc.latitude && bc.longitude) return { lat: Number(bc.latitude), lng: Number(bc.longitude) };
  const aw = await jget(`https://cep.awesomeapi.com.br/json/${cep}`);
  if (aw && aw.lat && aw.lng) return { lat: Number(aw.lat), lng: Number(aw.lng) };
  return null;
}
// endereço -> coordenadas: tenta CEP, depois busca por endereço, depois bairro/cidade
const CITY_FALLBACK = { americana: { lat: -22.7392, lng: -47.3314 } };
async function cityCentroid(city, st) {
  const key = "city:" + `${city},${st}`.toLowerCase();
  if (state.geoCache[key]) return state.geoCache[key];
  const p = new URLSearchParams({ format: "json", limit: "1", countrycodes: "br", city, state: st || "", country: "Brasil" });
  const d = await jget(`https://nominatim.openstreetmap.org/search?${p}`);
  const c = d && d[0] ? { lat: Number(d[0].lat), lng: Number(d[0].lon) } : (CITY_FALLBACK[String(city).toLowerCase()] || null);
  if (c) state.geoCache[key] = c;
  return c;
}
// endereço -> coordenadas. Cada tentativa só vale se cair perto da própria cidade (evita ruas homônimas de outros lugares)
async function geocodeAddr(o) {
  const key = JSON.stringify([o.cep, o.street, o.number, o.neighborhood, o.city, o.state]).toLowerCase();
  if (state.geoCache[key]) return state.geoCache[key];
  const city = [o.city, o.state].filter(Boolean).join(" - ");
  const full = `${o.street} ${o.number}, ${o.neighborhood}, ${city}, Brasil`.replace(/\s+,/g, ",");
  const centroid = o.city ? await cityCentroid(o.city, o.state) : null;
  const sane = f => f && (!centroid || haversineKm(f.lat, f.lng, centroid.lat, centroid.lng) <= 25);
  const attempts = [
    () => geocodeByCep(o.cep),
    () => o.street && nominatimStruct(o),
    () => nominatim(full),
    () => photon(full),
    () => o.neighborhood && (nominatim(`${o.neighborhood}, ${city}, Brasil`) ),
    () => o.street && nominatim(`${o.street}, ${city}, Brasil`),
  ];
  let found = null;
  for (const at of attempts) { const f = await at(); if (sane(f)) { found = f; break; } }
  if (!found && centroid) found = { ...centroid, approx: true };
  if (found) state.geoCache[key] = found;
  return found;
}
async function geocodeText(address, cepHint) {
  const m = address.match(/\b(\d{5})-?(\d{3})\b/);
  const cep = m ? m[1] + m[2] : (cepHint || "");
  const key = "t:" + address.replace(/\s+/g, " ").trim().toLowerCase();
  if (state.geoCache[key]) return state.geoCache[key];
  let f = await geocodeByCep(cep) || await nominatim(address + ", Brasil") || await photon(address + ", Brasil");
  if (f) state.geoCache[key] = f;
  return f;
}
// ponto de saída: usa as coordenadas do admin; se faltarem, descobre pelo endereço cadastrado
// "Rua X, 74 - Bairro, Cidade/UF" -> { street, number, neighborhood, city, state }
function parseOriginAddress(txt) {
  const t = String(txt || "").trim();
  const m = t.match(/([^,\/\-]+?)\s*\/\s*([A-Za-z]{2})\s*$/);
  const city = m ? m[1].trim() : "", state = m ? m[2].toUpperCase() : "";
  const head = t.split(/\s+-\s+/)[0];
  const nm = head.match(/^(.*?),?\s*(\d+\w*)\s*$/);
  const street = (nm ? nm[1] : head).replace(/,\s*$/, "").trim();
  const hood = (t.split(/\s+-\s+/)[1] || "").split(",")[0].trim();
  const cm = t.match(/\b(\d{5})-?(\d{3})\b/);
  return { cep: cm ? cm[1] + cm[2] : "", street, number: nm ? nm[2] : "", neighborhood: hood, city: city.replace(/\b\d{5}-?\d{3}\b/, "").trim(), state };
}
async function resolveOrigin(cfg) {
  if (state.originCoords) return state.originCoords;
  const po = parseOriginAddress(cfg.origin_address || "Americana/SP");
  const centroid = po.city ? await cityCentroid(po.city, po.state) : null;
  let o = null;
  if (cfg.origin_lat != null && cfg.origin_lng != null) {
    o = { lat: Number(cfg.origin_lat), lng: Number(cfg.origin_lng) };
    // coordenada salva que cai longe da própria cidade provavelmente é de outra rua homônima
    if (centroid && haversineKm(o.lat, o.lng, centroid.lat, centroid.lng) > 25) o = null;
  }
  if (!o) o = await geocodeAddr(po);
  state.originCoords = o || centroid || CITY_FALLBACK.americana;
  return state.originCoords;
}
let shippingToken = 0, shippingTimer = null;
function scheduleShipping() {
  clearTimeout(shippingTimer);
  if (!SHOW_SHIPPING) { state.shipping = { status: "idle" }; return; }
  shippingToken++;
  if (!addrReady()) { state.shipping = { status: "idle" }; paintBagTotals(); return; }
  state.shipping = { status: "loading" };
  paintBagTotals();
  shippingTimer = setTimeout(() => estimateShipping(), 800);
}
async function estimateShipping(force) {
  clearTimeout(shippingTimer);
  if (!SHOW_SHIPPING) { state.shipping = { status: "idle" }; return; }
  const b = bagData();
  const address = bagAddress().trim();
  if (!wantsShip(b) || !addrReady()) { state.shipping = { status: "idle" }; paintBagTotals(); return; }
  if (!state.shipCfg) await loadShipCfg();
  const cfg = state.shipCfg;
  if (!cfg || cfg.enabled === false) { state.shipping = { status: "off" }; paintBagTotals(); return; }
  const token = ++shippingToken;
  state.shipping = { status: "loading" };
  paintBagTotals();
  if (force) state.geoCache = {};
  const [origin, dest] = await Promise.all([resolveOrigin(cfg), geocodeAddr(currentAddrObj())]);
  if (token !== shippingToken) return;
  if (!dest) {
    // sem coordenadas: se for a mesma cidade da saída, usa a taxa mínima (aproximada)
    const oc = (currentAddrObj().city || "").trim().toLowerCase();
    if (oc && String(cfg.origin_address || "").toLowerCase().includes(oc)) { state.shipping = { status: "ok", km: 0, fee: Math.ceil(Number(cfg.min_fee) * 2) / 2, approx: true }; }
    else state.shipping = { status: "error" };
    paintBagTotals(); return;
  }
  const km = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng) * Number(cfg.circuity || 1.3);
  // mesma cidade da saída nunca é "fora da área": se a distância deu absurda, a localização é que veio errada
  const oc = (currentAddrObj().city || "").trim().toLowerCase();
  const sameCity = !!oc && String(cfg.origin_address || "").toLowerCase().includes(oc);
  if (sameCity && km > Number(cfg.max_km)) {
    state.shipping = { status: "ok", km: 0, fee: Math.ceil(Number(cfg.min_fee) * 2) / 2, approx: true };
    paintBagTotals(); return;
  }
  if (km > Number(cfg.max_km)) { state.shipping = { status: "out", km }; paintBagTotals(); return; }
  const mins = km / (Number(cfg.avg_speed_kmh) || 30) * 60; // tempo estimado de corrida
  const raw = Math.max(Number(cfg.min_fee), Number(cfg.base_fee) + Number(cfg.per_km) * km + Number(cfg.per_minute || 0) * mins);
  state.shipping = { status: "ok", km, fee: Math.ceil(raw * 2) / 2, approx: !!dest.approx };
  console.info("[frete]", { origem: origin, destino: dest, km: Number(km.toFixed(2)) });
  paintBagTotals();
}

/* ---- Envio ---- */
function allocateDiscount(orders, discount, appliesTo) {
  let left = discount;
  const pref = appliesTo === "encomenda" ? ["encomenda", "delivery"] : appliesTo === "delivery" ? ["delivery", "encomenda"] : orders.slice().sort((a, b) => b.subtotal - a.subtotal).map(o => o.order_type);
  pref.forEach(t => {
    const o = orders.find(x => x.order_type === t);
    if (!o || left <= 0) return;
    if (appliesTo !== "all" && ((appliesTo === "encomenda" && t !== "encomenda") || (appliesTo === "delivery" && t !== "delivery"))) return;
    const d = Math.min(left, o.subtotal);
    o.discount_amount = Number(d.toFixed(2));
    left -= d;
  });
}

async function submitBag() {
  const b = bagData();
  if (!bagCanSubmit(b)) return;
  const btn = document.getElementById("bagSendBtn");
  const resetBtn = () => { if (btn) { btn.disabled = false; btn.textContent = "Enviar pedido"; } };
  if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }
  // A aba precisa abrir durante o toque no botão; se esperar o banco responder,
  // navegadores móveis podem bloqueá-la como pop-up.
  const whatsappWindow = window.open("about:blank", "_blank");
  const abort = (msg) => { if (whatsappWindow) whatsappWindow.close(); if (msg) alert(msg); resetBtn(); };

  const c = auth.customer
    ? { ...state.customer, name: auth.customer.full_name || state.customer.name, phone: auth.customer.phone || state.customer.phone }
    : state.customer;
  const mode = fulfillMode(b);
  const address = mode === "delivery" ? bagAddress().trim() : "";

  // confere o cupom de novo com os valores finais
  let coupon = null;
  if (state.coupon && state.coupon.valid) {
    const r = await callValidateCoupon(state.coupon.code);
    if (!r.valid) { state.coupon = null; state.couponMsg = r.message; abort("Seu cupom não pode mais ser usado: " + r.message); return render(); }
    coupon = r; state.coupon = r;
  }
  if (wantsShip(b) && state.shipping.status === "loading") { abort("Aguarde o cálculo da entrega e tente novamente."); return; }

  const m = bagMoney(b);
  const paymentMap = { "Pix": "pix", "Crédito": "credito" };
  const common = {
    customer_id: auth.customer ? auth.customer.id : null,
    customer_name: c.name, customer_phone: c.phone,
    customer_email: auth.customer ? auth.customer.email : null,
    payment_method: paymentMap[c.payment] || null,
    origin: "site", fulfillment: mode,
  };
  const orders = [];
  let msg = `Olá! Gostaria de fazer um pedido na Gizona Doces.\n\nNome: ${c.name}\nTelefone: ${c.phone}\n\n`;
  if (mode === "pickup") msg += `🏠 RETIRADA no local${pickupAddress() ? ` (${pickupAddress()})` : ""}\n`;
  else if (address) msg += `🛵 ENTREGA — Endereço: ${address}\n`;
  if (c.payment) msg += `\nForma de pagamento: ${c.payment}\n`;
  msg += `\n`;

  if (b.hasDel) {
    msg += `*ITENS ESCOLHIDOS*\n\n` + b.delItems.map(i => `* ${i.qty}x ${i.name} = ${fmt(Number(i.price) * i.qty)}`).join("\n") + `\n\n`;
    orders.push({
      ...common, order_type: "delivery",
      items: b.delItems.map(i => ({ id: i.id, product_name: i.name, category: "delivery", quantity: i.qty, unit_price: Number(i.price), subtotal: Number(i.price) * i.qty })),
      subtotal: b.delSub, discount_amount: 0,
      delivery_fee: mode === "delivery" ? (m.fee || 0) : 0, delivery_km: mode === "delivery" && state.shipping.status === "ok" ? Number(state.shipping.km.toFixed(2)) : null,
      event_date: null, personalization: {}, observations: mode === "delivery" ? `Endereço: ${address}` : "Retirada no local",
    });
  }
  if (b.hasEnc) {
    msg += `📅 ENCOMENDA\n`;
    if (c.eventDate) msg += `Data do evento: ${new Date(c.eventDate + "T00:00:00").toLocaleDateString("pt-BR")}\n`;
    const items = [];
    if (b.brigItems.length) {
      msg += `${state.box.boxConfig.title}\n`;
      b.brigItems.forEach(i => {
        msg += `  - ${i.name}: ${i.qty} unidades\n`;
        items.push({ product_name: i.name, category: "brigadeiro", quantity: i.qty, unit_price: i.price, subtotal: i.price * i.qty });
      });
      msg += `  Subtotal: ${fmt(b.brigSubtotal)}\n\n`;
    }
    b.cakeItems.forEach(c => {
      msg += `${cakeTitle(c)} — ${fmt(c.price)}\n` + cakeDetails(c).map(l => `  - ${l}\n`).join("") + `\n`;
      items.push({ product_name: `${cakeTitle(c)} — massa ${c.massa}; recheio${c.recheios.length > 1 ? "s" : ""}: ${c.recheios.join(" + ")}`, category: "bolo", quantity: 1, unit_price: c.price, subtotal: c.price });
      if (c.adicionais.length) items.push({ product_name: `Adicionais do bolo ${c.size}: ${c.adicionais.join(", ")}`, category: "bolo", quantity: 1, unit_price: null, subtotal: null });
      if (c.obs) items.push({ product_name: `Decoração do bolo ${c.size}: ${c.obs}`, category: "bolo", quantity: 1, unit_price: null, subtotal: null });
    });
    if (b.gelaItems.length) {
      msg += `Geladinhos Gourmet Tamanho Festa\n`;
      b.gelaItems.forEach(i => {
        msg += `  - ${i.name}: ${i.qty} unidades x ${fmt(i.price)} = ${fmt(i.price * i.qty)}\n`;
        items.push({ product_name: i.name, category: "geladinho", quantity: i.qty, unit_price: i.price, subtotal: i.price * i.qty });
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
    orders.push({
      ...common, order_type: "encomenda", items, subtotal: b.encSub, discount_amount: 0, delivery_fee: !b.hasDel && mode === "delivery" ? (m.fee || 0) : 0, delivery_km: !b.hasDel && mode === "delivery" && state.shipping.status === "ok" && state.shipping.km ? Number(state.shipping.km.toFixed(2)) : null,
      event_date: c.eventDate || null, personalization: state.wantsArt ? state.personalization : {},
      observations: mode === "delivery" ? (address ? `Endereço: ${address}` : "") : "Retirada no local",
    });
  }

  // desconto do cupom distribuído entre os pedidos
  if (coupon) {
    allocateDiscount(orders, Math.min(Number(coupon.discount) || 0, b.encSub + b.delSub), coupon.applies_to);
    const first = orders.find(o => o.discount_amount > 0) || orders.find(o => o.order_type === "delivery") || orders[0];
    first.coupon_code = coupon.code;
  }
  orders.forEach(o => { o.total = Number((o.subtotal - o.discount_amount).toFixed(2)); });

  if (coupon && m.discount > 0) msg += `Cupom ${coupon.code}: - ${fmt(m.discount)}\n`;
  if (wantsShip(b) && !SHOW_SHIPPING) msg += `Entrega: valor a confirmar pelo WhatsApp, de acordo com o endereço informado.\n`;
  else if (wantsShip(b)) msg += m.feeFree ? `Entrega: Grátis\n` : (state.shipping.status === "ok" ? `Entrega (estimativa): ${fmt(m.fee)} — pode haver reajuste\n` : `Entrega: a combinar\n`);
  msg += `\n${SHOW_SHIPPING || !wantsShip(b) ? "Total estimado" : "Total (entrega à parte)"}: ${fmt(m.grand)}${b.hasEnc && !b.hasDel ? "" : ""}\n\nAguardo confirmação.`;

  // grava os pedidos (delivery primeiro: é ele que confere o estoque)
  for (const o of orders) {
    const { error } = await sb.from("orders").insert(o);
    if (error) {
      console.error(error);
      const text = error.message || "";
      if (/Delivery fechado/i.test(text)) {
        await loadDeliveryCatalog();
        abort("O delivery acabou de fechar. Tire os itens de delivery da sacola (ou envie só a encomenda).");
        return render();
      }
      if (/Estoque insuficiente/i.test(text)) {
        await loadDeliveryCatalog();
        abort("Alguém acabou de levar um dos produtos do delivery. Atualizamos o estoque — confira a sacola.");
        return render();
      }
      if (/Cupom/i.test(text)) {
        state.coupon = null; state.couponMsg = "Esse cupom não está mais disponível.";
        abort("Esse cupom não está mais disponível. Remova-o e envie novamente.");
        return render();
      }
      abort("Não foi possível enviar o pedido. Tente novamente em instantes ou chame a Gizona pelo WhatsApp.");
      return;
    }
  }

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  if (whatsappWindow) whatsappWindow.location.href = url; else window.location.href = url;
  state.delivery = {}; state.coupon = null; state.couponMsg = ""; state.shipping = { status: "idle" }; state.fulfillment = null;
  loadDeliveryCatalog();
  renderConfirmation();
  decorateScreen();
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
  if (!el.value) { state.customer.eventDate = ""; return; }
  const year = Number(el.value.split("-")[0]);
  if (year < 2000) return; // ano ainda incompleto/em digitação, ignora por enquanto
  if (el.value < min) {
    alert(`Para garantir o preparo da sua encomenda, trabalhamos com antecedência mínima de 5 dias. A primeira data disponível é ${formatDateKey(min)}.`);
    el.value = "";
    state.customer.eventDate = "";
    return;
  }
  state.customer.eventDate = el.value;
}


function renderConfirmation() {
  app.innerHTML = `
    <section class="screen center-screen">
      <img class="cover-seal" src="images/brand/icon.png" alt="Gizona Doces">
      <h2 class="confirm-title">Pedido enviado!</h2>
      <p class="hint">Seu pedido foi enviado pelo WhatsApp. A Gizona vai confirmar disponibilidade e pagamento por lá.</p>
      <button class="btn btn-ghost" onclick="resetOrder()">Fazer novo pedido</button>
    </section>
  `;
}
function resetOrder() {
  state.category = null;
  state.box = null;
  state.flavors = {};
  state.geladinho = {};
  state.cakes = []; state.cakeDraft = null;
  state.delivery = {};
  state.coupon = null; state.couponMsg = ""; state.couponInput = "";
  state.shipping = { status: "idle" };
  state.wantsArt = null;
  state.isoporBox = false;
  state.suggestQty = {};
  state.personalization = { birthday_name: "", age: "", theme: "", colors: "", custom_text: "", art_description: "" };
  go(state.guest ? "welcome" : "dashboard");
}

/* ---------------- HELPERS ---------------- */
function stickySubtotal({ back, total, enabled }) {
  return `
    <div class="sticky-subtotal">
      <strong>Subtotal: ${fmt(total)}</strong>
      <button ${enabled ? `onclick="go('cart')"` : "disabled"}>Ir para o carrinho</button>
    </div>
    ${back ? `<button class="btn btn-ghost sticky-back" onclick="go('${back}')">← Voltar</button>` : ""}
  `;
}

function navButtons({ back, next, nextLabel }) {
  return `
    <div class="nav-row">
      ${back ? `<button class="btn btn-ghost" onclick="go('${back}')">← Voltar</button>` : "<span></span>"}
      ${next ? `<button class="btn btn-primary" onclick="go('${next}')">${nextLabel} →</button>` : ""}
    </div>
  `;
}

/* ---------------- Atualização do delivery (estoque / aberto-fechado) ---------------- */
function deliverySig() {
  return JSON.stringify([state.deliveryStatus && state.deliveryStatus.open, (state.deliveryCatalog || []).map(p => [p.id, p.stock, p.price])]);
}
async function refreshDelivery() {
  if (!sb || document.hidden) return;
  const onList = state.step === "category" && state.orderTab === "delivery";
  const onCart = state.step === "cart" && Object.keys(state.delivery).length > 0;
  if (!onList && !onCart) return;
  const before = deliverySig();
  await loadDeliveryCatalog();
  if (before === deliverySig() && !state.bagNotice) return;
  if (state.step === "category" && state.orderTab === "delivery") { renderCategory(); decorateScreen(); }
  else if (state.step === "cart") { render(); }
}
setInterval(refreshDelivery, 20000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshDelivery(); });

/* ---------------- Init ---------------- */
(async function init() {
  try {
    await auth_init();
  } catch (e) {
    console.error("Erro ao verificar login:", e);
  }
  await loadProductsFromDB();
  loadSiteMedia().then(() => { if (state.step === "category" && state.orderTab === "encomendas") { renderCategory(); decorateScreen(); } });
  if (auth.session && auth.customer) {
    syncOrderCustomerFromProfile();
    state.step = "dashboard";
    await loadLoyaltyData();
  } else {
    state.step = "welcome";
  }
  render();
})();
