const CACHE = 'sango-v9-20260917-tactic-cinematic';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './engine.mjs', './officer-catalog.mjs', './data/officers.mjs', './data/officer-traits.mjs', './officer-roster.mjs', './relationships.mjs', './combat-rules.mjs', './hex-grid.mjs', './command-cue.mjs', './scenarios.mjs', './scenario-catalog.mjs', './battlefield.mjs', './tactics.mjs', './unit-stats.mjs', './passives.mjs', './progression.mjs', './battle-effects.mjs', './icon.svg', './manifest.webmanifest'];
ASSETS.push('./famous-officers.mjs');
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('sango-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(() => caches.match(event.request)));
});
