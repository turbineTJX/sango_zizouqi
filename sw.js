const CACHE = 'sango-fixed-tactics-64-20260922';
const ASSETS = ['./strategic-map-camera.mjs','./road-network.mjs','./data/design/road-network.mjs','./troop-training.mjs','./data/design/technologies.mjs','./battle-generator.mjs','./data/design/battles.mjs','./strategic-intent.mjs','./troop-allocation.mjs','./battle-council.mjs','./army-details.mjs','./modal-scroll.mjs','./army-setup-view.mjs','./scenario-setup.mjs','./combat-comparison.mjs','./list-sort.mjs','./officer-recommendation.mjs','./military-flow.mjs','./officer-traits.mjs','./officer-fates.mjs','./officer-missions.mjs','./battle-info.mjs','./personnel-movement.mjs','./strategic-army-markers.mjs','./campaign-info-status.mjs','./campaign-info.mjs','./city-units.mjs','./strategic-command.mjs','./tactic-tempo.mjs','./classical.css','./landscape-scroll.svg','./battle-signals.mjs','./', './index.html', './styles.css', './app.js', './engine.mjs', './officer-catalog.mjs', './data/officers.mjs', './data/officer-traits.mjs', './officer-roster.mjs', './relationships.mjs', './combat-rules.mjs', './hex-grid.mjs', './command-cue.mjs', './scenarios.mjs', './scenario-catalog.mjs', './historical-campaigns.mjs', './campaign-lobby.mjs', './battlefield.mjs', './tactics.mjs', './unit-stats.mjs', './passives.mjs', './progression.mjs', './tactic-learning.mjs', './battle-effects.mjs', './icon.svg', './manifest.webmanifest'];
ASSETS.push('./stratagems.mjs','./strategic-movement.mjs','./strategic-ai.mjs','./national-lobby.mjs','./national-scenarios.mjs','./national-map-view.mjs','./data/national-map.mjs');
ASSETS.push('./building-rules.mjs','./support-rules.mjs','./battle-labels.mjs','./famous-officers.mjs','./attack-orbs.mjs');
ASSETS.push('./data/officer-profile-overrides.mjs','./custom-battle.mjs');
ASSETS.push('./art-strategic-map.mjs','./strategic-map-art.mjs');
ASSETS.push('./art.css','./art-assets.mjs','./art-battle.mjs','./art-models.mjs','./vendor/three/three.module.js','./vendor/three/three.core.js','./vendor/three/loaders/GLTFLoader.js','./vendor/three/loaders/OBJLoader.js','./vendor/three/utils/BufferGeometryUtils.js');
ASSETS.push('./domestic.mjs','./domestic-cooperation.mjs','./strategic-campaign.mjs','./strategic-view.mjs','./strategic.css');
ASSETS.push('./strategic-orders.mjs','./strategic-order-view.mjs','./city-personnel.mjs','./strategic-roster.mjs','./talent-core.mjs','./talent-lifecycle.mjs');
ASSETS.push('./tactic-outcomes.mjs','./tactic-power.mjs','./campaign-lobby.css','./troop-capacity.mjs','./tactical-campaigns.mjs');
ASSETS.push('./engagement.mjs','./expanded-tactics.mjs','./terrain-rules.mjs','./battle-ai.mjs','./status-display.mjs');
ASSETS.push('./design-catalog.mjs','./data/design/traits.mjs','./data/design/tactics.mjs','./data/design/stratagems.mjs','./data/design/troops.mjs','./data/design/officers.mjs','./data/design/cities.mjs','./data/design/assignments.mjs','./data/design/schema.mjs');
ASSETS.push('./domestic-designs.mjs','./design-strategy-validation.mjs','./data/design/domestic-actions.mjs','./data/design/buildings.mjs','./data/design/roads.mjs','./data/design/movement-rules.mjs');
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


ASSETS.push('./data/design/progression.mjs','./data/design/economy-rules.mjs');
