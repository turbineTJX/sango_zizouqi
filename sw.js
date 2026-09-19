const CACHE = 'sango-v54-deployment-order';
const ASSETS = ['./classical.css','./landscape-scroll.svg','./battle-signals.mjs','./', './index.html', './styles.css', './app.js', './engine.mjs', './officer-catalog.mjs', './data/officers.mjs', './data/officer-traits.mjs', './officer-roster.mjs', './relationships.mjs', './combat-rules.mjs', './hex-grid.mjs', './command-cue.mjs', './scenarios.mjs', './scenario-catalog.mjs', './historical-campaigns.mjs', './campaign-lobby.mjs', './battlefield.mjs', './tactics.mjs', './unit-stats.mjs', './passives.mjs', './progression.mjs', './tactic-learning.mjs', './battle-effects.mjs', './icon.svg', './manifest.webmanifest'];
ASSETS.push('./strategic-ai.mjs','./national-lobby.mjs','./national-scenarios.mjs','./national-map-view.mjs','./data/national-map.mjs');
ASSETS.push('./building-rules.mjs','./support-rules.mjs','./battle-labels.mjs','./famous-officers.mjs','./attack-orbs.mjs');
ASSETS.push('./data/officer-profile-overrides.mjs','./custom-battle.mjs');
ASSETS.push('./art-strategic-map.mjs','./strategic-map-art.mjs');
ASSETS.push('./art.css','./art-assets.mjs','./art-battle.mjs','./art-models.mjs','./vendor/three/three.module.js','./vendor/three/three.core.js','./vendor/three/loaders/GLTFLoader.js','./vendor/three/loaders/OBJLoader.js','./vendor/three/utils/BufferGeometryUtils.js');
ASSETS.push('./domestic.mjs','./domestic-cooperation.mjs','./strategic-campaign.mjs','./strategic-view.mjs','./strategic.css');
ASSETS.push('./tactic-outcomes.mjs','./tactic-power.mjs','./campaign-lobby.css','./troop-capacity.mjs','./tactical-campaigns.mjs');
ASSETS.push('./engagement.mjs','./expanded-tactics.mjs','./terrain-rules.mjs','./battle-ai.mjs','./status-display.mjs');
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('sango-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  // External local-only art must never enter the offline/release cache.
  if(new URL(event.request.url).pathname.startsWith('/local-art/'))return;
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(() => caches.match(event.request)));
});
