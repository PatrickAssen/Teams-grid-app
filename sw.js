const CACHE = "tg-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request).then(resp => {
      // Cache new GET responses
      if (e.request.method === "GET") {
        const respClone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, respClone)).catch(()=>{});
      }
      return resp;
    }).catch(()=>res))
  );
});
