/* ============================================================
   GIZONA DOCES — autenticação e perfil (Supabase Auth)
============================================================ */

const auth = {
  session: null,
  customer: null, // linha da tabela customers, quando logado
};

/* Busca sessão ativa ao carregar a página */
async function auth_init() {
  if (!sb) return; // biblioteca não carregou, segue sem login
  const { data } = await sb.auth.getSession();
  auth.session = data.session;
  if (auth.session) {
    await auth_loadCustomer();
  }
}

async function auth_loadCustomer() {
  if (!auth.session) return null;
  const { data, error } = await sb
    .from("customers")
    .select("*")
    .eq("id", auth.session.user.id)
    .maybeSingle();
  if (!error) auth.customer = data;
  return auth.customer;
}

/* Cadastro: cria o login e o perfil do cliente */
async function auth_register({ name, gender, cpf, phone, email, password, cep, street, number, complement, neighborhood, city, state }) {
  const cpfDigits = cpf.replace(/\D/g, "");

  // Verifica se o CPF já existe antes de criar a conta
  const { data: existing } = await sb
    .from("customers")
    .select("id")
    .eq("cpf", cpfDigits)
    .maybeSingle();
  if (existing) {
    throw new Error("Já existe um cadastro com esse CPF.");
  }

  const { data: signUpData, error: signUpError } = await sb.auth.signUp({ email, password });
  if (signUpError) throw signUpError;

  const userId = signUpData.user.id;

  const { error: insertError } = await sb.from("customers").insert({
    id: userId,
    full_name: name,
    gender: gender || null,
    cpf: cpfDigits,
    phone,
    email,
    cep, street, number, complement, neighborhood, city, state,
  });
  if (insertError) throw insertError;

  auth.session = signUpData.session;
  await auth_loadCustomer();
}

async function auth_login({ email, password }) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  auth.session = data.session;
  await auth_loadCustomer();
}

async function auth_logout() {
  await sb.auth.signOut();
  auth.session = null;
  auth.customer = null;
}

/* Envia e-mail de recuperação de senha */
async function auth_resetPassword(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) throw error;
}

/* Busca endereço pelo CEP (ViaCEP, gratuito, sem chave) */
async function auth_fetchCep(cepValue) {
  const digits = cepValue.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return { street: data.logradouro || "", neighborhood: data.bairro || "", city: data.localidade || "", state: data.uf || "" };
  } catch {
    return null;
  }
}
