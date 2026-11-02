const CACHE_NAME = "maia-operacoes-v1"
const STATIC_ASSETS = [
  "/",
  "/simples-conferencia",
  "/manifest.json",
  "/apple-icon.png",
  "/icon.svg",
  "/images/maia-logo.jpg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("ServiceWorker pre-cache parcial:", err)
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  // Ignora chamadas de API externas e extensões do Chrome
  if (!event.request.url.startsWith(self.location.origin)) return

  // Para navegação HTML e recursos estáticos: network-first com fallback para cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.method === "GET" &&
          !event.request.url.includes("/api/")
        ) {
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return networkResponse
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        if (event.request.mode === "navigate") {
          return (await caches.match("/simples-conferencia")) || caches.match("/")
        }
        return new Response("Offline - conexão indisponível", { status: 503 })
      })
  )
})
