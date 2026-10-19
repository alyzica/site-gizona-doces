// Service worker do painel: exibe notificações de novos pedidos e abre o painel ao tocar nelas.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("push", e => { // usado quando houver envio push pelo servidor (ainda não configurado)
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || "Novo pedido", { body: d.body || "Aguardando confirmação", icon: "../images/brand/icon.png", requireInteraction: true, data: { url: d.url || "./#/orders" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./#/orders";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ("focus" in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
