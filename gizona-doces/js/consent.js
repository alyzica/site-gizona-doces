/* Aviso de privacidade/cookies + helpers de links legais (usado no site e nas páginas legais) */
(function () {
  const KEY = "gizona_cookie_ack_v1";
  const L = window.GIZONA_LEGAL || {};
  window.GizonaConsent = {
    // Hoje o site usa SOMENTE armazenamento estritamente necessário (login e tela atual).
    // Se um dia for adicionado Analytics/pixel, ele só pode carregar se has("analytics") for true.
    has(cat) { return cat === "necessary"; },
    acknowledged() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } },
    acknowledge() { try { localStorage.setItem(KEY, L.versao || "1"); } catch (e) {} const b = document.getElementById("ckBanner"); if (b) b.remove(); },
    show() {
      if (document.getElementById("ckBanner")) return;
      const base = window.GIZONA_BASE || "";
      const d = document.createElement("div");
      d.id = "ckBanner"; d.className = "ck-banner"; d.setAttribute("role", "region"); d.setAttribute("aria-label", "Aviso de privacidade e cookies");
      d.innerHTML = `<p><strong>Sua privacidade importa.</strong> Este site usa apenas armazenamento essencial (manter seu login e lembrar a tela em que você está). Não usamos cookies de publicidade nem de rastreamento. Saiba mais na <a href="${base}privacidade.html">Política de Privacidade</a> e na <a href="${base}cookies.html">Política de Cookies</a>.</p>
        <div class="ck-actions"><button class="ck-ok" type="button">Entendi</button><a class="ck-more" href="${base}cookies.html" style="display:inline-flex;align-items:center;border-radius:999px;padding:8px 16px;border:2px solid var(--pink);text-decoration:none;font-size:13px">Ver detalhes</a></div>`;
      d.querySelector(".ck-ok").addEventListener("click", () => window.GizonaConsent.acknowledge());
      document.body.appendChild(d);
    },
    footerHtml() {
      const base = window.GIZONA_BASE || "";
      const parts = [L.razaoSocial || L.nomeFantasia, L.cnpj ? "CNPJ " + L.cnpj : "", L.endereco].filter(Boolean).join(" · ");
      return `<nav class="legal-links" aria-label="Documentos legais"><a href="${base}privacidade.html">Privacidade</a><a href="${base}termos.html">Termos de uso</a><a href="${base}reembolso.html">Cancelamentos e reembolsos</a><a href="${base}cookies.html">Cookies</a></nav>
        <p class="footer-legal">${parts}${L.emailContato ? " · " + L.emailContato : ""}</p>`;
    }
  };
  document.addEventListener("DOMContentLoaded", () => { if (!window.GizonaConsent.acknowledged()) window.GizonaConsent.show(); });
})();
