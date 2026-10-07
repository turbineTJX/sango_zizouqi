import {setCityBudget,updateCityBudgetAlerts} from './city-budget.mjs';
import {combatType,combatFamily,equipmentNames,troopTypes} from './troop-equipment.mjs';
import {highestAptitudeTroop,battleTroopTypes} from './troop-choice.mjs';
import {recordOfficerActivities} from './officer-activity.mjs';
import {officerActivityMarkup,siteActivityMarkup} from './officer-activity-view.mjs';
import {domesticPriority,setDomesticPriority,fillFactionAppointments} from './faction-affairs.mjs';
import {assignDiplomat,dismissDiplomat,setDiplomaticGoal,setDiplomaticBudget,approveDiplomaticProposal,decideDiplomaticProposal,cancelDiplomaticOrder} from './diplomacy.mjs';
import {replayFrames} from './campaign-replay.mjs';
import {battleDay,battleDays,battleTimeText,battleSteps} from './player-time.mjs';
import {customArmyColumns,arrivalLabel,removeCustomReinforcement} from './reinforcement-arrival.mjs';
import {BATTLE_EVENTS,battleEventSummary} from './battle-events.mjs';
import {battleJournalMarkup} from './report-presentation.mjs';
import {pendingDomesticAlerts,acknowledgeDomesticAlerts,domesticAlertsMarkup} from './domestic-feedback.mjs';
import {attachArmyHover} from './army-inspection.mjs';
import {animateArmyMarch} from './strategic-army-markers.mjs';
import {historicalBattleDraft} from './historical-battle-library.mjs';
import {BATTLE_MAPS} from './data/design/battle-maps.mjs';
import {formationCells,formationTier} from './bond-battlefield.mjs';
import {marchModes,marchDescription} from './strategic-traits.mjs';
import {setArmyMarchMode} from './strategic-campaign.mjs';
import {battleBondsMarkup,personalBondsMarkup,bondsMarkup} from './bond-display.mjs';
import {dispatchScout,recallScout} from './scouting.mjs';
import {scoutingMarkup,scoutingReportMarkup} from './scouting-view.mjs';
import {intelligenceWorld,cityVisible} from './strategic-vision.mjs';
import {installBondHover} from './bond-hover.mjs';
import {FACTION_DIRECTORIES,factionDirectoryRows,factionDirectoryMarkup} from './faction-directory.mjs';
import {canPrepareSiegeDefense} from './strategic-roster.mjs';
import {frontlineCapacity,armyFrontlineCapacity} from './army-trait-rules.mjs';
import {BATTLE_LOG_KINDS} from './battle-log.mjs';
import {isAreaStratagem} from './stratagem-area.mjs';
import {areaPreview,nearestAreaCell,stratagemZonesMarkup} from './stratagem-area-view.mjs';
import {retreatDestinations,configureRetreatDestination} from './strategic-retreat.mjs';
import {bondOverview} from './bond-reference.mjs';
import {abilityReference,abilityButton,abilityOverview} from './ability-reference.mjs';
import {traitChips} from './trait-display.mjs';
import {detailTable,compactDescriptions} from './ui-detail-table.mjs';
import {mapNode,isJunction} from './road-network.mjs';
import {hidden,decoyTargets,detected} from './battle-status-rules.mjs';
import {battleStratagemSource} from './engine.mjs';
import {battleCouncilMarkup,changeBattleCouncil,configureCouncilRetreat} from './battle-council.mjs';
import {createModalScrollMemory} from './modal-scroll.mjs';
import {createDetailPanels,isObjectDetail} from './detail-panels.mjs';
import {archiveSummary,listArchives,readArchive,writeArchive,deleteArchive,archivesMarkup} from './save-archives.mjs';
import {saveScenarioUnit,newScenarioSetup,newBattleSetup,scenarioSetupMarkup,scenarioSetupSteps,scenarioSetupError,scenarioSetupDraft,scenarioSetupUnits,scenarioSetupOfficer,changeScenarioSetup,applyBattleSetup} from './scenario-setup.mjs';
import {playerFaction,playerHome} from './player-faction.mjs';
import {setCombatPage,combatComparison} from './combat-comparison.mjs';
import {sortRows,sortButton} from './list-sort.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {newMilitaryFlow,militarySteps,previewMilitaryFlow,militaryFlowMarkup,encounterFlowMarkup} from './military-flow.mjs';
import {releaseCaptive} from './officer-fates.mjs';
import {battleUnitSummaryMarkup,battleTacticDetailMarkup,battleTacticConditions} from './battle-info.mjs';
import {campaignInfoMenu,campaignInfoMarkup,campaignInfoDetail,campaignInfoSections} from './campaign-info.mjs';
import {mapObjectActions} from './map-object-menu.mjs';
import {cityForce} from './city-units.mjs';
import {selectCommandPoint,continueCommandRoute,backCommandRoute,removeCommandUnit,changeCommandUnit,newCommand,commandRoute,commandSteps,commandMarkup,commandCanAdvance,prepareCommandFormation} from './strategic-command.mjs';
import {tacticUsesLeft,tacticUseLimit} from './tactic-tempo.mjs';
import {commanderStratagems,stratagemPoolLabel,STRATAGEM_RULE_TEXT,selectStratagemSource,stratagemEffectText} from './stratagems.mjs';
import {requestStrategicOrder} from './strategic-orders.mjs';
import {interruptionMarkup,officerWorkMarkup} from './strategic-order-view.mjs';
import {removeDomesticOrder} from './domestic.mjs';
import {campaignOfficers,campaignRosterMarkup,cityRosterMarkup,pickerReason,pickerTitle} from './strategic-roster.mjs';
import {initializeTacticLearning,LEARNING_TROOPS,troopAptitude} from './tactic-learning.mjs';
import {nationalLobby} from './national-lobby.mjs';
import {nationalScenario} from './national-scenarios.mjs';
import {canTrain,dismissDomestic} from './domestic.mjs';
import {BATTLE_INTENTS,battleIntent,configureBattleIntent} from './engine.mjs';
import {art} from './art-assets.mjs';
import {BattleArt} from './art-battle.mjs';
import {BattleLabels,battleLabelMarkup} from './battle-labels.mjs';
let battleLabels=null;
import {attachStrategicMap} from './art-strategic-map.mjs';
import {newCampaign,validateCampaign,serializeCampaign,calendar,isPlanning,canEditArmy,armyBattle,activeBattles,battleRecord,beginExecution,advanceCampaignStep,advanceCampaignDay,chooseEncounter,takeOverBattle,viewCampaignMap,orderCampaignArmy,recruitCampaign,splitCampaignArmy,mergeCampaignArmies,createCampaignArmy,transferOfficer,commissionProject,relieveCity,appointGovernor,changeCampaignTroop,assignDomestic} from './strategic-campaign.mjs';
import {cityDomesticMarkup,strategicView,campaignBattleBar,snapshotMarkup,commandMap,factionAffairsMarkup,battlesPanel,replayMarkup,campaignBattleName,campaignBattleDate} from './strategic-view.mjs';
const newGame = (scenarioId='guandu-200',faction='cao') => newCampaign(521200,scenarioId,faction);
function nationalResume(){try{const data=JSON.parse(localStorage.getItem('sango-sovereign-v2'));return nationalScenario(data?.campaign?.scenarioId)?{scenarioId:data.campaign.scenarioId,day:data.campaign.day,playerFaction:playerFaction(data)}:null;}catch{return null;}}
const validateSave = value => {if(value?.testScenario){if(value.campaign)throw new Error('试炼与战略存档类型不一致');return validateBattleSave(value);}return validateCampaign(value);};
import {troopCapacity} from './troop-capacity.mjs';
import {relationshipInfo,setRelationshipScore,setRelationshipType} from './relationships.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {rosterMarkup,officerCommandMarkup,officerDetailMarkup,officerProfileMarkup,relationshipEditorMarkup} from './officer-roster.mjs';
import {makeOfficer} from './engine.mjs';
import { unitAttributes, ATTRIBUTE_LABELS } from './unit-stats.mjs';
import {intentIncome, officerLevel, passiveList, passiveDamageTaken} from './passives.mjs';
import {meritNeeded,contributionText} from './progression.mjs';
import { shieldLayers, shieldAmount } from './tactics.mjs';
import { TACTICS_BOOK, availableTactics, defaultTacticIds, CATEGORY_NAMES } from './tactics.mjs';
import { TROOPS, FACTIONS, GRID, COMBAT, armyTroops, armyById, cityById, findRoute, orderArmy, advanceTurn, startBattle, stepBattle, issueCommand, settleBattle, activeUnits, recruit, splitArmy, mergeArmies, validateSave as validateBattleSave } from './engine.mjs';
import {visibleStatuses,statusIcon,statusTimeLabel,statusSources,inspectionStatuses,statusAttributeChanges,statusAmounts} from './status-display.mjs';
import { BattleEffects } from './battle-effects.mjs';
import {tacticPowerPreview} from './tactic-power.mjs';
import {statusPower} from './tactics.mjs';
import { HEX_GRID, HEX_ASPECT, hexCenter, hexCellStyle } from './hex-grid.mjs';
import { CommandCue } from './command-cue.mjs';
import { SCENARIOS, createScenario, scenarioDraft } from './scenarios.mjs';
import { campaignLobby, modeLobby } from './campaign-lobby.mjs';
import {defaultCustomBattle,validateCustomBattle,customRoles,customParticipants,customBattleTotals,customTroopBudget,customReserveTroops,swapCustomBattle} from './custom-battle.mjs';
import { waveSummary,terrainAt,unitTerrain,BATTLE_TERRAINS,TERRAIN_NAMES,TERRAIN_HELP } from './battlefield.mjs';
import { armyCommanders, officerStratagems, armyStratagems, battleStratagems, commandIntellect, COMMAND_RESOURCE, battleWounded, attackRange, unitTactics, hasStatus, STRATAGEMS, isDeploying, isBattleCouncil, isReinforcementCouncil, openReinforcementCouncil, confirmReinforcementCouncil, deployUnit, reserveDeploymentUnit, resetDeployment, configureBattleTerrain, lockDeployment } from './engine.mjs';

const SAVE_KEY = 'sango-sovereign-v2';
const TEST_SAVE_KEY = 'sango-battle-lab-v1';
const HISTORY_SAVE_KEY = 'sango-historical-battle-v1';
const storageKey = () => currentScenario()?.campaign ? HISTORY_SAVE_KEY : state?.testScenario ? TEST_SAVE_KEY : SAVE_KEY;
const routeKey = () => location.hash === '#historical-battle' ? HISTORY_SAVE_KEY : location.hash === '#battle-lab' ? TEST_SAVE_KEY : SAVE_KEY;
const $ = selector => document.querySelector(selector);
const bondHover=installBondHover({decorate:root=>art.decorate(root)});
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
const ui = { army: state.armies.find(a => a.faction === playerFaction(state))?.id, city: playerHome(state), mode: 'map', order: false, modal: null, paused: true, speed: 1, effectMode: 'clear', focusMode: false, deploymentSelection: null, zoom: 1, showArmies: true, selectedSplit: new Set(), savedAt: null, lastTime: 0, catalogQuery:'',catalogKind:'all',catalogSort:'source',catalogPage:0,catalogSelected:[...(state.testScenario?.officerIds||[])] };
ui.mode = location.hash==='#strategy'||(location.hash==='#historical-battle'&&currentScenario()?.campaign)||(location.hash==='#battle-lab'&&state.testScenario&&!currentScenario()?.campaign) ? 'map' : 'lobby';
ui.historySelection = currentScenario()?.campaign ? state.testScenario.id : 'custom-battle';
ui.customBattle = structuredClone(state.testScenario?.customBattle??defaultCustomBattle());
try { const draft=localStorage.getItem('sango-custom-draft-v46');if(draft)ui.customBattle=validateCustomBattle(JSON.parse(draft)); } catch {}
function saveCustomDraft(){try{localStorage.setItem('sango-custom-draft-v46',JSON.stringify(validateCustomBattle(ui.customBattle)));}catch{}}
function refreshCustomDraft(){for(const key of ['ownTeam','enemyTeam'])ui.customBattle[key+'Roles']??=customRoles(ui.customBattle,key);saveCustomDraft();render();}
if(ui.mode !== 'lobby')ui.modal=state.report?'report':state.pending?'encounter':null;
try { ui.effectMode = localStorage.getItem('sango-effects-mode') === 'full' ? 'full' : 'clear'; } catch {}
let toastTimer;
let battleFx = null;
let battleArt = null;
const commandCue = new CommandCue();
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3400); }
function save(silent = true) {
  if(state.campaign){updateCityBudgetAlerts(state);recordOfficerActivities(state);}
  try { localStorage.setItem(storageKey(), state.campaign?serializeCampaign(state):JSON.stringify(state)); ui.savedAt = new Date(); if (!silent) toast(state.testScenario ? '战役进度已单独保存' : '进度已保存到此浏览器'); }
  catch { toast('浏览器存储不可用，请在设置中导出存档'); }
}
function openArchives(){
  ui.paused=true;ui.archiveConfirm=null;const summary=archiveSummary(state);
  ui.archiveName=summary.scenario+(summary.faction?' · '+summary.faction:'')+' · '+summary.progress;
  openModal('archives');
}
function archiveListMarkup(){try{return archivesMarkup(listArchives(localStorage,validateSave),{canSave:ui.mode!=='lobby',name:ui.archiveName});}catch{return '<p>浏览器存储不可用，无法读取存档列表。可返回设置导出当前进度。</p>';}}
function selectedArmy() { return armyById(state, ui.army) || state.armies.find(a => a.faction === playerFaction(state)); }
function currentScenario() { const s=SCENARIOS.find(s => s.id === state.testScenario?.id),map=BATTLE_MAPS[state.testScenario?.customBattle?.mapId];return map?{...s,name:map.name}:s; }
function historicalResume() {
  try {
    const raw=localStorage.getItem(HISTORY_SAVE_KEY);
    if(!raw)return null;
    const saved=validateSave(JSON.parse(raw)),scenario=SCENARIOS.find(s=>s.id===saved.testScenario?.id&&s.campaign);
    if(!scenario||(!saved.battle&&!saved.report))return null;
    return {name:BATTLE_MAPS[saved.testScenario.customBattle?.mapId]?.name||scenario.name,finished:!!saved.report,stage:saved.report?'本役已结束':isDeploying(saved.battle)?'待布阵':`第 ${battleDay(saved.battle.tick)} 天 · 已暂停`};
  } catch { return {name:'战役试玩存档不可用',stage:'版本不兼容或数据损坏，请重新开始',invalid:true}; }
}
function showLobby(page = 'modes') {
  ui.lobbyPage=page;
  if(page==='national')ui.nationalDraft={...ui.nationalDraft,step:'scenario'};
  ui.paused=true;ui.modal=null;ui.mode='lobby';ui.battlePanel=null;ui.focusMode=false;
  history.replaceState(null,'',location.pathname+location.search);render();window.scrollTo(0,0);
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
function launchScenario(id, seed, shieldPercent = 20, officerIds = null, customDraft = null) {
  try {
    if(seed===undefined&&SCENARIOS.find(s=>s.id===id)?.historical===false)seed=crypto.getRandomValues(new Uint32Array(1))[0];
    const next = createScenario(id, seed, shieldPercent, officerIds, customDraft);
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
  return modalShell('战役试炼', 'BATTLE LAB · 独立测试', `<p class="modal-intro">选择战役即可布阵。试炼独立存档。切换或重开会重置试炼。</p><label class="scenario-seed" hidden>随机种子 <input id="scenario-seed" type="number" min="0" max="4294967295" step="1" placeholder="留空使用各战役固定种子"><small>用于比较布阵、战法与军略的影响</small></label><label class="scenario-seed">守方首发护盾 <input id="scenario-shield" type="number" min="0" max="100" step="1" value="${state.testScenario?.shieldPercent ?? 20}" aria-label="守方首发护盾百分比"><small>% 初始兵力 · 仅攻守城生效 · 预备队无护盾</small></label><div class="scenario-grid">${SCENARIOS.filter(s=>!s.campaign).map(s => `<article class="scenario-card"><div class="eyebrow">${s.kind} · ${s.difficulty}</div><h3>${s.name}</h3><p>${s.description}</p><div class="scenario-strength"><span>我军 <b>${fmt(s.own*s.ownTroops)}</b><small>${s.own} 队 · Lv.${s.level}</small></span><span>敌军 <b>${fmt(s.enemy*s.enemyTroops)}</b><small>${s.enemy} 队 · Lv.${s.enemyLevel}</small></span></div><p class="scenario-waves">${s.id==='officer-lab'?'默认六将，可在武将名录自选 1～6 人':s.waves.length ? s.waves.map((w,i)=>`第 ${i+1} 批：${w.count} 队 · ${w.tick ? battleDays(w.tick)+' 天到达' : '开局待命'}`).join('<br>') : `我军 ${Math.min(6,s.own)} 队、敌军 ${Math.min(6,s.enemy)} 队首发，无预备队`}</p><small class="scenario-goal">${s.goal}</small><button class="button primary full" data-action="launch-scenario" data-scenario="${s.id}">布阵</button><button class="button secondary full" data-action="preset-edit" data-scenario="${s.id}">编辑战役</button></article>`).join('')}</div>`, state.testScenario ? '<button class="button secondary" data-action="exit-scenario">返回</button>' : '', true);
}
function scenarioControls(b) {
  const s = currentScenario();
  if (!s) return '';
  return `<div class="scenario-toolbar"><div><b>${s.campaign?'战役试玩':s.kind+'试炼'} · 种子 ${state.testScenario.seed}</b><small>${s.goal}</small></div><div><button class="button secondary" data-action="step-scenario" data-steps="1" title="推进1个战斗回合" ${isDeploying(b)||b.result?'disabled':''}>单步</button><button class="button secondary" data-action="step-scenario" data-steps="10" title="推进10个战斗回合" ${isDeploying(b)||b.result?'disabled':''}>十步</button><button class="button secondary" data-action="retry-scenario">同局重试</button><button class="button secondary" data-action="rematch-scenario">换局再战</button><button class="button secondary" data-action="${s.campaign?'campaign-lobby':'scenarios'}">切换战役</button><button class="button secondary" data-action="lobby">模式首页</button></div></div>`;
}
function siegeTerrain(b) {
  return [...(b.siege?.gate?[b.siege.gate]:[]),...(b.buildings||[])].map(g=>buildingMarker(b,g)).join('');
}
function buildingMarker(b,g) {
  return `<button class="siege-gate side-${g.side} ${g.hp===0?'is-destroyed':''}" data-action="${g.type==='gate'?'inspect-gate':'inspect-building'}" data-building="${esc(g.id)}" style="${hexCellStyle(g.x,g.y)}" aria-label="${g.side===0?'我方':'敌方'}${esc(g.name)}，耐久${g.hp}/${g.maxHp}"><span class="unit-type">${g.type==='gate'?'門':'舍'}</span><span class="unit-name">${esc(g.name)}</span><span class="unit-health"><i style="width:${g.hp/g.maxHp*100}%"></i></span><span class="unit-number">${compact(g.hp)}/${compact(g.maxHp)}</span>${b.sides[0].focus===g.id&&b.sides[0].focusUntil>b.tick?'<span class="target-ring"></span>':''}</button>`;
}
function reinforcementPanel(b) {
  return '<div class="reinforcement-panel">'+[0,1].map(side=>'<h4>'+(side?'敌军':'我军')+'援军</h4>'+waveSummary(b,side).map(w=>`<div><b>${esc(state.armies.find(a=>a.id===w.armyId)?.name||'第'+w.wave+'批')} · ${w.total}队</b><small>${!w.arrived?'待抵达 · '+esc(arrivalLabel(w,b.sides.flatMap(s=>s.units),state.armies)):w.waiting?'已抵达 · '+w.waiting+'队等候补位':w.active?'已投入战斗':'已离场'}</small></div>`).join('')).join('')+(b.siege?`<h4>城门 ${fmt(b.siege.gate.hp)} / ${fmt(b.siege.gate.maxHp)}</h4><div class="meter"><i style="width:${b.siege.gate.hp/b.siege.gate.maxHp*100}%"></i></div>`:'')+'</div>';
}
function dateLabel() { const n = state.turn - 1, year = 5 + Math.floor(n / 36), month = Math.floor(n % 36 / 3) + 1; return `建安${['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][year] || year}年 · ${month}月${['上', '中', '下'][n % 3]}旬`; }
function avatar(unit, small = false, detailAction = null, scene = 'roster') { const portrait=`<span data-art-portrait="${esc(unit.id)}" data-art-scene="${scene}" class="portrait ${combatFamily(unit)} ${small ? 'small' : ''}"><span>${esc(unit.name.slice(-1))}</span><i>${esc(TROOPS[combatType(unit)].icon)}</i></span>`; return detailAction?`<button type="button" class="portrait-inspect" data-action="${detailAction}" data-inspect="${esc(unit.id)}" aria-label="查看${esc(unit.name)}详情">${portrait}</button>`:portrait; }
function resource(name, value, symbol, extra) { return `<div class="resource">${icon(symbol)}<div><span>${name}</span><strong>${fmt(value)}</strong></div><small>${extra}</small></div>`; }
function header() {
  const owned = state.cities.filter(c => c.owner === playerFaction(state)).length;
  const armyCount = state.armies.filter(a => a.faction === playerFaction(state)).reduce((n, a) => n + armyTroops(a), 0);
  return `<header class="topbar"><a class="brand" href="#" data-action="lobby" aria-label="返回模式首页"><span class="brand-seal">君</span><div><b>三国<span> · </span>君临</b><small>汉 末 风 云 · 群 雄 逐 鹿</small></div></a><div class="resources">${resource('府库', state.gold, 'coin', `+${owned * 160}/旬`)}${resource('粮草', state.grain, 'grain', `+${owned * 600}/旬`)}${resource('总兵力', armyCount, 'flag', `${state.armies.filter(a => a.faction === playerFaction(state)).length} 军团`)}</div><button class="faction-badge" data-action="help"><span>曹</span><div><b>曹操势力</b><small>声望 ${state.fame} · ${owned} 座城池</small></div></button></header>`;
}
function rail() {
  return `<nav class="rail" aria-label="主导航"><div class="rail-nav"><button class="nav-item ${!ui.modal ? 'active' : ''}" data-action="home">${icon('map')}<span>天下</span></button><button class="nav-item" data-action="army">${icon('flag')}<span>军团</span></button><button class="nav-item" data-action="officers">${icon('people')}<span>武将</span></button><button class="nav-item" data-action="scenarios">${icon('sword')}<span>试炼</span></button><button class="nav-item" data-action="journal">${icon('scroll')}<span>纪事</span></button></div><div class="rail-bottom"><button class="nav-item" data-action="lobby">${icon('sword')}<span>模式首页</span></button><button class="nav-item" data-action="help" aria-label="玩法说明">${icon('help')}<span>指引</span></button><button class="nav-item" data-action="settings">${icon('gear')}<span>设置</span></button><span class="version">V 0.3</span></div></nav>`;
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
    const isSelected = city.id === ui.city, hostile = city.owner !== playerFaction(state), resident = state.armies.filter(a => a.location === city.id);
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
  const army = selectedArmy(), city = cityById(state, ui.city), friendly = city.owner === playerFaction(state);
  if (!army) return `<aside class="side-panel"><p>暂无可用军团。</p></aside>`;
  const leader = army.units.find(u => u.id === army.leader), route = findRoute(state, army.location, city.id);
  const same = army.location === city.id;
  return `<aside class="side-panel"><div class="panel-section city-detail"><div class="eyebrow">${city.province} <span class="ownership ${city.owner}">${friendly ? '己方领地' : FACTIONS[city.owner].name}</span></div><div class="city-title"><h2>${city.name}</h2><span>${city.subtitle}</span>${icon('home')}</div><div class="city-stats"><div><span>驻城守军</span><b>${fmt(city.garrison)}</b></div><div><span>距军团</span><b>${same ? '驻地' : `${route.length} 旬`}</b></div></div>${!same ? `<button class="button ${friendly ? 'secondary' : 'outline-gold'} full" data-action="march" data-target="${city.id}">${icon(friendly ? 'flag' : 'sword')}${friendly ? '移驻此城' : '出征此地'}<span>→</span></button>` : '<div class="quiet-note">天时地利，皆在运筹。</div>'}</div><div class="panel-section legion-detail"><div class="section-heading"><h3>麾下军团</h3><button class="text-button" data-action="army">编制 ${icon('chevron')}</button></div><select class="army-select" id="army-select" aria-label="选择军团">${state.armies.filter(a => a.faction === playerFaction(state)).map(a => `<option value="${a.id}" ${a.id === army.id ? 'selected' : ''}>${a.name} · ${cityById(state, a.location).name}</option>`).join('')}</select><div class="commander">${avatar(leader || army.units[0])}<div><div class="commander-title">${esc(army.name)}<span class="status-tag">${army.task}</span></div><p>主将 ${esc(leader?.name || '待任命')}</p></div></div><div class="army-metrics"><div><span>总兵力</span><strong>${fmt(armyTroops(army))}<small> 人</small></strong></div><div><span>武将</span><strong>${army.units.length}<small> 名</small></strong></div></div><div class="meter-label"><span>军团士气</span><b>${army.morale}<small> / 100</small></b></div><div class="meter"><i style="width:${army.morale}%"></i></div><div class="meter-label"><span>随军粮草</span><b>${fmt(army.supply)}<small> 石</small></b></div><div class="meter amber"><i style="width:${Math.min(100, army.supply / 9)}%"></i></div><div class="mini-roster">${army.units.slice(0, 6).map(u => `<div title="${u.name} · ${TROOPS[combatType(u)].name}">${avatar(u, true)}<span>${u.name}</span></div>`).join('')}</div><div class="reserve-caption">${army.units.filter(u => u.first).length} 名首发 <span>·</span> ${army.units.filter(u => !u.first).length} 名预备队</div>${army.route.length ? `<div class="route-summary">${icon('flag')}<span>${cityById(state, army.location).name} → ${cityById(state, army.target).name}<small>剩余 ${army.route.length} 旬 · 下一回合继续行军</small></span><button class="text-button" data-action="cancel-march">取消</button></div>` : ''}<div class="button-pair"><button class="button primary" data-action="order">${icon('flag')}调遣</button><button class="button secondary" data-action="recruit">${icon('people')}征兵</button></div></div><div class="adviser-note"><span class="adviser-seal">策</span><div><b>军师谏言</b><p>${state.turn < 5 ? '官渡扼守南北要道。先整军备战，再图河北。' : '敌军已动，切勿孤军深入。留意粮草，善用预备队。'}</p></div></div></aside>`;
}
function campaign() {
  const own = state.cities.filter(c => c.owner === playerFaction(state)).length;
  return `<main class="campaign"><div class="page-heading"><div><div class="eyebrow">THE CENTRAL PLAINS <span class="small-rule"></span> 群雄逐鹿</div><h1>天下大势<span>运筹帷幄，决胜千里。</span></h1></div><button class="button primary" data-action="scenarios">${icon('sword')}战役试炼</button></div><div class="campaign-layout"><section class="map-panel"><div class="map-toolbar"><div>${icon('map')}<b>中原</b><span>势力版图</span></div><div class="map-legend"><span><i class="cao"></i>曹操</span><span><i class="yuan"></i>袁绍</span><span><i class="neutral"></i>地方势力</span></div></div><div class="map-wrap">${mapSvg()}<div class="map-objective"><span>剧本目标</span><b>平定中原</b><small>占领全部 ${state.cities.length} 座城池</small><div class="objective-progress"><i style="width:${own / state.cities.length * 100}%"></i></div><em>${own} / ${state.cities.length}</em></div><div class="map-controls"><button data-action="zoom-in" aria-label="放大地图">+</button><button data-action="zoom-out" aria-label="缩小地图">−</button><button data-action="zoom-reset" aria-label="重置地图">◎</button><button data-action="toggle-armies" aria-label="切换军团标记">${icon('flag')}</button></div><div class="map-hint ${ui.order ? 'ordering' : ''}">${ui.order ? '选择一座城池，向所选军团下达调遣令。' : '点击城池查看详情 · 调遣军团后推进回合'}${ui.order ? '<button data-action="cancel-order">取消</button>' : ''}</div></div><div class="campaign-news"><span class="news-icon">报</span><span>${esc(state.logs[0]?.text || '')}</span><button class="text-button" data-action="journal">天下纪事 ${icon('chevron')}</button></div></section>${sidePanel()}</div><footer class="turn-bar"><div class="calendar"><span class="calendar-icon">${String(state.turn).padStart(2, '0')}</span><div><b>${dateLabel()}</b><small>第 ${state.turn} 回合 · 一回合为一旬</small></div></div><div class="turn-status"><span class="live-dot"></span>${ui.savedAt ? '进度已自动保存' : '离线单机 · 本地存档'}<small>${state.armies.filter(a => a.faction === playerFaction(state) && a.route.length).length} 支军团待行军</small></div><button class="end-turn" data-action="next-turn" ${state.finished ? 'disabled' : ''}><span>结束回合<small>军团行动 · 城池收益</small></span>${icon('chevron')}</button></footer></main>`;
}
function battleHeader(b) {
  const stats = b.sides.map(s => ({ hp: s.units.reduce((n,u)=>n+u.hp,0),total:s.units.reduce((n,u)=>n+u.initial,0) }));
  return `<div class="arena-header"><div class="arena-title"><h1>${currentScenario()?.name || (state.campaign?battleRecord(state,state.campaign.focusId)?.name:null) || cityById(state,b.cityId).name+'之战'}</h1><span>意图：${BATTLE_INTENTS[battleIntent(b)]}${isDeploying(b)?' · 战前可调整':' · 已锁定'} · ${BATTLE_TERRAINS[b.terrain]} · ${battleTimeText(b)}</span></div><div class="arena-strength" aria-label="双方剩余兵力">${stats.map((s,i)=>`<span class="side-${i}">${i?(currentScenario()?.enemyName||'敌军'):(currentScenario()?.ownName||'我军')} <b>${fmt(s.hp)}</b><i><em style="width:${s.hp/Math.max(1,s.total)*100}%"></em></i></span>`).join('')}</div><div class="battle-playback">${isBattleCouncil(b)?'<button class="button secondary" data-action="show-council">军议</button>':''}<button class="button secondary" data-action="lobby" aria-label="保存并返回模式首页">模式首页</button><button class="button primary" data-action="pause">${icon(ui.paused?'play':'pause')}${isDeploying(b)?'确认开战':isReinforcementCouncil(b)?'确认军议':ui.paused?'继续战斗':'暂停'}</button><button class="button secondary" data-action="speed" aria-label="切换战斗速度">${ui.speed}×</button><button class="button secondary" data-action="battle-panel" data-panel="tools" aria-label="战斗工具" aria-expanded="${ui.battlePanel==='tools'}">${icon('gear')}</button></div></div>`;
}

function tacticState(u,s,b) {
  const detail=tacticCondition(u,s,b);
  return s.passive?detail:'剩余 '+tacticUsesLeft(u,s)+'/'+tacticUseLimit(u,s)+' 次 · '+detail;
}
function tacticCondition(u,s,b) {return battleTacticConditions(b,u,s).join(' · ')||'等待目标与自动施放检查';}

function tacticChips(u,b) {
  return '<div class="tactic-chips">'+unitTactics(u).map(s=>'<button class="tactic-chip '+(s.special?'special':'')+'" data-action="tactic-detail" data-inspect="'+u.id+'" data-skill="'+s.id+'"><strong>'+(s.special?'★ ':'')+esc(s.name)+'</strong>'+(inspectionBattle()?'<em>剩余 '+tacticUsesLeft(u,s)+'/'+tacticUseLimit(u,s)+' 次</em>':'')+'</button>').join('')+'</div>';
}

function battleUnitMarkup(u, b) {
  const targeted = b.sides[0].focus === u.id && b.sides[0].focusUntil > b.tick;
  const health=Math.max(0,Math.min(100,u.hp/u.maxHp*100)),intent=Math.max(0,Math.min(100,(u.intent||0)/COMBAT.intentCap*100));
  const statuses=inspectionStatuses(b,u),summary=statuses.map(s=>`${s.name} · ${s.time}`).join('；');
  return `<span class="unit-type">${TROOPS[combatType(u)].icon}</span><span class="unit-map-caption" style="--troop-health:${health}%;" title="${esc(summary)}"><span class="map-portrait-row"><span class="map-portrait-ring">${avatar(u,true)}</span><span class="map-statuses">${statuses.slice(0,2).map(s=>`<span class="map-status ${s.tone}" title="${esc(s.name+' · '+s.time)}">${statusIcon(s.key)}</span>`).join('')}${statuses.length>2?`<span class="map-status-overflow">+${statuses.length-2}</span>`:''}</span><span class="map-troop-type">${TROOPS[u.type].icon}</span></span><b>${esc(u.name)}</b><span class="map-troops">${Math.round(u.hp)}</span><span class="map-intent-pips" aria-label="战意 ${Math.round(u.intent||0)} / ${COMBAT.intentCap}">${Array.from({length:5},(_,i)=>`<span><span style="width:${Math.max(0,Math.min(100,(intent-i*20)*5))}%"></span></span>`).join('')}</span></span>${targeted ? '<span class="target-ring"></span>' : ''}`;
}
function enemyCommandMarkup(b){
  const c=b.enemyCommand,last=c.lastCommand;
  return '<div class="enemy-command-state"><b>敌军军略 '+Math.floor(c.commandProgress/COMMAND_RESOURCE.capacity*100)+'%</b><p>已掌握：'+(battleStratagems(b,1).map(k=>STRATAGEMS[k].name).join(' · ')||'暂无')+'</p><span>'+(last?'最近施放：'+(STRATAGEMS[last.key]?.name||last.key)+'':'蓄满后根据战况自动施放')+'</span></div>';
}
function battleSidebar(b) {
  return `<aside class="battle-sidebar">${reinforcementPanel(b)}${enemyCommandMarkup(b)}<p class="terrain-note"><b>${BATTLE_TERRAINS[b.terrain]}</b> · ${TERRAIN_HELP[b.terrain]}</p><div class="section-heading"><h3>战场态势</h3></div><div class="battle-summary"><div><b>${activeUnits(b, 0).length}<small> / ${frontlineCapacity(b,0)}</small></b><span>我军在场</span></div><div><b>${b.sides[0].units.filter(u => u.status === 'reserve').length}</b><span>预备部队</span></div></div><div class="combo-summary"><span>我军连携 <b>${b.comboCounts?.[0]||0}</b></span><span>敌军连携 <b>${b.comboCounts?.[1]||0}</b></span></div><button class="button secondary full" data-action="unit-stats">部队详情</button><h4>前线诸将 <small>自动作战</small></h4><div class="frontline-list">${activeUnits(b, 0).map(u => `<div>${avatar(u, true, 'unit-stats')}<div><b><button class="unit-inspect-link" data-action="unit-stats" data-inspect="${u.id}">${u.name}</button><span>${compact(u.hp)}</span></b><small>${esc(u.action)} · 战法 ${u.skillCasts || 0} 次</small><small>${TERRAIN_NAMES[unitTerrain(b,u)]} · 本场伤兵 ${battleWounded(u)} · 射程 ${attackRange(b,u)}</small><small class="intent-label">战意 <b>${u.intent || 0} / ${COMBAT.intentCap}</b></small>${tacticChips(u,b)}<div class="meter"><i style="width:${u.hp / u.maxHp * 100}%"></i></div></div></div>`).join('')}</div><h4>后备序列</h4><div class="reserve-list">${b.sides[0].units.filter(u => u.status === 'reserve').map(u => `<button class="unit-inspect-link" data-action="unit-stats" data-inspect="${u.id}">${u.name}<small>${TROOPS[u.type].name} · 战意 ${u.intent || 0}</small></button>`).join('') || '<p class="muted">暂无待命预备队</p>'}</div><h4>战况记录</h4><div class="battle-logs">${b.logs.slice(0, 8).map(l => `<p><time>${String(l.tick).padStart(3, '0')}</time>${esc(l.text)}</p>`).join('')}</div></aside>`;
}
function commands(b) {
  const available=battleStratagems(b),intellect=commandIntellect(b),progress=(b.commandProgress||0)/COMMAND_RESOURCE.capacity;
  const command = (action, symbol, name, hint, cost) => {
    const cd = Math.max(0,(b.commandReady?.[action] || 0) - b.tick);
    return `<button class="command-button" data-command="${action}" ${(isDeploying(b) || b.result || cost && b.commandProgress < COMMAND_RESOURCE.capacity || cd && action !== 'retreat' || b.sides[0].retreat || b.sides[0].stratagemUses?.[action]) ? 'disabled' : ''}>${icon(symbol)}<span><b>${name}</b><small>${hint}</small>${b.sides[0].stratagemUses?.[action]?'<small>本场已使用</small>':''}${cd ? `<small>冷却中</small>` : ''}</span><em>${cost ? '满条' : '免费'}</em></button>`;
  };
  const strategies = Object.entries(STRATAGEMS).filter(([key])=>available.includes(key)).map(([key,s])=>command(key,s.icon,s.name,stratagemEffectText(battleStratagemSource(b,key)),s.cost)).join('');
  const statuses=b.sides.flatMap((side,index)=>Object.entries(side.stratagemEffects||{}).filter(([field,p])=>side[field]>b.tick).map(([field,p])=>`<span class="army-buff ${index?'debuff':''}">${esc(STRATAGEMS[p.key].name)} · ${esc(stratagemEffectText(p))}<b>生效中</b></span>`)).join('');
  return `<div class="command-heading"><div><span class="eyebrow">君主军略 · 施放范围见各项</span><b>${Math.floor(progress*100)}<small>%</small></b></div><p>${isDeploying(b) ? '开战后逐渐积累军略，蓄满即可施放。' : ui.focusMode ? '请点击战场上的敌军，集中攻击该目标。' : ui.paused ? '已暂停，满条可施放一次军略；进度与持续时间冻结。' : '可先暂停观察，再施放军略。'}</p></div><div class="command-resource"><span>军略</span><div class="meter" role="progressbar" aria-label="军略积累" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(progress*100)}"><i style="width:${progress*100}%"></i></div><small>${!available.length?'暂无军略':progress>=1?'军略就绪':'蓄势中'}</small></div>${statuses ? `<div class="army-buffs">${statuses}</div>` : ''}<div class="command-row stratagem-options">${strategies || '<p class="muted">暂无可用军略。需由基础智力≥70的军团长或军师提供。</p>'}</div><p class="basic-order-label">基础军令 · 全军撤退免费</p><div class="command-row tactical-orders">${command('retreat','wind','全军撤退','向己方边缘脱离',0)}</div>`;
}
function deploymentBoard(b) {
  return Array.from({length:GRID.rows*5},(_,i)=>`<button class="deployment-cell" data-deploy-x="${i%5}" data-deploy-y="${Math.floor(i/5)}" style="${hexCellStyle(i%5,Math.floor(i/5))}" aria-label="布阵第${i%5+1}列第${Math.floor(i/5)+1}行 · ${TERRAIN_NAMES[terrainAt(b,i%5,Math.floor(i/5))]}"></button>`).join('');
}
function hexBoard(b) {
  const formation=[0,1].flatMap(side=>b.sides[side].units.some(u=>u.bondGrowth?.levels.bondGuard)?formationCells(b,side).map(p=>({...p,side,tier:formationTier(b,side)})):[]);
  const h=100*2/Math.sqrt(3),w=HEX_GRID.width*100,height=HEX_GRID.height*h;
  const cells=Array.from({length:112},(_,i)=>{
    const x=i%14,y=Math.floor(i/14),p=hexCenter(x,y),cx=p.x*w,cy=p.y*height;
    const ground=terrainAt(b,x,y);
    const mark=formation.find(p=>p.x===x&&p.y===y);
    return `<polygon data-formation-side="${mark?.side??''}" class="${mark?'hex-formation formation-'+mark.side+(mark.tier?' formation-active':''):''} hex-${ground} ${x<5?'hex-home':x>8?'hex-away':''}" points="${[[0,-.5],[.5,-.25],[.5,.25],[0,.5],[-.5,.25],[-.5,-.25]].map(([dx,dy])=>[cx+dx*100,cy+dy*h].join(',')).join(' ')}"><title>${TERRAIN_NAMES[ground]}${mark?` · ${mark.side?'敌方':'我方'}军阵阵位${mark.tier?' · 已激活':' · 未达首档'}`:''}</title></polygon>${mark?`<text class="formation-cell-label" x="${cx}" y="${cy-h*.12}">阵</text>`:''}${ground==='land'?'':`<text class="terrain-cell-label" x="${cx}" y="${cy+h*.34}">${TERRAIN_NAMES[ground]}</text>`}`;
  }).join('');
  return `<svg class="hex-grid" viewBox="0 0 ${w} ${height}" aria-hidden="true">${cells}</svg>`;
}
function battle() {
  const b=state.battle;
  return `${state.campaign?campaignBattleBar(state):''}<main class="battle-page arena-page"><div id="battle-header">${battleHeader(b)}</div><div id="stratagem-area-controls" class="stratagem-area-controls" hidden></div><div id="ability-cues" class="ability-cues" aria-label="特性与战法发动"></div><div class="battle-layout"><div id="battle-unit-labels" aria-label="部队情报名册"><aside class="roster-side roster-side-0"><header>我军<small>部队情报</small></header><div class="roster-list"></div><div id="battle-bonds" class="battle-bonds">${battleBondsMarkup(b,0)}</div></aside><aside class="roster-side roster-side-1"><header>敌军<small>部队情报</small></header><div class="roster-list"></div><div id="enemy-battle-bonds" class="battle-bonds">${battleBondsMarkup(b,1)}</div></aside></div><div class="arena-stage"><div class="battle-board" id="battle-board" style="--hex-aspect:${HEX_ASPECT}">${hexBoard(b)}<div id="siege-terrain">${siegeTerrain(b)}</div><div id="deployment-grid"></div><div id="battle-units"></div><div id="stratagem-zone-overlay"></div><div id="stratagem-area-overlay"></div><canvas id="battle-effects" aria-hidden="true"></canvas></div></div></div><button id="tactic-result" class="tactic-result" data-action="battle-panel" data-panel="events" disabled>暂无记录</button><div class="arena-context"><span class="terrain-legend">${[...new Set(Array.from({length:112},(_,i)=>terrainAt(b,i%14,Math.floor(i/14))))].map(t=>`<span class="terrain-key terrain-${t}">${TERRAIN_NAMES[t]}</span>`).join('')}</span><span id="pause-note" hidden>已暂停</span><span id="target-note" hidden>选择要合围的敌军 <button data-action="cancel-focus">取消</button></span><span class="arena-legend"><i></i>我军 <i></i>敌军</span><span id="enemy-command-note" class="enemy-command-state"></span><span id="gate-summary"></span></div><div id="deployment-guide" class="deployment-guide"></div><footer class="arena-dock">${state.testScenario?.customBattle?'<button class="button secondary" data-action="custom-edit">调整阵容</button>':''}<button id="command-cue" class="command-cue" data-action="choose-stratagem" aria-haspopup="dialog"><span id="command-cue-label"></span><span class="cue-track" role="progressbar" aria-label="军略进度" aria-valuemin="0" aria-valuemax="100"><i></i></span></button><button class="button secondary" data-action="battle-panel" data-panel="intel">战况</button><button class="button secondary" data-action="battle-panel" data-panel="events">战斗日志</button></footer><span id="command-announcement" class="sr-only" role="status" aria-live="polite"></span><section id="arena-panel" class="arena-panel" hidden><header><b id="arena-panel-title"></b><button class="button secondary" data-action="close-battle-panel">收起 ×</button></header><div id="battle-commands"></div><div id="battle-sidebar"></div><section class="battle-events" id="battle-events" aria-label="战斗动态"><div class="battle-events-heading"><span>战斗日志</span><span>最近300条 · 随存档保留</span></div><nav id="battle-log-filters" class="battle-log-filters" aria-label="日志筛选"></nav><div id="battle-journal" class="battle-journal" role="log" aria-label="战斗日志" aria-live="off"></div><div id="skill-feed" hidden class="skill-feed" role="log" aria-label="特性与战法战斗日志" aria-live="off"></div><div id="stratagem-feedback" aria-live="polite"></div></section><div id="battle-tools"><div class="arena-tools"><button class="button secondary" data-action="army">军团情报</button><button class="button secondary" data-action="effects-mode" id="effects-mode"></button><button class="button secondary" data-action="settings">设置</button><button class="button secondary" data-action="help">玩法说明</button></div><div id="scenario-controls">${scenarioControls(b)}</div></div></section></main>`;
}
function updateArena(b) {
  const enemy=b.enemyCommand,last=enemy.lastCommand;
  $('#enemy-command-note').textContent='敌军军略 '+Math.floor(enemy.commandProgress/COMMAND_RESOURCE.capacity*100)+'%'+(last?' · '+(STRATAGEMS[last.key]?.name||last.key)+'':'');

  const panel=ui.battlePanel||null;
  $('#arena-panel').hidden=!panel;
  const filter=ui.battleLogFilter||'all';
  $('#battle-log-filters').innerHTML=Object.entries(BATTLE_LOG_KINDS).map(([key,name])=>`<button data-action="battle-log-filter" data-kind="${key}" aria-pressed="${key===filter}">${name}</button>`).join('');
  const journal=$('#battle-journal'),scrollTop=journal.scrollTop,oldHeight=journal.scrollHeight,sameFilter=journal.dataset.filter===filter,first=b.logs?.[0],signature=first?`${first.tick}:${first.text}`:'';
  const newRows=journal.dataset.latest!==signature;
  journal.innerHTML=battleJournalMarkup(b,filter);
  if(sameFilter&&scrollTop>4)journal.scrollTop=scrollTop+(newRows?journal.scrollHeight-oldHeight:0);else if(!sameFilter)journal.scrollTop=0;
  journal.dataset.filter=filter;journal.dataset.latest=signature;
  $('#arena-panel-title').textContent=({commands:'君主军略',intel:'战场态势',events:'战斗日志',tools:'战斗工具'})[panel]||'';
  for(const [name,id] of Object.entries({commands:'battle-commands',intel:'battle-sidebar',events:'battle-events',tools:'battle-tools'})) $('#'+id).hidden=panel!==name;
  document.querySelectorAll('[data-action="battle-panel"]').forEach(el=>el.setAttribute('aria-expanded',String(el.dataset.panel===panel)));
  const progress=Math.min(100,Math.floor((b.commandProgress||0)/COMMAND_RESOURCE.capacity*100));
  const ready=battleStratagems(b).length>0&&progress===100&&!isDeploying(b)&&!b.result&&!b.sides[0].retreat;
  $('#command-cue').classList.toggle('ready',ready);
  $('#command-cue-label').textContent=!battleStratagems(b).length?'暂无军略':ready?'施放军略':isDeploying(b)?'待开战':b.sides[0].retreat?'正在撤退':'蓄势 '+progress+'%';
  $('#command-cue .cue-track').setAttribute('aria-valuenow',progress);
  $('#command-cue .cue-track i').style.width=progress+'%';
  if(commandCue.update(b,ready)) $('#command-announcement').textContent='军略就绪';
  else if(!ready) $('#command-announcement').textContent='';
  $('#target-note').hidden=!ui.focusMode;
  const g=b.siege?.gate;
  $('#gate-summary').textContent=g?`${g.side?'敌方':'我方'}城门 ${fmt(g.hp)} / ${fmt(g.maxHp)}`:'';
}

function updateBattle() {
  if(ui.areaDraft&&(ui.areaDraft.battleId!==state.battle?.id||state.battle?.result))ui.areaDraft=null;
  const overlay=$('#stratagem-area-overlay'),controls=$('#stratagem-area-controls');
  const preview=ui.areaDraft?areaPreview(state.battle,STRATAGEMS[ui.areaDraft.key],ui.areaDraft):null;
  const affected=new Set(preview?.targetIds||[]);
  if(overlay&&controls){

    overlay.innerHTML=preview?.svg||'';controls.innerHTML=preview?.controls||'';controls.hidden=!preview;
  }
  if (!state.battle || !$('#battle-units')) return;
  const b = state.battle;
  $('#stratagem-zone-overlay').innerHTML=stratagemZonesMarkup(b);
  $('#battle-board').dataset.battleId=b.id;
  if(state.campaign&&$('#campaign-battle-bar'))$('#campaign-battle-bar').outerHTML=campaignBattleBar(state);
  $('#battle-header').innerHTML = battleHeader(b);
  $('#battle-board').classList.toggle('clear-effects',ui.effectMode==='clear');
  $('#battle-board').style.setProperty('--battle-move-ms', Math.round(220/ui.speed)+'ms');
  $('#effects-mode').textContent = ui.effectMode==='clear' ? '清晰特效' : '完整特效';
  $('#effects-mode').setAttribute('aria-label','切换特效，当前'+(ui.effectMode==='clear'?'清晰模式':'完整模式'));
  $('#scenario-controls').innerHTML = scenarioControls(b);
  $('#siege-terrain').innerHTML = siegeTerrain(b);
  $('#battle-sidebar').innerHTML = battleSidebar(b);
  for(const side of [0,1]){const panel=$(side?'#enemy-battle-bonds':'#battle-bonds'),bondHtml=battleBondsMarkup(b,side);if(panel.innerHTML!==bondHtml){const scroll=panel.querySelector('.bond-list')?.scrollTop||0;panel.innerHTML=bondHtml;panel.querySelector('.bond-list').scrollTop=scroll;}}
  $('#battle-commands').innerHTML = '';
  updateArena(b);
  const deploying = isDeploying(b), council = isBattleCouncil(b);
  $('#ability-cues').hidden=deploying;
  $('#tactic-result').hidden=deploying;
  const grid=$('#battle-board .hex-grid');if(grid)grid.outerHTML=hexBoard(b);
  $('#pause-note').hidden = !ui.paused || deploying;
  $('#battle-board').classList.toggle('deployment-on',deploying);
  $('#deployment-grid').hidden = !deploying;
  $('#deployment-guide').hidden = !council;
  if (council) {
    if (deploying && !$('#deployment-grid').children.length) $('#deployment-grid').innerHTML = deploymentBoard(b);
    const chosen = b.sides[0].units.find(u=>u.id === ui.deploymentSelection);
    $('#deployment-guide').innerHTML = battleCouncilMarkup(b,{armies:state.armies,destinations:state.campaign?retreatDestinations(state,b):[],open:$('#deployment-guide .battle-council details')?.open,retreatOpen:$('#deployment-guide .retreat-council')?.open,selected:ui.retreatBattleId===b.id?ui.retreatSelected:[]})+(deploying?`<b>${chosen ? `移动 ${chosen.name} · 点格子或我军部队` : '战前布阵'}</b><details class="deployment-help"><summary>布阵说明</summary><p>${BATTLE_MAPS[b.mapId]?.description||TERRAIN_HELP[b.terrain]} 点击部队或头像查看详情；拖动我军部队调整阵位，也可在详情中选择“调整站位”后点选格子。</p></details><div class="deployment-actions"><label>战斗意图 <select id="battle-intent" aria-label="战斗意图">${Object.entries(BATTLE_INTENTS).map(([id,name])=>`<option value="${id}" ${battleIntent(b)===id?'selected':''} ${id==='siege'&&b.siege?.attackerSide!==0?'disabled':''}>${name}</option>`).join('')}</select><small>开战后不可更改</small></label><label>地形 <select id="battle-terrain" aria-label="战场地形" ${currentScenario()?.campaign||state.campaign?'disabled':''}>${Object.entries(BATTLE_TERRAINS).map(([id,name])=>`<option value="${id}" ${b.terrain===id?'selected':''} ${id!=='river'&&b.sides.some(s=>s.units.some(u=>u.type==='ship'))?'disabled':''}>${name}</option>`).join('')}</select></label><button data-action="army">军团</button><button data-action="loadout">固定战法</button><button data-action="reset-deployment">重置阵型</button></div>`:'');
  }
  $('#battle-board').classList.toggle('select-target', ui.focusMode);
  const live = b.sides.flatMap(s => s.units).filter(u => u.status === 'active'&&(deploying||u.side===0||!hidden(b,u)));
  for(const el of document.querySelectorAll('.decoy-marker'))el.remove();
  for(const d of [0,1].flatMap(side=>decoyTargets(b,side))){const el=document.createElement('div');el.className='decoy-marker side-'+d.side;el.style.cssText=hexCellStyle(d.x,d.y);el.textContent=detected(b,d,0)?'已识破':'疑兵';el.title=d.name+' · 耐久 '+d.hp+' · 无攻击力';$('#battle-units').append(el);}
  for(const label of [...$('#battle-unit-labels').querySelectorAll('.unit-nameplate')])if(!live.some(u=>u.id===label.dataset.inspect))label.remove();
  for (const existing of [...$('#battle-units').children]) if (!existing.classList.contains('decoy-marker')&&!live.some(u => u.id === existing.dataset.unit)) existing.remove();
  for (const u of live) {
    let el = [...$('#battle-units').children].find(e => e.dataset.unit === u.id);
    if (!el) { el = document.createElement('button'); el.dataset.unit = u.id; $('#battle-units').append(el); }
    el.className = `battle-unit side-${u.side} ${u.type}${hasStatus(b,u,'decoy')?' has-illusion':''}${deploying && ui.deploymentSelection === u.id ? ' deploy-selected' : ''}`;
    el.classList.toggle('stratagem-affected',affected.has(u.id));
    el.classList.toggle('status-stealth',hasStatus(b,u,'stealth'));
    el.classList.toggle('buff-attack',b.sides[u.side].assaultUntil > b.tick);
    el.classList.toggle('inspected',ui.inspectUnit===u.id&&!!ui.modal);
    el.classList.toggle('buff-defense',b.sides[u.side].fortifyUntil > b.tick);
    el.classList.toggle('debuffed',b.sides[u.side].disruptUntil > b.tick);
    for(const key of ['scorch','confuse','seal','ward','confuse','phalanx','shield','burn','haste','valor'])el.classList.toggle(`status-${key}`,hasStatus(b,u,key));
    el.draggable = deploying && u.side === 0;
    el.style.cssText = hexCellStyle(u.x,u.y);
    el.innerHTML = battleUnitMarkup(u, b); el.title = `${u.name} · ${TROOPS[u.type].name} · ${TERRAIN_NAMES[unitTerrain(b,u)]} · ${u.action} · 外圈：兵力比例 · 蓝色刻度：战意 · ${inspectionStatuses(b,u).map(s=>s.name+' '+s.time).join('；')} · 点击查看部队属性 · 战意 ${u.intent || 0}/${COMBAT.intentCap} · ${unitTactics(u).map(s=>`${s.name}：${tacticState(u,s,b)}`).join('；')}`;
    el.setAttribute('aria-label', `${u.side ? '敌军' : '我军'}${u.name}，兵力${u.hp}${visibleStatuses(b,u).map(s=>'，'+s.name+' '+s.time).join('')}，点击查看部队属性`);
    let label=[...$('#battle-unit-labels').querySelectorAll('.unit-nameplate')].find(e=>e.dataset.inspect===u.id);
    if(!label){label=document.createElement('button');label.dataset.action='unit-stats';label.dataset.inspect=u.id;$('.roster-side-'+u.side+' .roster-list').append(label);}
    label.className=`unit-nameplate side-${u.side}${ui.inspectUnit===u.id&&ui.modal?' inspected':''}${deploying&&ui.deploymentSelection===u.id?' deploy-selected':''}`;
    label.draggable=deploying&&u.side===0;
    if(label.draggable)label.dataset.councilUnit=u.id;else delete label.dataset.councilUnit;
    label.classList.toggle('stratagem-affected',affected.has(u.id));
    label.innerHTML=battleLabelMarkup(u,b);
    label.setAttribute('aria-label',`${u.side?'敌军':'我军'}${u.name}，${TROOPS[u.type].name}，兵力 ${u.hp}，战意 ${u.intent||0}，点击查看部队情报`);
    label.title=`${u.name} · ${u.action} · 点击查看部队情报`;
  }
  if(!battleLabels)battleLabels=new BattleLabels($('#battle-board'));
  battleLabels.update(live);
  if (!battleFx) battleFx = new BattleEffects($('#battle-effects'), $('#skill-feed'), $('#tactic-result'), $('#ability-cues'));
  battleFx.update(b, { paused: ui.paused || !!ui.modal, speed: ui.speed, mode: ui.effectMode });
  if(art.active&&!battleArt)battleArt=new BattleArt($('#battle-board'),battleFx);
  battleArt?.update(b,{paused:ui.paused||!!ui.modal||deploying,speed:ui.speed});
  battleFx.unitPosition=id=>{const u=battleArt?.units.get(id);return u?battleArt.position(u):null;};
  art.decorate($('#app'));
  bondHover.refresh();
  const feedback = $('#stratagem-feedback');
  const enemy=state.battle.enemyCommand.lastCommand;
  if(enemy&&STRATAGEMS[enemy.key]&&b.tick-enemy.tick<=2){
    const s=STRATAGEMS[enemy.key];
    feedback.dataset.enemy='true';
    clearTimeout(ui.commandFeedbackTimer);
    feedback.innerHTML='<div class="stratagem-banner enemy"><span>敌军军略</span><b>'+s.name+'</b><strong>'+esc(stratagemEffectText(enemy.source).replaceAll('敌军','我方部队'))+'</strong></div>';
    return;
  }
  if(feedback.dataset.enemy){feedback.innerHTML='';delete feedback.dataset.enemy;}
  if (b.lastCommand && b.tick-b.lastCommand.tick <= 1 && feedback.dataset.serial !== String(b.commandSerial)) {
    feedback.dataset.serial = String(b.commandSerial);
    const s = STRATAGEMS[b.lastCommand.key];
    if (s) {
      feedback.innerHTML = `<div class="stratagem-banner ${s.side ? 'enemy' : ''}"><span>军略生效</span><b>${s.name}</b><strong>${esc(stratagemEffectText(b.lastCommand.source))}</strong><small>${b.lastCommand.source.duration ? `持续 ${b.lastCommand.source.duration} 日 · 暂停不计时` : '立即生效 · 军略进度已清空'}</small></div>`;
      clearTimeout(ui.commandFeedbackTimer); ui.commandFeedbackTimer = setTimeout(()=>{ feedback.innerHTML=''; },3500);
    }
  }
}
function presentDomesticAlerts(){
 if(!state.campaign||ui.mode==='lobby'||ui.modal||ui.rewardMapReport)return false;
 const events=pendingDomesticAlerts(state);if(!events.length)return false;
 ui.paused=true;ui.domesticAlertIds=events.map(e=>e.id);ui.modal='domestic-alerts';return true;
}
let mapHoverCleanup;
function render() {
  mapHoverCleanup?.();mapHoverCleanup=null;
  const previousQuick=$('.map-quick-directory .city-directory-list'),previousQuickKind=$('.map-quick-directory nav [aria-pressed="true"]')?.dataset.kind;
  ui.mapQuickScrolls??={};if(previousQuick?.clientHeight&&previousQuickKind)ui.mapQuickScrolls[previousQuickKind]=previousQuick.scrollTop;
  if(ui.mapQuickResetScroll){delete ui.mapQuickScrolls[ui.mapQuickKind||'city'];ui.mapQuickResetScroll=false;}
  presentDomesticAlerts();
  const previousBoard=$('#battle-board'),previousStage=$('.arena-stage');
  const scroll=previousStage&&previousBoard?.dataset.battleId===state.battle?.id?{x:previousStage.scrollLeft,y:previousStage.scrollTop}:null;
  const rosterScroll=scroll?[...document.querySelectorAll('.roster-list,.battle-bonds .bond-list')].map(el=>({x:el.scrollLeft,y:el.scrollTop})):[];
  battleLabels?.destroy();battleLabels=null;
  battleArt?.destroy();battleArt=null;
  battleFx?.destroy(); battleFx = null;
  const lobby=ui.mode==='lobby'||(!state.battle&&!!state.testScenario);
  document.body.classList.toggle('battle-view',!!state.battle&&!lobby);
  $('#app').innerHTML = lobby ? (['campaign','custom'].includes(ui.lobbyPage) ? campaignLobby(ui.historySelection,historicalResume(),ui.customBattle,ui.lobbyPage==='custom') : ui.lobbyPage==='national' ? nationalLobby(nationalResume(),ui.nationalDraft) : modeLobby()) : state.battle ? battle() : state.campaign ? strategicView(state,ui) : `${header()}<div class="app-body">${rail()}${campaign()}</div>`;
  const quickList=$('.map-quick-directory .city-directory-list');if(quickList?.clientHeight)quickList.scrollTop=ui.mapQuickScrolls[ui.mapQuickKind||'city']||0;
  if (state.battle&&!lobby) updateBattle();
  if(scroll&&$('.arena-stage')){$('.arena-stage').scrollLeft=scroll.x;$('.arena-stage').scrollTop=scroll.y;}
  else if(state.battle&&!isDeploying(state.battle)&&$('.arena-stage')){const stage=$('.arena-stage');stage.scrollLeft=(stage.scrollWidth-stage.clientWidth)/2;stage.scrollTop=(stage.scrollHeight-stage.clientHeight)/2;}
  document.querySelectorAll('.roster-list,.battle-bonds .bond-list').forEach((el,i)=>{if(rosterScroll[i]){el.scrollLeft=rosterScroll[i].x;el.scrollTop=rosterScroll[i].y;}});
  renderModal();
  art.decorate();
  bondHover.refresh();
  if(!ui.mapCommandView)attachStrategicMap($('#app'),ui,render);
  if(state.campaign&&!state.battle&&!lobby)mapHoverCleanup=attachArmyHover($('#app').firstElementChild,state);
  const tools=$('#battle-tools .arena-tools')||$('.strategy-heading>div:last-child')||$('.mode-selection');
  if(tools&&!tools.querySelector('[data-action="art-mode"]')){const button=document.createElement('button');button.className='button secondary';button.dataset.action='art-mode';button.textContent=art.active?'人物美术':'默认美术';button.title='切换美术，不改变本局规则与存档';tools.append(button);}
}
function modalShell(title, subtitle, body, footer = '', wide = false) {
  const inspection=state.battle&&['unit-stats','unit-officer','tactic-detail'].includes(ui.modal);
  const detail=isObjectDetail(ui);
  return `<div class="modal-backdrop ${inspection?'battle-inspection':''} ${detail?'detail-inspection':''}"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="${!detail}" aria-labelledby="modal-title"><header class="modal-header"><div><div class="eyebrow">${subtitle}</div><h2 id="modal-title">${title}</h2></div><button class="close-button" data-action="close" aria-label="关闭弹窗">×</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}</section></div>`;
}
function loadoutUnits() {
  return state.battle ? state.battle.sides[0].units : state.armies.filter(a=>a.faction===playerFaction(state)&&(!state.campaign||canEditArmy(state,a))).flatMap(a=>a.units);
}
function inspectContext(unit) {
  const inspected=inspectionBattle();if (inspected) return { unit, battle:inspected, stats:unitAttributes(unit,inspected) };
  const army=ui.scenarioInspect?{units:scenarioSetupUnits(ui.scenarioSetup),...ui.scenarioSetup.roles,tactic:ui.scenarioSetup.tactic}:state.armies.find(a=>a.units.some(u=>u.id===unit.id));
  const role=key=>army?.units.find(u=>u.id===army[key]);
  const preview={...unit,hp:unit.troops,maxHp:Math.max(1,unit.troops),side:0,commandBonus:(role('leader')?.leadership||60)/1000,deputyBonus:(role('deputy')?.force||0)/2000,advisorBonus:(role('advisor')?.intellect||0)/1000};
  const battle={tick:0,terrain:ui.scenarioInspect?(ui.scenarioSetup.terrain||ui.scenarioSetup.draft.terrain):'land',sides:[{tactic:army?.tactic}]};
  return {unit:preview,battle,stats:unitAttributes(preview,battle)};
}
function growthLabel(u) {
  return `等级 ${officerLevel(u)} / 10 · ${officerLevel(u)===10?'已满级':`功绩 ${u.merit||0} / ${meritNeeded(officerLevel(u))}`}`;
}
function passiveMarkup(u,b=null) {return personalBondsMarkup(u,b)+'<section class="passive-panel"><h3>特性</h3>'+traitChips(u,b)+'</section>';}

const precise=n=>Number(n.toFixed(2)).toLocaleString('zh-CN');
function inspectionBattle(){if(ui.scenarioInspect||ui.commandInspect)return null;return ui.militaryReturn&&ui.inspectBattleId?battleRecord(state,ui.inspectBattleId)?.battle:state.battle;}
function inspectionUnits(){if(ui.commandInspect&&ui.officerPick){const p=ui.officerPick,preview=prepareCommandFormation(state,{...p,selected:[...new Set([...p.selected,ui.inspectUnit].filter(Boolean))]});return campaignOfficers(preview.state||state).map(r=>r.unit);}if(ui.scenarioInspect){const units=scenarioSetupUnits(ui.scenarioSetup);if(!units.some(u=>u.id===ui.inspectUnit))units.push(scenarioSetupOfficer(ui.scenarioSetup,ui.inspectUnit));return units;}const b=inspectionBattle();return b?b.sides.flatMap(s=>s.units):state.campaign?campaignOfficers(state).map(r=>r.unit):state.armies.filter(a=>a.faction===playerFaction(state)).flatMap(a=>a.units);}
function statusCards(b,u){
  return '<div class="inspection-statuses">'+inspectionStatuses(b,u).map(s=>{
    const rows=statusAttributeChanges(b,u,s),amounts=statusAmounts(b,u,s);
    return '<details class="effect-tile tone-'+s.tone+'" data-status="'+s.key+'"><summary>'+statusIcon(s.key)+'<span><b>'+esc(s.name)+'</b><small>来源：'+esc(s.sources.join(' / '))+'</small></span><em>'+(s.state.charges!==undefined?s.remaining+' 次':s.time)+'</em></summary><div class="effect-details"><p>'+esc(s.description)+'</p><small>'+s.time+'</small>'+(amounts.length?'<dl>'+amounts.map(([name,value])=>'<div><dt>'+esc(name)+'</dt><dd>'+esc(value)+'</dd></div>').join('')+'</dl>':'')+'</div></details>';
  }).join('')+'</div>';
}
function campaignInspectionStatus(id){if(ui.scenarioInspect||ui.commandInspect)return '';const b=inspectionBattle();if(b){const u=b.sides.flatMap(s=>s.units).find(u=>u.id===id);return u?battleUnitSummaryMarkup(b,u):'';}return state.campaign?campaignInfoSections(campaignInfoDetail(state,'officer',id),{sections:['status']}):'';}
function officerUnitModal(){
  const u=inspectionUnits().find(u=>u.id===ui.inspectUnit);if(!u)return modalShell('武将属性','暂无武将','');
  const profile=OFFICER_BY_ID[u.id]||u;
  return modalShell(u.name+' · 武将属性','OFFICER · 人物与成长',
    campaignInspectionStatus(u.id)+'<div class="inspection-heading">'+avatar(u,false,null,'detail')+'<div><h3>'+esc(u.name)+(u.courtesy?' <small>字 '+esc(u.courtesy)+'</small>':'')+'</h3><p>'+growthLabel(u)+' · 忠诚 '+(state.campaign?.domestic.loyalty[u.id]??u.loyalty)+'</p></div></div><div class="officer-four">'+[['统率',u.leadership],['武力',u.force],['智力',u.intellect],['政治',u.politics],['魅力',u.charm??profile.charm]].map(([n,v])=>'<div><span>'+n+'</span><b>'+v+'</b></div>').join('')+'</div>'+campaignLearningMarkup(u)+passiveMarkup(u,inspectionBattle())+officerCommandMarkup(u.id,u)+officerProfileMarkup(u,state.battle?.relationshipScores||state.relationshipScores,state.battle?.relationshipTypes||state.relationshipTypes)+'<details class="profile-disclosure"><summary>人物生平</summary><p>'+esc(profile.biography||'暂无记录')+'</p></details>',
    (ui.personnelReturn?'<button class="button secondary" data-action="campaign-person-back">返回</button>':'')+'<button class="button secondary" data-action="unit-stats" data-inspect="'+u.id+'">部队</button><button class="button primary" data-action="close">关闭</button>',true);
}
function campaignLearningMarkup(u){
 if(!state.campaign&&!ui.scenarioInspect)return '';
 const row=(ui.scenarioInspect?[]:campaignOfficers(state)).find(r=>r.unit.id===u.id);
 return (ui.scenarioInspect?'':officerWorkMarkup(state,u.id))+`<p class="personnel-summary">${esc(row?.place||'')} · ${esc(row?.status||'')} · ${esc(row?.duty||'')}</p><h3>兵种适性与固定战法</h3><div class="personnel-learning">${LEARNING_TROOPS.map(type=>{const learned=u.tacticLearning?.byTroop[type];return `<article><b>${TROOPS[type].name} · ${['C','B','A','S'][troopAptitude(u,type)]}</b><p>${[...(learned?.low||[]),...(learned?.high||[])].map(id=>esc(TACTICS_BOOK[id]?.name)).join('、')||'无可用战法'}</p></article>`;}).join('')}</div><p>当前携带：${unitTactics(u).map(t=>esc(t.name)).join('、')||'无'}</p><p>军略：${officerStratagems(u.id).map(k=>esc(STRATAGEMS[k].name)).join('、')||'无'}</p>`;
}
function tacticDetailModal(){
  const skill=TACTICS_BOOK[ui.inspectSkill],u=inspectionUnits().find(u=>u.id===ui.inspectUnit);if(!skill||!u)return '';
  const {unit,battle}=inspectContext(u);
  return modalShell(skill.name,'TACTIC · '+u.name+' · '+CATEGORY_NAMES[skill.category]+'类',
    (inspectionBattle()?battleTacticDetailMarkup(battle,unit,skill):'')+'<div class="info-strip">'+(skill.passive?'持续光环 · 占用一个战法槽':'战意 ≥ '+skill.threshold+' · 冷却 '+skill.cooldown+' 日 · '+(inspectionBattle()?'剩余 '+tacticUsesLeft(unit,skill)+'/'+tacticUseLimit(unit,skill)+' 次':'每场 '+skill.maxUses+' 次'))+'</div><h3>效果</h3><p>'+esc(skill.description)+'</p><p class="power-preview">'+esc(tacticPowerPreview(skill,statusPower(unit,skill,battle)))+'</p><details class="profile-disclosure"><summary>威力、成功率与暴击</summary><p>'+esc(skill.powerDescription)+'</p></details><p>地形：'+esc(skill.terrainDescription)+'</p>'+(skill.tradeoff?'<p>取舍：'+esc(skill.tradeoff)+'</p>':''),'<button class="button secondary" data-action="inspection-back">返回</button>');
}
function unitStatsModal() {
  const units=inspectionUnits();
  const chosen=units.find(u=>u.id===ui.inspectUnit)||units[0];if(!chosen)return modalShell('部队属性','暂无部队','');
  ui.inspectUnit=chosen.id;
  const {unit:u,battle:b,stats}=inspectContext(chosen),inBattle=!!inspectionBattle();
  const precise=n=>Number(n.toFixed(2)).toLocaleString('zh-CN');
  const mitigation=kind=>precise((1-(kind==='dot'?1:1-stats.damageReduction)*passiveDamageTaken(inBattle?b:null,u,kind))*100);
  const suffix=key=>({move:'格 / 日',range:'格',attackSpeed:'次 / 秒'}[key]||'');
  const notes={attack:'当前士兵合计的普通攻击威力；减员时降低',defense:'抵御普攻与武力战法',move:'常规移动；不足 1 格时逐日累计',range:'普攻与兵器战法射程；计策另有施法范围',siege:'当前攻击 × 兵种攻城系数，再计入攻城专属加成；用于普攻城门',attackSpeed:'仅影响普攻，不缩短战法冷却',discipline:'抵御智力伤害，缩短混乱与封技',martialPower:'当前士兵合计的武力战法威力；减员时降低',strategyPower:'当前士兵合计的谋略威力；影响伤害与辅助效果',supportPower:'政治为主、智力辅助；影响救护、休整与修缮，随现役兵力降低'};
  const cards=Object.entries(ATTRIBUTE_LABELS).map(([key,name])=>{
    const d=stats.breakdown[key],baseLabel=key==='siege'?'当前攻击 × 兵种攻城系数':['attack','martialPower','strategyPower'].includes(key)?'现役兵员基础贡献':'兵种基础';
    return `<details class="attribute-card"><summary><span>${name}</span><b>${precise(d.value)} <small>${suffix(key)}</small></b></summary><p>${notes[key]}</p><dl><div><dt>${baseLabel}</dt><dd>${precise(d.base)}</dd></div><div><dt>${d.source}</dt><dd>+${precise(d.officer)}</dd></div>${d.modifiers.map(m=>`<div><dt>${m.label}</dt><dd>${m.add!==undefined?'+'+precise(m.add):'×'+Number(m.factor.toFixed(4))}</dd></div>`).join('')}</dl></details>`;
  }).join('');
  const layers=inBattle?shieldLayers(b,u):[];
  const states=[['原兵种',TROOPS[u.type].name],['当前形态',TROOPS[combatType(u)].name],['携带装备',equipmentNames(u)],['士兵数',fmt(inBattle?u.hp:u.troops)],['带兵上限',fmt(troopCapacity(u))],...(inBattle?[['本场初始兵力',fmt(u.initial)]]:[]),['战意',`${u.intent||0} / ${COMBAT.intentCap}`],['普攻战意',`+${intentIncome(u).attack}`],['受击战意',`+${intentIncome(u).hit}`],...(u.tactics?.includes('camp')?[['修缮物资',`${Math.max(0,3-(u.tacticCasts?.camp||0))} / 3 组`]]:[]),['护盾',fmt(layers.reduce((n,l)=>n+l.amount,0))],['伤兵数',fmt(inBattle?battleWounded(u):u.wounded)]];
  if(inBattle&&u.status==='active')states.push(['所在格',TERRAIN_NAMES[unitTerrain(b,u)]]);
  const statuses=inBattle?statusCards(b,u):'<p class="muted">尚未交战</p>';
  return modalShell(u.name+' · 部队属性','UNIT · '+(inBattle?'战场实时数值 · 已暂停':'出战预览'),
    campaignInspectionStatus(u.id)+'<div class="loadout-toolbar"><label>选择部队<select id="inspect-unit">'+units.map(a=>'<option value="'+a.id+'" '+(a.id===u.id?'selected':'')+'>'+(inBattle?(a.side?'敌军 · ':'我军 · '):'')+a.name+' · '+TROOPS[combatType(a)].name+'</option>').join('')+'</select></label><button class="officer-entry" data-action="unit-officer" data-inspect="'+u.id+'">'+avatar(u,true)+'<span><small>所属武将</small><b>'+u.name+' →</b></span></button></div><div class="unit-state-grid">'+states.map(([name,value])=>'<div><span>'+name+'</span><b>'+value+'</b></div>').join('')+'</div><div class="inspection-section-heading"><h3>当前状态效果</h3></div>'+(inBattle&&!inspectionStatuses(b,u).length?'<p class="muted">暂无临时状态</p>':statuses)+passiveMarkup(u,b)+'<div class="inspection-section-heading"><h3>携带战法</h3></div>'+tacticChips(u,b)+'<div class="inspection-section-heading"><h3>当前战斗属性</h3></div><div class="attribute-grid">'+cards+'</div><details class="profile-disclosure"><summary>作战规则与减伤</summary><p>普攻间隔 '+precise(stats.attackInterval)+' 日；普攻 / 武技 / 谋略 / 持续减伤 '+mitigation('basic')+'% / '+mitigation('force')+'% / '+mitigation('intellect')+'% / '+mitigation('dot')+'%。控制时长减免 '+precise(stats.controlResistance*100)+'%。</p><p>同时邻接多支敌军时，一次普攻输出按敌军数量均分，再分别计算克制、减伤和护盾；强化普攻只消耗一次。远射与战法按各自目标规则结算。攻击、武技、谋略和攻城已计入现役兵力。治疗只能救治本场伤兵。攻击与受击积累战意，友军溃败会使在场部队失去战意，附近部队受影响更大；战意达标自动施法，按各项战法的消耗结算；各战法独立冷却，同队施法间隔至少 4 日，调息期间可普攻。不同来源护盾独立到期，同源刷新，优先消耗最早到期层。</p></details>',
    (inBattle&&isDeploying(b)&&u.side===0&&['active','reserve'].includes(u.status)&&u.arrivalConfirmed!==false&&(u.arrivalTick||0)<=b.tick&&!detailPanels.hasSource?'<button class="button secondary" data-action="deployment-select" data-inspect="'+u.id+'">调整站位</button>':'')+'<button class="button primary" data-action="close">返回</button>',true);

}
function loadoutModal() {
  const units=loadoutUnits();if(!units.length)return modalShell('固定战法','暂无部队','');
  const u=units.find(u=>u.id===ui.loadoutUnit)||units[0];ui.loadoutUnit=u.id;
  const skills=unitTactics(u),grade=['C','B','A','S'][troopAptitude(u)];
  const options=units.map(a=>'<option value="'+a.id+'" '+(a.id===u.id?'selected':'')+'>'+a.name+' · '+TROOPS[a.type].name+'</option>').join('');
  const cards=skills.map((skill,i)=>'<article class="loadout-card compact-loadout"><header><b>优先级 '+(i+1)+'</b><span class="type-badge '+skill.category+'">'+(skill.special?'★ 专属':skill.learningTier==='low'?'小战法':'大战法')+'</span></header><h3>'+esc(skill.name)+'</h3><footer>每场 '+skill.maxUses+' 次 · 门槛 '+skill.threshold+' · 施放消耗 '+skill.intentCost+' · 冷却 '+skill.cooldown+' 日</footer><button class="unit-inspect-link" data-action="tactic-detail" data-inspect="'+u.id+'" data-skill="'+skill.id+'">战法说明</button></article>').join('');
  const ledger=LEARNING_TROOPS.map(type=>{const p=u.tacticLearning.byTroop[type];return '<li><b>'+TROOPS[type].name+' · '+['C','B','A','S'][troopAptitude(u,type)]+'</b><p>小战法：'+p.low.map(id=>TACTICS_BOOK[id].name).join('、')+'；大战法：'+(p.high.map(id=>TACTICS_BOOK[id].name).join('、')||'无')+'</p></li>';}).join('');
  return modalShell('部队固定战法','所有等级可用 · 适性与主将属性决定普通战法',
    '<div class="loadout-toolbar"><label>选择部队<select id="loadout-unit">'+options+'</select></label><span>'+growthLabel(u)+' · '+TROOPS[u.type].name+'适性 '+grade+'</span></div>'+
    '<p>S适性：武技小战法、谋略小战法、大战法各一项；A适性：一个小战法和一个大战法；B、C适性：一个小战法。</p>'+
    '<p>小战法先比较武力与智力，再比较统率与政治；均相同时，魅力≥50选择谋略，否则选择武技。专属额外携带，不限兵种。</p>'+
    '<h3>本场携带 · '+skills.length+' 项</h3><div class="loadout-grid">'+cards+'</div>'+
    '<details class="profile-disclosure"><summary>全部兵种固定配置</summary><ul>'+ledger+'</ul><p>升级兵种继承枪、戟、骑、弓适性与小战法，替换高级战法。携带船和兵器按当前形态使用战法，对应名额共享次数和冷却。</p></details>',
    '<button class="button primary" data-action="close">完成</button>',true);
}

function armyModal() {
  const army = selectedArmy(); if (!army) return '';
  const locked = !!state.battle || !!state.campaign&&!canEditArmy(state,army);
  const opts = Object.entries(TACTICS).map(([id, name]) => `<option value="${id}" ${army.tactic === id ? 'selected' : ''}>${name}</option>`).join('');
  const leaders = role => army.units.map(u => `<option value="${u.id}" ${army[role] === u.id ? 'selected' : ''}>${u.name}</option>`).join('');
  return modalShell('整军经武', 'LEGION MANAGEMENT · 军团编制', `<div class="roster-overview"><div><b>${esc(army.name)}</b><span>${cityById(state, army.location).name} · ${fmt(armyTroops(army))} 人</span></div><div class="roster-controls"><label>主将<select data-role="leader" ${locked ? 'disabled' : ''}>${leaders('leader')}</select></label><label>副将<select data-role="deputy" ${locked ? 'disabled' : ''}>${leaders('deputy')}</select></label><label>军师<select data-role="advisor" ${locked ? 'disabled' : ''}>${leaders('advisor')}</select></label></div></div><div class="info-strip">${icon('help')}${locked ? '战斗期间编制锁定。' : '驻城部队独立保存；出征时编组最多10队，通常首发最多6队，奸雄任军团长时7队，其余进入预备。枪戟克骑、骑克弓、弓克枪。携船部队入水使用船形态，登岸恢复兵种；攻城位置可展开携带兵器。'}主将提升攻防，副将提升武技威力，军师提升谋略威力。战法后数字为战意门槛，★ 为专用战法。</div>${bondsMarkup(army.units,{army})}<section class="commander-repertoire"><h3>军团军略 · ${armyStratagems(army).length} 种</h3><p class="muted">军团长提供军略；基础智力≥70的军师也提供，重复只计一次。副将及普通武将不解锁军略。开战从空条开始，在场智力计入任职特性后，每累计 12000 蓄满一条，使用后清空，不储存次数。</p>${armyCommanders(army).map(c=>`<div><b>${c.role==='leader'?'主将':'军师'} · ${c.name}</b><div class="repertoire-skills">${commanderStratagems(c).map(key=>`<span title="${esc(stratagemEffectText(selectStratagemSource(armyCommanders(army),key)))}">${STRATAGEMS[key].name}<small>满条施放 · ${stratagemEffectText(selectStratagemSource(armyCommanders(army),key))}</small></span>`).join('') || '暂无军略'}</div></div>`).join('')}</section><div class="roster-table"><div class="roster-table-head"><span>${[['first','首发'],['name','武将']].map(([k,n])=>sortButton('army',k,n,ui.armySort?.sort,ui.armySort?.direction)).join('')}</span><span>${[['leadership','统'],['force','武'],['intellect','智'],['politics','政']].map(([k,n])=>sortButton('army',k,n,ui.armySort?.sort,ui.armySort?.direction)).join('')}</span><span>${sortButton('army','type','所率兵种',ui.armySort?.sort,ui.armySort?.direction)}</span><span>${sortButton('army','formation','战场位置',ui.armySort?.sort,ui.armySort?.direction)}</span><span>${[['troops','兵力'],['wounded','伤兵']].map(([k,n])=>sortButton('army',k,n,ui.armySort?.sort,ui.armySort?.direction)).join('')}</span></div>${(ui.armySort?.sort?sortRows(army.units,ui.armySort.sort,ui.armySort.direction,(u,k)=>k==='type'?TROOPS[u.type].name:k==='formation'?({front:0,middle:1,back:2,left:3,right:4})[u.formation]:u[k]):army.units).map(u => `<div class="roster-row"><div><input type="checkbox" data-first="${u.id}" aria-label="${u.name}首发" ${u.first ? 'checked' : ''} ${locked ? 'disabled' : ''}>${avatar(u, true, 'unit-stats')}<div><button class="unit-inspect-link" data-action="unit-stats" data-inspect="${u.id}">${u.name} · ${officerLevel(u)} 级 ↗</button><small title="${esc(unitTactics(u).map(s=>`${s.name}：${s.description}；门槛 ${s.threshold}；冷却 ${s.cooldown} 日`).join(' / '))}">${unitTactics(u).map(s=>`${s.special ? '★' : ''}${s.name} ${s.threshold}`).join(' · ')}</small></div></div><div class="stat-trio"><span>${u.leadership}</span><span>${u.force}</span><span>${u.intellect}</span><span>${u.politics}</span></div><select data-type="${u.id}" aria-label="${u.name}兵种" ${locked ? 'disabled' : ''}>${troopTypes().map(key=>[key,TROOPS[key]]).map(([key, t]) => `<option value="${key}" ${u.type === key ? 'selected' : ''} ${state.campaign&&!canTrain(cityById(state,army.location),key)?'disabled':''}>${t.name}${state.campaign&&!canTrain(cityById(state,army.location),key)?'（本城未解锁）':''}</option>`).join('')}</select><select data-formation="${u.id}" aria-label="${u.name}位置" ${locked ? 'disabled' : ''}>${Object.entries({ front: '前排', middle: '中排', back: '后排', left: '左翼', right: '右翼' }).map(([key, name]) => `<option value="${key}" ${u.formation === key ? 'selected' : ''}>${name}</option>`).join('')}</select><div class="troop-count"><b>${fmt(u.troops)}<small> / ${fmt(troopCapacity(u))}</small></b><small>伤兵 ${fmt(u.wounded)}</small></div></div>`).join('')}</div>`, `<button class="button secondary" data-action="loadout">固定战法</button><button class="button secondary" data-action="split" ${locked || state.pending ? 'disabled' : ''}>拆分军团</button><button class="button secondary" data-action="merge" ${locked || state.pending ? 'disabled' : ''}>合并军团</button><button class="button primary" data-action="close">完成编制</button>`, true);
}
const modalScroll=createModalScrollMemory();
const detailPanels=createDetailPanels($('#overlay-root'));
const detailContext=()=>Object.fromEntries(['modal','textDetails','textDetailsTab','scenarioInspect','commandInspect','infoView','infoReturn','personnelReturn','militaryReturn','snapshotReturn','inspectionReturn','inspectBattleId'].map(key=>[key,ui[key]]).concat([['infoHistory',[...(ui.infoHistory||[])]]]));
function restoreDetailSource(context){Object.assign(ui,context);ui.scenarioInspect=!!context.scenarioInspect;}
for(const kind of ['click','input','change','keydown'])document.addEventListener(kind,event=>{const context=detailPanels.sourceContext(event.target);if(context)restoreDetailSource(context);},true);
function switchMapInspection(kind,id){
 if(!isObjectDetail(ui)||detailPanels.hasSource)return false;
 ui.textDetails=null;ui.textDetailsTab=0;ui.infoReturn=null;ui.infoHistory=[];ui.infoView={type:kind,id,objectOnly:true};ui.modal='campaign-info';return true;
}
function openMapInspection(kind,id){
 ui.mapObject=null;ui.infoReturn=ui.modal&&!isObjectDetail(ui)?ui.modal:ui.infoReturn;ui.infoHistory=[];ui.infoView={type:kind,id,objectOnly:true};
 openModal('campaign-info');
}
function modalScrollKey(){
 if(ui.textDetails)return JSON.stringify(['detail',ui.textDetails.title,ui.textDetails.groups[0]?.name,ui.textDetailsTab||0]);
 const name=ui.modal;if(!name)return null;
 const p=name==='scenario-setup'?ui.scenarioSetup:name==='campaign-picker'?ui.officerPick:name==='military-flow'?ui.militaryFlow:null;
 const filter=name==='scenario-setup'?p?.filter:['campaign-picker','campaign-personnel','city-personnel'].includes(name)?ui.personnel:null;
 return JSON.stringify([name,p?.step,p?.choosingMain,p?.choosingMain?null:p?.editorId,p?.choosingMain?null:p?.unitOfficer,p?.team,p?.task,p?.kind,p?.city,p?.armyId,filter?.query,filter?.city,filter?.status,filter?.page,
 name==='campaign-info'?[ui.infoView?.type,ui.infoView?.id,ui.infoView?.query]:null,
 name==='faction-directory'?[ui.factionDirectoryKind,ui.factionDirectories?.[ui.factionDirectoryKind]?.query]:null,
 name==='city-personnel'?ui.personnelCity:null,
 ['officers','custom-person-picker'].includes(name)?[ui.catalogQuery,ui.catalogKind,ui.catalogPage]:null,
 ['unit-stats','unit-officer','tactic-detail'].includes(name)?[ui.inspectUnit,name==='tactic-detail'?ui.inspectSkill:null]:null,
 name==='encounter-flow'?[ui.encounterFlow?.id,ui.encounterFlow?.step]:null]);
}
function renderModal() {
  const focusKey=detailPanels.panelRoot.contains(document.activeElement)?document.activeElement.dataset.controlKey:null;
  const mapCommand=ui.modal==='campaign-picker'&&ui.officerPick?.step==='target'&&['march','expedition'].includes(ui.officerPick.task);
  if(ui.mapCommandView&&!mapCommand){ui.mapCommandView=false;render();return;}
  modalScroll.capture(detailPanels.panelRoot);
  let html = '';
  if(ui.modal==='scout-report'){const report=scoutingReportMarkup(state,ui.scoutReport);html=modalShell(report.title,'沿路侦察报告',report.body,'<button class="button secondary" data-action="scout-open">返回侦察工作</button>',true);}
  if(ui.modal==='scouting')html=modalShell('侦察','斥候与周边敌情',scoutingMarkup(state,ui.scout),'',true);
  if(ui.modal==='diplomacy-interruption'){const r=ui.diplomaticInterruption;html=modalShell('外交委任','执行时机',`<p>${esc(r.name)}正在办理内政。立即执行将中止当前事务；完成后执行会保留等待安排。</p>`,`<button class="button primary" data-action="diplomacy-assign-now" data-direction="${r.direction}" data-officer="${r.officerId}">立即执行</button><button class="button secondary" data-action="diplomacy-assign-after" data-direction="${r.direction}" data-officer="${r.officerId}">完成后执行</button><button class="button secondary" data-action="close">取消</button>`,true);}
  if(state.testScenario&&ui.mode!=='lobby'&&state.battle?.reinforcementCouncil==='pending'&&!ui.modal){ui.modal='reinforcement-arrival';ui.paused=true;}
  if(ui.modal==='reinforcement-arrival')html=modalShell('援军抵达','战场暂停','<p>援军已加入后备，可进入军议调整后备顺序及撤离设置，在场部队保持原位。</p>','<button class="button primary" data-action="battle-reinforcement-council">军议</button><button class="button secondary" data-action="battle-reinforcement-continue">继续作战</button>',true);
  if(state.campaign&&ui.mode!=='lobby'&&activeBattles(state).some(r=>r.battle.reinforcementCouncil==='pending')&&!ui.modal){ui.modal='campaign-encounters';ui.paused=true;}
  if(state.campaign&&ui.mode!=='lobby'&&state.battle?.deploymentLocked&&activeBattles(state).some(r=>r.awaiting&&!ui.encounterNotices?.has(r.id))&&!ui.modal){ui.modal='campaign-encounters';ui.encounterNotices??=new Set();for(const r of activeBattles(state).filter(r=>r.awaiting))ui.encounterNotices.add(r.id);}
  if (ui.mode!=='lobby' && state.report && !['scenarios','settings','archives','archive-confirm'].includes(ui.modal)) ui.modal = 'report';
  else if (ui.mode!=='lobby' && state.pending && !ui.modal) ui.modal = 'encounter';
  if (ui.modal === 'gate' && state.battle?.siege) {
    const g=state.battle.siege.gate;
    html=modalShell('城门', 'SIEGE · 守方目标', `<p class="modal-intro">耐久 ${fmt(g.hp)} / ${fmt(g.maxHp)}。耐久归零，守方立即败北。</p><div class="info-strip">独立占据守方半场一格，不占部队出场名额；不移动、不攻击。攻方普通攻击可削减耐久，可用重兵合围提高攻击倾向。城门不承受部队战法，也不计入士兵伤亡。</div>`);
  }
  if (ui.modal === 'scenarios') html = scenarioModal();
  if(ui.modal==='stratagem-picker'&&state.battle)html=modalShell('选择军略','范围军略需选择落点 · 战斗已暂停','<div class="stratagem-picker">'+commands(state.battle)+'</div>','<button class="button secondary" data-action="close">取消</button>',true);
  if(ui.modal==='march-mode'){const a=state.armies.find(a=>a.id===ui.marchArmy);html=modalShell('行军方式','确认后生效',a?`<p>${a.name} · 士气 ${a.morale} · 携粮 ${Math.floor(a.supply)} / ${a.supplyCapacity}</p><p>${marchDescription(a)}</p><div class="button-row">${marchModes(a).map(m=>`<button class="button ${ui.marchChoice===m.id?'primary':'secondary'}" data-action="march-mode-select" data-mode="${m.id}">${m.name}</button>`).join('')}</div>`:'军团不存在','<button class="button secondary" data-action="close">取消</button><button class="button primary" data-action="march-mode-confirm">确认</button>',true);}
  if(ui.modal==='domestic-interruption')html=modalShell('事务冲突','选择时机',interruptionMarkup(state,ui.interruption),`<button class="button secondary" data-action="campaign-command-return">返回</button><button class="button secondary" data-action="campaign-order-choice" data-choice="now">立即执行</button><button class="button primary" data-action="campaign-order-choice" data-choice="after">办完执行</button>`,true);
  if(ui.modal==='faction-battle')html=modalShell('战场','本势力交战',battlesPanel({...state,campaign:{...state.campaign,battles:state.campaign.battles.filter(r=>r.id===ui.directoryBattle),archive:[]}},isPlanning(state)),'<button class="button secondary" data-action="directory-back">返回</button>',true);
  if(ui.modal==='faction-directory')html=modalShell('本势力 · '+FACTION_DIRECTORIES[ui.factionDirectoryKind],'总览',factionDirectoryMarkup(state,ui.factionDirectoryKind,ui.factionDirectories[ui.factionDirectoryKind]),'',true);
  if(ui.modal==='campaign-affairs')html=modalShell('势力事务','统一政令',factionAffairsMarkup(state,ui.affairsTab||'domestic'),'',true);
  if(ui.modal==='campaign-battles')html=modalShell('战役','当前交战与历史回放',battlesPanel(state,isPlanning(state)),'',true);
  if(ui.modal==='info-menu'){const info=campaignInfoMenu(ui.infoScope||'self');html=modalShell(info.title,'一览',info.body,'');}
  if(ui.modal==='campaign-info'){const info=campaignInfoMarkup(state,ui.infoView?.id?{...ui.infoView,objectOnly:true}:ui.infoView);html=modalShell(info.title,ui.infoView?.objectOnly?'对象详情':'天下情报 · 动向与详情',info.body,`${ui.infoHistory?.length?'<button class="button secondary" data-action="campaign-info-back">返回</button>':''}${['city','army'].includes(ui.infoView?.type)&&ui.infoView?.id?mapObjectActions(state,ui.infoView.type,ui.infoView.id):''}${ui.infoView?.objectOnly?'':'<button class="button secondary" data-action="campaign-info-home">返回名册</button>'}`,true);}
  if(ui.modal==='domestic-alerts')html=modalShell('战略奏报','每日记录中的重要事项 · 已暂停',domesticAlertsMarkup(state,pendingDomesticAlerts(state)), '<button class="button primary" data-action="close">确认</button>',true);
  if(ui.modal==='harvest-review'){const receipt=state.campaign.activity.nodes.find(n=>n.id===ui.harvestReviewId),nodes=state.campaign.activity.nodes.filter(n=>receipt?.result.nodeIds.includes(n.id));html=modalShell('本旬成果',`第 ${receipt?.result.turn||''} 旬 · 已暂停`,domesticAlertsMarkup(state,nodes),'<button class="button secondary" data-action="close">返回</button>',true);}
  if(ui.modal==='activity-record'){const p=ui.activityRecord,node=state.campaign.activity.nodes.find(n=>n.id===p.nodeId),name=node.officerId?OFFICER_BY_ID[node.officerId].name:mapNode(state,node.siteId)?.name||'战略';html=modalShell(name+' · 每日记录','原始记录 · 已暂停',node.officerId?officerActivityMarkup(state,node.officerId,p.beforeDay,node.id):siteActivityMarkup(state,node.siteId,p.beforeDay,node.id),`<button class="button secondary" data-action="close">${p.returnModal==='harvest-review'?'返回成果':'返回奏报'}</button>`,true);}
  if(ui.modal==='city-domestic')html=modalShell('城市内政','六方向 · 委任与办理进度',cityDomesticMarkup(state,ui.city),'<button class="button secondary" data-action="close">返回地图</button>',true);
  if(ui.modal==='city-personnel')html=modalShell((state.cities.find(c=>c.id===ui.personnelCity)?.name||'据点')+' · 武将','本据点人事',cityRosterMarkup(state,ui,ui.personnelCity),'',true);
  if(ui.modal==='campaign-personnel')html=modalShell('麾下武将','人事 · 全势力名册',campaignRosterMarkup(state,ui),'',true);
  if(ui.modal==='campaign-picker'){const p=ui.officerPick,route=commandRoute(state,p),a=p.task==='expedition'?{...cityForce(state.cities.find(c=>c.id===p.city)),units:p.selected.map(id=>state.cities.find(c=>c.id===p.city).units.find(u=>u.id===id)).filter(Boolean),leader:p.leader,advisor:p.advisor,deputy:p.deputy}:state.armies.find(a=>a.id===p.armyId);p.mapUI||={strategicMapView:ui.strategicMapView?{...ui.strategicMapView}:undefined};p.mapUI.city=p.destination||p.city;p.mapUI.army=p.armyId;p.mapUI.strategyTab=!p.destination&&p.task==='march'?'army':'city';const preview=a&&(route||p.mapRoute?.length)?{...a,location:route?.from||(p.task==='march'?(a.travel?.to||a.location):p.city),travel:null,route:route?.route||p.mapRoute,roadPolicy:p.policy}:a;const m=commandMarkup(state,ui,p.step==='target'?commandMap(state,p.mapUI,preview):'');if(mapCommand){ui.mapCommandView=true;detailPanels.clear();$('#app').removeAttribute('inert');document.body.classList.remove('modal-open');$('#app').innerHTML='<main class="map-command-screen"><header><h1>'+m.title+'</h1><p>'+m.subtitle+'</p></header>'+m.body+(m.footer?'<footer class="map-command-footer">'+m.footer+'</footer>':'')+'</main>';attachStrategicMap($('#app'),p.mapUI,renderModal);return;}html=modalShell(m.title,m.subtitle,m.body,m.footer,true);}
  if(ui.modal==='military-flow'){const m=militaryFlowMarkup(state,ui.militaryFlow);html=modalShell(m.title,'军团调度 · 逐步下令',m.body,m.footer,true);}
  if(ui.modal==='encounter-flow'){const m=encounterFlowMarkup(state,ui.encounterFlow);html=modalShell(m.title,'战线情报 · 战前准备',m.body,m.footer,true);}
  if (ui.modal === 'army') html = armyModal();
  if (ui.modal === 'loadout') html = loadoutModal();
  if (ui.modal === 'unit-stats') html = unitStatsModal();
  if (ui.modal === 'unit-officer') html = officerUnitModal();
  if (ui.modal === 'tactic-detail') html = tacticDetailModal();
  if (ui.modal === 'owned-officers') html = modalShell('麾下群英', 'OFFICERS · 武将名录', `<div class="field-sort-bar">${[['name','武将'],['leadership','统率'],['force','武力'],['intellect','智力'],['politics','政治'],['level','等级'],['loyalty','忠诚']].map(([k,n])=>sortButton('owned',k,n,ui.ownedSort?.sort,ui.ownedSort?.direction)).join('')}</div><div class="officer-grid">${sortRows(state.armies.filter(a=>a.faction===playerFaction(state)).flatMap(a=>a.units.map(u=>({a,u}))),ui.ownedSort?.sort,ui.ownedSort?.direction,({u},k)=>k==='loyalty'?state.campaign?.domestic.loyalty[u.id]??u.loyalty:u[k]).map(({a,u}) => `<article class="officer-card">${avatar(u,false,'unit-officer')}<div><h3>${u.name}<small>字 ${u.courtesy}</small></h3><span class="trait">${u.trait}</span><small class="officer-growth">${growthLabel(u)}</small></div><p>${unitTactics(u).map(s=>s.name).join(' · ')}<span>${TROOPS[u.type].name}</span></p><div class="officer-stats">${[['统率', u.leadership], ['武力', u.force], ['智力', u.intellect], ['政治', u.politics]].map(([n, v]) => `<div><b>${v}</b><small>${n}</small></div>`).join('')}</div><button class="button secondary full" data-action="unit-officer" data-inspect="${u.id}">属性</button><p class="officer-strategies">拥有军略：${officerStratagems(u.id).map(key=>STRATAGEMS[key].name).join(' · ') || '无'}<small>基础智力≥70，任军团长或军师时提供</small></p><footer>${esc(a.name)} · ${cityById(state, a.location).name}<span>忠诚 ${state.campaign?.domestic.loyalty[u.id]??u.loyalty}</span></footer></article>`).join('')}</div>`, '', true);
  if(ui.modal==='scenario-setup'){const m=scenarioSetupMarkup(ui.scenarioSetup,ui.scenarioSetup.sourceArmy?state:{});html=modalShell(m.title,'军团编制 · 逐步下令',m.body,m.footer,true);}
  if(ui.modal==='scenario-review'){const d=ui.customBattle,units=customParticipants(d).map(u=>({...u,name:OFFICER_BY_ID[u.id].name})),armies=customArmyColumns(d),columns=[{team:'ownTeam',label:'我军先遣',index:null},{team:'enemyTeam',label:'敌军先遣',index:null},...(d.reinforcements||[]).map((a,i)=>({team:a.side===0?'ownTeam':'enemyTeam',label:(a.side===0?'我军':'敌军')+' · '+a.name+' · '+arrivalLabel(a,units,armies),index:i}))];html=modalShell('战前核阅','参战军团',('<p>我方总预备兵 '+customTroopBudget(d).toLocaleString()+' 人 · 已编制 '+customBattleTotals(d,0).troops.toLocaleString()+' 人 · 可用 '+customReserveTroops(d).toLocaleString()+' 人</p>')+((d.events||[]).length?'<h3>定时战役事件</h3>'+(d.events||[]).map(e=>'<p>'+esc(battleEventSummary(e))+'<br>'+esc(BATTLE_EVENTS[e.kind].description)+'</p>').join(''):'')+columns.map(a=>{const p=newScenarioSetup(d,a.team,a.index);return '<h3>'+esc(a.label)+'</h3>'+combatComparison({},scenarioSetupUnits(p),p.roles,{prefix:a.label});}).join(''),'<button class="button secondary" data-action="close">返回编制</button><button class="button primary" data-action="scenario-launch-confirm">确认</button>',true);}
  if(ui.modal==='scenario-army-info'){const a=selectedArmy(),units=state.battle?.sides[0].units||a.units;html=modalShell(a?.name||'参战军团','军团情报',combatComparison(state,units,state.battle?{commanders:state.battle.sides[0].commanders}:a),'<button class="button primary" data-action="close">返回战场</button>',true);}
  if(ui.modal==='officers')html=modalShell('武将名录','OFFICERS · '+Object.keys(OFFICER_BY_ID).length+' 人',rosterMarkup({query:ui.catalogQuery,sort:ui.catalogSort,direction:ui.catalogDirection,kind:ui.catalogKind,page:ui.catalogPage,selected:ui.catalogSelected}),'<button class="button secondary" data-action="owned-officers">武将</button>',true);
  if(ui.modal==='catalog-detail'){
    const u=OFFICER_BY_ID[ui.catalogInspect];
    html=modalShell(u?.name||'武将资料','OFFICER · 人物档案',officerDetailMarkup(ui.catalogInspect,state.relationshipScores,state.relationshipTypes)+relationshipEditorMarkup(ui.catalogInspect,ui.relationshipPartner,state.relationshipScores,!!(state.battle&&!state.battle.result&&(state.battle.deploymentLocked||state.battle.tick>0)),state.relationshipTypes)+(u?passiveMarkup({...makeOfficer(u.id),level:1}):''),'<button class="button secondary" data-action="officers">返回</button>',true);
  }
  if (ui.modal === 'journal') html = modalShell('天下纪事', 'CHRONICLE · 军国大事', `<div class="journal">${intelligenceWorld(state).logs.map(l => `<div class="${l.type}"><span>第 ${l.turn} 旬</span><p>${esc(l.text)}</p></div>`).join('')}</div>`);
  if (ui.modal === 'settings') html = modalShell('游戏设置', `ARCHIVES · ${currentScenario()?.name||'战略原型'}`, `<p class="modal-intro">存档保存在当前浏览器。可保存、读取，或导出、导入 JSON 备份。</p><div class="settings-actions"><button data-action="save" ${ui.mode==='lobby'?'disabled':''} title="新建命名存档或覆盖已有存档">${icon('save')}保存</button><button data-action="load" title="查看手动存档与自动存档">${icon('scroll')}读取</button><button data-action="export" title="下载 JSON 文件">${icon('flag')}导出</button><button data-action="import" title="选择 JSON 文件">${icon('home')}导入</button></div><div class="settings-divider"></div><div class="reset-row"><div><b>重新开始</b><p>${state.testScenario?'恢复本役预设布阵与兵力。':'回到建安五年，重新逐鹿中原。'}</p></div><button class="button danger" data-action="${state.testScenario?'retry-scenario':'reset-confirm'}">${state.testScenario?'重开本役':'新开一局'}</button></div><input type="file" id="import-file" accept=".json,application/json" hidden>`);
  if(ui.modal==='archives')html=modalShell('游戏存档','ARCHIVES · 游戏存档',archiveListMarkup(),'<button class="button secondary" data-action="settings">返回设置</button>',true);
  if(ui.modal==='archive-confirm'&&ui.archiveConfirm){const q=ui.archiveConfirm;html=modalShell(q.kind==='delete'?'删除存档':'覆盖存档','ARCHIVES · 核阅确认',`<p>${q.kind==='delete'?'删除':'用当前进度替换'}「${esc(q.name)}」？</p><p class="muted">${q.kind==='delete'?'删除后无法恢复此手动存档。':'原存档内容会被当前进度替换。'}</p>`,`<button class="button secondary" data-action="archive-cancel">取消</button><button class="button ${q.kind==='delete'?'danger':'primary'}" data-action="archive-confirm">${q.kind==='delete'?'删除':'覆盖'}</button>`);}
  if (ui.modal === 'reset') html = modalShell('再起风云', 'NEW CAMPAIGN', '<p class="modal-intro">新开一局会更新普通模式自动存档。手动存档会保留；可先在设置中保存当前进度。</p>', '<button class="button secondary" data-action="settings">返回存档</button><button class="button primary" data-action="reset">新局</button>');
  if (ui.modal === 'help') html = modalShell('玩法说明','', '<ol class="guide-steps"><li><b>经营</b><p>委任城市内政负责人，武将自动办理事务。重要结果会暂停并呈报。</p></li><li><b>出征</b><p>在己方城市编制部队、任命军团指挥，再选择路线并确认。行军与供粮按世界日期推进。</p></li><li><b>交战</b><p>战前调整阵容；战中部队自动移动、攻击和施放战法。军略蓄满后可主动施放，随时暂停查看局势。</p></li><li><b>查看</b><p>悬停城市或军团查看概况，点击打开操作菜单。战斗日志记录实际结果；战果显示兵力损失与成长。</p></li></ol>');
  if (ui.modal === 'encounter' && state.pending) {
    const p = state.pending, city = cityById(state, p.cityId), attack = armyById(state, p.attackerId);
    const friendlyAttack = attack.faction === playerFaction(state), defenders = p.defenderIds.map(id => armyById(state, id));
    const own = friendlyAttack ? [attack] : defenders, enemy = friendlyAttack ? defenders : [attack];
    const ownN = own.reduce((n, a) => n + armyTroops(a), 0) + (city.owner === playerFaction(state) ? city.garrison : 0);
    const enemyN = enemy.reduce((n, a) => n + armyTroops(a), 0) + (city.owner !== playerFaction(state) && city.owner !== attack.faction ? city.garrison : 0);
    if (own[0]) ui.army = own[0].id;
    html = modalShell('两军相逢', `${city.name} · ${friendlyAttack ? '我军进攻' : '敌军来袭'}`, `<div class="encounter-symbol">${icon('sword')}</div><h3 class="encounter-title">${city.name}之战</h3><p class="center muted">旗鼓相望，兵锋已至。请君主部署诸将。</p><div class="encounter-versus"><div><span class="faction-token cao">曹</span><b>曹操军</b><strong>${fmt(ownN)}</strong></div><span>VS</span><div><span class="faction-token yuan">${FACTIONS[friendlyAttack ? p.defenderFaction : attack.faction].short}</span><b>${FACTIONS[friendlyAttack ? p.defenderFaction : attack.faction].name}军</b><strong>${fmt(enemyN)}</strong></div></div><div class="info-strip">平原战场 · 通常每方最多6队同时作战，奸雄统军可达7队 · 其余部队列入预备队</div>`, `<button class="button secondary" data-action="loadout">固定战法</button><button class="button secondary" data-action="army" ${own.length ? '' : 'disabled'}>战前编制</button><button class="button primary" data-action="start-battle">${icon('sword')}进入战场</button>`);
  }
  if (ui.modal === 'report' && state.report) {
    const r = state.report, won = r.winner === 0;
    html = modalShell(won ? '此战告捷' : r.winner === null ? '罢兵收军' : r.reason === '撤退' ? '全军收撤' : '此战失利', `${currentScenario()?.name || r.city+'之战'} · 战果呈报`, `<div class="report-seal ${won ? '' : 'lost'}">${won ? '捷' : r.winner === null ? '和' : '退'}</div><p class="center">${state.testScenario ? esc(r.reason) : r.captured ? `${r.city}现归${FACTIONS[r.owner].name}势力所有` : `${r.city}归属未变`} · 交战 ${battleDays(r.tick)} 天</p>${r.gate?`<div class="info-strip">${esc(r.reason)} · 城门耐久 ${fmt(r.gate.remaining)} / ${fmt(r.gate.initial)}</div>`:''}<table class="report-table"><thead><tr><th>战果</th><th>我军</th><th>敌军</th></tr></thead><tbody>${[['参战兵力', 'initial'], ['存活兵力', 'remaining'], ['伤兵', 'wounded'], ['阵亡', 'killed']].map(([name, key]) => `<tr><td>${name}</td><td>${fmt(r.stats[0][key])}</td><td>${fmt(r.stats[1][key])}</td></tr>`).join('')}</tbody></table><div class="info-strip">${state.testScenario ? '本场独立结算，战略进度不受影响。可重试本役，或返回选择其他战役。' : (won ? '战功：声望 +30，府库 +300。' : '未获胜的进攻军退回最近的己方城池。')+'伤兵在己方城池逐旬恢复。'}</div>${(r.growth||[]).some(g=>g.side===0)?`<h3 class="stats-section-title">武将成长</h3><div class="growth-report">${r.growth.filter(g=>g.side===0).map(g=>`<div><b>${esc(g.name)}</b><span>功绩 +${g.gained} · ${g.after>g.before?`${g.before} → ${g.after} 级`:`${g.after} 级`}</span><small>${esc(contributionText(g.contribution))}</small><small>${g.unlocked.length?`习得：${g.unlocked.map(esc).join("、")}`:g.after===10?"已满级":"继续积累功绩"}</small></div>`).join("")}</div>`:""}${state.finished ? `<div class="campaign-complete"><b>${state.finished === 'victory' ? '中原已定，天下归心！' : '城池尽失，此番霸业未成。'}</b><p>可在设置中开启新的征程。</p></div>` : ''}`, currentScenario()?.campaign ? (state.testScenario?.customBattle?'<button class="button secondary" data-action="custom-edit">调整阵容</button>':'')+'<button class="button primary" data-action="retry-scenario">同局重试</button><button class="button secondary" data-action="rematch-scenario">换局再战</button><button class="button secondary" data-action="lobby">首页</button>' : state.testScenario ? '<button class="button primary" data-action="retry-scenario">重开本局</button><button class="button secondary" data-action="scenarios">选择战役</button><button class="button secondary" data-action="exit-scenario">返回天下</button>' : '<button class="button primary full" data-action="close-report">返回天下</button>');
  }
  if (ui.modal === 'split') {
    const army = selectedArmy();
    html = modalShell('分兵立营', 'NEW LEGION · 拆分军团', `<p class="modal-intro">选中的武将将组成新军团。两支军团都需保留至少一名有兵力的武将。</p><div class="split-list">${army.units.map(u => `<label><input type="checkbox" data-split="${u.id}" ${ui.selectedSplit.has(u.id) ? 'checked' : ''}>${avatar(u, true)}<b>${u.name}</b><span>${fmt(u.troops)} 人</span></label>`).join('')}</div>`, '<button class="button secondary" data-action="army">返回编制</button><button class="button primary" data-action="confirm-split">组建军团</button>');
  }
  if (ui.modal === 'merge') {
    const army = selectedArmy(), others = state.armies.filter(a => a.id !== army.id && a.faction === playerFaction(state) && a.location === army.location && !a.route.length);
    html = modalShell('合兵一处', 'MERGE LEGIONS', `<p class="modal-intro">将同城军团的全部武将、部队与粮草并入${esc(army.name)}。</p><div class="settings-actions">${others.map(a => `<button data-merge="${a.id}">${esc(a.name)}<span>${a.units.length} 名武将 · ${fmt(armyTroops(a))} 人 → 合并</span></button>`).join('') || '<p class="muted">同城暂无可合并的军团。</p>'}</div>`, '<button class="button secondary" data-action="army">返回编制</button>');
  }
  if(ui.modal==='campaign-encounters'&&state.campaign)html=modalShell('战线军议','全局暂停',activeBattles(state).filter(r=>r.awaiting||r.battle.reinforcementCouncil==='pending').map(r=>`<article class="strategy-battle-card"><h3>${r.battle.reinforcementCouncil?'援军抵达 · ':''}${esc(r.name)}</h3><p>${r.battle.reinforcementCouncil?'援军已加入后备，可调整顺序与撤离设置，在场部队保持原位。':'请确认本战指挥方式。'}</p>${canPrepareSiegeDefense(state,r)?`<button class="button secondary" data-action="campaign-defense-prepare" data-battle="${r.id}">守城编制</button>`:''}<button class="button primary" data-action="${r.battle.reinforcementCouncil?'campaign-focus':'campaign-prepare'}" data-battle="${r.id}">军议</button>${r.battle.reinforcementCouncil?`<button class="button secondary" data-action="reinforcement-continue" data-battle="${r.id}">继续作战</button>`:''}</article>`).join(''));
  if(ui.modal==='campaign-archive'&&state.campaign){const r=intelligenceWorld(state).campaign.archive.find(r=>r.id===ui.campaignHistory);if(r)html=modalShell(campaignBattleName(r),'战役战报',`<p>发生时间：${esc(campaignBattleDate(state,r.startedDay))}</p><p>结束时间：${esc(campaignBattleDate(state,r.endedDay))}</p><p>${r.winner?esc(FACTIONS[r.winner].name)+'获胜':'双方收兵'} · ${esc(r.reason)}</p><p class="muted">该战役仅保留战报摘要。</p>`,'',true);}
  if(ui.modal==='campaign-replay'&&state.campaign){const r=battleRecord(intelligenceWorld(state),ui.campaignHistory);if(r)html=modalShell(campaignBattleName(r),'历史回放 · 只读',replayMarkup(state,r,ui.replayIndex||0,ui.replayPlaying),'',true);}
  if(ui.modal==='campaign-history'&&state.campaign){const r=battleRecord(intelligenceWorld(state),ui.campaignHistory);if(r)html=modalShell(campaignBattleName(r),'每日快照 · 只读',snapshotMarkup(state,r,ui.campaignSnapshotDay,ui.snapshotSort),'',true);}
  html=ui.textDetails?modalShell(ui.textDetails.title,'详情',detailTable(ui.textDetails,ui.textDetailsTab||0),'<button class="button secondary" data-action="close">返回</button>',true):compactDescriptions(html);
  const overlay=detailPanels.render(html,detailContext());
  modalScroll.restore(detailPanels.panelRoot,html?modalScrollKey():null,overlay.restored);
  art.decorate($('#overlay-root'));
  if(ui.modal==='campaign-picker'&&ui.officerPick.step==='target')attachStrategicMap(detailPanels.panelRoot,ui.officerPick.mapUI,renderModal);
  document.body.classList.toggle('modal-open',overlay.blocking);
  $('#app').toggleAttribute('inert',overlay.blocking);
  if(html){if(state.battle)ui.paused=true;const focus=focusKey&&[...detailPanels.panelRoot.querySelectorAll('[data-control-key]')].find(el=>el.dataset.controlKey===focusKey);(focus||detailPanels.panelRoot.querySelector('button:not([disabled])'))?.focus({preventScroll:true});}
}
let musterRenderFrame=null;
function renderMusterChange(el){
 if(!el.closest('.unit-muster,.troop-slider')){renderModal();return;}
 // Let a blur's click or Tab reach its destination before restoring focus.
 if(musterRenderFrame!==null)cancelAnimationFrame(musterRenderFrame);
 musterRenderFrame=requestAnimationFrame(()=>{musterRenderFrame=null;renderModal();});
}
function openModal(name) { if(!['unit-stats','unit-officer','tactic-detail'].includes(name))ui.commandInspect=false;ui.textDetails=null;ui.textDetailsTab=0;ui.modal = name; if (state.battle) ui.paused = true; renderModal(); if (state.battle&&ui.mode!=='lobby') updateBattle(); }
function closeModal() {
 if(!ui.textDetails&&isObjectDetail(ui)&&detailPanels.hasSource){restoreDetailSource(detailPanels.returnContext());renderModal();if(state.battle&&ui.mode!=='lobby')updateBattle();return;}
 if(ui.modal==='diplomacy-interruption'){ui.diplomaticInterruption=null;openModal('campaign-affairs');return;}
 if(ui.modal==='campaign-affairs'&&ui.diplomacyReportReturn){ui.diplomacyReportReturn=false;openModal('domestic-alerts');return;}
 if(ui.modal==='activity-record'){const target=ui.activityRecord?.returnModal||'domestic-alerts';ui.activityRecord=null;openModal(target);return;}
 if(ui.modal==='domestic-alerts'){acknowledgeDomesticAlerts(state,ui.domesticAlertIds||[]);ui.domesticAlertIds=[];ui.paused=false;ui.lastTime=performance.now();save();} if(ui.modal==='faction-battle'&&!ui.textDetails){openModal('faction-directory');return;}if(['campaign-history','campaign-replay','campaign-archive'].includes(ui.modal)&&ui.snapshotReturn&&!ui.textDetails){const target=ui.snapshotReturn;ui.snapshotReturn=null;openModal(target);return;} if(ui.modal==='campaign-info'&&!ui.textDetails){const target=ui.infoReturn;ui.infoReturn=null;if(target){openModal(target);return;}}  if(ui.textDetails){ui.textDetails=null;ui.textDetailsTab=0;renderModal();return;} if(ui.modal==='archive-confirm'){ui.archiveConfirm=null;openModal('archives');return;}if(ui.modal==='archives'){ui.modal=null;render();return;} if(ui.scenarioInspect){ui.scenarioInspect=false;openModal('scenario-setup');return;}if(ui.modal==='scenario-setup')ui.scenarioSetup=null; if(ui.militaryReturn&&['unit-stats','unit-officer','tactic-detail'].includes(ui.modal)){const target=ui.militaryReturn;ui.militaryReturn=null;openModal(target);return;} if(['military-flow','encounter-flow'].includes(ui.modal)){ui.militaryFlow=null;ui.encounterFlow=null;}  if(['unit-officer','unit-stats','tactic-detail'].includes(ui.modal)&&['campaign-picker','city-domestic','city-personnel','campaign-personnel'].includes(ui.personnelReturn)){openModal(ui.personnelReturn);return;} if(ui.modal==='domestic-interruption'&&ui.officerPick){ui.interruption=null;openModal('campaign-picker');return;} if(ui.modal==='campaign-picker'){ui.officerPick=null;ui.personnelReturn=null;if(ui.commandReturn){const target=ui.commandReturn;ui.commandReturn=null;openModal(target);return;}} if(ui.mode==='lobby'){ui.modal=null;render();return;} if (state.report) return closeReport(); ui.modal = state.pending ? 'encounter' : null; save(); render(); }
function closeReport() { if (currentScenario()?.campaign) return showLobby(); if (state.testScenario) { ui.modal = 'scenarios'; renderModal(); return; } state.report = null; ui.modal = null; ui.city = selectedArmy()?.location || playerHome(state); save(); render(); }
function act(action, el) {
 if(action==='bond-overview'){ui.textDetails=bondOverview();ui.textDetailsTab=0;renderModal();return;}
 if(action==='ability-reference'||action==='tactic-detail'){const data=el.dataset.details?JSON.parse(el.dataset.details):abilityReference(action==='tactic-detail'?'tactic':el.dataset.kind,el.dataset.id||el.dataset.skill);if(data){if(action==='tactic-detail'){const u=inspectionUnits().find(u=>u.id===el.dataset.inspect),skill=TACTICS_BOOK[el.dataset.skill];if(u&&skill){const {unit,battle}=inspectContext(u);data.groups[0].rows.push(['威力','',tacticPowerPreview(skill,statusPower(unit,skill,battle))],['施放次数','',inspectionBattle()?'剩余 '+tacticUsesLeft(unit,skill)+'/'+tacticUseLimit(unit,skill)+' 次':'每场 '+skill.maxUses+' 次']);if(inspectionBattle())data.groups[0].rows.push(['当前限制','',tacticCondition(unit,skill,battle)]);}}if(el.dataset.effect)data.groups[0].rows.push(['当前效果','',el.dataset.effect]);ui.textDetails=data;ui.textDetailsTab=0;renderModal();}return;}

 if(action==='text-details'){ui.textDetails=JSON.parse(el.dataset.details);ui.textDetailsTab=0;renderModal();return;}
 if(action==='text-details-tab'){ui.textDetailsTab=Number(el.dataset.index);renderModal();return;}
 if(action==='map-city-inspect'){if(!cityVisible(state,el.dataset.town||ui.city)){ui.infoView={type:'city',id:el.dataset.town||ui.city,objectOnly:true};openModal('campaign-info');return;}ui.city=el.dataset.town||ui.city;ui.strategyTab=isJunction(state,ui.city)?'node':'city';ui.modal=null;ui.mapObject=null;ui.mapPanelOpen=false;render();$('#app [data-map-view="city"]')?.click();return;}
  if(action==='map-object-close'){ui.mapObject=null;render();return true;}
 if(action==='map-object-manage'){if(el.dataset.kind==='army'){ui.army=el.dataset.id;ui.strategyTab='army';}else if(el.dataset.kind==='city'){ui.city=el.dataset.id;ui.strategyTab='city';}ui.modal=null;ui.mapObject=null;ui.mapPanelOpen=true;render();return true;}
 if(action==='city-domestic'){ui.city=el.dataset.town||ui.city;ui.mapObject=null;openModal('city-domestic');return true;}
 if(action==='combat-page'){setCombatPage(el.dataset.group,el.dataset.page);renderModal();return;}
  if(action==='scenario-setup-open'){
    if(!Number.isSafeInteger(ui.customBattle.seed)||ui.customBattle.seed<0||ui.customBattle.seed>0xffffffff)return toast('请先设置有效随机种子');
    ui.scenarioSetup=newScenarioSetup(ui.customBattle,el.dataset.team,el.dataset.reinforcement===undefined?null:Number(el.dataset.reinforcement));ui.scenarioInspect=false;return openModal('scenario-setup');
  }
  if(action==='army'&&state.battle){
    if(state.testScenario&&isDeploying(state.battle)){ui.scenarioSetup=newBattleSetup(state,selectedArmy().id);ui.scenarioInspect=false;return openModal('scenario-setup');}
    return openModal('scenario-army-info');
  }
  if(action==='task-picker-tab'||action==='task-picker-traits'){const filter=el.dataset.scope==='faction-directory'?ui.factionDirectories[ui.factionDirectoryKind]:scope==='scenario'?ui.scenarioSetup.filter:(ui.personnel??={});if(action==='task-picker-tab')filter.tab=el.dataset.tab;else filter.traitPage=Math.max(0,Number(el.dataset.page)||0);renderModal();return;}
  if(action==='troop-min'||action==='troop-max'){const input=el.closest('.troop-slider')?.querySelector('input');if(input&&!input.disabled){input.value=action==='troop-min'?input.min:input.max;input.dispatchEvent(new Event('change',{bubbles:true}));}return;}
  if(action==='scenario-unit-choose'||action==='scenario-unit-picker-back'){ui.scenarioSetup.choosingMain=action==='scenario-unit-choose';renderModal();return;}
  if(action==='scenario-unit-disband'){const p=ui.scenarioSetup;if(p.sourceArmy)return;changeScenarioSetup(p,'selected',el.dataset.id,false);if(p.editorId===el.dataset.id)p.editorId=null;renderModal();return;}
  if(action==='scenario-unit-edit'||action==='scenario-unit-list'){const p=ui.scenarioSetup;if(action==='scenario-unit-edit'&&!p.selected.includes(el.dataset.id))return;Object.assign(p,{step:action==='scenario-unit-edit'?'formation':'unit-review',editorId:el.dataset.id||null,choosingMain:false});renderModal();return;}
  if(action==='scenario-unit-new'){Object.assign(ui.scenarioSetup,{editorId:null,step:'formation',choosingMain:false});renderModal();return;}
  if(action==='scenario-unit-save'){const error=saveScenarioUnit(ui.scenarioSetup);if(error)toast(error);renderModal();return;}
  if(action==='scenario-setup-page'){ui.scenarioSetup.filter.page=Math.max(0,Number(el.dataset.page)||0);renderModal();return;}
  if(action==='scenario-setup-unit-detail'){ui.scenarioInspect=true;ui.personnelReturn=null;ui.inspectUnit=el.dataset.officer||el.dataset.id;return openModal('unit-stats');}
  if(action==='scenario-setup-detail'){ui.scenarioInspect=true;ui.personnelReturn=null;ui.inspectUnit=el.dataset.officer||el.dataset.id;return openModal('unit-officer');}
  if(action==='scenario-setup-cancel'){ui.scenarioSetup=null;ui.scenarioInspect=false;ui.modal=null;render();return;}
  if(action==='scenario-setup-move'){const p=ui.scenarioSetup,ids=p.armySelected??p.selected,i=ids.indexOf(el.dataset.id),j=i+Number(el.dataset.offset);if(i>=0&&j>=0&&j<ids.length)[ids[i],ids[j]]=[ids[j],ids[i]];renderModal();return;}
  if(['scenario-setup-next','scenario-setup-back','scenario-setup-step'].includes(action)){
    const p=ui.scenarioSetup,steps=scenarioSetupSteps(p),index=steps.indexOf(p.step),error=scenarioSetupError(p);
    if(action==='scenario-setup-next'&&error)return toast(error);
    const target=action==='scenario-setup-step'?steps.indexOf(el.dataset.step):index+(action==='scenario-setup-next'?1:-1);
    if(target>=0&&target<steps.length&&(action!=='scenario-setup-step'||target<index)){p.step=steps[target];setCombatPage('combat-本军',p.step==='commanders'?'appointments':'units');}renderModal();return;
  }
  if(action==='scenario-setup-confirm'){
    const p=ui.scenarioSetup,error=scenarioSetupError(p);if(error)return toast(error);
    try{if(p.sourceArmy){state=applyBattleSetup(state,p);save();}else{ui.customBattle=scenarioSetupDraft(p);saveCustomDraft();}ui.scenarioSetup=null;ui.modal=null;render();}catch(e){toast(e.message);}return;
  }
  if(action==='art-mode'){art.toggle();render();return;}
 if(action==='unit-workbench-preview'){const p=ui.modal==='scenario-setup'?ui.scenarioSetup:ui.officerPick;if(p){p.workbench={id:el.dataset.id,tab:el.dataset.tab||p.workbench?.tab||'unit'};renderModal();}return;}
  if(state.campaign&&handleCampaignAction(action,el))return;
  if(state.campaign&&['relationship-save','relationship-reset'].includes(action)&&activeBattles(state).length)return toast('交战期间人物关系锁定');

  if(action==='campaign-category'){ui.historySelection=el.dataset.category==='tactical'?'tactical-control-lv':'history-guandu';render();return;}
  if(action==='rematch-scenario')return launchScenario(state.testScenario.id,crypto.getRandomValues(new Uint32Array(1))[0],state.testScenario.shieldPercent,state.testScenario.officerIds||null,state.testScenario.customBattle);
  if(action==='historical-template'){ui.customBattle=historicalBattleDraft(el.dataset.history);refreshCustomDraft();document.querySelector('.custom-battle')?.scrollIntoView({behavior:'smooth',block:'start'});toast('已载入历史战役，可调整双方军团后开战');return;}
  if(action==='launch-custom'){try{validateCustomBattle(ui.customBattle);openModal('scenario-review');}catch(e){toast(e.message);}return;}
  if(action==='scenario-launch-confirm')return launchScenario('custom-battle',ui.customBattle.seed,ui.customBattle.shieldPercent??20,null,ui.customBattle);
  if(action==='custom-setup'){showLobby('custom');return;}
  if(action==='preset-edit'){ui.customBattle=scenarioDraft(el.dataset.scenario);refreshCustomDraft();showLobby('custom');return;}
  if(action==='custom-reinforcement-add'){
    const used=new Set(customParticipants(ui.customBattle).map(u=>u.id)),officer=Object.values(OFFICER_BY_ID).find(u=>!used.has(u.id));if(!officer)return toast('暂无未参战武将');
    ui.customBattle.reinforcements??=[];ui.customBattle.reinforcements.push({side:1,name:'援军'+(ui.customBattle.reinforcements.length+1),tick:Math.min(battleSteps(2),Math.max(0,(ui.customBattle.limit??480)-1)),team:[{id:officer.id,type:highestAptitudeTroop(officer,battleTroopTypes(ui.customBattle.terrain)),troops:Math.min(3000,troopCapacity({...officer,level:5})),level:5}],roles:{leader:officer.id,advisor:officer.id,deputy:null}});refreshCustomDraft();return;
  }
  if(action==='custom-reinforcement-remove'){removeCustomReinforcement(ui.customBattle,Number(el.dataset.index));refreshCustomDraft();return;}
  if(action==='custom-event-add'){ui.customBattle.events??=[];if(ui.customBattle.events.length<32)ui.customBattle.events.push({kind:'supply-cut',side:1,tick:Math.min(48,(ui.customBattle.limit??480)-1),duration:BATTLE_EVENTS['supply-cut'].duration});refreshCustomDraft();return;}
  if(action==='custom-event-remove'){ui.customBattle.events.splice(Number(el.dataset.index),1);refreshCustomDraft();return;}
  if(action==='battle-reinforcement-council'){const error=openReinforcementCouncil(state.battle);if(error)return toast(error);ui.paused=true;ui.modal=null;save();render();return;}
  if(action==='battle-reinforcement-continue'){const error=confirmReinforcementCouncil(state.battle);if(error)return toast(error);ui.modal=null;ui.paused=false;ui.lastTime=performance.now();save();render();return;}
  if(action==='custom-wave-add'){ui.customBattle.waves??=[];if(ui.customBattle.waves.length<4)ui.customBattle.waves.push({count:1,tick:(ui.customBattle.waves.at(-1)?.tick??0)+25});refreshCustomDraft();return;}
  if(action==='custom-wave-remove'){ui.customBattle.waves.splice(Number(el.dataset.index),1);refreshCustomDraft();return;}
  if(action==='custom-edit'){ui.customBattle=structuredClone(state.testScenario.customBattle);ui.customBattle.seed=state.testScenario.seed;saveCustomDraft();showLobby('custom');return;}
  if(action==='custom-swap'){try{ui.customBattle=swapCustomBattle(ui.customBattle);refreshCustomDraft();}catch(e){toast(e.message);}return;}
  if(action==='lobby')return showLobby();
  if(action==='campaign-lobby')return showLobby('custom');
  if(action==='strategy'){ui.nationalDraft??={step:'scenario'};return showLobby('national');}
  if(action==='select-national-scenario'){if(!nationalScenario(el.dataset.scenario))return;const old=ui.nationalDraft;ui.nationalDraft={step:'faction',scenarioId:el.dataset.scenario,faction:old?.scenarioId===el.dataset.scenario?old.faction:null};render();window.scrollTo(0,0);return;}
  if(action==='national-back'){ui.nationalDraft.step='scenario';render();window.scrollTo(0,0);return;}
  if(action==='select-national-faction'){if(!nationalScenario(ui.nationalDraft?.scenarioId)?.factions.includes(el.dataset.faction))return;ui.nationalDraft.faction=el.dataset.faction;render();return;}
  if(action==='continue-national'){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return toast('尚无普通模式存档');state=validateSave(JSON.parse(raw));restoreUI();}catch{toast('存档不兼容，请重新开始');}return;}
  if(action==='launch-national'){const draft=ui.nationalDraft;if(draft?.step!=='faction'||!nationalScenario(draft.scenarioId)?.factions.includes(draft.faction))return;state=newGame(draft.scenarioId,draft.faction);ui.strategicMapView=null;ui.strategyTab='city';restoreUI();save();return;}
  if(action==='select-history'){ui.historySelection=el.dataset.scenario;render();document.querySelector(`[data-action="select-history"][data-scenario="${ui.historySelection}"]`)?.focus({preventScroll:true});return;}
  if(action==='launch-history')return launchScenario(el.dataset.scenario);
  if(action==='continue-history')return continueHistory();
  if(action==='inspect-building'){const b=state.battle,g=[...(b?.siege?.gate?[b.siege.gate]:[]),...(b?.buildings||[])].find(a=>a.id===el.dataset.building);if(g)g.type==='gate'?openModal('gate'):toast(g.name+' · 耐久 '+fmt(g.hp)+' / '+fmt(g.maxHp));return;}
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
  if (action === 'scenarios') return showLobby('custom');
  if (action === 'launch-scenario') { const raw = $('#scenario-seed').value.trim(); return launchScenario(el.dataset.scenario, raw === '' ? undefined : Number(raw), Number($('#scenario-shield').value)); }
  if (action === 'retry-scenario') return launchScenario(state.testScenario.id, state.testScenario.seed, state.testScenario.shieldPercent, state.testScenario.officerIds||null,state.testScenario.customBattle);
  if (action === 'exit-scenario') return exitScenario();
  if (action === 'step-scenario') {
    if (!state.testScenario || !state.battle || isDeploying(state.battle)) return;
    ui.paused = true;
    for (let i=0; i<Number(el.dataset.steps) && !state.battle.result; i++) stepBattle(state.battle);
    if (state.battle.result) { settleBattle(state); ui.modal='report'; render(); } else updateBattle();
    save(); return;
  }
  if (action === 'home') { if (!state.pending && !state.report) ui.modal = null; render(); }
  else if(action==='battle-log-filter'){ui.battleLogFilter=el.dataset.kind;updateBattle();}
  else if(action==='battle-panel') { if(el.dataset.panel==='commands'){ui.battlePanel=null;openModal('stratagem-picker');return;} ui.battlePanel=ui.battlePanel===el.dataset.panel?null:el.dataset.panel; if(['commands','events'].includes(ui.battlePanel)) ui.paused=true; updateBattle(); }
  else if(action==='close-battle-panel') { ui.battlePanel=null; updateBattle(); }
  else if(action==='cancel-focus') { ui.focusMode=false; updateBattle(); }
  else if(action==='choose-stratagem') {ui.battlePanel=null;openModal('stratagem-picker');}
  else if(action==='unit-stats'){if(ui.focusMode&&state.battle&&!isObjectDetail(ui)&&el.classList.contains('unit-nameplate')){const error=issueCommand(state.battle,'focus',el.dataset.inspect);if(!error)ui.focusMode=false;toast(error||'已提高该敌军的目标权重');save();updateBattle();return;}ui.inspectUnit=el.dataset.inspect||ui.inspectUnit;openModal('unit-stats');}
  else if(action==='deployment-select'){const u=state.battle?.sides[0].units.find(u=>u.id===el.dataset.inspect&&['active','reserve'].includes(u.status));if(!isDeploying(state.battle)||!u)return;closeModal();ui.deploymentSelection=u.id;updateBattle();}
  else if(action==='unit-officer'){ui.inspectUnit=el.dataset.inspect||ui.inspectUnit;openModal('unit-officer');}
  else if(action==='tactic-detail'){ui.inspectionReturn=ui.modal;ui.inspectUnit=el.dataset.inspect;ui.inspectSkill=el.dataset.skill;openModal('tactic-detail');}
  else if(action==='inspection-back'){if(ui.inspectionReturn)openModal(ui.inspectionReturn);else closeModal();}
  else if(action==='loadout')openModal('loadout');


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
  else if(action==='retreat-batch-apply'){const value=$('[data-retreat-batch]').value,ids=ui.retreatBattleId===state.battle?.id?ui.retreatSelected:[];const error=configureCouncilRetreat(state.battle,ids,value===''?null:Number(value));if(error)toast(error);else{syncCouncilDraft();save();}updateBattle();}
  else if (action === 'pause' || action === 'tactical-pause') { if(ui.areaDraft){toast('请先确认或取消军略选区');return;} if(isReinforcementCouncil(state.battle)){confirmReinforcementCouncil(state.battle);ui.deploymentSelection=null;ui.paused=false;} else if (isDeploying(state.battle)) { const error=lockDeployment(state.battle);if(error){toast(error);return;} ui.deploymentSelection = null; ui.paused = false; } else ui.paused = !ui.paused; if(!ui.paused) ui.battlePanel=null; ui.lastTime = performance.now(); updateBattle(); save(); }
  else if(action==='show-council'){const council=$('.battle-council details');if(council){council.open=true;council.scrollIntoView({behavior:'smooth',block:'center'});}}
  else if(action==='council-order'){const error=changeBattleCouncil(state.battle,{id:el.dataset.id,offset:Number(el.dataset.offset)});if(error)toast(error);else{ui.deploymentSelection=null;syncCouncilDraft();save();}updateBattle();}
  else if (action === 'reset-deployment') { const error = resetDeployment(state.battle); if (error) toast(error); else { ui.deploymentSelection = null; updateBattle(); save(); } }
  else if (action === 'speed') { ui.speed = ui.speed === 4 ? .5 : ui.speed * 2; updateBattle(); }
  else if (action === 'effects-mode') { ui.effectMode = ui.effectMode === 'clear' ? 'full' : 'clear'; try { localStorage.setItem('sango-effects-mode',ui.effectMode); } catch {} updateBattle(); }
  else if (action === 'zoom-in') { ui.zoom = Math.min(2, ui.zoom + .25); render(); }
  else if (action === 'zoom-out') { ui.zoom = Math.max(1, ui.zoom - .25); render(); }
  else if (action === 'zoom-reset') { ui.zoom = 1; render(); }
  else if (action === 'toggle-armies') { ui.showArmies = !ui.showArmies; render(); }
  else if (action === 'save'||action === 'load') openArchives();
  else if(action==='archive-create'){
    if(ui.mode==='lobby')return;
    ui.archiveName=$('#archive-name')?.value||'';
    try{writeArchive(localStorage,{name:ui.archiveName,data:state.campaign?serializeCampaign(state):JSON.stringify(state)},validateSave);renderModal();toast('手动存档已保存');}
    catch(error){toast(error.name==='QuotaExceededError'?'浏览器空间不足，请导出或删除不需要的手动存档':`保存失败：${error.message}`);}
  }
  else if(action==='archive-load'){
    try{const next=readArchive(localStorage,el.dataset.key,validateSave);state=next;restoreUI();save();toast('已读取所选存档，游戏已暂停');}
    catch(error){toast(`读取失败：${error.message}`);}
  }
  else if(action==='archive-overwrite'||action==='archive-delete'){
    if(action==='archive-overwrite'&&ui.mode==='lobby')return;
    try{const entry=listArchives(localStorage,validateSave).find(x=>x.key===el.dataset.key&&!x.automatic);if(!entry)return;ui.archiveName=$('#archive-name')?.value||ui.archiveName;ui.archiveConfirm={key:entry.key,name:entry.name,kind:action==='archive-delete'?'delete':'overwrite'};openModal('archive-confirm');}
    catch(error){toast(`无法选择存档：${error.message}`);}
  }
  else if(action==='archive-cancel'){ui.archiveConfirm=null;openModal('archives');}
  else if(action==='archive-confirm'){
    const q=ui.archiveConfirm;if(!q)return;
    try{if(q.kind==='delete')deleteArchive(localStorage,q.key);else{if(ui.mode==='lobby')return;writeArchive(localStorage,{key:q.key,name:q.name,data:state.campaign?serializeCampaign(state):JSON.stringify(state)},validateSave);}ui.archiveConfirm=null;openModal('archives');toast(q.kind==='delete'?'手动存档已删除':'手动存档已更新');}
    catch(error){toast(error.name==='QuotaExceededError'?'浏览器空间不足，原存档已保留':`操作失败：${error.message}`);}
  }
  else if (action === 'export') {
    const url = URL.createObjectURL(new Blob([state.campaign?serializeCampaign(state):JSON.stringify(state, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = state.testScenario ? `君临-${currentScenario()?.campaign?'战役':'试炼'}-${state.testScenario.id}.json` : `君临-第${state.turn}旬.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('存档已导出');
  }
  else if (action === 'import') $('#import-file').click();
  else if (action === 'reset-confirm') openModal('reset');
  else if (action === 'reset') { closeModal();showLobby('national'); }
  else if (action === 'close-report') closeReport();
  else if (action === 'split') { ui.selectedSplit.clear(); openModal('split'); }
  else if (action === 'confirm-split') { const error = state.campaign?splitCampaignArmy(state,selectedArmy().id,[...ui.selectedSplit]):splitArmy(state, selectedArmy().id, [...ui.selectedSplit]); if (error) toast(error); else { save(); openModal('army'); toast('新军团已组建，可在军团选择框中切换'); } }
}
function march(target) { const error = orderArmy(state, selectedArmy()?.id, target); if (error) toast(error); else { ui.order = false; save(); render(); toast('军令已下达，结束回合后开始行军'); } }
function restoreUI() { ui.encounterNotices=new Set(); ui.areaDraft=null; ui.mode='map';ui.battlePanel=null; history.replaceState(null, '', location.pathname + location.search + (currentScenario()?.campaign ? '#historical-battle' : state.testScenario ? '#battle-lab' : '#strategy')); ui.army = (state.armies.find(a => a.faction === playerFaction(state) && a.units.some(u=>OFFICER_BY_ID[u.id]?.sourceId===FACTIONS[playerFaction(state)]?.leaderSourceId))||state.armies.find(a => a.faction === playerFaction(state)))?.id; ui.city = selectedArmy()?.location || playerHome(state); ui.paused = true; ui.modal = state.report ? 'report' : state.pending ? 'encounter' : null; ui.order = false; ui.focusMode = false; ui.deploymentSelection = null; ui.zoom = 1;ui.strategicMapView=null;ui.mapFocusKey=null;ui.mapCameraManual=false; render(); window.scrollTo(0, 0); }
document.addEventListener('contextmenu',event=>{
  const unit=event.target.closest('[data-unit]');
  if(!unit||!state.battle)return;
  event.preventDefault();ui.inspectUnit=unit.dataset.unit;openModal('unit-stats');
});
document.addEventListener('keydown',event=>{
  if(event.key!=='ContextMenu'&&!(event.shiftKey&&event.key==='F10'))return;
  const unit=event.target.closest('[data-unit]');if(!unit||!state.battle)return;
  event.preventDefault();ui.inspectUnit=unit.dataset.unit;openModal('unit-stats');
});
document.addEventListener('click', event => {
  if(ui.areaDraft){
    const action=event.target.closest('[data-area-action]');
    if(action){
      if(action.disabled)return;
      if(action.dataset.areaAction==='cancel')ui.areaDraft=null;
      else if(action.dataset.areaAction==='rotate'){ui.areaDraft.rotation=ui.areaDraft.rotation===90?0:90;if(ui.areaDraft.point)ui.areaDraft.point.rotation=ui.areaDraft.rotation;}
      else {const error=issueCommand(state.battle,ui.areaDraft.key,ui.areaDraft.point);if(error)toast(error);else{ui.areaDraft=null;toast('军略已施放');save();}}
      updateBattle();return;
    }
    const board=event.target.closest('#battle-board');
    if(board){ui.areaDraft.point={...nearestAreaCell(event.clientX,event.clientY,board.getBoundingClientRect()),rotation:ui.areaDraft.rotation};updateBattle();return;}
  }
  const sortField=event.target.closest('[data-field-sort]');
  if(sortField){
    event.preventDefault();
    const key=sortField.dataset.sortKey,direction=sortField.dataset.sortCurrent==='asc'?'desc':'asc',scope=sortField.dataset.fieldSort;
    if(scope==='catalog'){ui.catalogSort=key;ui.catalogDirection=direction;ui.catalogPage=0;}
    else {const target=scope==='scenario'?ui.scenarioSetup.filter:scope==='info'?(ui.infoView??={}):scope==='army'?(ui.armySort??={}):scope==='owned'?(ui.ownedSort??={}):scope==='snapshot'?(ui.snapshotSort??={}):(ui.personnel??={});target.sort=key;target.direction=direction;if(scope==='scenario')target.page=0;}
    renderModal();
    document.querySelector(`[data-field-sort="${scope}"][data-sort-key="${key}"]`)?.focus({preventScroll:true});
    return;
  }
  const road=event.target.closest('[data-road-from]');
  if(road&&ui.mapCommandView){const p=ui.officerPick,a=state.armies.find(a=>a.id===p.armyId),from=p.task==='march'?(a?.travel?.to||a?.location):p.city,path=p.mapRoute||[],at=path.at(-1)||from,x=road.dataset.roadFrom,y=road.dataset.roadTo,next=x===at?y:y===at?x:null;
    if(!next){toast('请从出发点或已选路线末端，点击相连道路');return;}
    if(next===from||path.includes(next)){toast('路线不能重复经过同一地点；点目的地可重新规划');return;}
    const error=selectCommandPoint(state,p,next);if(error)toast(error);renderModal();return;
  }
  const junction=event.target.closest('[data-junction]');
  if(junction){ui.city=junction.dataset.junction;ui.strategyTab='node';ui.mapPanelOpen=true;ui.mapObjectMenu=null;render();return;}
  const target=event.target.closest('[data-command-city]');
  if(target&&ui.modal==='campaign-picker'){const p=ui.officerPick,id=target.dataset.commandCity,c=mapNode(state,id);if(p.task==='transfer'&&(id===p.city||c.owner!==playerFaction(state))){toast('请选择其它可调入的据点');return;}if(['march','expedition'].includes(p.task)){const error=selectCommandPoint(state,p,id);if(error)toast(error);}else p.destination=id;renderModal();return;}
  const transport=event.target.closest('[data-transport-officer]');
  if(transport&&state.campaign){openMapInspection('officer',transport.dataset.transportOfficer);render();return;}
  const legion=event.target.closest('[data-campaign-army]');
  if(legion&&state.campaign){ui.army=legion.dataset.campaignArmy;ui.strategyTab='army';ui.mapPanelOpen=false;ui.mapDirectoryOpen=false;openMapInspection('army',ui.army);render();return;}
  const action = event.target.closest('[data-action]');
  if (action) { event.preventDefault(); if (!action.disabled) act(action.dataset.action, action); return; }
  const city = event.target.closest('[data-city]');
  if (city) { ui.city = city.dataset.city; if(state.campaign){ui.strategyTab='city';ui.mapFocusKey=null;ui.mapDirectoryOpen=false;const onMap=!!city.closest('.strategy-world');ui.mapPanelOpen=!onMap;ui.mapObject=null;if(onMap&&!ui.order)openMapInspection('city',ui.city);else switchMapInspection('city',ui.city);} if (ui.order) march(ui.city); else render(); return; }
  const command = event.target.closest('[data-command]');
  if (command && !command.disabled && state.battle) {
    if (command.dataset.command === 'focus') { ui.focusMode = !ui.focusMode; ui.battlePanel=null; updateBattle(); return; }
    if(isAreaStratagem(STRATAGEMS[command.dataset.command])){
      ui.areaDraft={key:command.dataset.command,battleId:state.battle.id,point:null,rotation:0};ui.paused=true;ui.battlePanel=null;ui.modal=null;renderModal();updateBattle();return;
    }
    ui.areaDraft=null;
    const error = issueCommand(state.battle, command.dataset.command); if(!error){ui.battlePanel=null;if(ui.modal==='stratagem-picker'){ui.modal=null;renderModal();}} toast(error || '军令已传达'); save(); updateBattle(); return;
  }
  const unit = event.target.closest('[data-unit]');
  if(unit&&state.battle&&isObjectDetail(ui)){ui.inspectUnit=unit.dataset.unit;openModal('unit-stats');return;}
  if (unit && isDeploying(state.battle)) {
    const target=activeUnits(state.battle,0).find(u=>u.id===unit.dataset.unit);
    if(ui.deploymentSelection&&target&&target.id!==ui.deploymentSelection){const error=deployUnit(state.battle,ui.deploymentSelection,target.x,target.y);if(error)toast(error);else{ui.deploymentSelection=null;syncCouncilDraft();save();}updateBattle();return;}
    ui.deploymentSelection=null;ui.inspectUnit=unit.dataset.unit;openModal('unit-stats');return;
  }
  const cell = event.target.closest('[data-deploy-x]');
  if (cell && isDeploying(state.battle)) { placeSelected(cell); return; }
  if (unit && ui.focusMode && state.battle) { const error = issueCommand(state.battle, 'focus', unit.dataset.unit); if (!error) ui.focusMode = false; toast(error || '已提高该敌军的目标权重'); save(); updateBattle(); return; }
  if(unit&&state.battle){ui.inspectUnit=unit.dataset.unit;openModal('unit-stats');return;}
  const merge = event.target.closest('[data-merge]');
  if (merge) { const error = state.campaign?mergeCampaignArmies(state,selectedArmy().id,merge.dataset.merge):mergeArmies(state, selectedArmy().id, merge.dataset.merge); if (error) toast(error); else { save(); openModal('army'); toast('军团已合并'); } }
});
function placeSelected(cell) {
  if (!ui.deploymentSelection) return toast('请拖动我军部队，或在详情中选择“调整站位”');
  const error = deployUnit(state.battle,ui.deploymentSelection,Number(cell.dataset.deployX),Number(cell.dataset.deployY));
  if (error) toast(error); else { ui.deploymentSelection = null;syncCouncilDraft(); save(); updateBattle(); }
}
document.addEventListener('dragstart',event=>{
 if(!isBattleCouncil(state.battle))return;
 const el=event.target.closest(isReinforcementCouncil(state.battle)?'[data-council-unit]':'[data-council-unit],.battle-unit.side-0');if(!el)return;
 ui.deploymentSelection=el.dataset.councilUnit||el.dataset.unit;
 event.dataTransfer.setData('text/plain',ui.deploymentSelection);event.dataTransfer.effectAllowed='move';
});
document.addEventListener('dragover',event=>{if(isBattleCouncil(state.battle)&&event.target.closest(isReinforcementCouncil(state.battle)?'[data-reserve-bench]':'[data-reserve-bench],[data-deploy-x],.battle-unit.side-0'))event.preventDefault();});
document.addEventListener('drop',event=>{
 if(!isBattleCouncil(state.battle))return;
 const id=event.dataTransfer.getData('text/plain'),bench=event.target.closest('[data-reserve-bench]'),row=event.target.closest('[data-council-unit]'),cell=event.target.closest('[data-deploy-x]'),target=event.target.closest('.battle-unit.side-0');
 if(!id||(!bench&&!cell&&!target))return;event.preventDefault();let error;
 if(bench)error=reserveDeploymentUnit(state.battle,id,row?.dataset.councilUnit);
 else {const u=target&&activeUnits(state.battle,0).find(u=>u.id===target.dataset.unit);error=deployUnit(state.battle,id,cell?Number(cell.dataset.deployX):u?.x,cell?Number(cell.dataset.deployY):u?.y);}
 if(error)toast(error);else{ui.deploymentSelection=null;syncCouncilDraft();save();}updateBattle();
});
document.addEventListener('dragend',()=>{ui.deploymentSelection=null;});
document.addEventListener('input',event=>{
  if(event.target.dataset.scenarioQuery&&!event.isComposing){const cursor=event.target.selectionStart;ui.scenarioSetup.filter.query=event.target.value;ui.scenarioSetup.filter.page=0;renderModal();const input=document.querySelector('[data-scenario-query]');input?.focus({preventScroll:true});if(cursor!==null)input?.setSelectionRange(cursor,cursor);return;}

  if(event.target.id==='map-quick-query'&&!event.isComposing){const cursor=event.target.selectionStart;ui.mapQuickQueries??={};ui.mapQuickQueries[ui.mapQuickKind||'city']=event.target.value;ui.mapQuickResetScroll=true;render();const input=document.querySelector('#map-quick-query');input?.focus({preventScroll:true});if(cursor!==null)input?.setSelectionRange(cursor,cursor);return;}
  if(event.target.id==='faction-directory-query'&&!event.isComposing){const cursor=event.target.selectionStart;ui.factionDirectories[ui.factionDirectoryKind].query=event.target.value;renderModal();const input=document.querySelector('#faction-directory-query');input?.focus({preventScroll:true});if(cursor!==null)input?.setSelectionRange(cursor,cursor);return;}
  if(event.target.id==='campaign-info-query'&&!event.isComposing){const cursor=event.target.selectionStart;ui.infoView.query=event.target.value;renderModal();const input=document.querySelector('#campaign-info-query');input?.focus({preventScroll:true});if(cursor!==null)input?.setSelectionRange(cursor,cursor);return;}

  if(event.target.dataset.personnelFilter==='query'&&!event.isComposing){const cursor=event.target.selectionStart;ui.personnel.query=event.target.value;renderModal();const input=document.querySelector('[data-personnel-filter="query"]');input?.focus({preventScroll:true});if(cursor!==null)input?.setSelectionRange(cursor,cursor);return;}
  if(event.target.id!=='catalog-query'||event.isComposing)return;
  const cursor=event.target.selectionStart;
  ui.catalogQuery=event.target.value;ui.catalogPage=0;renderModal();
  const input=$('#catalog-query');input.focus({preventScroll:true});if(cursor!==null)input.setSelectionRange(cursor,cursor);
});
document.addEventListener('input',event=>{
 const el=event.target,group=el.closest('.troop-slider');if(!group)return;
 const number=group.querySelector('input[type="number"]'),range=group.querySelector('input[type="range"]');
 if(el===range)number.value=range.value;
 else if(el===number){range.value=number.value;number.setAttribute('aria-invalid',String(!number.validity.valid));}
});
document.addEventListener('keydown',event=>{
 if(event.key==='Enter'&&event.target.matches('.troop-slider input[type="number"]')){event.preventDefault();event.target.dispatchEvent(new Event('change',{bubbles:true}));}
});
document.addEventListener('compositionend',event=>{if(event.target.id==='map-quick-query'||event.target.id==='faction-directory-query'||event.target.id==='campaign-info-query'||event.target.id==='catalog-query'||event.target.dataset.personnelFilter==='query'||event.target.dataset.scenarioQuery)event.target.dispatchEvent(new Event('input',{bubbles:true}));});
document.addEventListener('change', async event => {
 if(['scout-city','scout-officer','scout-target'].includes(event.target.id)){ui.scout??={};const field=event.target.id.slice(6);ui.scout[field]=event.target.value;if(field==='city')ui.scout.officer=null;if(field!=='target')ui.scout.target=null;renderModal();return;}
  const el = event.target, army = selectedArmy();
  if(el.hasAttribute('data-troop-range')){el.closest('.troop-slider').querySelector('input[type="number"]').dispatchEvent(new Event('change',{bubbles:true}));return;}
  if(ui.modal==='scenario-setup'){
    const p=ui.scenarioSetup,d=el.dataset;
    if(d.scenarioArmyUnit)changeScenarioSetup(p,'army-selected',d.scenarioArmyUnit,el.checked);
    else if(d.scenarioChoice)changeScenarioSetup(p,'unit-main',d.scenarioChoice,el.checked);
    else if(d.scenarioRole)changeScenarioSetup(p,'role',d.scenarioRole,el.value);
    else if(el.id==='scenario-setup-tactic')changeScenarioSetup(p,'tactic',null,el.value);
    else {const field=['type','formation','first','level','troops','siege','ship'].find(k=>d['scenario'+k[0].toUpperCase()+k.slice(1)]);if(!field)return;changeScenarioSetup(p,field,d['scenario'+field[0].toUpperCase()+field.slice(1)],field==='first'?el.checked:el.value);}
    renderMusterChange(el);return;
  }

  if(el.name==='encounter-control'){ui.encounterFlow.control=el.value;return;}
  if(ui.militaryFlow&&ui.modal==='military-flow'){
   const p=ui.militaryFlow;
   if(el.dataset.militaryUnit)p.selected=el.checked?[...p.selected,el.dataset.militaryUnit]:p.selected.filter(id=>id!==el.dataset.militaryUnit);
   else if(el.dataset.militaryTarget)p.target=el.dataset.militaryTarget;
   else if(el.dataset.militaryRole)p.roles[el.dataset.militaryRole]=el.value||null;
   else if(el.dataset.militaryFirst)p.units[el.dataset.militaryFirst].first=el.checked;
   else if(el.dataset.militarySiege||el.dataset.militaryShip){const slot=el.dataset.militarySiege?'siege':'ship',id=el.dataset.militarySiege||el.dataset.militaryShip;p.units[id].equipment[slot]=el.value||null;}
   else if(el.dataset.militaryType)p.units[el.dataset.militaryType].type=el.value;
   else if(el.dataset.militaryPosition)p.units[el.dataset.militaryPosition].formation=el.value;
   else if(el.id==='military-tactic')p.tactic=el.value;else return;
   renderMusterChange(el);return;
  }
  if(el.dataset.commandArmyUnit){const p=ui.officerPick,id=el.dataset.commandArmyUnit;p.selected=el.checked?[...new Set([...p.selected,id])]:p.selected.filter(x=>x!==id);renderModal();return;}
  if(el.dataset.expeditionRole){ui.officerPick[el.dataset.expeditionRole]=el.value||null;renderModal();return;}
  if(el.id==='command-destination'){ui.officerPick.destination=el.value||null;delete ui.officerPick.route;renderModal();return;}
  if(el.id==='command-policy'){ui.officerPick.policy=el.value;renderModal();return;}
  if(el.hasAttribute('data-transfer-cycles')){ui.officerPick.cycles=Number(el.value);renderModal();return;}
  if(el.hasAttribute('data-transfer-relay')){ui.officerPick.relay=el.value||null;renderModal();return;}
  if(el.dataset.transferCargo){ui.officerPick.cargo[el.dataset.transferCargo]=Number(el.value);renderModal();return;}
  if(el.id==='command-reinforce'){ui.officerPick.reinforce=el.checked;renderModal();return;}
  if(el.dataset.commandTroops){if(el.closest('.unit-muster'))changeCommandUnit(state,ui.officerPick,el.dataset.commandTroops,'troops',el.value);else (ui.officerPick.troops??={})[el.dataset.commandTroops]=Number(el.value);renderMusterChange(el);return;}
  if(el.dataset.commandSiege||el.dataset.commandShip){changeCommandUnit(state,ui.officerPick,el.dataset.commandSiege||el.dataset.commandShip,el.dataset.commandSiege?'siege':'ship',el.value);renderMusterChange(el);return;}
  if(el.dataset.commandType){if(el.closest('.unit-muster'))changeCommandUnit(state,ui.officerPick,el.dataset.commandType,'type',el.value);else ui.officerPick.types[el.dataset.commandType]=el.value;renderMusterChange(el);return;}
  if(el.dataset.personnelFilter){if(ui.personnel[el.dataset.personnelFilter]===el.value)return;ui.personnel[el.dataset.personnelFilter]=el.value;renderModal();return;}
  if(el.dataset.personnelChoice){const p=ui.officerPick,id=el.dataset.personnelChoice;p.focused=id;if(p.choosingMain){p.unitOfficer=id;(p.troops??={})[id]??=Math.max(1000,campaignOfficers(state).find(r=>r.unit.id===id)?.unit.troops||0);p.choosingMain=false;renderModal();return;}p.selected=['draft','domestic','expedition','defense'].includes(p.task)?(el.checked?[...p.selected,id]:p.selected.filter(x=>x!==id)):[id];renderModal();return;}
  if(el.dataset.customReinforcement){
   const a=ui.customBattle.reinforcements[Number(el.dataset.index)],field=el.dataset.customReinforcement;
   if(a){
    if(field==='arrivalType'){
     delete a.tick;delete a.arrivalCondition;
     if(el.value==='time')a.tick=Math.min(battleSteps(2),Math.max(0,(ui.customBattle.limit??480)-1));
     else a.arrivalCondition={type:el.value,[el.value==='unit-defeated'?'unitId':'armyId']:''};
    }else if(['unitId','armyId'].includes(field))a.arrivalCondition[field]=el.value;
    else a[field]=field==='tick'?battleSteps(Number(el.value)):field==='side'?Number(el.value):el.value;
   }
   refreshCustomDraft();return;
  }
  if(el.dataset.customEvent){const e=ui.customBattle.events[Number(el.dataset.index)],key=el.dataset.customEvent;if(e){e[key]=['tick','duration'].includes(key)?battleSteps(Number(el.value)):key==='side'?Number(el.value):el.value;if(key==='kind'&&BATTLE_EVENTS[e.kind])e.duration=BATTLE_EVENTS[e.kind].duration;}refreshCustomDraft();return;}
  if(el.dataset.customWave){const w=ui.customBattle.waves[Number(el.dataset.index)];if(w)w[el.dataset.customWave]=el.dataset.customWave==='tick'?battleSteps(Number(el.value)):Number(el.value);refreshCustomDraft();return;}
 if(el.dataset.customOption){if(el.dataset.customOption==='terrain')delete ui.customBattle.mapId;if(el.dataset.customOption==='mapId'){if(el.value)ui.customBattle.terrain=BATTLE_MAPS[el.value].terrain;else delete ui.customBattle.mapId;}ui.customBattle[el.dataset.customOption]=['seed','gateHp','limit','shieldPercent','holdUntil','ownTroopBudget'].includes(el.dataset.customOption)?(['limit','holdUntil'].includes(el.dataset.customOption)?battleSteps(Number(el.value)):Number(el.value)):el.value;if(el.dataset.customOption==='battleKind'&&el.value==='field')delete ui.customBattle.holdUntil;refreshCustomDraft();return;}
  if(state.campaign&&el.dataset.domesticDirection){if(el.value)submitStrategicOrder({kind:'assign',cityId:el.dataset.town,direction:el.dataset.domesticDirection,officerIds:[el.value]});return;}
  if(state.campaign&&el.dataset.cityBudgetKey){const error=setCityBudget(state,el.dataset.cityBudgetId,el.dataset.cityBudgetKey,Number(el.value));if(error)toast(error);else updateCityBudgetAlerts(state);save();render();return;}
  if(state.campaign&&el.id==='campaign-governor'){const error=appointGovernor(state,el.dataset.town,el.value);if(error)toast(error);save();render();return;}
  if(state.campaign&&el.id==='campaign-replay-frame'){ui.replayIndex=Number(el.value);ui.replayPlaying=false;renderModal();return;}
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
  if(el.id==='catalog-kind'){ui.catalogKind=el.value;ui.catalogPage=0;renderModal();return;}
  if (el.id === 'army-select') { ui.army = el.value; ui.city = selectedArmy().location;ui.mapFocusKey=null; render(); return; }
  if (el.id === 'import-file') {
    const file = el.files?.[0]; if (!file) return;
    if (file.size > 50_000_000) return toast('文件过大，请选择君临导出的存档');
    try { const imported = validateSave(JSON.parse(await file.text())); state = imported; restoreUI(); save(); toast('存档导入成功'); }
    catch (error) { toast(`导入失败：${error.message}`); }
    return;
  }
  if(el.hasAttribute('data-retreat-all')||el.dataset.retreatPick){
   if(!isBattleCouncil(state.battle))return;
   if(ui.retreatBattleId!==state.battle.id){ui.retreatBattleId=state.battle.id;ui.retreatSelected=[];}
   if(el.hasAttribute('data-retreat-all'))ui.retreatSelected=el.checked?state.battle.sides[0].units.filter(u=>u.hp>0&&['active','reserve'].includes(u.status)&&!u.withdrawing).map(u=>u.id):[];
   else ui.retreatSelected=el.checked?[...new Set([...ui.retreatSelected,el.dataset.retreatPick])]:ui.retreatSelected.filter(id=>id!==el.dataset.retreatPick);
   updateBattle();return;
  }
  if(el.hasAttribute('data-retreat-destination')){const error=configureRetreatDestination(state,state.battle,el.value);if(error)toast(error);else save();updateBattle();return;}
  if(el.dataset.unitRetreat){
   const ids=el.dataset.unitRetreat?[el.dataset.unitRetreat]:ui.retreatBattleId===state.battle?.id?ui.retreatSelected:[];
   const error=configureCouncilRetreat(state.battle,ids,el.value===''?null:Number(el.value));
   if(error)toast(error);else{syncCouncilDraft();save();}
   updateBattle();return;
  }
  if(el.id==='battle-intent'){const error=configureBattleIntent(state.battle,el.value);if(error)toast(error);else save();updateBattle();return;}
  if(el.id==='inspect-unit'){ui.inspectUnit=el.value;renderModal();if(state.battle)updateBattle();return;}
  if(el.id==='loadout-unit'){ui.loadoutUnit=el.value;renderModal();return;}

  if (el.dataset.split) { el.checked ? ui.selectedSplit.add(el.dataset.split) : ui.selectedSplit.delete(el.dataset.split); return; }
  if (!army || state.battle || state.campaign&&(!canEditArmy(state,army)||army.faction!==playerFaction(state))) return;
  if (el.id === 'tactic-select') army.tactic = el.value;
  if (el.dataset.role) {army[el.dataset.role] = el.value;let n=0;for(const u of army.units)if(u.first)u.first=++n<=armyFrontlineCapacity(army);}
  if (el.dataset.first) {
    if (el.checked && army.units.filter(u => u.first).length >= armyFrontlineCapacity(army)) { el.checked = false; return toast(`最多配置 ${armyFrontlineCapacity(army)} 名首发，请先取消另一名武将`); }
    army.units.find(u => u.id === el.dataset.first).first = el.checked;
  }
  if (el.dataset.type) {if(state.campaign){const error=changeCampaignTroop(state,army.id,el.dataset.type,el.value);if(error){toast(error);renderModal();return;}}const u=army.units.find(u=>u.id===el.dataset.type);u.type=el.value;u.tactics=defaultTacticIds(u);toast('兵种已更换');}
  if (el.dataset.formation) army.units.find(u => u.id === el.dataset.formation).formation = el.value;
  save();
  if(el.dataset.role)renderModal();
  if (el.dataset.type) { const id=el.dataset.type;renderModal();document.querySelector(`[data-type="${id}"]`)?.focus({preventScroll:true}); }
});
document.addEventListener('keydown', event => {
  const force=event.target.closest?.('.selection-map [data-action]');if(force&&(event.key==='Enter'||event.key===' ')){event.preventDefault();act(force.dataset.action,force);return;}
  if (event.key === 'Escape') { if(ui.areaDraft){ui.areaDraft=null;updateBattle();return;} if(ui.textDetails){closeModal();return;} if(ui.mapObject&&!ui.modal){ui.mapObject=null;render();return;} if(document.querySelector('.task-trait-popover:popover-open')) return; if (ui.modal) closeModal(); else { ui.order = false; ui.focusMode = false;ui.deploymentSelection=null; ui.battlePanel=null; if(state.battle&&ui.mode!=='lobby') updateBattle(); else render(); } }
  if (event.key === ' ' && ui.mode!=='lobby' && state.battle && !ui.modal && !['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); act('pause'); }
  if ((event.key === 'Enter' || event.key === ' ') && (event.target.dataset.roadFrom||event.target.dataset.junction||event.target.dataset.city||event.target.dataset.commandCity||event.target.dataset.campaignArmy||event.target.dataset.transportOfficer)) { event.preventDefault(); event.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  if (event.key === 'Tab' && (ui.modal||ui.textDetails)&&(!isObjectDetail(ui)||detailPanels.hasSource)) {
    const nodes = [...$('#overlay-root').querySelectorAll('button:not([disabled]), input:not([hidden]):not([disabled]), select:not([disabled]), summary')];
    if (!nodes.length) return;
    if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
    if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
  }
});
setInterval(() => {
  if(state.campaign){runCampaignClock();return;}
  if (ui.mode==='lobby' || !state.battle || ui.areaDraft || ui.paused || ui.modal || document.hidden) return;
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
  if(state.battle.reinforcementCouncil){ui.paused=true;renderModal();}
  updateBattle(); save();
}, 50);

function submitStrategicOrder(command,choice=null){
 const result=requestStrategicOrder(state,command,choice);
 if(result.error){toast(result.error);return;}
 if(result.confirmation){ui.interruption=result.confirmation;openModal('domestic-interruption');return;}
 ui.modal=ui.commandReturn||(ui.modal==='city-domestic'?'city-domestic':null);ui.commandReturn=null;ui.officerPick=null;ui.interruption=null;ui.personnelReturn=null;toast(result.queued?'后续命令已保存，将在当前事务结束后执行':'新命令已生效');save();render();
}
function handleCampaignAction(action,el){
 if(action==='activity-alert-record'){const node=state.campaign.activity.nodes.find(n=>n.id===el.dataset.node);if(!node||node.faction!==playerFaction(state))return true;ui.activityRecord={nodeId:node.id,beforeDay:node.day,returnModal:ui.modal};ui.paused=true;openModal('activity-record');return true;}
 if(action==='harvest-review'){const receipt=state.campaign.activity.nodes.find(n=>n.id===el.dataset.node&&n.phase==='harvest'&&n.faction===playerFaction(state));if(!receipt)return true;ui.harvestReviewId=receipt.id;ui.paused=true;openModal('harvest-review');return true;}
 if(action==='reward-show-building'){
  const node=state.campaign.activity.nodes.find(n=>n.id===el.dataset.node&&n.faction===playerFaction(state)),reward=node?.result?.reward,site=reward?.kind==='building'?mapNode(state,reward.siteId):null;if(!site)return true;
  ui.rewardMapView=Object.fromEntries(['city','strategyTab','mapObject','mapPanelOpen','mapDirectoryOpen','mapFocusKey','mapCameraManual','strategicMapView'].map(key=>[key,ui[key]]));
  ui.rewardMapReport=ui.modal;ui.paused=true;ui.city=site.id;ui.strategyTab='city';ui.mapObject=null;ui.mapPanelOpen=false;ui.mapDirectoryOpen=false;ui.mapFocusKey='place:'+site.id;ui.mapCameraManual=true;ui.strategicMapView={x:site.x-32,y:site.y-32,width:64,height:64};ui.modal=null;render();
  requestAnimationFrame(()=>document.querySelector(`[data-scene-city="${site.id}"] [data-city-building="${reward.buildingKey}"]`)?.dispatchEvent(new MouseEvent('click',{bubbles:true})));return true;
 }
 if(action==='reward-return-report'){const target=ui.rewardMapReport,view=ui.rewardMapView;ui.rewardMapReport=null;ui.rewardMapView=null;if(view)Object.assign(ui,view);if(target)openModal(target);render();return true;}
 if(action==='domestic-alert-city'){
  acknowledgeDomesticAlerts(state,ui.domesticAlertIds||[]);ui.domesticAlertIds=[];ui.paused=true;ui.city=el.dataset.town;ui.mapCameraManual=false;ui.mapObject=null;ui.modal='city-domestic';save();render();return true;
 }
 if(action==='map-object-close'){ui.mapObject=null;render();return true;}
 if(action==='map-object-manage'){if(el.dataset.kind==='army'){ui.army=el.dataset.id;ui.strategyTab='army';}else if(el.dataset.kind==='city'){ui.city=el.dataset.id;ui.strategyTab='city';}ui.modal=null;ui.mapObject=null;ui.mapPanelOpen=true;render();return true;}
 if(action==='city-domestic'){ui.city=el.dataset.town||ui.city;ui.mapObject=null;openModal('city-domestic');return true;}
 if(action==='combat-page'){setCombatPage(el.dataset.group,el.dataset.page);renderModal();return true;}
 if(['army','split','merge','recruit'].includes(action)&&selectedArmy()&&!state.battle){ui.militaryFlow=newMilitaryFlow(state,selectedArmy().id,action==='army'?'purpose':action);ui.militaryReturn=null;openModal('military-flow');return true;}
 if(action==='military-purpose'){ui.militaryFlow=newMilitaryFlow(state,ui.militaryFlow.armyId,el.dataset.kind);renderModal();return true;}
 if(action==='military-detail'){ui.militaryReturn=ui.modal;ui.inspectUnit=el.dataset.id;ui.inspectBattleId=el.dataset.battle||null;openModal('unit-stats');return true;}
 if(action==='military-cancel'){ui.militaryReturn=null;ui.militaryFlow=null;ui.encounterFlow=null;ui.modal=null;render();return true;}
 if(action==='military-back'||action==='military-next'){
  const p=ui.militaryFlow,steps=militarySteps(p),next=steps.indexOf(p.step)+(action==='military-next'?1:-1);
  if(p.step==='select'&&action==='military-next'){
   const a=state.armies.find(a=>a.id===p.armyId),units=a.units.filter(u=>p.selected.includes(u.id));
   if(p.kind==='split'){if(!units.length||units.length===a.units.length||!units.some(u=>u.troops>0)||!a.units.some(u=>!p.selected.includes(u.id)&&u.troops>0)){toast('两支军团都须保留有兵力的部队');return true;}for(const role of ['leader','advisor','deputy'])if(!units.some(u=>u.id===p.roles[role]))p.roles[role]=role==='deputy'?null:units[0].id;}
   else {const result=previewMilitaryFlow(state,p);if(result.error){toast(result.error);return true;}}
  }
  if(next>=0&&next<steps.length){p.step=steps[next];if(p.step==='commanders')setCombatPage('combat-本军','appointments');}renderModal();return true;
 }
 if(action==='military-confirm'){const result=previewMilitaryFlow(state,ui.militaryFlow);if(result.error){toast(result.error);return true;}state=result.state;ui.army=result.army.id;ui.militaryFlow=null;ui.modal=null;save();render();toast('军令已执行');return true;}
 if(['campaign-manual','campaign-auto','campaign-prepare'].includes(action)||action==='campaign-focus'&&battleRecord(state,el.dataset.battle)?.awaiting){ui.encounterFlow={id:el.dataset.battle,step:0,control:action==='campaign-auto'?'auto':'manual'};ui.city=battleRecord(state,el.dataset.battle).cityId;ui.paused=true;openModal('encounter-flow');return true;}
 if(action==='encounter-select'){ui.encounterFlow={id:el.dataset.id,step:0,control:'manual'};ui.city=battleRecord(state,el.dataset.id).cityId;renderModal();return true;}
 if(action==='encounter-next'||action==='encounter-back'){ui.encounterFlow.step+=action==='encounter-next'?1:-1;renderModal();return true;}
 if(action==='encounter-confirm'){const p=ui.encounterFlow,error=chooseEncounter(state,p.id,p.control==='manual');if(error){toast(error);return true;}ui.paused=true;ui.modal=null;ui.encounterFlow=null;ui.battlePanel=null;save();render();return true;}
 if(action==='personnel-ransom'||action==='personnel-release'){const error=releaseCaptive(state,el.dataset.id,{ransom:action==='personnel-ransom'});if(error)toast(error);else{save();render();}return true;}
  let error=null;
  if(action==='map-quick-open'){ui.mapQuickKind=el.dataset.kind;ui.mapDirectoryOpen=true;ui.mapPanelOpen=false;ui.mapObject=null;render();return true;}
  if(action==='map-city-filter'){ui.mapCityFilter=el.dataset.filter==='idle'?'idle':'all';ui.mapQuickResetScroll=true;render();return true;}
  if(action==='city-idle-assign'){const c=state.cities.find(c=>c.id===el.dataset.town&&c.owner===playerFaction(state));if(!c){render();return true;}ui.city=c.id;ui.strategyTab='city';ui.mapFocusKey=null;ui.mapPanelOpen=false;ui.mapObject=null;ui.paused=true;ui.modal='city-domestic';render();return true;}
  if(action==='map-quick-manage'){ui.mapDirectoryOpen=false;ui.mapPanelOpen=true;ui.strategyTab=el.dataset.kind;if(el.dataset.kind==='city')ui.city=el.dataset.id;else ui.army=el.dataset.id;ui.mapFocusKey=null;render();return true;}
  if(action==='map-quick-select'){
   const kind=el.dataset.kind,row=factionDirectoryRows(state,kind).find(r=>String(r.id)===el.dataset.id);if(!row){render();return true;}
   if(kind==='city')ui.city=row.id;else if(kind==='army')ui.army=row.id;else ui.directoryBattle=row.id;
   ui.strategyTab=kind;ui.mapDirectoryOpen=true;ui.mapPanelOpen=false;ui.mapObject=null;ui.mapFocusKey=null;if(kind==='city'||kind==='army')switchMapInspection(kind,row.id);render();return true;
  }
  if(action==='directory-back'){openModal('faction-directory');return true;}
  if(action==='faction-directory'){const kind=el.dataset.kind;if(!FACTION_DIRECTORIES[kind])return true;ui.factionDirectoryKind=kind;ui.factionDirectories??={};ui.factionDirectories[kind]??={};openModal('faction-directory');return true;}
  if(action==='faction-object'){
   const kind=el.dataset.kind,id=el.dataset.id;if(!factionDirectoryRows(state,kind).some(r=>String(r.id)===id)){toast('对象已不在本势力名册');renderModal();return true;}
   if(kind==='city'||kind==='army'){if(kind==='city')ui.city=id;else ui.army=id;ui.strategyTab=kind;ui.mapFocusKey=null;ui.mapPanelOpen=true;ui.mapDirectoryOpen=false;ui.mapObject=null;ui.modal=null;render();return true;}
   if(kind==='battle'){ui.directoryBattle=state.campaign.battles.find(r=>String(r.id)===id).id;openModal('faction-battle');return true;}
   ui.infoReturn='faction-directory';ui.infoHistory=[];ui.infoView={type:kind,id,objectOnly:true};openModal('campaign-info');return true;
  }
  if(action==='scout-report'){ui.scoutReport={task:el.dataset.task,key:el.dataset.key};openModal('scout-report');return true;}
  if(action==='scout-open'){ui.scout={city:el.dataset.town||null};openModal('scouting');return true;}
  if(action==='scout-dispatch'){const error=dispatchScout(state,el.dataset.city,el.dataset.officer,el.dataset.target);if(error)toast(error);else{ui.scout={city:el.dataset.city};save();render();}return true;}
  if(action==='scout-recall'){const error=recallScout(state,el.dataset.officer);if(error)toast(error);else{save();render();}return true;}
  if(action==='campaign-affairs'||action==='campaign-battles'){openModal(action);return true;}
  if(action==='info-menu-scope'){ui.infoScope=el.dataset.scope;renderModal();return true;}
  if(action==='info-reference'){ui.textDetails=el.dataset.kind==='bond'?bondOverview():abilityOverview(el.dataset.kind);ui.textDetailsTab=0;renderModal();return true;}
  if(action==='info-menu-list'){ui.infoReturn='info-menu';ui.infoHistory=[];ui.infoView={type:el.dataset.kind,scope:ui.infoScope||'self',query:''};openModal('campaign-info');return true;}
  if(action==='campaign-info'){ui.mapObject=null;openModal('info-menu');return true;}
  if(action==='campaign-info-detail'){ui.mapObject=null;
   const objectOnly=action==='campaign-info-detail'&&(ui.modal!=='campaign-info'||ui.infoView?.objectOnly);
   if(ui.modal!=='campaign-info')ui.infoReturn=ui.modal;
   if(ui.modal==='campaign-info')ui.infoHistory.push({...ui.infoView});else ui.infoHistory=[];
   ui.infoView={scope:ui.infoView?.scope,type:el.dataset.kind||'city',id:el.dataset.id||null,page:el.dataset.page,query:'',objectOnly};openModal('campaign-info');return true;
  }
  if(action==='campaign-info-page'){ui.infoView.page=el.dataset.page;renderModal();return true;}
  if(action==='campaign-activity-page'){if(ui.modal==='activity-record')ui.activityRecord.beforeDay=Number(el.dataset.day);else{ui.infoView.activityBefore=Number(el.dataset.day);ui.infoView.page='行动记录';}renderModal();return true;}
  if(action==='campaign-info-peer'){ui.infoView={...ui.infoView,type:el.dataset.kind,id:el.dataset.id};renderModal();return true;}
  if(action==='campaign-info-back'){ui.infoView=ui.infoHistory.pop()||{type:'city'};renderModal();return true;}
  if(action==='campaign-info-tab'||action==='campaign-info-home'){ui.infoView={scope:ui.infoView.scope,type:el.dataset.kind||ui.infoView.type,query:''};ui.infoHistory=[];renderModal();return true;}
  if(action==='campaign-order-choice'){submitStrategicOrder(ui.interruption.command,el.dataset.choice);return true;}
  if(action==='campaign-cancel-order'){if(!state.campaign.domestic.orders.some(q=>q.id===Number(el.dataset.order)&&q.faction===playerFaction(state)))return true;removeDomesticOrder(state,Number(el.dataset.order));save();render();return true;}
  if(action==='campaign-city-personnel'||action==='campaign-personnel'&&el.dataset.town){ui.personnelCity=el.dataset.town;ui.cityPersonnelFilters??={};ui.personnel=ui.cityPersonnelFilters[ui.personnelCity]??={};ui.personnelReturn=null;openModal('city-personnel');return true;}
  if(action==='campaign-personnel'){ui.personnel=ui.factionPersonnelFilter??={};ui.personnelReturn=null;openModal('campaign-personnel');return true;}
  if(action==='campaign-candidate-focus'){ui.officerPick.focused=el.dataset.officer;renderModal();return true;}
  if(action==='campaign-unit-detail'){ui.commandInspect=ui.modal==='campaign-picker';ui.personnelReturn=ui.commandInspect?'campaign-picker':null;ui.inspectUnit=el.dataset.officer||el.dataset.id;openModal('unit-stats');return true;}
  if(action==='campaign-person-detail'){ui.personnelReturn=['campaign-picker','campaign-personnel','city-personnel','city-domestic'].includes(ui.modal)?ui.modal:null;ui.inspectUnit=el.dataset.officer;openModal('unit-officer');return true;}
  if(action==='campaign-person-back'){openModal(ui.personnelReturn||'campaign-personnel');return true;}
  if(action==='campaign-defense-prepare'){const r=battleRecord(state,el.dataset.battle);if(!canPrepareSiegeDefense(state,r)){toast('没有可临时编制的武将，请使用现有守军进入战前军议');return true;}ui.encounterFlow??={id:r.id,step:1,control:'manual'};ui.commandReturn='encounter-flow';ui.officerPick=newCommand(state,'defense',r.cityId);ui.officerPick.battleId=r.id;ui.personnel={city:r.cityId};openModal('campaign-picker');return true;}
  if(action==='map-route-continue'){continueCommandRoute(ui.officerPick);renderModal();return true;}
  if(action==='map-route-back'){backCommandRoute(ui.officerPick);renderModal();return true;}
  if(action==='map-route-end'){if(commandCanAdvance(state,ui.officerPick)){ui.officerPick.step='review';renderModal();}return true;}
  if(action==='march-mode-open'){if(el.dataset.army)ui.army=el.dataset.army;const a=selectedArmy();if(a){ui.marchArmy=a.id;ui.marchChoice=a.marchMode||'normal';openModal('march-mode');}return true;}
  if(action==='march-mode-select'){ui.marchChoice=el.dataset.mode;renderModal();return true;}
  if(action==='march-mode-confirm'){const error=setArmyMarchMode(state,ui.marchArmy,ui.marchChoice);if(error)toast(error);else {ui.modal=null;save();}render();return true;}
  if(action==='campaign-pick'||action==='campaign-order'){
   ui.commandReturn=ui.modal==='city-domestic'?'city-domestic':null;ui.mapObject=null;
   if(action==='campaign-order'&&el.dataset.army)ui.army=el.dataset.army;
   const a=action==='campaign-order'?selectedArmy():null;
   ui.officerPick=newCommand(state,a?'march':el.dataset.task,a?.location||el.dataset.town,{direction:el.dataset.direction,armyId:a?.id});
   ui.personnel={city:ui.officerPick.city};ui.personnelReturn=null;openModal('campaign-picker');return true;
  }
  if(action==='campaign-unit-choose'||action==='campaign-unit-picker-back'){ui.officerPick.choosingMain=action==='campaign-unit-choose';renderModal();return true;}
  if(action==='campaign-unit-disband'){const error=removeCommandUnit(state,ui.officerPick,el.dataset.id);if(error)toast(error);renderModal();return true;}
  if(action==='campaign-unit-edit'||action==='campaign-unit-list'){const p=ui.officerPick;Object.assign(p,{step:action==='campaign-unit-edit'?'formation':'unit-review',unitOfficer:el.dataset.id||null,choosingMain:false});renderModal();return true;}
  if(action==='campaign-unit-new'){const p=ui.officerPick;if(['unit-select','commanders','target','review'].includes(p.step)){p.armySelection=[...p.selected];if(p.formationPool)p.selected=[...p.formationPool];}Object.assign(p,{step:'formation',unitOfficer:null,choosingMain:false});renderModal();return true;}
  if(action==='campaign-command-cancel'){ui.officerPick=null;ui.personnelReturn=null;ui.interruption=null;closeModal();return true;}
  if(action==='campaign-command-return'){ui.interruption=null;if(ui.officerPick)openModal('campaign-picker');else closeModal();return true;}
  if(action==='campaign-command-army'){const a=state.armies.find(a=>a.id===el.dataset.army);Object.assign(ui.officerPick,{armyId:a.id,city:a.location,step:'target',destination:null});renderModal();return true;}
  if(action==='campaign-command-direction'){if(ui.officerPick.direction!==el.dataset.direction)ui.officerPick.selected=[];ui.officerPick.direction=el.dataset.direction;ui.officerPick.step='officers';ui.personnel.sort='recommended';renderModal();return true;}
  if(action==='campaign-command-next'||action==='campaign-command-back'||action==='campaign-command-step'){
   const p=ui.officerPick,steps=commandSteps(p),index=steps.indexOf(p.step);
   if(action==='campaign-command-next'&&!commandCanAdvance(state,p))return true;
   if(action==='campaign-command-next'&&p.step==='formation'){p.selected=[...new Set([...p.selected,p.unitOfficer])];p.formationPool=[...p.selected];}
   const next=action==='campaign-command-step'?steps.indexOf(el.dataset.step):index+(action==='campaign-command-next'?1:-1);
   if(next>=0&&next<steps.length&&(action!=='campaign-command-step'||next<index)){if(p.step==='unit-select')p.armySelection=[...p.selected];if(steps[next]==='unit-select'&&index<next){p.formationPool=[...p.selected];if(p.armySelection)p.selected=p.armySelection.filter(id=>p.formationPool.includes(id)||state.cities.find(c=>c.id===p.city)?.units.some(u=>u.id===id));}if(['formation','unit-review'].includes(steps[next])&&p.formationPool)p.selected=[...p.formationPool];if(steps[next]==='commanders'){if(!p.selected.includes(p.leader))p.leader=rankOfficerCandidates(state,campaignOfficers(state).filter(r=>p.selected.includes(r.unit.id)).map(r=>r.unit),{task:'role',role:'leader',city:p.city})[0]?.unit.id;if(!p.selected.includes(p.advisor))p.advisor=rankOfficerCandidates(state,campaignOfficers(state).filter(r=>p.selected.includes(r.unit.id)).map(r=>r.unit),{task:'role',role:'advisor',city:p.city})[0]?.unit.id;if(!p.selected.includes(p.deputy))p.deputy=null;}p.step=steps[next];if(p.step==='commanders')setCombatPage('combat-本军','appointments');renderModal();}return true;
  }
  if(action==='campaign-pick-confirm'){
   const p=ui.officerPick,rows=campaignOfficers(state),chosen=p?.selected||[];
   if(!p||(p.step!=='review'&&!(['domestic','governor'].includes(p.task)&&p.step==='officers')))return true;
   if(p.task==='expedition'){submitStrategicOrder({kind:'expedition',cityId:p.city,officerIds:p.selected,leader:p.leader,advisor:p.advisor,deputy:p.deputy,target:p.destination,policy:p.policy,...(p.route?{route:p.route}:{}),formation:{types:p.types,equipment:p.equipment,reinforce:p.reinforce,troops:p.troops,disbandIds:p.disbandIds}});return true;}
   if(p.task==='march'){submitStrategicOrder({kind:'march',armyId:p.armyId,target:p.destination,policy:p.policy,...(p.route?{route:p.route}:{})});return true;}
   if(!chosen.length&&!p.disbandIds?.length)return true;
   error=chosen.map(id=>{const row=rows.find(r=>r.unit.id===id);return row?pickerReason(state,row,p.task==='draft'&&row.cityUnit?{...p,task:'defense'}:p):'武将已离开';}).find(Boolean);
   if(!error){
    if(p.task==='domestic'){submitStrategicOrder({kind:'assign',cityId:p.city,direction:p.direction,officerIds:chosen});return true;}
    else if(p.task==='governor')error=appointGovernor(state,p.city,chosen[0]);
    else if(p.task==='transfer'){submitStrategicOrder({kind:'transfer',cityId:p.city,officerIds:chosen,target:p.destination,cargo:p.cargo,relay:p.relay,cycles:p.cycles});return true;}
    else if(['draft','defense'].includes(p.task)){const result=prepareCommandFormation(state,p);error=result.error;if(!error){state=result.state;ui.city=p.city;ui.strategyTab='city';}}
   }
   if(error)toast(error);else {ui.modal=p.task==='defense'&&ui.encounterFlow?'encounter-flow':null;ui.commandReturn=null;ui.officerPick=null;ui.personnelReturn=null;toast('安排已生效');}save();render();return true;
  }
  if(action==='campaign-clear-governor'){error=appointGovernor(state,el.dataset.town,null);if(error)toast(error);save();render();return true;}
  if(action==='map-panel-toggle'){ui.mapObject=null;ui.mapPanelOpen=!ui.mapPanelOpen;ui.mapDirectoryOpen=false;render();return true;}
  if(action==='map-directory-toggle'){ui.mapObject=null;ui.mapDirectoryOpen=!ui.mapDirectoryOpen;render();return true;}
  if(action==='campaign-tab'){ui.strategyTab=el.dataset.tab;render();return true;}
  if(action==='faction-domestic'||action==='faction-diplomacy'||action==='diplomacy-review'){if(action==='diplomacy-review'){ui.diplomacyReportReturn=ui.modal==='domestic-alerts';ui.paused=true;}ui.affairsTab=action==='faction-domestic'?'domestic':'diplomacy';openModal('campaign-affairs');if(el.dataset.proposal)document.querySelector(`[data-diplomatic-proposal="${Number(el.dataset.proposal)}"]`)?.scrollIntoView({block:'center'});return true;}
  if(action==='diplomacy-goal'){const error=setDiplomaticGoal(state,document.querySelector('#diplomacy-goal').value,document.querySelector('#diplomacy-target').value||null);if(error)toast(error);save();renderModal();return true;}
  if(action==='diplomacy-budget'){const values=Object.fromEntries(['feeBudget','goldReserve','grainReserve','manpowerReserve'].map(k=>[k,Number(document.querySelector('#diplomacy-'+k).value)])),error=setDiplomaticBudget(state,values);if(error)toast(error);save();renderModal();return true;}
  if(action==='diplomacy-assign'||action==='diplomacy-assign-now'||action==='diplomacy-assign-after'){
   const direction=el.dataset.direction,id=el.dataset.officer||document.querySelector('#diplomacy-officer-'+direction).value,result=assignDiplomat(state,id,direction,{choice:action==='diplomacy-assign-now'?'now':action==='diplomacy-assign-after'?'after':null});
   if(result.confirmation){ui.diplomaticInterruption=result.confirmation;openModal('diplomacy-interruption');return true;}
   if(result.error)toast(result.error);save();ui.modal='campaign-affairs';ui.affairsTab='diplomacy';render();return true;
  }
  if(action==='diplomacy-dismiss'){const error=dismissDiplomat(state,el.dataset.officer);if(error)toast(error);save();render();return true;}
  if(action==='diplomacy-cancel-order'){const error=cancelDiplomaticOrder(state,Number(el.dataset.order));if(error)toast(error);save();renderModal();return true;}
  if(['diplomacy-approve','diplomacy-renegotiate','diplomacy-reject'].includes(action)){const id=Number(el.dataset.proposal),error=action==='diplomacy-approve'?approveDiplomaticProposal(state,id,Number(el.dataset.version)):decideDiplomaticProposal(state,id,action==='diplomacy-renegotiate'?'renegotiate':'reject');if(error)toast(error);else toast(action==='diplomacy-approve'?'已批准，后台将复核并履行':'已交执行武将处理');save();render();return true;}
  if(action==='faction-affairs-tab'){ui.affairsTab=el.dataset.tab;renderModal();return true;}
  if(action==='faction-priority-up'){const p=[...domesticPriority(state)],i=p.indexOf(el.dataset.direction);if(i>0){[p[i-1],p[i]]=[p[i],p[i-1]];const error=setDomesticPriority(state,p);if(error)toast(error);else save();}renderModal();return true;}
  if(action==='faction-appoint'){const result=fillFactionAppointments(state);toast(result.error||('已补齐 '+result.count+' 项委任'));save();renderModal();return true;}
  if(action==='campaign-archive'){ui.snapshotReturn=ui.modal;ui.campaignHistory=el.dataset.battle;openModal('campaign-archive');return true;}
  if(action==='campaign-replay'){ui.snapshotReturn=ui.modal;ui.campaignHistory=el.dataset.battle;ui.replayIndex=0;ui.replayPlaying=false;ui.paused=true;openModal('campaign-replay');return true;}
  if(action.startsWith('replay-')){const r=battleRecord(intelligenceWorld(state),ui.campaignHistory),last=replayFrames(r).length-1;if(action==='replay-toggle')ui.replayPlaying=!ui.replayPlaying;else{ui.replayPlaying=false;ui.replayIndex=action==='replay-reset'?0:Math.max(0,Math.min(last,(ui.replayIndex||0)+(action==='replay-next'?1:-1)));}ui.replayTime=performance.now();renderModal();return true;}
  if(action==='campaign-history'){ui.snapshotReturn=ui.modal;ui.campaignHistory=el.dataset.battle;ui.campaignSnapshotDay=null;ui.paused=true;openModal('campaign-history');return true;}
  if(action==='campaign-map'){viewCampaignMap(state);ui.paused=true;ui.modal=null;ui.strategyTab='battles';save();render();return true;}
  if(action==='campaign-begin'||action==='next-turn'){error=beginExecution(state);if(!error){ui.paused=false;ui.lastTime=performance.now();}}
  else if(action==='campaign-run'){ui.paused=!ui.paused;ui.lastTime=performance.now();}
  else if(action==='campaign-day'){
    ui.paused=true;
    if(state.battle&&isBattleCouncil(state.battle))error='请先确认军议';
    else if(isPlanning(state))error='请先完成战略操作并点击进行';
    else {advanceCampaignDay(state);ui.strategyTab=activeBattles(state).some(r=>r.awaiting)?'battles':ui.strategyTab;}
  }
  else if(action==='campaign-manual') {error=chooseEncounter(state,el.dataset.battle,true);ui.paused=true;ui.modal=null;ui.battlePanel=null;}
  else if(action==='campaign-auto'){error=chooseEncounter(state,el.dataset.battle,false);ui.modal=null;ui.paused=activeBattles(state).some(r=>r.awaiting);}
  else if(action==='reinforcement-continue'){error=confirmReinforcementCouncil(battleRecord(state,el.dataset.battle)?.battle);ui.modal=null;ui.paused=isPlanning(state)||activeBattles(state).some(r=>r.awaiting||r.battle.reinforcementCouncil);ui.lastTime=performance.now();}
  else if(action==='campaign-focus'){error=takeOverBattle(state,el.dataset.battle);ui.paused=true;ui.modal=null;ui.battlePanel=null;}
  else if(action==='campaign-project')error=commissionProject(state,el.dataset.town,el.dataset.project);
  else if(action==='domestic-dismiss'){if(ui.modal==='city-domestic')ui.commandReturn='city-domestic';const row=campaignOfficers(state).find(r=>r.unit.id===el.dataset.officer);submitStrategicOrder({kind:'dismiss',cityId:row?.location,officerIds:[el.dataset.officer]});return true;}
  else if(action==='campaign-relief')error=relieveCity(state,el.dataset.town);
  else if(action==='campaign-create-army'){error=createCampaignArmy(state,el.dataset.town,[...document.querySelectorAll('[data-draft-officer]:checked')].map(x=>x.dataset.draftOfficer));if(!error){ui.army=state.armies.find(a=>a.location===el.dataset.town&&a.faction===playerFaction(state)&&!a.travel&&!a.route.length)?.id;ui.strategyTab='army';}}
  else if(action==='campaign-transfer'){const row=campaignOfficers(state).find(r=>r.unit.id===el.dataset.officer);submitStrategicOrder({kind:'transfer',cityId:row?.location,officerIds:[el.dataset.officer],target:document.querySelector('[data-transfer-target="'+el.dataset.officer+'"]').value});return true;}
  else return false;
  if(error)toast(error);save();render();return true;
}
function runCampaignClock(){
  if(ui.mode==='lobby'||ui.paused||ui.modal||document.hidden){ui.lastTime=performance.now();return;}
  if(isPlanning(state)||state.finished){ui.paused=true;render();return;}
  if(state.battle&&battleFx?.isCinematicPlaying()){ui.lastTime=performance.now();return;}
  // Map playback advances one day every three seconds; battle speed is local
  // to watching combat and must not accelerate marching after returning here.
  const now=performance.now(),delay=state.battle?COMBAT.stepMs/ui.speed:3000;
  if(now-ui.lastTime<delay)return;ui.lastTime=now;
  const marchPositions=new Map([...document.querySelectorAll('[data-map-army-anchor]')].map(el=>[el.dataset.scoutTask||el.dataset.campaignArmy||'transport:'+el.dataset.transportOfficer,{x:+el.dataset.x,y:+el.dataset.y}]));
  const previous=state.battle,day=state.campaign.day;
  const result=previous?advanceCampaignStep(state):advanceCampaignDay(state);
  if(result.encounter||result.reinforcement||result.deployment||result.planning||isPlanning(state)||state.finished)ui.paused=true;
  const domesticAlert=presentDomesticAlerts();
  if(domesticAlert||previous!==state.battle||!state.battle||result.encounter||result.reinforcement){if(result.encounter||result.reinforcement)ui.strategyTab='battles';render();}
  else updateBattle();
  if(!state.battle&&!ui.paused&&!ui.modal)animateArmyMarch($('#app'),marchPositions);
  if(day!==state.campaign.day||result.encounter||result.reinforcement||result.deployment||previous!==state.battle)save();
}

document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', () => save());
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
await art.init();
render();
if (loadWarning) { save(); toast(loadWarning); }

document.addEventListener('toggle',event=>{const key=event.target.dataset.cityDisclosure;if(key&&event.target.isConnected){ui.cityDisclosures||={};ui.cityDisclosures[key]=event.target.open;}},true);

function syncCouncilDraft(){
 const side=state.battle.sides[0];
 for(const a of state.armies.filter(a=>side.units.some(u=>u.armyId===a.id))){a.tactic=side.tactic;const ids=side.units.filter(u=>u.armyId===a.id).map(u=>u.id);a.units.sort((x,y)=>ids.indexOf(x.id)-ids.indexOf(y.id));for(const u of a.units){const live=side.units.find(x=>x.id===u.id);u.first=live?.status==='active';if(live)u.retreatAt=live.retreatAt;}}
 const d=state.testScenario?.customBattle;if(d){d.ownTeamTactic=side.tactic;for(const [armyId,team]of [['a1',d.ownTeam],...(d.reinforcements||[]).flatMap((a,i)=>a.side===0?[['a'+(i+3),a.team]]:[])])for(const entry of team){const live=side.units.find(u=>u.id===entry.id&&u.armyId===armyId);if(live){entry.first=live.status==='active';entry.retreatAt=live.retreatAt;}}}
}

document.addEventListener('dragend',()=>{ui.councilDrag=null;});
