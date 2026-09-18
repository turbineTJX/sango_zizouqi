import {newCampaign,validateCampaign,serializeCampaign,calendar,isPlanning,canEditArmy,armyBattle,activeBattles,battleRecord,beginExecution,advanceCampaignStep,advanceCampaignDay,chooseEncounter,takeOverBattle,viewCampaignMap,orderCampaignArmy,recruitCampaign,splitCampaignArmy,mergeCampaignArmies,createCampaignArmy,transferOfficer,commissionProject,relieveCity,appointGovernor} from './strategic-campaign.mjs';
import {strategicView,campaignBattleBar,snapshotMarkup} from './strategic-view.mjs';
const newGame = () => newCampaign();
const validateSave = value => {if(value?.testScenario){if(value.campaign)throw new Error('试炼与战略存档类型不一致');return validateBattleSave(value);}return validateCampaign(value);};
import {troopCapacity} from './troop-capacity.mjs';
import {relationshipInfo,setRelationshipScore,setRelationshipType} from './relationships.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {rosterMarkup,officerDetailMarkup,officerProfileMarkup,relationshipEditorMarkup} from './officer-roster.mjs';
import {makeOfficer} from './engine.mjs';
import { unitAttributes, ATTRIBUTE_LABELS } from './unit-stats.mjs';
import {intentIncome, officerLevel, passiveList, passiveDamageTaken} from './passives.mjs';
import {experienceNeeded} from './progression.mjs';
import { shieldLayers, shieldAmount } from './tactics.mjs';
import { availableTactics, defaultTacticIds, roleTacticIds, TACTIC_ROLES, CATEGORY_NAMES } from './tactics.mjs';
import { TROOPS, TACTICS, FACTIONS, GRID, COMBAT, armyTroops, armyById, cityById, findRoute, orderArmy, advanceTurn, startBattle, stepBattle, issueCommand, settleBattle, activeUnits, recruit, splitArmy, mergeArmies, validateSave as validateBattleSave } from './engine.mjs';
import {visibleStatuses,statusIcon,statusTimeLabel} from './status-display.mjs';
import { BattleEffects } from './battle-effects.mjs';
import {tacticPowerPreview} from './tactic-power.mjs';
import {statusPower} from './tactics.mjs';
import { HEX_GRID, HEX_ASPECT, hexCenter, hexCellStyle } from './hex-grid.mjs';
import { CommandCue } from './command-cue.mjs';
import { SCENARIOS, createScenario } from './scenarios.mjs';
import { campaignLobby } from './campaign-lobby.mjs';
import { waveSummary,terrainAt,unitTerrain,BATTLE_TERRAINS,TERRAIN_NAMES,TERRAIN_HELP } from './battlefield.mjs';
import { armyCommanders, officerStratagems, armyStratagems, battleStratagems, commandIntellect, COMMAND_RESOURCE, battleWounded, attackRange, configureUnitTactics, unitTactics, hasStatus, STRATAGEMS, isDeploying, deployUnit, resetDeployment, configureBattleTerrain, lockDeployment } from './engine.mjs';

const SAVE_KEY = 'sango-sovereign-v2';
const TEST_SAVE_KEY = 'sango-battle-lab-v1';
const HISTORY_SAVE_KEY = 'sango-historical-battle-v1';
const storageKey = () => currentScenario()?.campaign ? HISTORY_SAVE_KEY : state?.testScenario ? TEST_SAVE_KEY : SAVE_KEY;
const routeKey = () => location.hash === '#historical-battle' ? HISTORY_SAVE_KEY : location.hash === '#battle-lab' ? TEST_SAVE_KEY : SAVE_KEY;
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
const fmt = value => Math.round(value).toLocaleString('zh-CN');
const compact = value => value >= 10000 ? `${(value / 10000).toFixed(1)}万` : fmt(value);
const icons = {
  map: '<path d="m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3V5Zm6-3v17m6-14v17"/>',
  flag: '<path d="M5 22V3m0 1c6-5 9 5 15 0v11c-6 5-9-5-15 0"/>',
  people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m2-17a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5v3"/>',
  scroll: '<path d="M7 3h12v16H7a3 3 0 0 1-3-3V6a3 3 0 1 1 6 0v13m-3 0v2h15v-5h-3M13 7h3m-3 4h3"/>',
  gear: '<path d="m10 2 4 0 1 3 3 1 3 3-2 3 1 3-3 3-3-1-2 3-4-1-1-3-3-1-1-4 3-2V7l4-2 0-3Z"/><circle cx="12" cy="11" r="3"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M9 9h6v6H9z"/>',
  grain: '<path d="M12 22V5m0 5c-6 0-7-3-7-6 5 0 7 3 7 6Zm0 6c-6 0-7-3-7-6 5 0 7 3 7 6Zm0-3c6 0 7-3 7-6-5 0-7 3-7 6Zm0 6c6 0 7-3 7-6-5 0-7 3-7 6Z"/>',
  sword: '<path d="m5 3 5 2 10 13-3 3L5 8V3Zm15 0-5 2-3 4M3 17l4 4m10-17-5 6M4 21l4-4m12 4-4-4"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  play: '<path d="m8 4 13 8-13 8V4Z"/>',
  pause: '<path d="M7 4v16M17 4v16"/>',
  home: '<path d="m3 11 9-8 9 8M5 9v12h14V9m-10 12v-8h6v8"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3v1"/>',
  save: '<path d="M4 3h13l4 4v14H3V3h1Zm3 0v6h9V3M7 21v-8h10v8"/>',
  wind: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h17a3 3 0 1 1-3 3M3 16h6a3 3 0 1 1-3 3"/>',
  crown: '<path d="m3 6 5 5 4-8 4 8 5-5-2 13H5L3 6Zm3 16h12"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.flag}</svg>`;
let state, loadWarning = '';
try { const raw = localStorage.getItem(routeKey()); state = raw ? validateSave(JSON.parse(raw)) : newGame(); }
catch {
  const failedLab=['#battle-lab','#historical-battle'].includes(location.hash);
  state = newGame(); loadWarning = '存档已过期或无法读取，已按当前规则创建新局。';
  try { localStorage.removeItem(routeKey()); } catch {}
  if(failedLab){
    // A stale trial must not overwrite a separate, valid current campaign.
    try { const raw=localStorage.getItem(SAVE_KEY);if(raw){state=validateSave(JSON.parse(raw));loadWarning='试炼存档已过期或无法读取，已返回天下进度。';} } catch {}
    history.replaceState(null,'',location.pathname+location.search);
  }
}
const ui = { army: state.armies.find(a => a.faction === 'cao')?.id, city: 'xuchang', mode: 'map', order: false, modal: null, paused: true, speed: 1, effectMode: 'clear', focusMode: false, deploymentSelection: null, zoom: 1, showArmies: true, selectedSplit: new Set(), savedAt: null, lastTime: 0, catalogQuery:'',catalogKind:'all',catalogSort:'source',catalogPage:0,catalogSelected:[...(state.testScenario?.officerIds||[])] };
ui.mode = location.hash==='#strategy'||(location.hash==='#historical-battle'&&currentScenario()?.campaign)||(location.hash==='#battle-lab'&&state.testScenario&&!currentScenario()?.campaign) ? 'map' : 'lobby';
ui.historySelection = currentScenario()?.campaign ? state.testScenario.id : 'history-guandu';
if(ui.mode !== 'lobby')ui.modal=state.report?'report':state.pending?'encounter':null;
try { ui.effectMode = localStorage.getItem('sango-effects-mode') === 'full' ? 'full' : 'clear'; } catch {}
let toastTimer;
let battleFx = null;
const commandCue = new CommandCue();
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3400); }
function save(silent = true) {
  try { localStorage.setItem(storageKey(), state.campaign?serializeCampaign(state):JSON.stringify(state)); ui.savedAt = new Date(); if (!silent) toast(state.testScenario ? '战役进度已单独保存' : '进度已保存到此浏览器'); }
  catch { toast('浏览器存储不可用，请在设置中导出存档'); }
}
function selectedArmy() { return armyById(state, ui.army) || state.armies.find(a => a.faction === 'cao'); }
function currentScenario() { return SCENARIOS.find(s => s.id === state.testScenario?.id); }
function historicalResume() {
  try {
    const raw=localStorage.getItem(HISTORY_SAVE_KEY);
    if(!raw)return null;
    const saved=validateSave(JSON.parse(raw)),scenario=SCENARIOS.find(s=>s.id===saved.testScenario?.id&&s.campaign);
    if(!scenario||(!saved.battle&&!saved.report))return null;
    return {name:scenario.name,finished:!!saved.report,stage:saved.report?'本役已结束':isDeploying(saved.battle)?'待布阵':`第 ${saved.battle.tick} 步 · 已暂停`};
  } catch { return {name:'战役试玩存档不可用',stage:'版本不兼容或数据损坏，请重新开始',invalid:true}; }
}
function showLobby() {
  ui.paused=true;ui.modal=null;ui.mode='lobby';ui.battlePanel=null;ui.focusMode=false;
  save();history.replaceState(null,'',location.pathname+location.search);render();window.scrollTo(0,0);
}
function continueHistory() {
  try {
    const raw=localStorage.getItem(HISTORY_SAVE_KEY);
    if(!raw)return toast('尚无战役进度，请选择战役开始');
    const next=validateSave(JSON.parse(raw));
    if(!SCENARIOS.some(s=>s.id===next.testScenario?.id&&s.campaign))throw new Error('战役存档无效，请重新开始');
    save();state=next;restoreUI();
  } catch(error){toast(`无法继续：${error.message}`);}
}
function launchScenario(id, seed, shieldPercent = 20, officerIds = null) {
  try {
    if(seed===undefined&&SCENARIOS.find(s=>s.id===id)?.historical===false)seed=crypto.getRandomValues(new Uint32Array(1))[0];
    const next = createScenario(id, seed, shieldPercent, officerIds);
    if(!SCENARIOS.find(s=>s.id===id)?.campaign){
    next.relationshipScores=structuredClone(state.relationshipScores);
    next.battle.relationshipScores=structuredClone(next.relationshipScores);
    next.relationshipTypes=structuredClone(state.relationshipTypes);
    next.battle.relationshipTypes=structuredClone(next.relationshipTypes);
    }
    save(); state = next;
    ui.speed = 1; restoreUI(); save();
  } catch (error) { toast(error.message); }
}
function exitScenario() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    let next,warning='';
    try { next=raw?validateSave(JSON.parse(raw)):newGame(); }
    catch { next=newGame();warning='天下存档已过期或无法读取，已按当前规则创建新局。'; }
    save(); state = next; history.replaceState(null, '', location.pathname + location.search);
    restoreUI();save();if(warning)toast(warning);
  } catch (error) { toast(`天下存档读取失败：${error.message}`); }
}
function scenarioModal() {
  return modalShell('战役试炼', 'BATTLE LAB · 独立测试', `<p class="modal-intro">选择战役即可布阵。试炼独立存档；相同种子和操作可复现战局。切换或重开会重置试炼。</p><label class="scenario-seed">随机种子 <input id="scenario-seed" type="number" min="0" max="4294967295" step="1" placeholder="留空使用各战役固定种子"><small>用于比较布阵、战法与军略的影响</small></label><label class="scenario-seed">守方首发护盾 <input id="scenario-shield" type="number" min="0" max="100" step="1" value="${state.testScenario?.shieldPercent ?? 20}" aria-label="守方首发护盾百分比"><small>% 初始兵力 · 仅攻守城生效 · 预备队无护盾</small></label><div class="scenario-grid">${SCENARIOS.filter(s=>!s.campaign).map(s => `<article class="scenario-card"><div class="eyebrow">${s.kind} · ${s.difficulty}</div><h3>${s.name}</h3><p>${s.description}</p><div class="scenario-strength"><span>我军 <b>${fmt(s.own*s.ownTroops)}</b><small>${s.own} 队 · Lv.${s.level}</small></span><span>敌军 <b>${fmt(s.enemy*s.enemyTroops)}</b><small>${s.enemy} 队 · Lv.${s.enemyLevel}</small></span></div><p class="scenario-waves">${s.id==='officer-lab'?'默认六将，可在武将名录自选 1～6 人':s.waves.length ? s.waves.map((w,i)=>`第 ${i+1} 批：${w.count} 队 · ${w.tick ? w.tick+' 步到达' : '开局待命'}`).join('<br>') : `我军 ${Math.min(6,s.own)} 队、敌军 ${Math.min(6,s.enemy)} 队首发，无预备队`}</p><small class="scenario-goal">${s.goal}</small><button class="button primary full" data-action="launch-scenario" data-scenario="${s.id}">布阵 · 开始测试</button></article>`).join('')}</div>`, state.testScenario ? '<button class="button secondary" data-action="exit-scenario">返回天下进度</button>' : '', true);
}
function scenarioControls(b) {
  const s = currentScenario();
  if (!s) return '';
  return `<div class="scenario-toolbar"><div><b>${s.campaign?'战役试玩':s.kind+'试炼'} · 种子 ${state.testScenario.seed}</b><small>${s.goal}</small></div><div><button class="button secondary" data-action="step-scenario" data-steps="1" ${isDeploying(b)||b.result?'disabled':''}>单步</button><button class="button secondary" data-action="step-scenario" data-steps="10" ${isDeploying(b)||b.result?'disabled':''}>推进 10 步</button><button class="button secondary" data-action="retry-scenario">同局重试</button><button class="button secondary" data-action="rematch-scenario">换局再战</button><button class="button secondary" data-action="${s.campaign?'lobby':'scenarios'}">切换战役</button><button class="button secondary" data-action="lobby">战役首页</button></div></div>`;
}
function siegeTerrain(b) {
  const g=b.siege?.gate;
  if (!g) return '';
  return `<button class="siege-gate side-${g.side}" data-action="inspect-gate" style="${hexCellStyle(g.x,g.y)}" aria-label="${g.side===0?'我方':'敌方'}城门，耐久${g.hp}"><span class="unit-type">門</span><span class="unit-name">城门</span><span class="unit-health"><i style="width:${g.hp/g.maxHp*100}%"></i></span><span class="unit-number">${compact(g.hp)}</span>${b.sides[0].focus===g.id&&b.sides[0].focusUntil>b.tick?'<span class="target-ring"></span>':''}</button>`;
}
function reinforcementPanel(b) {
  return `<div class="reinforcement-panel"><h4>敌方兵力序列</h4><p>在场 ${activeUnits(b,1).length} / 6 · 预备 ${b.sides[1].units.filter(u=>u.status==='reserve').length} 队</p>${waveSummary(b,1).map(w=>`<div><b>第 ${w.wave} 批 · ${w.total} 队</b><small>${w.arrivalTick>b.tick?`距抵达 ${w.arrivalTick-b.tick} 步`:w.waiting?`已抵达 · ${w.waiting} 队等候补位`:'已全部投入'} · 在场 ${w.active}</small></div>`).join('')}${b.sides[1].blockadeUntil>b.tick?`<p>断援中 · 剩余 ${b.sides[1].blockadeUntil-b.tick} 步</p>`:''}${b.siege?`<h4>城门 ${fmt(b.siege.gate.hp)} / ${fmt(b.siege.gate.maxHp)}</h4><div class="meter"><i style="width:${b.siege.gate.hp/b.siege.gate.maxHp*100}%"></i></div><p>城门耐久归零，守方立即败北。首发护盾 ${state.testScenario?.shieldPercent??15}%，预备队无护盾。</p>`:''}</div>`;
}
function dateLabel() { const n = state.turn - 1, year = 5 + Math.floor(n / 36), month = Math.floor(n % 36 / 3) + 1; return `建安${['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][year] || year}年 · ${month}月${['上', '中', '下'][n % 3]}旬`; }
function avatar(unit, small = false) { return `<span class="portrait ${unit.type} ${small ? 'small' : ''}"><span>${esc(unit.name.slice(-1))}</span><i>${esc(TROOPS[unit.type].icon)}</i></span>`; }
function resource(name, value, symbol, extra) { return `<div class="resource">${icon(symbol)}<div><span>${name}</span><strong>${fmt(value)}</strong></div><small>${extra}</small></div>`; }
function header() {
  const owned = state.cities.filter(c => c.owner === 'cao').length;
  const armyCount = state.armies.filter(a => a.faction === 'cao').reduce((n, a) => n + armyTroops(a), 0);
  return `<header class="topbar"><a class="brand" href="#" data-action="lobby" aria-label="返回战役首页"><span class="brand-seal">君</span><div><b>三国<span> · </span>君临</b><small>SOVEREIGN OF THE THREE KINGDOMS</small></div></a><div class="resources">${resource('府库', state.gold, 'coin', `+${owned * 160}/旬`)}${resource('粮草', state.grain, 'grain', `+${owned * 600}/旬`)}${resource('总兵力', armyCount, 'flag', `${state.armies.filter(a => a.faction === 'cao').length} 军团`)}</div><button class="faction-badge" data-action="help"><span>曹</span><div><b>曹操势力</b><small>声望 ${state.fame} · ${owned} 座城池</small></div></button></header>`;
}
function rail() {
  return `<nav class="rail" aria-label="主导航"><div class="rail-nav"><button class="nav-item ${!ui.modal ? 'active' : ''}" data-action="home">${icon('map')}<span>天下</span></button><button class="nav-item" data-action="army">${icon('flag')}<span>军团</span></button><button class="nav-item" data-action="officers">${icon('people')}<span>武将</span></button><button class="nav-item" data-action="scenarios">${icon('sword')}<span>试炼</span></button><button class="nav-item" data-action="journal">${icon('scroll')}<span>纪事</span></button></div><div class="rail-bottom"><button class="nav-item" data-action="lobby">${icon('sword')}<span>战役首页</span></button><button class="nav-item" data-action="help" aria-label="玩法说明">${icon('help')}<span>指引</span></button><button class="nav-item" data-action="settings">${icon('gear')}<span>设置</span></button><span class="version">V 0.3</span></div></nav>`;
}
function mapDecoration() {
  let s = '';
  const mountains = [[80, 170, 170, 95], [380, 220, 120, 65], [100, 470, 130, 145], [865, 610, 100, 125], [840, 100, 130, 90], [465, 730, 150, 90]];
  mountains.forEach(([x, y, w, h], idx) => {
    for (let i = 0; i < 12; i++) {
      const px = x + (Math.sin(i * 4.3 + idx) + 1) * w / 2, py = y + (Math.cos(i * 2.2 + idx) + 1) * h / 2;
      const size = 12 + i % 4 * 7;
      s += `<path d="m${px - size} ${py + size * .5} ${size * .7} -${size} ${size * .3} ${size * .35} ${size * .35} -${size * .65} ${size * .9} ${size * 1.3}" class="mountain"/><path d="m${px} ${py - size * .15} ${size * .35} -${size * .65} ${size * .15} ${size * .8}" class="mountain-lit"/>`;
    }
  });
  for (let i = 0; i < 75; i++) {
    const x = 100 + ((i * 157) % 830), y = 120 + ((i * 97) % 590);
    s += `<path d="m${x} ${y} 3-7 3 7h-6m3 0v4" class="forest"/>`;
  }
  return s;
}
const terrain = mapDecoration();
function mapSvg() {
  const army = selectedArmy();
  const activeRoads = army?.route.length ? [army.location, ...army.route] : [];
  const nodes = state.cities.map(city => {
    const isSelected = city.id === ui.city, hostile = city.owner !== 'cao', resident = state.armies.filter(a => a.location === city.id);
    return `<g class="city-node ${isSelected ? 'selected' : ''} ${city.owner}" data-city="${city.id}" tabindex="0" role="button" aria-label="${city.name}，${FACTIONS[city.owner].name}势力" transform="translate(${city.x},${city.y})"><circle class="city-aura" r="41"/><circle class="city-outer" r="29"/><circle class="city-inner" r="22"/><path class="castle" d="M-14 8V-3h4v-8h5v5H5v-5h5v8h4V8Zm-14-12v-5m28 5v-5M-3 8V1h6v7"/><path class="city-roof" d="m-18-3 9-6m27 6-9-6M-8-12l8-6 8 6"/><text class="city-name" y="52">${city.name}</text><text class="city-sub" y="69">${isSelected ? city.subtitle : `${FACTIONS[city.owner].name} · ${compact(city.garrison)}守军`}</text>${city.id === 'xuchang' ? '<text class="capital" x="-45" y="-24">都</text>' : ''}${ui.showArmies && resident.length ? `<g class="army-map-marker" transform="translate(33,-28)"><path d="M0 0h49v25H0z" fill="${hostile ? '#653c39' : '#264e46'}"/><text x="24" y="17">${FACTIONS[resident[0].faction].short} ${compact(resident.reduce((n, a) => n + armyTroops(a), 0))}</text><path d="M0 0v37"/></g>` : ''}</g>`;
  }).join('');
  const roads = state.roads.map(([a, b]) => {
    const x = cityById(state, a), y = cityById(state, b);
    const active = activeRoads.some((id, i) => id === a && activeRoads[i + 1] === b || id === b && activeRoads[i + 1] === a);
    return `<path class="road ${active ? 'route' : ''}" d="M${x.x} ${x.y} L${y.x} ${y.y}"/>`;
  }).join('');
  const selected = cityById(state, ui.city) || { x: 500, y: 400 };
  const w = 1000 / ui.zoom, h = 800 / ui.zoom, x = Math.max(0, Math.min(1000 - w, selected.x - w / 2)), y = Math.max(0, Math.min(800 - h, selected.y - h / 2));
  return `<svg id="strategic-map" viewBox="${x} ${y} ${w} ${h}" role="group" aria-label="中原战略地图，可点击城池选择目的地"><defs><radialGradient id="map-glow"><stop offset="0" stop-color="#31453f"/><stop offset="1" stop-color="#16282a"/></radialGradient><pattern id="map-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#b7c2a9" stroke-opacity=".035"/></pattern><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".045"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="#dcc18a"/></marker></defs><rect width="1000" height="800" fill="url(#map-glow)"/><g class="region-lines"><path d="M0 285 230 268 390 345 530 265 705 267 1000 187M0 570 180 595 390 620 590 663 705 750M350 0 430 205 390 345M705 267 760 360 705 750"/></g><g class="province-labels"><text x="478" y="95">并 州</text><text x="810" y="180">冀 州</text><text x="141" y="403">司 隶</text><text x="742" y="398">兖 州</text><text x="531" y="664">豫 州</text><text x="116" y="729">荆 州</text></g><rect width="1000" height="800" fill="url(#map-grid)"/>${terrain}<path class="river-shadow" d="M-30 192C160 160 193 223 210 239S262 294 329 280 444 237 489 251 522 298 567 292 660 193 714 210 785 302 836 294 937 243 1030 334"/><path class="river" d="M-30 192C160 160 193 223 210 239S262 294 329 280 444 237 489 251 522 298 567 292 660 193 714 210 785 302 836 294 937 243 1030 334"/><path class="river-small" d="M110 830C211 761 122 702 230 597S426 527 435 610 554 778 636 814M994 580C854 538 913 638 818 641S756 765 702 820"/><text class="river-label" x="463" y="225" transform="rotate(9 463 225)">黄 河</text><text class="river-label" x="370" y="588" transform="rotate(22 370 588)">颍 水</text><g>${roads}</g><g>${nodes}</g><g class="compass" transform="translate(905 694)"><circle r="29"/><path d="M0-33 6 0 0 30-6 0Z"/><path d="M-27 0H27"/><text y="-44">北</text></g><text class="map-footnote" x="46" y="764">中 原 舆 图 · 建 安 五 年</text></svg>`;
}
function sidePanel() {
  const army = selectedArmy(), city = cityById(state, ui.city), friendly = city.owner === 'cao';
  if (!army) return `<aside class="side-panel"><p>暂无可用军团。</p></aside>`;
  const leader = army.units.find(u => u.id === army.leader), route = findRoute(state, army.location, city.id);
  const same = army.location === city.id;
  return `<aside class="side-panel"><div class="panel-section city-detail"><div class="eyebrow">${city.province} <span class="ownership ${city.owner}">${friendly ? '己方领地' : FACTIONS[city.owner].name}</span></div><div class="city-title"><h2>${city.name}</h2><span>${city.subtitle}</span>${icon('home')}</div><div class="city-stats"><div><span>驻城守军</span><b>${fmt(city.garrison)}</b></div><div><span>距军团</span><b>${same ? '驻地' : `${route.length} 旬`}</b></div></div>${!same ? `<button class="button ${friendly ? 'secondary' : 'outline-gold'} full" data-action="march" data-target="${city.id}">${icon(friendly ? 'flag' : 'sword')}${friendly ? '移驻此城' : '出征此地'}<span>→</span></button>` : '<div class="quiet-note">天时地利，皆在运筹。</div>'}</div><div class="panel-section legion-detail"><div class="section-heading"><h3>麾下军团</h3><button class="text-button" data-action="army">编制 ${icon('chevron')}</button></div><select class="army-select" id="army-select" aria-label="选择军团">${state.armies.filter(a => a.faction === 'cao').map(a => `<option value="${a.id}" ${a.id === army.id ? 'selected' : ''}>${a.name} · ${cityById(state, a.location).name}</option>`).join('')}</select><div class="commander">${avatar(leader || army.units[0])}<div><div class="commander-title">${esc(army.name)}<span class="status-tag">${army.task}</span></div><p>主将 ${esc(leader?.name || '待任命')} <span>·</span> ${TACTICS[army.tactic]}</p></div></div><div class="army-metrics"><div><span>总兵力</span><strong>${fmt(armyTroops(army))}<small> 人</small></strong></div><div><span>武将</span><strong>${army.units.length}<small> 名</small></strong></div></div><div class="meter-label"><span>军团士气</span><b>${army.morale}<small> / 100</small></b></div><div class="meter"><i style="width:${army.morale}%"></i></div><div class="meter-label"><span>随军粮草</span><b>${fmt(army.supply)}<small> 石</small></b></div><div class="meter amber"><i style="width:${Math.min(100, army.supply / 9)}%"></i></div><div class="mini-roster">${army.units.slice(0, 6).map(u => `<div title="${u.name} · ${TROOPS[u.type].name}">${avatar(u, true)}<span>${u.name}</span></div>`).join('')}</div><div class="reserve-caption">${army.units.filter(u => u.first).length} 名首发 <span>·</span> ${army.units.filter(u => !u.first).length} 名预备队</div>${army.route.length ? `<div class="route-summary">${icon('flag')}<span>${cityById(state, army.location).name} → ${cityById(state, army.target).name}<small>剩余 ${army.route.length} 旬 · 下一回合继续行军</small></span><button class="text-button" data-action="cancel-march">取消</button></div>` : ''}<div class="button-pair"><button class="button primary" data-action="order">${icon('flag')}调遣</button><button class="button secondary" data-action="recruit">${icon('people')}征兵</button></div></div><div class="adviser-note"><span class="adviser-seal">策</span><div><b>军师谏言</b><p>${state.turn < 5 ? '官渡扼守南北要道。先整军备战，再图河北。' : '敌军已动，切勿孤军深入。留意粮草，善用预备队。'}</p></div></div></aside>`;
}
function campaign() {
  const own = state.cities.filter(c => c.owner === 'cao').length;
  return `<main class="campaign"><div class="page-heading"><div><div class="eyebrow">THE CENTRAL PLAINS <span class="small-rule"></span> 群雄逐鹿</div><h1>天下大势<span>运筹帷幄，决胜千里。</span></h1></div><button class="button primary" data-action="scenarios">${icon('sword')}战役试炼</button></div><div class="campaign-layout"><section class="map-panel"><div class="map-toolbar"><div>${icon('map')}<b>中原</b><span>势力版图</span></div><div class="map-legend"><span><i class="cao"></i>曹操</span><span><i class="yuan"></i>袁绍</span><span><i class="neutral"></i>地方势力</span></div></div><div class="map-wrap">${mapSvg()}<div class="map-objective"><span>剧本目标</span><b>平定中原</b><small>占领全部 ${state.cities.length} 座城池</small><div class="objective-progress"><i style="width:${own / state.cities.length * 100}%"></i></div><em>${own} / ${state.cities.length}</em></div><div class="map-controls"><button data-action="zoom-in" aria-label="放大地图">+</button><button data-action="zoom-out" aria-label="缩小地图">−</button><button data-action="zoom-reset" aria-label="重置地图">◎</button><button data-action="toggle-armies" aria-label="切换军团标记">${icon('flag')}</button></div><div class="map-hint ${ui.order ? 'ordering' : ''}">${ui.order ? '选择一座城池，向所选军团下达调遣令。' : '点击城池查看详情 · 调遣军团后推进回合'}${ui.order ? '<button data-action="cancel-order">取消</button>' : ''}</div></div><div class="campaign-news"><span class="news-icon">报</span><span>${esc(state.logs[0]?.text || '')}</span><button class="text-button" data-action="journal">天下纪事 ${icon('chevron')}</button></div></section>${sidePanel()}</div><footer class="turn-bar"><div class="calendar"><span class="calendar-icon">${String(state.turn).padStart(2, '0')}</span><div><b>${dateLabel()}</b><small>第 ${state.turn} 回合 · 一回合为一旬</small></div></div><div class="turn-status"><span class="live-dot"></span>${ui.savedAt ? '进度已自动保存' : '离线单机 · 本地存档'}<small>${state.armies.filter(a => a.faction === 'cao' && a.route.length).length} 支军团待行军</small></div><button class="end-turn" data-action="next-turn" ${state.finished ? 'disabled' : ''}><span>结束回合<small>军团行动 · 城池收益</small></span>${icon('chevron')}</button></footer></main>`;
}
function battleHeader(b) {
  const stats = b.sides.map(s => ({ hp: s.units.reduce((n,u)=>n+u.hp,0),total:s.units.reduce((n,u)=>n+u.initial,0) }));
  return `<div class="arena-header"><div class="arena-title"><h1>${currentScenario()?.name || (state.campaign?battleRecord(state,state.campaign.focusId)?.name:null) || cityById(state,b.cityId).name+'之战'}</h1><span>${BATTLE_TERRAINS[b.terrain]} · ${b.holdUntil?'坚守 '+b.tick+' / '+b.holdUntil+' 步':b.tick+' 步 / '+(b.maxTicks||240)}</span></div><div class="arena-strength" aria-label="双方剩余兵力">${stats.map((s,i)=>`<span class="side-${i}">${i?(currentScenario()?.enemyName||'敌军'):(currentScenario()?.ownName||'我军')} <b>${fmt(s.hp)}</b><i><em style="width:${s.hp/Math.max(1,s.total)*100}%"></em></i></span>`).join('')}</div><div class="battle-playback"><button class="button secondary" data-action="lobby" aria-label="保存并返回战役首页">战役首页</button><button class="button primary" data-action="pause">${icon(ui.paused?'play':'pause')}${isDeploying(b)?'确认布阵 · 开战':ui.paused?'继续战斗':'暂停'}</button><button class="button secondary" data-action="speed" aria-label="切换战斗速度">${ui.speed}×</button><button class="button secondary" data-action="battle-panel" data-panel="tools" aria-label="战斗工具" aria-expanded="${ui.battlePanel==='tools'}">${icon('gear')}</button></div></div>`;
}

function tacticState(u,s,b) {
  const cd=Math.max(0,(u.skillReady?.[s.id]||0)-b.tick);
  if(cd)return '冷却 '+cd+'步'+(u.intent<s.threshold?' · 战意不足':'');
  return (u.intent||0)<s.threshold ? '战意 '+(u.intent||0)+'/'+s.threshold : '待条件满足';
}
function tacticChips(u,b) {
  return '<div class="tactic-chips">'+unitTactics(u).map(s=>'<span class="tactic-chip '+(s.special?'special':'')+'" title="'+esc(CATEGORY_NAMES[s.category]+'类 · 基础效果：'+s.description+' · '+s.powerDescription+' · 地形：'+s.terrainDescription+' · 门槛 '+s.threshold+' · 冷却 '+s.cooldown+' 步')+'"><strong>'+CATEGORY_NAMES[s.category]+' · '+(s.special?'★ ':'')+s.name+'</strong><em>'+tacticState(u,s,b)+'</em><small>'+esc(tacticPowerPreview(s,statusPower(u,s,b)))+'</small></span>').join('')+'</div>';
}
function unitStatusMarkup(u,b) {
  const statuses=visibleStatuses(b,u),shield=shieldAmount(b,u);
  return (statuses.length?'<span class="unit-status-icons">'+statuses.slice(0,4).map(s=>'<span class="status-badge tone-'+s.tone+'" title="'+esc(s.name+' · '+s.time)+'">'+statusIcon(s.key)+'<small>'+s.remaining+'</small></span>').join('')+(statuses.length>4?'<span class="status-more">+'+(statuses.length-4)+'</span>':'')+'</span>':'')+(shield?'<span class="unit-shield" title="护盾 '+shield+'"><i style="width:'+Math.min(100,shield/u.maxHp*100)+'%"></i></span>':'');
}

function battleUnitMarkup(u, b) {
  const targeted = b.sides[0].focus === u.id && b.sides[0].focusUntil > b.tick;
  const charge = Math.min(100, (u.intent || 0) / COMBAT.intentCap * 100);
  return `<span class="unit-type">${TROOPS[u.type].icon}</span><span class="unit-name">${esc(u.name)}</span><span class="unit-health"><i style="width:${u.hp / u.maxHp * 100}%"></i></span><span class="unit-number">${compact(u.hp)}</span><span class="unit-skill-meter ${charge >= 100 ? 'ready' : ''}" title="战意 ${u.intent || 0} / ${COMBAT.intentCap}"><i style="width:${charge}%"></i></span>${targeted ? '<span class="target-ring"></span>' : ''}${unitStatusMarkup(u,b)}`;
}
function enemyCommandMarkup(b){
  const c=b.enemyCommand,last=c.lastCommand;
  return '<div class="enemy-command-state"><b>敌军军略 '+Math.floor(c.commandProgress/COMMAND_RESOURCE.capacity*100)+'%</b><p>已掌握：'+(battleStratagems(b,1).map(k=>STRATAGEMS[k].name).join(' · ')||'暂无')+'</p><span>'+(last?'最近施放：'+(STRATAGEMS[last.key]?.name||last.key)+' · 第 '+last.tick+' 步':'蓄满后根据战况自动施放')+'</span></div>';
}
function battleSidebar(b) {
  return `<aside class="battle-sidebar">${reinforcementPanel(b)}${enemyCommandMarkup(b)}<p class="terrain-note"><b>${BATTLE_TERRAINS[b.terrain]}</b> · ${TERRAIN_HELP[b.terrain]}</p><div class="section-heading"><h3>战场态势</h3><span class="status-tag">${TACTICS[b.sides[0].tactic]}</span></div><div class="battle-summary"><div><b>${activeUnits(b, 0).length}<small> / 6</small></b><span>我军在场</span></div><div><b>${b.sides[0].units.filter(u => u.status === 'reserve').length}</b><span>预备部队</span></div></div><div class="combo-summary"><span>我军连携 <b>${b.comboCounts?.[0]||0}</b></span><span>敌军连携 <b>${b.comboCounts?.[1]||0}</b></span></div><button class="button secondary full" data-action="unit-stats">部队属性 · 状态详情</button><h4>前线诸将 <small>自动作战</small></h4><div class="frontline-list">${activeUnits(b, 0).map(u => `<div>${avatar(u, true)}<div><b>${u.name}<span>${compact(u.hp)}</span></b><small>${esc(u.action)} · 战法 ${u.skillCasts || 0} 次</small><small>${TERRAIN_NAMES[unitTerrain(b,u)]} · 本场伤兵 ${battleWounded(u)} · 射程 ${attackRange(b,u)}</small><small class="intent-label">战意 <b>${u.intent || 0} / ${COMBAT.intentCap}</b></small>${tacticChips(u,b)}<div class="meter"><i style="width:${u.hp / u.maxHp * 100}%"></i></div></div></div>`).join('')}</div><h4>后备序列</h4><div class="reserve-list">${b.sides[0].units.filter(u => u.status === 'reserve').map(u => `<span>${u.name}<small>${TROOPS[u.type].name} · 战意 ${u.intent || 0}</small></span>`).join('') || '<p class="muted">暂无待命预备队</p>'}</div><h4>战况记录</h4><div class="battle-logs">${b.logs.slice(0, 8).map(l => `<p><time>${String(l.tick).padStart(3, '0')}</time>${esc(l.text)}</p>`).join('')}</div></aside>`;
}
function commands(b) {
  const available=battleStratagems(b),intellect=commandIntellect(b),progress=(b.commandProgress||0)/COMMAND_RESOURCE.capacity;
  const sources=key=>(b.sides[0].commanders||[]).filter(c=>officerStratagems(c.id).includes(key)).map(c=>c.name+'·'+(c.role==='leader'?'主将':'军师')).join(' / ');
  const command = (action, symbol, name, hint, cost) => {
    const cd = Math.max(0,(b.commandReady?.[action] || 0) - b.tick);
    return `<button class="command-button" data-command="${action}" ${(isDeploying(b) || b.result || cost && b.commandProgress < COMMAND_RESOURCE.capacity || cd && action !== 'retreat' || b.sides[0].retreat) ? 'disabled' : ''}>${icon(symbol)}<span><b>${name}</b><small>${hint}</small>${cd ? `<small>冷却 ${cd} 步</small>` : ''}</span><em>${cost ? '满条' : '免费'}</em></button>`;
  };
  const category=ui.commandCategory||'offense';
  const tabs=Object.entries({offense:'进攻',support:'整军',control:'扰敌'}).map(([id,name])=>`<button data-action="command-category" data-category="${id}" class="${category===id?'active':''}" aria-pressed="${category===id}">${name}</button>`).join('');
  const strategies = Object.entries(STRATAGEMS).filter(([key,s])=>available.includes(key)&&s.group===category).map(([key,s])=>command(key,s.icon,s.name,`${sources(key)} · ${s.description}${s.duration ? ` · ${s.duration}步` : ' · 即时'}`,s.cost)).join('');
  const statuses = Object.entries(STRATAGEMS).filter(([,s])=>s.field && b.sides[s.side][s.field] > b.tick).map(([,s])=>`<span class="army-buff ${s.side ? 'debuff' : ''}">${s.description}<b>余 ${Math.max(0,b.sides[s.side][s.field]-b.tick-1)} 步</b></span>`).join('');
  return `<div class="command-heading"><div><span class="eyebrow">君主军略</span><b>${Math.floor(progress*100)}<small>%</small></b></div><p>${isDeploying(b) ? '军略从空条开始，开战后由在场部队智力积累。' : ui.focusMode ? '请点击战场上的敌军，提升其目标权重。' : ui.paused ? '已暂停，满条可施放一次军略；进度与持续时间冻结。' : '可先暂停观察，再下达全军军略。'}</p></div><div class="command-resource"><span>在场总智力 <b>${intellect}</b> · 每步 +${(intellect/COMMAND_RESOURCE.capacity*100).toFixed(1)}%</span><div class="meter" role="progressbar" aria-label="军略积累" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(progress*100)}"><i style="width:${progress*100}%"></i></div><small>${progress>=1?'军略就绪 · 使用一次后清空，未使用保持满条':'蓄势中 · 满条可下达一次军略，暂停不增长'}</small></div>${statuses ? `<div class="army-buffs">${statuses}</div>` : ''}<div class="command-tabs" aria-label="军略分类">${tabs}</div><div class="command-row">${strategies || '<p class="muted">主将与军师未掌握此类军略，可在下次交战前调整任命。</p>'}</div><p class="basic-order-label">基础军令 · 合围与接阵同样消耗满条进度，收兵免费</p><div class="command-row tactical-orders">${command('focus','sword','重兵合围','提高敌军目标权重',1)}${command('reserve','flag','后军接阵','轮换受损前线',1)}${command('retreat','wind','鸣金收兵','向己方边缘脱离',0)}</div>`;
}
function deploymentBoard(b) {
  return Array.from({length:GRID.rows*5},(_,i)=>`<button class="deployment-cell" data-deploy-x="${i%5}" data-deploy-y="${Math.floor(i/5)}" style="${hexCellStyle(i%5,Math.floor(i/5))}" aria-label="布阵第${i%5+1}列第${Math.floor(i/5)+1}行 · ${TERRAIN_NAMES[terrainAt(b,i%5,Math.floor(i/5))]}"></button>`).join('');
}
function hexBoard(b) {
  const h=100*2/Math.sqrt(3),w=HEX_GRID.width*100,height=HEX_GRID.height*h;
  const cells=Array.from({length:112},(_,i)=>{
    const x=i%14,y=Math.floor(i/14),p=hexCenter(x,y),cx=p.x*w,cy=p.y*height;
    const ground=terrainAt(b,x,y);
    return `<polygon class="hex-${ground} ${x<5?'hex-home':x>8?'hex-away':''}" points="${[[0,-.5],[.5,-.25],[.5,.25],[0,.5],[-.5,.25],[-.5,-.25]].map(([dx,dy])=>[cx+dx*100,cy+dy*h].join(',')).join(' ')}"><title>${TERRAIN_NAMES[ground]}</title></polygon>${ground==='land'?'':`<text class="terrain-cell-label" x="${cx}" y="${cy+h*.34}">${TERRAIN_NAMES[ground]}</text>`}`;
  }).join('');
  return `<svg class="hex-grid" viewBox="0 0 ${w} ${height}" aria-hidden="true">${cells}</svg>`;
}
function battle() {
  const b=state.battle;
  return `${state.campaign?campaignBattleBar(state):''}<main class="battle-page arena-page"><div id="battle-header">${battleHeader(b)}</div><div class="arena-stage"><div class="battle-board" id="battle-board" style="--hex-aspect:${HEX_ASPECT}">${hexBoard(b)}<div id="siege-terrain">${siegeTerrain(b)}</div><div id="deployment-grid"></div><div id="battle-units"></div><canvas id="battle-effects" aria-hidden="true"></canvas></div></div><button id="tactic-result" class="tactic-result" data-action="battle-panel" data-panel="events" disabled>战法效果将在此显示</button><div class="arena-context"><span class="terrain-legend">${[...new Set(Array.from({length:112},(_,i)=>terrainAt(b,i%14,Math.floor(i/14))))].map(t=>`<span class="terrain-key terrain-${t}">${TERRAIN_NAMES[t]}</span>`).join('')}</span><span id="pause-note" hidden>已暂停</span><span id="target-note" hidden>选择要合围的敌军 <button data-action="cancel-focus">取消</button></span><span class="arena-legend"><i></i>我军 <i></i>敌军</span><span id="enemy-command-note" class="enemy-command-state"></span><span id="gate-summary"></span></div><div id="deployment-guide" class="deployment-guide"></div><footer class="arena-dock"><button id="command-cue" class="command-cue" data-action="battle-panel" data-panel="commands"><span id="command-cue-label"></span><span class="cue-track" role="progressbar" aria-label="军略进度" aria-valuemin="0" aria-valuemax="100"><i></i></span></button><button class="button secondary" data-action="battle-panel" data-panel="intel">战况</button><button class="button secondary" data-action="battle-panel" data-panel="events">战法记录</button></footer><span id="command-announcement" class="sr-only" role="status" aria-live="polite"></span><section id="arena-panel" class="arena-panel" hidden><header><b id="arena-panel-title"></b><button class="button secondary" data-action="close-battle-panel">收起 ×</button></header><div id="battle-commands"></div><div id="battle-sidebar"></div><section class="battle-events" id="battle-events" aria-label="战斗动态"><div class="battle-events-heading"><span>最新战法在前 · 双方各保留 20 条</span><span>实际结算</span></div><div id="skill-feed" class="skill-feed" role="log" aria-label="战法发动记录" aria-live="off"></div><div id="stratagem-feedback" aria-live="polite"></div></section><div id="battle-tools"><div class="arena-tools"><button class="button secondary" data-action="effects-mode" id="effects-mode"></button><button class="button secondary" data-action="settings">存档与设置</button><button class="button secondary" data-action="help">玩法说明</button></div><div id="scenario-controls">${scenarioControls(b)}</div></div></section></main>`;
}
function updateArena(b) {
  const enemy=b.enemyCommand,last=enemy.lastCommand;
  $('#enemy-command-note').textContent='敌军军略 '+Math.floor(enemy.commandProgress/COMMAND_RESOURCE.capacity*100)+'%'+(last?' · '+(STRATAGEMS[last.key]?.name||last.key)+'（'+last.tick+'步）':'');

  const panel=ui.battlePanel||null;
  $('#arena-panel').hidden=!panel;
  $('#arena-panel-title').textContent=({commands:'君主军略',intel:'战场态势',events:'战法记录',tools:'战斗工具'})[panel]||'';
  for(const [name,id] of Object.entries({commands:'battle-commands',intel:'battle-sidebar',events:'battle-events',tools:'battle-tools'})) $('#'+id).hidden=panel!==name;
  document.querySelectorAll('[data-action="battle-panel"]').forEach(el=>el.setAttribute('aria-expanded',String(el.dataset.panel===panel)));
  const progress=Math.min(100,Math.floor((b.commandProgress||0)/COMMAND_RESOURCE.capacity*100));
  const ready=progress===100&&!isDeploying(b)&&!b.result&&!b.sides[0].retreat;
  $('#command-cue').classList.toggle('ready',ready);
  $('#command-cue-label').textContent=ready?'军略已就绪 · 点击施放':isDeploying(b)?'军略 · 开战后积累':b.sides[0].retreat?'正在撤退':'军略蓄势 '+progress+'%';
  $('#command-cue .cue-track').setAttribute('aria-valuenow',progress);
  $('#command-cue .cue-track i').style.width=progress+'%';
  if(commandCue.update(b,ready)) $('#command-announcement').textContent='军略条已满，可以施放军略。';
  else if(!ready) $('#command-announcement').textContent='';
  $('#target-note').hidden=!ui.focusMode;
  const g=b.siege?.gate;
  $('#gate-summary').textContent=g?`${g.side?'敌方':'我方'}城门 ${fmt(g.hp)} / ${fmt(g.maxHp)}`:'';
}

function updateBattle() {
  if (!state.battle || !$('#battle-units')) return;
  const b = state.battle;
  if(state.campaign&&$('#campaign-battle-bar'))$('#campaign-battle-bar').outerHTML=campaignBattleBar(state);
  $('#battle-header').innerHTML = battleHeader(b);
  $('#battle-board').classList.toggle('clear-effects',ui.effectMode==='clear');
  $('#battle-board').style.setProperty('--battle-move-ms', Math.round(220/ui.speed)+'ms');
  $('#effects-mode').textContent = ui.effectMode==='clear' ? '特效：清晰' : '特效：完整';
  $('#effects-mode').setAttribute('aria-label','切换特效，当前'+(ui.effectMode==='clear'?'清晰模式':'完整模式'));
  $('#scenario-controls').innerHTML = scenarioControls(b);
  $('#siege-terrain').innerHTML = siegeTerrain(b);
  $('#battle-sidebar').innerHTML = battleSidebar(b);
  $('#battle-commands').innerHTML = commands(b);
  updateArena(b);
  const deploying = isDeploying(b);
  $('#pause-note').hidden = !ui.paused || deploying;
  $('#battle-board').classList.toggle('deployment-on',deploying);
  $('#deployment-grid').hidden = !deploying;
  $('#deployment-guide').hidden = !deploying;
  if (deploying) {
    if (!$('#deployment-grid').children.length) $('#deployment-grid').innerHTML = deploymentBoard(b);
    const chosen = activeUnits(b,0).find(u=>u.id === ui.deploymentSelection);
    $('#deployment-guide').innerHTML = `<b>${chosen ? `已选 ${chosen.name}` : '开战前布阵'}</b><span>${TERRAIN_HELP[b.terrain]} 点击我军，再点左侧格子布阵。</span><div class="deployment-actions"><label>地形 <select id="battle-terrain" aria-label="战场地形" ${currentScenario()?.campaign||state.campaign?'disabled':''}>${Object.entries(BATTLE_TERRAINS).map(([id,name])=>`<option value="${id}" ${b.terrain===id?'selected':''} ${id!=='river'&&b.sides.some(s=>s.units.some(u=>u.type==='ship'))?'disabled':''}>${name}</option>`).join('')}</select></label><button data-action="loadout">配置默认战法</button><button data-action="reset-deployment">重置阵型</button></div>`;
  }
  $('#battle-board').classList.toggle('select-target', ui.focusMode);
  const live = b.sides.flatMap(s => s.units).filter(u => u.status === 'active');
  for (const existing of [...$('#battle-units').children]) if (!live.some(u => u.id === existing.dataset.unit)) existing.remove();
  for (const u of live) {
    let el = [...$('#battle-units').children].find(e => e.dataset.unit === u.id);
    if (!el) { el = document.createElement('button'); el.dataset.unit = u.id; $('#battle-units').append(el); }
    el.className = `battle-unit side-${u.side} ${u.type}${hasStatus(b,u,'illusion')?' has-illusion':''}${deploying && ui.deploymentSelection === u.id ? ' deploy-selected' : ''}`;
    el.classList.toggle('buff-attack',b.sides[u.side].assaultUntil > b.tick);
    el.classList.toggle('buff-defense',b.sides[u.side].fortifyUntil > b.tick);
    el.classList.toggle('debuffed',b.sides[u.side].disruptUntil > b.tick);
    for(const key of ['scorch','confuse','seal','ward','stun','phalanx','shield','burn','haste','valor'])el.classList.toggle(`status-${key}`,hasStatus(b,u,key));
    el.draggable = deploying && u.side === 0;
    el.style.cssText = hexCellStyle(u.x,u.y);
    el.innerHTML = battleUnitMarkup(u, b); el.title = `${u.name} · ${TROOPS[u.type].name} · ${TERRAIN_NAMES[unitTerrain(b,u)]} · ${u.action} · 右键查看状态 · 战意 ${u.intent || 0}/${COMBAT.intentCap} · ${unitTactics(u).map(s=>`${s.name}：${tacticState(u,s,b)}`).join('；')}`;
    el.setAttribute('aria-label', `${u.side ? '敌军' : '我军'}${u.name}，兵力${u.hp}${visibleStatuses(b,u).map(s=>'，'+s.name+' '+s.time).join('')}，右键查看状态`);
  }
  if (!battleFx) battleFx = new BattleEffects($('#battle-effects'), $('#skill-feed'), $('#tactic-result'));
  battleFx.update(b, { paused: ui.paused || !!ui.modal, speed: ui.speed, mode: ui.effectMode });
  const feedback = $('#stratagem-feedback');
  const enemy=state.battle.enemyCommand.lastCommand;
  if(enemy&&STRATAGEMS[enemy.key]&&b.tick-enemy.tick<=2){
    const s=STRATAGEMS[enemy.key];
    feedback.dataset.enemy='true';
    clearTimeout(ui.commandFeedbackTimer);
    feedback.innerHTML='<div class="stratagem-banner enemy"><span>敌军军略</span><b>'+s.name+'</b><strong>'+s.description.replaceAll('我军','敌方部队').replaceAll('敌军','我方部队')+'</strong></div>';
    return;
  }
  if(feedback.dataset.enemy){feedback.innerHTML='';delete feedback.dataset.enemy;}
  if (b.lastCommand && b.tick-b.lastCommand.tick <= 1 && feedback.dataset.serial !== String(b.commandSerial)) {
    feedback.dataset.serial = String(b.commandSerial);
    const s = STRATAGEMS[b.lastCommand.key];
    if (s) {
      feedback.innerHTML = `<div class="stratagem-banner ${s.side ? 'enemy' : ''}"><span>军略生效</span><b>${s.name}</b><strong>${s.description}</strong><small>${s.duration ? `持续 ${s.duration} 步 · 暂停不计时` : '立即生效 · 军略进度已清空'}</small></div>`;
      clearTimeout(ui.commandFeedbackTimer); ui.commandFeedbackTimer = setTimeout(()=>{ feedback.innerHTML=''; },3500);
    }
  }
}
function render() {
  battleFx?.destroy(); battleFx = null;
  const lobby=ui.mode==='lobby'||(!state.battle&&!!state.testScenario);
  document.body.classList.toggle('battle-view',!!state.battle&&!lobby);
  $('#app').innerHTML = lobby ? campaignLobby(ui.historySelection,historicalResume()) : state.battle ? battle() : state.campaign ? strategicView(state,ui) : `${header()}<div class="app-body">${rail()}${campaign()}</div>`;
  if (state.battle&&!lobby) updateBattle();
  renderModal();
}
function modalShell(title, subtitle, body, footer = '', wide = false) {
  return `<div class="modal-backdrop"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><div><div class="eyebrow">${subtitle}</div><h2 id="modal-title">${title}</h2></div><button class="close-button" data-action="close" aria-label="关闭弹窗">×</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}</section></div>`;
}
function loadoutUnits() {
  return state.battle ? state.battle.sides[0].units : state.armies.filter(a=>a.faction==='cao'&&(!state.campaign||canEditArmy(state,a))).flatMap(a=>a.units);
}
function inspectContext(unit) {
  if (state.battle) return { unit, battle:state.battle, stats:unitAttributes(unit,state.battle) };
  const army=state.armies.find(a=>a.units.some(u=>u.id===unit.id));
  const role=key=>army?.units.find(u=>u.id===army[key]);
  const preview={...unit,hp:unit.troops,maxHp:Math.max(1,unit.troops),side:0,commandBonus:(role('leader')?.leadership||60)/1000,deputyBonus:(role('deputy')?.force||0)/2000,advisorBonus:(role('advisor')?.intellect||0)/1000};
  const battle={tick:0,sides:[{tactic:army?.tactic}]};
  return {unit:preview,battle,stats:unitAttributes(preview,battle)};
}
function growthLabel(u) {
  return `等级 ${officerLevel(u)} / 10 · ${officerLevel(u)===10?'已满级':`经验 ${u.experience||0} / ${experienceNeeded(officerLevel(u))}`}`;
}
function passiveMarkup(u,b=null) {
  if(!passiveList(u,b).length)return '<section class="passive-panel"><h3>武将技能</h3><p class="muted">技能待设计，成长路线暂空。参战仍可配置兵种通用战法。</p></section>';
  return `<section class="passive-panel"><div class="section-heading"><h3>武将成长 · 被动技能</h3><span>${growthLabel(u)}</span></div><p class="muted">2、3、5、8、10 级各习得一个；自动生效，不占战法槽。实际交战获得 100 经验，获胜额外 50，战后升级。</p><ol class="passive-route">${passiveList(u,b).map(s=>`<li class="${s.unlocked?'unlocked':'locked'} ${s.tier==='专属'?'exclusive':''}"><span class="passive-level">${s.level} 级 · ${s.tier}</span><b>${s.name}</b><p>${s.description}</p><small>${s.state}</small></li>`).join('')}</ol></section>`;
}

function statusDetail(s){
  const v=s.state;
  return (v.stacks!==undefined?' · '+v.stacks+' / 3 层':'')+(v.hits!==undefined?' · 余 '+v.hits+' 次':'')+(v.percent!==undefined?' · '+v.percent+'%':'')+(v.amount!==undefined?' · '+(s.key==='shield'?'余量 ':'基础每步 ')+fmt(v.amount):'');
}
const ARMY_STATUS_NAMES={assaultUntil:'击鼓催锋 · 攻击 +25%',fortifyUntil:'坚壁列阵 · 防御 +30%',disruptUntil:'离间疲敌 · 攻防 −20%',hasteUntil:'疾行赴援 · 移速 +1',rangeUntil:'引弦远射 · 弓弩射程 +2',recoveryUntil:'休养生息',blockadeUntil:'烽火断援 · 暂缓增援',reliefUntil:'后军固阵 · 入场护盾'};
function unitStatusModal(){
  const b=state.battle;if(!b)return '';
  const units=b.sides.flatMap(s=>s.units),u=units.find(u=>u.id===ui.inspectUnit)||units[0];
  const statuses=visibleStatuses(b,u),layers=shieldLayers(b,u),side=b.sides[u.side];
  const cards=statuses.filter(s=>s.key!=='shield').map(s=>`<article class="status-detail tone-${s.tone}">${statusIcon(s.key)}<b>${s.name}</b><small>${s.time}</small><p>${s.description}${statusDetail(s)}</p></article>`).join('');
  const army=Object.entries(ARMY_STATUS_NAMES).filter(([key])=>side[key]>b.tick).map(([key,name])=>`<article class="status-detail tone-buff">${statusIcon('ward')}<b>${name}</b><small>${statusTimeLabel(side[key],b.tick)}</small></article>`).join('');
  return modalShell(`${u.name} · 当前状态`,'UNIT STATUS · 战场已暂停',`<div class="loadout-toolbar"><label>查看部队<select id="inspect-unit">${units.map(a=>`<option value="${a.id}" ${a.id===u.id?'selected':''}>${a.side?'敌军':'我军'} · ${a.name}</option>`).join('')}</select></label><span>${TROOPS[u.type].name} · ${u.status==='active'?TERRAIN_NAMES[unitTerrain(b,u)]:'不在场'} · 兵力 ${fmt(u.hp)} / ${fmt(u.maxHp)}</span></div><p class="muted">剩余时间按战斗模拟计算：1 步 = 0.7 秒（1×）；暂停及战法演出不计时。“本步结束”表示下一步开始时到期。</p><div class="status-cards">${cards||'<p class="muted">暂无个人增益或减益</p>'}</div><h3>护盾分层</h3><div class="status-cards">${layers.map(l=>`<article class="status-detail tone-buff">${statusIcon('shield')}<b>${esc(l.label)} · ${fmt(l.amount)}</b><small>${statusTimeLabel(l.until,b.tick)}</small></article>`).join('')||'<p class="muted">暂无护盾</p>'}</div><h3>军团状态</h3><div class="status-cards">${army||'<p class="muted">暂无军团状态</p>'}</div><h3>已配战法</h3>${tacticChips(u,b)}`,`<button class="button secondary" data-action="unit-stats" data-inspect="${u.id}">完整部队属性</button><button class="button primary" data-action="close">返回战场</button>`);
}
function unitStatsModal() {
  const units=state.battle?state.battle.sides.flatMap(s=>s.units):state.armies.filter(a=>a.faction==='cao').flatMap(a=>a.units);
  const chosen=units.find(u=>u.id===ui.inspectUnit)||units[0];if(!chosen)return modalShell('部队属性','暂无部队','');
  ui.inspectUnit=chosen.id;
  const {unit:u,battle:b,stats}=inspectContext(chosen),inBattle=!!state.battle;
  const precise=n=>Number(n.toFixed(2)).toLocaleString('zh-CN');
  const mitigation=kind=>precise((1-(kind==='dot'?1:1-stats.damageReduction)*passiveDamageTaken(inBattle?b:null,u,kind))*100);
  const suffix=key=>({move:'格 / 步',range:'格',attackSpeed:'次 / 秒'}[key]||'');
  const notes={attack:'当前士兵合计的普通攻击威力；减员时降低',defense:'抵御普攻与武力战法',move:'常规移动；不足 1 格时逐步累计',range:'普攻与兵器战法射程；计策另有施法范围',siege:'当前士兵合计的额外攻城威力',attackSpeed:'仅影响普攻，不缩短战法冷却',discipline:'抵御智力伤害，缩短混乱与封技',martialPower:'当前士兵合计的武力战法威力；减员时降低',strategyPower:'当前士兵合计的谋略威力；影响伤害与辅助效果'};
  const cards=Object.entries(ATTRIBUTE_LABELS).map(([key,name])=>{
    const d=stats.breakdown[key],baseLabel=['attack','martialPower','strategyPower','siege'].includes(key)?'现役兵员基础贡献':'兵种基础';
    return `<details class="attribute-card"><summary><span>${name}</span><b>${precise(d.value)} <small>${suffix(key)}</small></b></summary><p>${notes[key]}</p><dl><div><dt>${baseLabel}</dt><dd>${precise(d.base)}</dd></div><div><dt>${d.source}</dt><dd>+${precise(d.officer)}</dd></div>${d.modifiers.map(m=>`<div><dt>${m.label}</dt><dd>${m.add!==undefined?'+'+precise(m.add):'×'+Number(m.factor.toFixed(4))}</dd></div>`).join('')}</dl></details>`;
  }).join('');
  const layers=inBattle?shieldLayers(b,u):[];
  const states=[['士兵数',fmt(inBattle?u.hp:u.troops)],['带兵上限',fmt(troopCapacity(u))],...(inBattle?[['本场初始兵力',fmt(u.initial)]]:[]),['战意',`${u.intent||0} / ${COMBAT.intentCap}`],['普攻战意',`+${intentIncome(u).attack}`],['受击战意',`+${intentIncome(u).hit}`],['护盾',fmt(layers.reduce((n,l)=>n+l.amount,0))],['伤兵数',fmt(inBattle?battleWounded(u):u.wounded)]];
  if(inBattle&&u.status==='active')states.push(['所在格',TERRAIN_NAMES[unitTerrain(b,u)]]);
  const remaining=until=>statusTimeLabel(until,b.tick);
  const statuses=inBattle?visibleStatuses(b,u).filter(s=>s.key!=='shield').map(s=>'<span class="status-detail tone-'+s.tone+'">'+statusIcon(s.key)+'<b>'+s.name+'</b><small>'+s.time+'</small><em>'+s.description+statusDetail(s)+'</em></span>'):[];
  const side=b.sides[u.side]||{};
  for(const [key,name] of Object.entries(ARMY_STATUS_NAMES))if(side[key]>b.tick)statuses.push(`<span>${name}<small>${remaining(side[key])}</small></span>`);
  return modalShell(`${u.name} · 部队属性`,'UNIT ATTRIBUTES · '+(inBattle?'战场实时数值 · 已暂停':'军团出战预览'),`<div class="loadout-toolbar"><label>选择部队<select id="inspect-unit">${units.map(a=>`<option value="${a.id}" ${a.id===u.id?'selected':''}>${inBattle?(a.side?'敌军 · ':'我军 · '):''}${a.name} · ${TROOPS[a.type].name}</option>`).join('')}</select></label><span>${TROOPS[u.type].name} · 点击属性展开来源</span></div><div class="officer-four">${[['统率',u.leadership],['武力',u.force],['智力',u.intellect],['政治',u.politics]].map(([name,value])=>`<div><span>${name}</span><b>${value}</b></div>`).join('')}</div><div class="unit-state-grid">${states.map(([name,value])=>`<div><span>${name}</span><b>${value}</b></div>`).join('')}</div><p class="muted">${inBattle?'带兵上限由统率与等级决定；治疗最多恢复本场初始兵力，且只救治已有伤兵。':'现役与伤兵共同占用带兵名额；征兵按各将带兵上限补充。'}战意达标自动施法，施放不扣战意。普攻／受击收益已含成长技能；敌方截气／断势可阻止对应受击收益。</p><details class="profile-disclosure"><summary>人物资料与关系</summary>${officerProfileMarkup(u,state.battle?.relationshipScores||state.relationshipScores,state.battle?.relationshipTypes||state.relationshipTypes)}</details>${passiveMarkup(u,inBattle?b:null)}<div class="attribute-grid">${cards}</div><div class="info-strip">攻击、武技威力、谋略威力和攻城已计入当前士兵数，伤害直接使用面板数值。<br>智力控制时长减免 ${precise(stats.controlResistance*100)}% · 额外减伤（含被动）：普攻 ${mitigation("basic")}% / 武技 ${mitigation("force")}% / 谋略 ${mitigation("intellect")}% / 持续 ${mitigation("dot")}%<br>普攻间隔 ${precise(stats.attackInterval)} 步（${precise(stats.attackInterval*.7)} 秒）；战法即时施放、独立冷却。</div><h3 class="stats-section-title">增益与减益</h3><div class="unit-status-list">${statuses.join('')||'<p class="muted">暂无临时状态</p>'}</div><h3 class="stats-section-title">护盾分层</h3><div class="unit-status-list">${layers.map(l=>`<span>${esc(l.label)} · ${fmt(l.amount)}<small>${remaining(l.until)}</small></span>`).join('')||'<p class="muted">暂无护盾</p>'}</div><p class="muted">不同来源护盾独立到期；同一来源刷新，先消耗最早到期的一层。护盾总量不超过兵力上限。</p>`,`<button class="button primary" data-action="close">返回${inBattle?'战场':'地图'}</button>`,true);
}
function loadoutModal() {
  const units=loadoutUnits();if(!units.length)return modalShell('战法配置','暂无可配置部队','');
  const u=units.find(u=>u.id===ui.loadoutUnit)||units[0];ui.loadoutUnit=u.id;
  const locked=!!state.battle&&!isDeploying(state.battle),skills=unitTactics(u),pool=availableTactics(u);
  const options=units.map(a=>'<option value="'+a.id+'" '+(a.id===u.id?'selected':'')+'>'+a.name+' · '+TROOPS[a.type].name+(a.status==='reserve'||!a.first?' · 预备':'')+'</option>').join('');

  const roles=TACTIC_ROLES[u.type];
  const selected=new Set(skills.map(s=>s.id)),omitted=pool.filter(s=>!s.special&&!selected.has(s.id));
  const presets=roles.map(r=>`<article class="loadout-card loadout-role-card"><b>${r.name}</b><p>${r.position}</p><small>${r.cost}</small><button class="button secondary" data-action="tactic-preset" data-preset="${r.id}" ${locked?'disabled':''}>采用此定位</button></article>`).join('');
  const cards=skills.map((skill,i)=>`<article class="loadout-card"><header><b>优先级 ${i+1}</b><span class="type-badge ${skill.category}">${skill.special?'★ 专用':skill.role}</span>${i?'<button class="button secondary" data-action="tactic-up" data-slot="'+i+'" '+(locked?'disabled':'')+'>上移</button>':''}</header><label>战法 ${i+1}<select data-tactic-slot="${i}" aria-label="战法槽${i+1}" ${locked?'disabled':''}>${pool.map(s=>'<option value="'+s.id+'" '+(skill.id===s.id?'selected':'')+' '+(skills.some((other,j)=>j!==i&&other.id===s.id)?'disabled':'')+'>'+(s.special?'★ 专用':s.role)+' · '+s.name+'</option>').join('')}</select></label><p>基础效果：${skill.description}</p><p class="power-preview">${esc(tacticPowerPreview(skill,statusPower(u,skill,state.battle)))}</p><details class="power-rules"><summary>威力成长、成功率与暴击规则</summary><p>${esc(skill.powerDescription)}</p></details><p class="terrain-note">地形：${skill.terrainDescription}</p>${skill.tradeoff?'<p class="muted">取舍：'+skill.tradeoff+'</p>':''}<footer>战意 ≥ ${skill.threshold} · 冷却 ${skill.cooldown} 步 · ${CATEGORY_NAMES[skill.category]}类</footer></article>`).join('');
  const lost=omitted.map(s=>`<li><b>${s.role} · ${s.name}</b>：基础效果 ${s.description}<small class="power-preview">${esc(tacticPowerPreview(s,statusPower(u,s,state.battle)))}</small><small class="terrain-note">地形：${s.terrainDescription}</small></li>`).join('');
  return modalShell('部队战法与定位','TACTIC LOADOUT · 六选三 · 20 种基础组合',`
    <div class="loadout-toolbar"><label>选择部队<select id="loadout-unit">${options}</select></label><span>武力 ${u.force} · 智力 ${u.intellect} · ${TROOPS[u.type].name}</span></div>
    <div class="info-strip">${locked?'交战已经开始，配置锁定。暂停仍可查看效果。':'每队选择 3 个不同战法，修改即保存，下场沿用。按优先级 1 → 3 检查，条件不满足则检查下一项。'}</div>
    <h3>按阵容选择定位</h3><div class="loadout-grid">${presets}</div>
    <p class="muted">所有武将均可采用本兵种的三种起点，再逐槽自由调整。枪兵守线，戟兵反击与诅咒；骑兵突击；弓弩远攻；后勤救治、净化与开路；兵器压阵攻城；舰船水上突击与护航。换兵种保留武将成长，属性与被动决定擅长程度。定位方案使用基础战法；专用战法可手动替换，占用同样一个槽位。</p>
    <h3>保留的能力</h3><div class="loadout-grid">${cards}</div>
    <details class="profile-disclosure" open><summary>未携带的基础能力 · ${omitted.length} 项</summary><ul>${lost}</ul></details>
    <p class="muted">六个基础战法任选三个，共 20 种组合；优先级可另行调整。武技威力或谋略威力决定效果强度，部分控制需要成功判定，部分直接攻击可以暴击。基础效果中的固定数值以威力 280 为参照，实际结果见战法记录。战意共享、施放不扣除，每项独立冷却，每步只施放一个战法。</p>
  `,'<button class="button primary" data-action="close">完成配置</button>',true);
}
function armyModal() {
  const army = selectedArmy(); if (!army) return '';
  const locked = !!state.battle || !!state.campaign&&!canEditArmy(state,army);
  const opts = Object.entries(TACTICS).map(([id, name]) => `<option value="${id}" ${army.tactic === id ? 'selected' : ''}>${name}</option>`).join('');
  const leaders = role => army.units.map(u => `<option value="${u.id}" ${army[role] === u.id ? 'selected' : ''}>${u.name}</option>`).join('');
  return modalShell('整军经武', 'LEGION MANAGEMENT · 军团编制', `<div class="roster-overview"><div><b>${esc(army.name)}</b><span>${cityById(state, army.location).name} · ${fmt(armyTroops(army))} 人</span></div><div class="roster-controls"><label>主将<select data-role="leader" ${locked ? 'disabled' : ''}>${leaders('leader')}</select></label><label>副将<select data-role="deputy" ${locked ? 'disabled' : ''}>${leaders('deputy')}</select></label><label>军师<select data-role="advisor" ${locked ? 'disabled' : ''}>${leaders('advisor')}</select></label><label>全军策略<select id="tactic-select" ${locked ? 'disabled' : ''}>${opts}</select></label></div></div><div class="info-strip">${icon('help')}${locked ? '战斗期间编制锁定。' : '军团最多 10 支部队，首发最多 6 名；不足时由预备队补齐。枪戟克骑、骑克弓弩、弓弩克枪、兵器克戟。有舰船参战时使用双水道战场，舰船不能登陆。'}主将提升攻防，副将提升武技威力，军师提升谋略威力。战法后数字为战意门槛，★ 为专用战法。</div><section class="commander-repertoire"><h3>军团军略 · ${armyStratagems(army).length} 种</h3><p class="muted">仅主将和军师提供军略，重复只计一次。副将及普通武将不解锁军略。开战从空条开始，在场总智力每累计 12000 蓄满一条，使用后清空，不储存次数。</p>${armyCommanders(army).map(c=>`<div><b>${c.role==='leader'?'主将':'军师'} · ${c.name}</b><div class="repertoire-skills">${officerStratagems(c.id).map(key=>`<span title="${esc(STRATAGEMS[key].description)}">${STRATAGEMS[key].name}<small>满条施放 · ${STRATAGEMS[key].description}</small></span>`).join('') || '暂无军略'}</div></div>`).join('')}</section><div class="roster-table"><div class="roster-table-head"><span>首发 / 武将</span><span>统 · 武 · 智 · 政</span><span>所率兵种</span><span>战场位置</span><span>兵力 / 伤兵</span></div>${army.units.map(u => `<div class="roster-row"><div><input type="checkbox" data-first="${u.id}" aria-label="${u.name}首发" ${u.first ? 'checked' : ''} ${locked ? 'disabled' : ''}>${avatar(u, true)}<div><button class="unit-inspect-link" data-action="unit-stats" data-inspect="${u.id}">${u.name} · ${officerLevel(u)} 级 ↗</button><small title="${esc(unitTactics(u).map(s=>`${s.name}：${s.description}；门槛 ${s.threshold}；冷却 ${s.cooldown} 步`).join(' / '))}">${unitTactics(u).map(s=>`${s.special ? '★' : ''}${s.name} ${s.threshold}`).join(' · ')}</small></div></div><div class="stat-trio"><span>${u.leadership}</span><span>${u.force}</span><span>${u.intellect}</span><span>${u.politics}</span></div><select data-type="${u.id}" aria-label="${u.name}兵种" ${locked ? 'disabled' : ''}>${Object.entries(TROOPS).map(([key, t]) => `<option value="${key}" ${u.type === key ? 'selected' : ''}>${t.name}</option>`).join('')}</select><select data-formation="${u.id}" aria-label="${u.name}位置" ${locked ? 'disabled' : ''}>${Object.entries({ front: '前排', middle: '中排', back: '后排', left: '左翼', right: '右翼' }).map(([key, name]) => `<option value="${key}" ${u.formation === key ? 'selected' : ''}>${name}</option>`).join('')}</select><div class="troop-count"><b>${fmt(u.troops)}<small> / ${fmt(troopCapacity(u))}</small></b><small>伤兵 ${fmt(u.wounded)}</small></div></div>`).join('')}</div><div class="tactic-notes"><p><b>激进</b>攻击 +18%，防御 −9%</p><p><b>稳健</b>攻守均衡，优先就近接敌</p><p><b>防守</b>防御 +15%，攻击 −8%</p></div>`, `<button class="button secondary" data-action="loadout">配置默认战法</button><button class="button secondary" data-action="split" ${locked || state.pending ? 'disabled' : ''}>拆分 / 新建军团</button><button class="button secondary" data-action="merge" ${locked || state.pending ? 'disabled' : ''}>合并同城军团</button><button class="button primary" data-action="close">完成编制</button>`, true);
}
function renderModal() {
  let html = '';
  if(state.campaign&&ui.mode!=='lobby'&&state.battle?.deploymentLocked&&activeBattles(state).some(r=>r.awaiting)&&!ui.modal)ui.modal='campaign-encounters';
  if (ui.mode!=='lobby' && state.report && ui.modal !== 'scenarios') ui.modal = 'report';
  else if (ui.mode!=='lobby' && state.pending && !ui.modal) ui.modal = 'encounter';
  if (ui.modal === 'gate' && state.battle?.siege) {
    const g=state.battle.siege.gate;
    html=modalShell('城门', 'SIEGE · 守方目标', `<p class="modal-intro">耐久 ${fmt(g.hp)} / ${fmt(g.maxHp)}。耐久归零，守方立即败北。</p><div class="info-strip">独立占据守方半场一格，不占六队出场名额；不移动、不攻击。攻方普通攻击可削减耐久，可用重兵合围提高攻击倾向。城门不承受部队战法，也不计入士兵伤亡。</div>`);
  }
  if (ui.modal === 'scenarios') html = scenarioModal();
  if (ui.modal === 'army') html = armyModal();
  if (ui.modal === 'loadout') html = loadoutModal();
  if (ui.modal === 'unit-stats') html = unitStatsModal();
  if (ui.modal === 'unit-status') html = unitStatusModal();
  if (ui.modal === 'owned-officers') html = modalShell('麾下群英', 'OFFICERS · 武将名录', `<div class="officer-grid">${state.armies.filter(a => a.faction === 'cao').flatMap(a => a.units.map(u => `<article class="officer-card">${avatar(u)}<div><h3>${u.name}<small>字 ${u.courtesy}</small></h3><span class="trait">${u.trait}</span><small class="officer-growth">${growthLabel(u)}</small></div><p>${unitTactics(u).map(s=>s.name).join(' · ')}<span>${TROOPS[u.type].name}</span></p><div class="officer-stats">${[['统率', u.leadership], ['武力', u.force], ['智力', u.intellect], ['政治', u.politics]].map(([n, v]) => `<div><b>${v}</b><small>${n}</small></div>`).join('')}</div><button class="button secondary full" data-action="unit-stats" data-inspect="${u.id}">查看五技能成长路线</button><p class="officer-strategies">拥有军略：${officerStratagems(u.id).map(key=>STRATAGEMS[key].name).join(' · ') || '无'}<small>任主将或军师时解锁</small></p><footer>${esc(a.name)} · ${cityById(state, a.location).name}<span>忠诚 ${u.loyalty}</span></footer></article>`)).join('')}</div><p class="muted">实际交战后获得经验，战后自动升级至最高 10 级；专属技能或高级通用技能在 10 级解锁。人物关系决定连携概率；可在武将名录中查看与调整。招募留待后续版本。</p>`, '', true);
  if(ui.modal==='officers')html=modalShell('武将名录','OFFICERS · 835 人',rosterMarkup({query:ui.catalogQuery,sort:ui.catalogSort,kind:ui.catalogKind,page:ui.catalogPage,selected:ui.catalogSelected}),'<button class="button secondary" data-action="owned-officers">查看麾下武将</button>',true);
  if(ui.modal==='catalog-detail'){
    const u=OFFICER_BY_ID[ui.catalogInspect];
    html=modalShell(u?.name||'武将资料','OFFICER · 人物档案',officerDetailMarkup(ui.catalogInspect,state.relationshipScores,state.relationshipTypes)+relationshipEditorMarkup(ui.catalogInspect,ui.relationshipPartner,state.relationshipScores,!!(state.battle&&!state.battle.result&&(state.battle.deploymentLocked||state.battle.tick>0)),state.relationshipTypes)+(u?passiveMarkup({...makeOfficer(u.id),level:1}):''),'<button class="button secondary" data-action="officers">返回武将名录</button>',true);
  }
  if (ui.modal === 'journal') html = modalShell('天下纪事', 'CHRONICLE · 军国大事', `<div class="journal">${state.logs.map(l => `<div class="${l.type}"><span>第 ${l.turn} 旬</span><p>${esc(l.text)}</p></div>`).join('')}</div>`);
  if (ui.modal === 'settings') html = modalShell('案牍与存档', `ARCHIVES · ${currentScenario()?.name||'战略原型'}`, `<p class="modal-intro">进度自动保存在当前浏览器。可导出文件留存，或在另一台电脑导入继续。</p><div class="settings-actions"><button data-action="save">${icon('save')}立即保存<span>保存当前进度</span></button><button data-action="load">${icon('scroll')}读取存档<span>恢复上一次保存</span></button><button data-action="export">${icon('flag')}导出存档<span>下载 JSON 文件</span></button><button data-action="import">${icon('home')}导入存档<span>选择 JSON 文件</span></button></div><div class="settings-divider"></div><div class="reset-row"><div><b>重新开始</b><p>${state.testScenario?'恢复本役预设布阵与兵力。':'回到建安五年，重新逐鹿中原。'}</p></div><button class="button danger" data-action="${state.testScenario?'retry-scenario':'reset-confirm'}">${state.testScenario?'重开本役':'新开一局'}</button></div><input type="file" id="import-file" accept=".json,application/json" hidden>`);
  if (ui.modal === 'reset') html = modalShell('再起风云', 'NEW CAMPAIGN', '<p class="modal-intro">新开一局会替换当前浏览器中的进度。如需保留，请先在设置中导出存档。</p>', '<button class="button secondary" data-action="settings">返回存档</button><button class="button primary" data-action="reset">确认新开一局</button>');
  if (ui.modal === 'help') html = modalShell('君主之道', 'FIELD GUIDE · 玩法指引', `<div class="guide-intro"><span class="brand-seal">令</span><p>你决定战争的方向。<br><b>诸将为你执行每一步。</b></p></div><ol class="guide-steps"><li><b>整军</b><p>在军团中调整首发、兵种、阵型与策略，并配置每队 3 个默认战法。每个兵种有武力、智力各 3 个通用战法，可自由混配；少数武将的专用战法也占一个槽。修改即保存，下场沿用，开战后锁定。</p></li><li><b>出征</b><p>点击地图城池，选择出征或移驻。结束回合后沿一段道路行军，并获得城池收益。</p></li><li><b>临阵</b><p>进入战场后，点击部队与绿色格子布阵，再确认开战。枪骑控制相邻六格（ZOC），近战进入后必须与拦截者接战。眩晕或混乱会暂时解除该队 ZOC，诱敌可以改变控制区位置；冲阵会优先沿真实缺口突击弓弩，骑兵突入后会追击后排 8 步。挑衅可吸引 5 格内一队敌军 4 步，迫使其攻击或合法接近施法者；坚定与净化可反制。重叠控制区必须逐一解除，不能穿越仍有效的 ZOC 或被占用的格子。弓弩、谋略和范围伤害仍可威胁后排。战意收益随兵种不同，完整部队属性显示含成长技能的普攻与受击收益；截气阻止自身普攻给敌军送战意，断势阻止自身伤害战法给敌军送战意；伤害战法不为施法者回充，同一次多段战法对同一目标只计一次受击战意；每队三个战法按槽位优先级检查，共享战意；达到门槛、有合法目标且自身冷却结束就自动施放，施放不扣战意。点击战场下方效果摘要或战法记录可暂停查看实际结算。同阵营不同部队在 3 步内对同一目标完成战法，按相邻施法武将的关系值百分比判定二连携 / 三连携，后续战法伤害、护盾、战意等数值增强 25% / 40%，控制与状态延长 1 步；同一部队多段攻击不重复计数，普攻、军略、自身增益不触发。部分战法和军略可以降低敌军战意，但不打断已开始施法。军略从空条积累：在场部队总智力每累计 12000 蓄满一条，施放后清空，不用就保持满条，暂停不增长；仅解锁主将与军师拥有的军略。治疗只恢复本场伤兵，不复活溃败部队或阵亡士兵。暂停可在进攻、整军、扰敌三组中选择军略：增攻、防御、战意、解除控制、缩短冷却、加速行军、延迟敌方援军或保护入场预备队、治疗伤兵、增加弓弩射程或持续火攻；也可重兵合围、后军接阵、鸣金收兵。空格可暂停，支持 1× / 2× / 4×。</p></li><li><b>休整</b><p>战果返回地图。35% 的战损转为伤兵，在己方城池每旬恢复每队最多 180 人；也可花费府库与粮草征兵。</p></li></ol><div class="info-strip">剧本目标：占领全部 9 座城池。失去全部城池则本局结束。袁绍军从第 5 旬开始伺机进攻。</div><p class="muted">V0.3 玩法原型 · 史实人物，架空推演。城池经营、外交、俘虏与历史事件尚未开放。</p>`);
  if (ui.modal === 'encounter' && state.pending) {
    const p = state.pending, city = cityById(state, p.cityId), attack = armyById(state, p.attackerId);
    const friendlyAttack = attack.faction === 'cao', defenders = p.defenderIds.map(id => armyById(state, id));
    const own = friendlyAttack ? [attack] : defenders, enemy = friendlyAttack ? defenders : [attack];
    const ownN = own.reduce((n, a) => n + armyTroops(a), 0) + (city.owner === 'cao' ? city.garrison : 0);
    const enemyN = enemy.reduce((n, a) => n + armyTroops(a), 0) + (city.owner !== 'cao' && city.owner !== attack.faction ? city.garrison : 0);
    if (own[0]) ui.army = own[0].id;
    html = modalShell('两军相逢', `${city.name} · ${friendlyAttack ? '我军进攻' : '敌军来袭'}`, `<div class="encounter-symbol">${icon('sword')}</div><h3 class="encounter-title">${city.name}之战</h3><p class="center muted">旗鼓相望，兵锋已至。请君主部署诸将。</p><div class="encounter-versus"><div><span class="faction-token cao">曹</span><b>曹操军</b><strong>${fmt(ownN)}</strong></div><span>VS</span><div><span class="faction-token yuan">${FACTIONS[friendlyAttack ? p.defenderFaction : attack.faction].short}</span><b>${FACTIONS[friendlyAttack ? p.defenderFaction : attack.faction].name}军</b><strong>${fmt(enemyN)}</strong></div></div><div class="info-strip">平原战场 · 每方最多 6 支部队同时作战 · 其余部队列入预备队</div>`, `<button class="button secondary" data-action="loadout">战前战法配置</button><button class="button secondary" data-action="army" ${own.length ? '' : 'disabled'}>战前编制</button><button class="button primary" data-action="start-battle">${icon('sword')}进入战场</button>`);
  }
  if (ui.modal === 'report' && state.report) {
    const r = state.report, won = r.winner === 0;
    html = modalShell(won ? '此战告捷' : r.winner === null ? '罢兵收军' : r.reason === '撤退' ? '全军收撤' : '此战失利', `${currentScenario()?.name || r.city+'之战'} · 战果呈报`, `<div class="report-seal ${won ? '' : 'lost'}">${won ? '捷' : r.winner === null ? '和' : '退'}</div><p class="center">${state.testScenario ? esc(r.reason) : r.captured ? `${r.city}现归${FACTIONS[r.owner].name}势力所有` : `${r.city}归属未变`} · 交战 ${r.tick} 步</p>${r.gate?`<div class="info-strip">${esc(r.reason)} · 城门耐久 ${fmt(r.gate.remaining)} / ${fmt(r.gate.initial)}</div>`:''}<table class="report-table"><thead><tr><th>战果</th><th>我军</th><th>敌军</th></tr></thead><tbody>${[['参战兵力', 'initial'], ['存活兵力', 'remaining'], ['伤兵', 'wounded'], ['阵亡', 'killed']].map(([name, key]) => `<tr><td>${name}</td><td>${fmt(r.stats[0][key])}</td><td>${fmt(r.stats[1][key])}</td></tr>`).join('')}</tbody></table><div class="info-strip">${state.testScenario ? '本场独立结算，战略进度不受影响。可重试本役，或返回选择其他战役。' : (won ? '战功：声望 +30，府库 +300。' : '未获胜的进攻军退回最近的己方城池。')+'伤兵在己方城池逐旬恢复。'}</div>${(r.growth||[]).some(g=>g.side===0)?`<h3 class="stats-section-title">武将成长</h3><div class="growth-report">${r.growth.filter(g=>g.side===0).map(g=>`<div><b>${esc(g.name)}</b><span>经验 +${g.gained} · ${g.after>g.before?`${g.before} → ${g.after} 级`:`${g.after} 级`}</span><small>${g.unlocked.length?`习得：${g.unlocked.map(esc).join("、")}`:"继续积累经验"}</small></div>`).join("")}</div>`:""}${state.finished ? `<div class="campaign-complete"><b>${state.finished === 'victory' ? '中原已定，天下归心！' : '城池尽失，此番霸业未成。'}</b><p>可在设置中开启新的征程。</p></div>` : ''}`, currentScenario()?.campaign ? '<button class="button primary" data-action="retry-scenario">同局重试</button><button class="button secondary" data-action="rematch-scenario">换局再战</button><button class="button secondary" data-action="lobby">返回战役首页</button>' : state.testScenario ? '<button class="button primary" data-action="retry-scenario">同种子重开</button><button class="button secondary" data-action="scenarios">选择战役</button><button class="button secondary" data-action="exit-scenario">返回天下</button>' : '<button class="button primary full" data-action="close-report">返回天下</button>');
  }
  if (ui.modal === 'split') {
    const army = selectedArmy();
    html = modalShell('分兵立营', 'NEW LEGION · 拆分军团', `<p class="modal-intro">选中的武将将组成新军团。两支军团都需保留至少一名有兵力的武将。</p><div class="split-list">${army.units.map(u => `<label><input type="checkbox" data-split="${u.id}" ${ui.selectedSplit.has(u.id) ? 'checked' : ''}>${avatar(u, true)}<b>${u.name}</b><span>${fmt(u.troops)} 人</span></label>`).join('')}</div>`, '<button class="button secondary" data-action="army">返回编制</button><button class="button primary" data-action="confirm-split">组建新军团</button>');
  }
  if (ui.modal === 'merge') {
    const army = selectedArmy(), others = state.armies.filter(a => a.id !== army.id && a.faction === 'cao' && a.location === army.location && !a.route.length);
    html = modalShell('合兵一处', 'MERGE LEGIONS', `<p class="modal-intro">将同城军团的全部武将、部队与粮草并入${esc(army.name)}。</p><div class="settings-actions">${others.map(a => `<button data-merge="${a.id}">${esc(a.name)}<span>${a.units.length} 名武将 · ${fmt(armyTroops(a))} 人 → 合并</span></button>`).join('') || '<p class="muted">同城暂无可合并的军团。</p>'}</div>`, '<button class="button secondary" data-action="army">返回编制</button>');
  }
  if(ui.modal==='campaign-encounters'&&state.campaign)html=modalShell('其他战线发生遭遇','全局暂停 · 请选择指挥方式',activeBattles(state).filter(r=>r.awaiting).map(r=>`<article class="strategy-battle-card"><h3>${esc(r.name)}</h3><p>世界第 ${state.campaign.day} 天，所有战场已暂停。</p><button class="button primary" data-action="campaign-manual" data-battle="${r.id}">亲自指挥 · 战前布阵</button> <button class="button secondary" data-action="campaign-auto" data-battle="${r.id}">委托作战</button></article>`).join(''));
  if(ui.modal==='campaign-history'&&state.campaign){const r=battleRecord(state,ui.campaignHistory);if(r)html=modalShell(r.name,'每日快照 · 只读',snapshotMarkup(state,r,ui.campaignSnapshotDay),'',true);}
  $('#overlay-root').innerHTML = html;
  document.body.classList.toggle('modal-open', !!html);
  if (html) { $('#app').setAttribute('inert', ''); const first = $('#overlay-root button:not([disabled])'); first?.focus({ preventScroll: true }); }
  else $('#app').removeAttribute('inert');
}
function openModal(name) { ui.modal = name; if (state.battle) ui.paused = true; renderModal(); if (state.battle&&ui.mode!=='lobby') updateBattle(); }
function closeModal() { if(ui.mode==='lobby'){ui.modal=null;render();return;} if (state.report) return closeReport(); ui.modal = state.pending ? 'encounter' : null; save(); render(); }
function closeReport() { if (currentScenario()?.campaign) return showLobby(); if (state.testScenario) { ui.modal = 'scenarios'; renderModal(); return; } state.report = null; ui.modal = null; ui.city = selectedArmy()?.location || 'xuchang'; save(); render(); }
function act(action, el) {
  if(state.campaign&&handleCampaignAction(action,el))return;
  if(state.campaign&&['relationship-save','relationship-reset'].includes(action)&&activeBattles(state).length)return toast('交战期间人物关系锁定');

  if(action==='campaign-category'){ui.historySelection=el.dataset.category==='tactical'?'tactical-control-lv':'history-guandu';render();return;}
  if(action==='rematch-scenario')return launchScenario(state.testScenario.id,crypto.getRandomValues(new Uint32Array(1))[0],state.testScenario.shieldPercent,state.testScenario.officerIds||null);
  if(action==='lobby')return showLobby();
  if(action==='strategy') { if(state.testScenario)return exitScenario();restoreUI();return; }
  if(action==='select-history'){ui.historySelection=el.dataset.scenario;render();document.querySelector(`[data-action="select-history"][data-scenario="${ui.historySelection}"]`)?.focus({preventScroll:true});return;}
  if(action==='launch-history')return launchScenario(el.dataset.scenario);
  if(action==='continue-history')return continueHistory();
  if (action === 'inspect-gate') {
    if (ui.focusMode) { const error=issueCommand(state.battle,'focus','siege-gate'); if (!error) ui.focusMode=false; toast(error || '已提高城门的目标权重'); save(); updateBattle(); }
    else openModal('gate');
    return;
  }
  if(action==='catalog-toggle'){
    const id=el.dataset.id;if(!Object.hasOwn(OFFICER_BY_ID,id))return;
    const selected=ui.catalogSelected;
    if(selected.includes(id))ui.catalogSelected=selected.filter(key=>key!==id);
    else if(selected.length<6)selected.push(id);
    else return toast('最多选择 6 名试炼武将');
    renderModal();return;
  }
  if(action==='catalog-clear'){ui.catalogSelected=[];renderModal();return;}
  if(action==='catalog-launch')return launchScenario('officer-lab',undefined,20,ui.catalogSelected);
  if(action==='relationship-save'||action==='relationship-reset'){
    const partner=$('#relationship-partner').value,raw=$('#relationship-score').value;
    const score=action==='relationship-reset'?relationshipInfo(ui.catalogInspect,partner,state.relationshipScores,state.relationshipTypes).base:raw.trim()===''?NaN:Number(raw);
    const error=setRelationshipScore(state,ui.catalogInspect,partner,score);
    if(error)return toast(error);
    ui.relationshipPartner=partner;save();renderModal();toast('关系值已保存');return;
  }
  if(action==='catalog-detail'){ui.catalogInspect=el.dataset.id;return openModal('catalog-detail');}
  if(action==='catalog-page'){ui.catalogPage=Math.max(0,Number(el.dataset.page)||0);renderModal();return;}
  if(action==='owned-officers')return openModal('owned-officers');
  if (action === 'scenarios') return openModal('scenarios');
  if (action === 'launch-scenario') { const raw = $('#scenario-seed').value.trim(); return launchScenario(el.dataset.scenario, raw === '' ? undefined : Number(raw), Number($('#scenario-shield').value)); }
  if (action === 'retry-scenario') return launchScenario(state.testScenario.id, state.testScenario.seed, state.testScenario.shieldPercent, state.testScenario.officerIds||null);
  if (action === 'exit-scenario') return exitScenario();
  if (action === 'step-scenario') {
    if (!state.testScenario || !state.battle || isDeploying(state.battle)) return;
    ui.paused = true;
    for (let i=0; i<Number(el.dataset.steps) && !state.battle.result; i++) stepBattle(state.battle);
    if (state.battle.result) { settleBattle(state); ui.modal='report'; render(); } else updateBattle();
    save(); return;
  }
  if (action === 'home') { if (!state.pending && !state.report) ui.modal = null; render(); }
  else if(action==='battle-panel') { ui.battlePanel=ui.battlePanel===el.dataset.panel?null:el.dataset.panel; if(['commands','events'].includes(ui.battlePanel)) ui.paused=true; updateBattle(); }
  else if(action==='close-battle-panel') { ui.battlePanel=null; updateBattle(); }
  else if(action==='cancel-focus') { ui.focusMode=false; updateBattle(); }
  else if(action==='command-category') {ui.commandCategory=el.dataset.category;updateBattle();}
  else if(action==='unit-stats'){ui.inspectUnit=el.dataset.inspect||ui.inspectUnit;openModal('unit-stats');}
  else if(action==='loadout')openModal('loadout');
  else if(action==='tactic-preset') {const u=loadoutUnits().find(u=>u.id===ui.loadoutUnit);if(!u)return;const ids=roleTacticIds(u,el.dataset.preset);const error=configureUnitTactics(state,u.id,ids);if(error)toast(error);else {save();renderModal();if(state.battle)updateBattle();}}
  else if(action==='tactic-up') {const u=loadoutUnits().find(u=>u.id===ui.loadoutUnit),i=Number(el.dataset.slot);if(!u||i<1)return;const ids=unitTactics(u).map(s=>s.id);[ids[i-1],ids[i]]=[ids[i],ids[i-1]];const error=configureUnitTactics(state,u.id,ids);if(error)toast(error);else{save();renderModal();if(state.battle)updateBattle();}}
  else if (['army', 'officers', 'journal', 'settings', 'help', 'merge'].includes(action)) openModal(action);
  else if (action === 'close') closeModal();
  else if (action === 'order') { ui.order = true; toast('点击地图上的目的地，下达调遣令'); render(); }
  else if (action === 'cancel-order') { ui.order = false; render(); }
  else if (action === 'march') march(el.dataset.target);
  else if (action === 'cancel-march') { const a = selectedArmy(); const error = orderArmy(state, a.id, a.location); if (error) toast(error); else { save(); render(); } }
  else if (action === 'next-turn') {
    const error = advanceTurn(state); if (error) toast(error);
    else { ui.modal = state.pending ? 'encounter' : null; save(); render(); if (state.finished) toast(state.finished === 'victory' ? '中原已定，剧本目标达成！' : '城池尽失，本局结束。'); }
  }
  else if (action === 'recruit') { const error = state.campaign?recruitCampaign(state,selectedArmy()?.id):recruit(state, selectedArmy()?.id); toast(error || '兵员已补充，粮草已拨付'); save(); render(); }
  else if (action === 'start-battle') { const error = startBattle(state); if (error) toast(error); else { ui.modal = null; ui.paused = true; ui.deploymentSelection = null; save(); render(); window.scrollTo(0, 0); } }
  else if (action === 'pause' || action === 'tactical-pause') { if (isDeploying(state.battle)) { lockDeployment(state.battle); ui.deploymentSelection = null; ui.paused = false; } else ui.paused = !ui.paused; if(!ui.paused) ui.battlePanel=null; ui.lastTime = performance.now(); updateBattle(); save(); }
  else if (action === 'reset-deployment') { const error = resetDeployment(state.battle); if (error) toast(error); else { ui.deploymentSelection = null; updateBattle(); save(); } }
  else if (action === 'speed') { ui.speed = ui.speed === 4 ? .5 : ui.speed * 2; updateBattle(); }
  else if (action === 'effects-mode') { ui.effectMode = ui.effectMode === 'clear' ? 'full' : 'clear'; try { localStorage.setItem('sango-effects-mode',ui.effectMode); } catch {} updateBattle(); }
  else if (action === 'zoom-in') { ui.zoom = Math.min(2, ui.zoom + .25); render(); }
  else if (action === 'zoom-out') { ui.zoom = Math.max(1, ui.zoom - .25); render(); }
  else if (action === 'zoom-reset') { ui.zoom = 1; render(); }
  else if (action === 'toggle-armies') { ui.showArmies = !ui.showArmies; render(); }
  else if (action === 'save') save(false);
  else if (action === 'load') {
    try { const raw = localStorage.getItem(storageKey()); if (!raw) return toast('尚无本地存档'); state = validateSave(JSON.parse(raw)); restoreUI(); toast('存档已读取，战斗将暂停等待'); }
    catch (error) { toast(`读取失败：${error.message}`); }
  }
  else if (action === 'export') {
    const url = URL.createObjectURL(new Blob([state.campaign?serializeCampaign(state):JSON.stringify(state, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = state.testScenario ? `君临-${currentScenario()?.campaign?'战役':'试炼'}-${state.testScenario.id}.json` : `君临-第${state.turn}旬.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('存档已导出');
  }
  else if (action === 'import') $('#import-file').click();
  else if (action === 'reset-confirm') openModal('reset');
  else if (action === 'reset') { state = newGame(); restoreUI(); save(); toast('建安五年，霸业重启'); }
  else if (action === 'close-report') closeReport();
  else if (action === 'split') { ui.selectedSplit.clear(); openModal('split'); }
  else if (action === 'confirm-split') { const error = state.campaign?splitCampaignArmy(state,selectedArmy().id,[...ui.selectedSplit]):splitArmy(state, selectedArmy().id, [...ui.selectedSplit]); if (error) toast(error); else { save(); openModal('army'); toast('新军团已组建，可在军团选择框中切换'); } }
}
function march(target) { const error = orderArmy(state, selectedArmy()?.id, target); if (error) toast(error); else { ui.order = false; save(); render(); toast('军令已下达，结束回合后开始行军'); } }
function restoreUI() { ui.mode='map';ui.battlePanel=null; history.replaceState(null, '', location.pathname + location.search + (currentScenario()?.campaign ? '#historical-battle' : state.testScenario ? '#battle-lab' : '#strategy')); ui.army = state.armies.find(a => a.faction === 'cao')?.id; ui.city = selectedArmy()?.location || 'xuchang'; ui.paused = true; ui.modal = state.report ? 'report' : state.pending ? 'encounter' : null; ui.order = false; ui.focusMode = false; ui.deploymentSelection = null; ui.zoom = 1; render(); window.scrollTo(0, 0); }
document.addEventListener('contextmenu',event=>{
  const unit=event.target.closest('[data-unit]');
  if(!unit||!state.battle)return;
  event.preventDefault();ui.inspectUnit=unit.dataset.unit;openModal('unit-status');
});
document.addEventListener('keydown',event=>{
  if(event.key!=='ContextMenu'&&!(event.shiftKey&&event.key==='F10'))return;
  const unit=event.target.closest('[data-unit]');if(!unit||!state.battle)return;
  event.preventDefault();ui.inspectUnit=unit.dataset.unit;openModal('unit-status');
});
document.addEventListener('click', event => {
  const legion=event.target.closest('[data-campaign-army]');
  if(legion&&state.campaign){ui.army=legion.dataset.campaignArmy;ui.strategyTab='army';render();return;}
  const action = event.target.closest('[data-action]');
  if (action) { event.preventDefault(); if (!action.disabled) act(action.dataset.action, action); return; }
  const city = event.target.closest('[data-city]');
  if (city) { ui.city = city.dataset.city; if(state.campaign)ui.strategyTab='city'; if (ui.order) march(ui.city); else render(); return; }
  const command = event.target.closest('[data-command]');
  if (command && !command.disabled && state.battle) {
    if (command.dataset.command === 'focus') { ui.focusMode = !ui.focusMode; ui.battlePanel=null; updateBattle(); return; }
    const error = issueCommand(state.battle, command.dataset.command); if(!error) ui.battlePanel=null; toast(error || '军令已传达'); save(); updateBattle(); return;
  }
  const unit = event.target.closest('[data-unit]');
  if (unit && isDeploying(state.battle)) {
    const chosen = activeUnits(state.battle,0).find(u=>u.id === unit.dataset.unit);
    if (!chosen) return toast('只能布置我军首发部队');
    if (ui.deploymentSelection && ui.deploymentSelection !== chosen.id) {
      const error = deployUnit(state.battle,ui.deploymentSelection,chosen.x,chosen.y); if (error) toast(error); ui.deploymentSelection = null; save();
    } else ui.deploymentSelection = ui.deploymentSelection === chosen.id ? null : chosen.id;
    updateBattle(); return;
  }
  const cell = event.target.closest('[data-deploy-x]');
  if (cell && isDeploying(state.battle)) { placeSelected(cell); return; }
  if (unit && ui.focusMode && state.battle) { const error = issueCommand(state.battle, 'focus', unit.dataset.unit); if (!error) ui.focusMode = false; toast(error || '已提高该敌军的目标权重'); save(); updateBattle(); return; }
  if(unit&&state.battle){ui.inspectUnit=unit.dataset.unit;openModal('unit-stats');return;}
  const merge = event.target.closest('[data-merge]');
  if (merge) { const error = state.campaign?mergeCampaignArmies(state,selectedArmy().id,merge.dataset.merge):mergeArmies(state, selectedArmy().id, merge.dataset.merge); if (error) toast(error); else { save(); openModal('army'); toast('军团已合并'); } }
});
function placeSelected(cell) {
  if (!ui.deploymentSelection) return toast('请先点击一支我军部队');
  const error = deployUnit(state.battle,ui.deploymentSelection,Number(cell.dataset.deployX),Number(cell.dataset.deployY));
  if (error) toast(error); else { ui.deploymentSelection = null; save(); updateBattle(); }
}
document.addEventListener('dragstart',event=>{
  const unit = event.target.closest('[data-unit]');
  if (!isDeploying(state.battle) || !unit || !activeUnits(state.battle,0).some(u=>u.id === unit.dataset.unit)) return;
  ui.deploymentSelection = unit.dataset.unit; event.dataTransfer.setData('text/plain',unit.dataset.unit); event.dataTransfer.effectAllowed='move';
});
document.addEventListener('dragover',event=>{if(isDeploying(state.battle) && event.target.closest('[data-deploy-x],.battle-unit.side-0')) event.preventDefault();});
document.addEventListener('drop',event=>{
  if(!isDeploying(state.battle)) return;
  const cell=event.target.closest('[data-deploy-x]'), target=event.target.closest('[data-unit]');
  if(!cell && !target) return; event.preventDefault();
  if(cell) placeSelected(cell);
  else { const u=activeUnits(state.battle,0).find(u=>u.id===target.dataset.unit); if(u) { const error=deployUnit(state.battle,ui.deploymentSelection,u.x,u.y); if(error) toast(error); else {ui.deploymentSelection=null;save();updateBattle();} } }
});
document.addEventListener('input',event=>{
  if(event.target.id!=='catalog-query'||event.isComposing)return;
  const cursor=event.target.selectionStart;
  ui.catalogQuery=event.target.value;ui.catalogPage=0;renderModal();
  const input=$('#catalog-query');input.focus();if(cursor!==null)input.setSelectionRange(cursor,cursor);
});
document.addEventListener('compositionend',event=>{if(event.target.id==='catalog-query')event.target.dispatchEvent(new Event('input',{bubbles:true}));});
document.addEventListener('change', async event => {
  const el = event.target, army = selectedArmy();
  if(state.campaign&&el.id==='campaign-governor'){const error=appointGovernor(state,el.dataset.town,el.value);if(error)toast(error);save();render();return;}
  if(state.campaign&&el.id==='campaign-snapshot-day'){ui.campaignSnapshotDay=Number(el.value);renderModal();return;}
  if(state.campaign&&el.id==='relationship-type'&&activeBattles(state).length){toast('交战期间人物关系锁定');renderModal();return;}
  if(state.campaign&&el.id==='battle-terrain'){toast('战略战场地形由交战位置决定');updateBattle();return;}

  if(el.id==='battle-terrain'){
    const error=configureBattleTerrain(state.battle,el.value);
    if(error){toast(error);updateBattle();return;}
    ui.deploymentSelection=null;save();render();return;
  }
  if(el.id==='relationship-type'){
    const error=setRelationshipType(state,ui.catalogInspect,$('#relationship-partner').value,el.value);
    if(error){renderModal();toast(error);return;}
    save();renderModal();toast('当前关系已变更');return;
  }
  if(el.id==='relationship-partner'){ui.relationshipPartner=el.value;renderModal();return;}
  if(el.id==='catalog-kind'||el.id==='catalog-sort'){ui[el.id==='catalog-kind'?'catalogKind':'catalogSort']=el.value;ui.catalogPage=0;renderModal();return;}
  if (el.id === 'army-select') { ui.army = el.value; ui.city = selectedArmy().location; render(); return; }
  if (el.id === 'import-file') {
    const file = el.files?.[0]; if (!file) return;
    if (file.size > 50_000_000) return toast('文件过大，请选择君临导出的存档');
    try { const imported = validateSave(JSON.parse(await file.text())); state = imported; restoreUI(); save(); toast('存档导入成功'); }
    catch (error) { toast(`导入失败：${error.message}`); }
    return;
  }
  if(el.id==='inspect-unit'){ui.inspectUnit=el.value;renderModal();return;}
  if(el.id==='loadout-unit'){ui.loadoutUnit=el.value;renderModal();return;}
  if(el.dataset.tacticSlot!==undefined){const u=loadoutUnits().find(u=>u.id===ui.loadoutUnit);if(!u)return;const ids=unitTactics(u).map(s=>s.id);ids[Number(el.dataset.tacticSlot)]=el.value;const error=configureUnitTactics(state,u.id,ids);if(error)toast(error);else save();renderModal();if(state.battle)updateBattle();return;}
  if (el.dataset.split) { el.checked ? ui.selectedSplit.add(el.dataset.split) : ui.selectedSplit.delete(el.dataset.split); return; }
  if (!army || state.battle || state.campaign&&(!canEditArmy(state,army)||army.faction!=='cao')) return;
  if (el.id === 'tactic-select') army.tactic = el.value;
  if (el.dataset.role) army[el.dataset.role] = el.value;
  if (el.dataset.first) {
    if (el.checked && army.units.filter(u => u.first).length >= 6) { el.checked = false; return toast('最多配置 6 名首发，请先取消另一名武将'); }
    army.units.find(u => u.id === el.dataset.first).first = el.checked;
  }
  if (el.dataset.type) {const u=army.units.find(u=>u.id===el.dataset.type);u.type=el.value;u.tactics=defaultTacticIds(u);toast('兵种已更换，战法恢复为该兵种默认；可在战法配置中混配');}
  if (el.dataset.formation) army.units.find(u => u.id === el.dataset.formation).formation = el.value;
  save();
  if(el.dataset.role)renderModal();
  if (el.dataset.type) { const id=el.dataset.type;renderModal();document.querySelector(`[data-type="${id}"]`)?.focus(); }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { if (ui.modal) closeModal(); else { ui.order = false; ui.focusMode = false; ui.battlePanel=null; if(state.battle&&ui.mode!=='lobby') updateBattle(); else render(); } }
  if (event.key === ' ' && ui.mode!=='lobby' && state.battle && !ui.modal && !['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); act('pause'); }
  if ((event.key === 'Enter' || event.key === ' ') && event.target.dataset.city) { event.preventDefault(); event.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  if (event.key === 'Tab' && ui.modal) {
    const nodes = [...document.querySelectorAll('.modal button:not([disabled]), .modal input:not([hidden]):not([disabled]), .modal select:not([disabled]), .modal summary')];
    if (!nodes.length) return;
    if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
    if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
  }
});
setInterval(() => {
  if(state.campaign){runCampaignClock();return;}
  if (ui.mode==='lobby' || !state.battle || ui.paused || ui.modal || document.hidden) return;
  // Freeze battle time during a tactic cut-in, while its render clock runs.
  // Reset pacing so the simulation never catches up in a burst afterwards.
  if (battleFx?.isCinematicPlaying()) { ui.lastTime = performance.now(); return; }
  if (state.battle.result) {
    // Let the killing blow and casualty numbers finish before replacing the board.
    if (!battleFx?.isBusy()) { settleBattle(state); ui.paused = true; ui.focusMode = false; ui.modal = 'report'; save(); render(); }
    return;
  }
  const now = performance.now(); if (now - ui.lastTime < COMBAT.stepMs / ui.speed) return; ui.lastTime = now;
  stepBattle(state.battle);
  updateBattle(); save();
}, 50);

function handleCampaignAction(action,el){
  let error=null;
  if(action==='campaign-tab'){ui.strategyTab=el.dataset.tab;render();return true;}
  if(action==='campaign-history'){ui.campaignHistory=el.dataset.battle;ui.campaignSnapshotDay=null;ui.paused=true;openModal('campaign-history');return true;}
  if(action==='campaign-map'){viewCampaignMap(state);ui.paused=true;ui.modal=null;ui.strategyTab='battles';save();render();return true;}
  if(action==='campaign-begin'||action==='next-turn'){error=beginExecution(state);if(!error){ui.paused=false;ui.lastTime=performance.now();}}
  else if(action==='campaign-run'){ui.paused=!ui.paused;ui.lastTime=performance.now();}
  else if(action==='campaign-day'){
    ui.paused=true;
    if(state.battle&&isDeploying(state.battle))error='请先确认布阵开战';
    else if(isPlanning(state))error='请先完成战略操作并点击进行';
    else {advanceCampaignDay(state);ui.strategyTab=activeBattles(state).some(r=>r.awaiting)?'battles':ui.strategyTab;}
  }
  else if(action==='campaign-manual') {error=chooseEncounter(state,el.dataset.battle,true);ui.paused=true;ui.modal=null;ui.battlePanel=null;}
  else if(action==='campaign-auto'){error=chooseEncounter(state,el.dataset.battle,false);ui.modal=null;ui.paused=activeBattles(state).some(r=>r.awaiting);}
  else if(action==='campaign-focus'){error=takeOverBattle(state,el.dataset.battle);ui.paused=true;ui.modal=null;ui.battlePanel=null;}
  else if(action==='campaign-project')error=commissionProject(state,el.dataset.town,el.dataset.project);
  else if(action==='campaign-relief')error=relieveCity(state,el.dataset.town);
  else if(action==='campaign-order'){error=orderCampaignArmy(state,selectedArmy()?.id,$('#campaign-target').value);if(!error)toast('军令已下达，点击进行后开始行军');}
  else if(action==='campaign-create-army'){error=createCampaignArmy(state,el.dataset.town,[...document.querySelectorAll('[data-draft-officer]:checked')].map(x=>x.dataset.draftOfficer));if(!error){ui.army=state.armies.at(-1).id;ui.strategyTab='army';}}
  else if(action==='campaign-transfer')error=transferOfficer(state,el.dataset.officer,document.querySelector('[data-transfer-target="'+el.dataset.officer+'"]').value);
  else return false;
  if(error)toast(error);save();render();return true;
}
function runCampaignClock(){
  if(ui.mode==='lobby'||ui.paused||ui.modal||document.hidden)return;
  if(isPlanning(state)||state.finished){ui.paused=true;render();return;}
  if(state.battle&&battleFx?.isCinematicPlaying()){ui.lastTime=performance.now();return;}
  const now=performance.now(),delay=(state.battle?COMBAT.stepMs:800)/ui.speed;
  if(now-ui.lastTime<delay)return;ui.lastTime=now;
  const previous=state.battle,day=state.campaign.day;
  const result=previous?advanceCampaignStep(state):advanceCampaignDay(state);
  if(result.encounter||result.deployment||result.planning||isPlanning(state)||state.finished)ui.paused=true;
  if(previous!==state.battle||!state.battle||result.encounter){if(result.encounter)ui.strategyTab='battles';render();}
  else updateBattle();
  if(day!==state.campaign.day||result.encounter||result.deployment||previous!==state.battle)save();
}

document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', () => save());
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
render();
if (loadWarning) { save(); toast(loadWarning); }
