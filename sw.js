const CACHE = 'sango-officer-art-batch-0014-180';
const ASSETS = ['./data/design/national-scenarios.mjs','./data/design/reference-scenario.mjs','./city-classification.mjs','./faction-affairs.mjs','./campaign-replay.mjs','./player-time.mjs','./report-presentation.mjs','./map-metrics.mjs','./domestic-feedback.mjs','./army-inspection.mjs','./national-geography.mjs','./ancient-atlas-terrain.mjs','./data/design/ancient-atlas.mjs','./data/design/atlas-cities.mjs','./data/design/atlas-layout.mjs','./data/design/road-distances.mjs','./bond-reserves-peach.mjs','./bond-equipment.mjs','./work-traits.mjs','./bond-reference.mjs','./bond-display.mjs','./bond-hover.mjs','./bond-battlefield.mjs','./bond-events.mjs','./bond-combos.mjs', './bonds.mjs','./data/design/bonds.mjs','./data/design/bond-assignments.mjs','./army-trait-rules.mjs','./strategic-retreat.mjs','./battle-retreat.mjs','./strategic-map-camera.mjs','./road-network.mjs','./data/design/road-network.mjs','./troop-training.mjs','./data/design/technologies.mjs','./battle-generator.mjs','./data/design/battles.mjs','./strategic-intent.mjs','./troop-allocation.mjs','./battle-council.mjs','./army-details.mjs','./modal-scroll.mjs','./army-setup-view.mjs','./scenario-setup.mjs','./combat-comparison.mjs','./list-sort.mjs','./officer-recommendation.mjs','./military-flow.mjs','./strategic-traits.mjs','./officer-traits.mjs','./officer-fates.mjs','./officer-missions.mjs','./battle-info.mjs','./personnel-movement.mjs','./strategic-army-markers.mjs','./campaign-info-status.mjs','./campaign-info.mjs','./city-units.mjs','./strategic-command.mjs','./tactic-tempo.mjs','./classical.css','./landscape-scroll.svg','./battle-signals.mjs','./', './index.html', './styles.css', './app.js', './engine.mjs', './officer-catalog.mjs', './data/officers.mjs', './data/officer-traits.mjs', './officer-roster.mjs', './relationships.mjs', './combat-rules.mjs', './hex-grid.mjs', './command-cue.mjs', './scenarios.mjs', './scenario-catalog.mjs', './historical-campaigns.mjs', './campaign-lobby.mjs', './battlefield.mjs', './tactics.mjs', './unit-stats.mjs', './passives.mjs', './progression.mjs', './tactic-learning.mjs', './battle-effects.mjs', './icon.svg', './manifest.webmanifest'];
ASSETS.push('./reinforcement-arrival.mjs','./troop-choice.mjs','./army-muster.css');
ASSETS.push('./troop-equipment.mjs');
ASSETS.push('./unit-appearance.mjs','./art-siege-models.mjs');
ASSETS.push('./battle-events.mjs','./data/design/battle-events.mjs');
ASSETS.push('./army-supply.mjs');
ASSETS.push('./stratagems.mjs','./strategic-movement.mjs','./strategic-ai.mjs','./national-lobby.mjs','./national-scenarios.mjs','./national-map-view.mjs','./data/national-map.mjs');
ASSETS.push('./activity-nodes.mjs','./strategic-vision.mjs','./scouting.mjs','./scouting-state.mjs','./scouting-view.mjs');
ASSETS.push('./strategic-scouting-ai.mjs','./data/design/strategic-scouting-rules.mjs');
ASSETS.push('./harvest-summary.mjs','./reward-presentation.mjs','./reward-reports.css');
ASSETS.push('./diplomacy.mjs','./diplomacy-relations.mjs','./diplomacy-view.mjs','./data/design/diplomacy-rules.mjs');
ASSETS.push('./city-logistics.mjs','./city-resources.mjs','./city-budget.mjs','./economy.mjs','./data/design/economy-rules.mjs');
ASSETS.push('./building-rules.mjs','./support-rules.mjs','./battle-labels.mjs','./famous-officers.mjs','./attack-orbs.mjs');
ASSETS.push('./data/officer-profile-overrides.mjs','./custom-battle.mjs','./detail-panels.mjs');
ASSETS.push('./art-strategic-map.mjs','./strategic-map-art.mjs','./city-scene.mjs','./city-scene.css');
ASSETS.push('./metropolitan-areas.mjs','./data/design/metropolitan-areas.mjs');
ASSETS.push('./metropolitan-map.mjs','./map-detail-level.mjs','./town-layout.mjs');
ASSETS.push(...['plain','mountain','river','frontier'].map(region=>'./assets/town/han-terrain-'+region+'.webp'));
ASSETS.push(...['large','small','gate','port'].map(kind=>'./assets/town/han-space-'+kind+'.webp'));
ASSETS.push('./art.css','./art-assets.mjs','./art-battle.mjs','./art-models.mjs','./vendor/three/three.module.js','./vendor/three/three.core.js','./vendor/three/loaders/GLTFLoader.js','./vendor/three/loaders/OBJLoader.js','./vendor/three/utils/BufferGeometryUtils.js');
ASSETS.push('./domestic-proposal-view.mjs','./domestic.mjs','./domestic-cooperation.mjs','./strategic-campaign.mjs','./strategic-view.mjs','./strategic.css','./strategic-workspace.css','./strategic-hud.mjs','./strategic-relief.mjs');
ASSETS.push('./strategic-orders.mjs','./strategic-order-view.mjs','./city-personnel.mjs','./strategic-roster.mjs','./talent-core.mjs','./talent-lifecycle.mjs');
ASSETS.push('./tactic-outcomes.mjs','./tactic-power.mjs','./campaign-lobby.css','./troop-capacity.mjs','./tactical-campaigns.mjs');
ASSETS.push('./engagement.mjs','./expanded-tactics.mjs','./terrain-rules.mjs','./battle-ai.mjs','./status-display.mjs');
ASSETS.push('./design-catalog.mjs','./data/design/traits.mjs','./data/design/tactics.mjs','./data/design/stratagems.mjs','./data/design/troops.mjs','./data/design/officers.mjs','./data/design/cities.mjs','./data/design/assignments.mjs','./data/design/schema.mjs');
ASSETS.push('./domestic-designs.mjs','./design-strategy-validation.mjs','./data/design/domestic-actions.mjs','./data/design/buildings.mjs','./data/design/roads.mjs','./data/design/movement-rules.mjs');
ASSETS.push('./domestic-incidents.mjs','./domestic-incident-view.mjs','./data/design/domestic-incidents.mjs');
ASSETS.push('./page-guides.mjs','./page-guide-view.mjs','./page-guides.css');
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...new Set(ASSETS)])).then(() => self.skipWaiting())); });
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

ASSETS.push('./strategic-workspace.css','./strategic-hud.mjs','./strategic-relief.mjs');


ASSETS.push('./historical-battle-library.mjs','./data/design/battle-maps.mjs','./data/design/historical-battles.mjs');

ASSETS.push('./town-art.mjs','./assets/town/han-town-background.png','./assets/town/han-buildings-transparent.png','./assets/town/han-construction.png');

ASSETS.push('./officer-activity.mjs','./officer-activity-view.mjs');

ASSETS.push('./map-node-data.mjs','./road-metrics.mjs');

ASSETS.push('./officer-art-scenes.mjs','./assets/officers/manifest.json');

ASSETS.push('./campaign-merit.mjs','./domestic-merit.mjs');
