(function () {
  const L = window.GIZONA_LEGAL || {};
  const todo = () => { const m = document.createElement("mark"); m.className = "lg-todo"; m.textContent = "[preencher]"; return m; };
  document.querySelectorAll("[data-l]").forEach(el => { const v = L[el.dataset.l]; if (v) el.textContent = v; else el.replaceChildren(todo()); });
  document.querySelectorAll("[data-l-opt]").forEach(el => { el.textContent = L[el.dataset.lOpt] || el.dataset.default || ""; });
  document.querySelectorAll("[data-l-wa]").forEach(el => {
    const n = String(L.whatsapp || "").replace(/\D/g, "");
    if (!n) { el.replaceWith(todo()); return; }
    el.href = "https://wa.me/" + n; el.textContent = n.replace(/^55(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  });
  const f = document.getElementById("lgFoot"); if (f && window.GizonaConsent) f.innerHTML = GizonaConsent.footerHtml();
  const y = document.getElementById("yr"); if (y) y.textContent = new Date().getFullYear();
})();
