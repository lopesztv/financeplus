const CACHE_NAME = "finance-plus-shell-v2";
const BASE_PATH = new URL("./", self.location.href).pathname;
const INDEX_URL = new URL("./index.html", self.location.href).href;
const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./supabase-config.js",
    "./manifest.webmanifest",
    "./logo.svg",
    "./icon-192.png",
    "./icon-512.png",
    "./apple-touch-icon.png"
].map(function(path) { return new URL(path, self.location.href).href; });

self.addEventListener("install", function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) { return cache.addAll(APP_FILES); })
            .then(function() { return self.skipWaiting(); })
    );
});

self.addEventListener("activate", function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(keys.filter(function(key) {
                return key.startsWith("finance-plus-") && key !== CACHE_NAME;
            }).map(function(key) { return caches.delete(key); }));
        }).then(function() { return self.clients.claim(); })
    );
});

self.addEventListener("fetch", function(event) {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    const appOrigin = self.location.origin;
    const isAppRequest = url.origin === appOrigin && url.pathname.startsWith(BASE_PATH);
    const isPublicLibrary = url.origin === "https://cdn.jsdelivr.net" &&
        request.destination === "script" &&
        (url.pathname.includes("chart.js") || url.pathname.includes("supabase-js"));

    // Never cache Supabase Auth, database, or other remote API responses.
    if (!isAppRequest && !isPublicLibrary) return;

    if (request.mode === "navigate") {
        event.respondWith(fetch(request).then(function(response) {
            if (response.ok) {
                const copy = response.clone();
                event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
                    return cache.put(INDEX_URL, copy);
                }));
            }
            return response;
        }).catch(async function() {
            return (await caches.match(INDEX_URL)) || Response.error();
        }));
        return;
    }

    event.respondWith(fetch(request).then(function(response) {
        if ((response.ok || response.type === "opaque") && (isAppRequest || isPublicLibrary)) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
                return cache.put(request, copy);
            }));
        }
        return response;
    }).catch(async function() {
        return (await caches.match(request)) || Response.error();
    }));
});
