// Service worker mínimo: só cuida do toque nas notificações do contrato de estudo.
// Não faz cache nem intercepta requisições, então não muda o comportamento do app.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/notificacoes";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          return client
            .focus()
            .then((focused) => (focused && focused.navigate ? focused.navigate(url) : focused));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
