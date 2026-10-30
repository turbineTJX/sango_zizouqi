import {icon} from './ui-icons.mjs';
import {CampaignRunner} from './campaign-runner.mjs';
import {ArchiveReader} from './archive-reader.mjs';
import {validateGameSave} from './game-save-validation.mjs';
import {patchStrategicDOM,rememberStrategicDOM,patchMarkup,patchElement} from './strategic-dom.mjs';
import {appointBattleRoles} from './battle-appointments.mjs';
import {appointEncounterRoles} from './strategic-campaign.mjs';
import {pendingArmyAppointments,confirmPostbattleAppointments} from './postbattle-appointments.mjs';
import {reinforcementArrivalMarkup,appointmentResultMarkup,battleStrength,participationMarkup} from './battle-experience-view.mjs';
import {armyAppointmentCandidates} from './army-appointments.mjs';
import {appointmentFields} from './army-appointments-view.mjs';
import {battleAppointmentsMarkup} from './battle-appointments-view.mjs';
import {isNativeApplication,saveLocationText,exportSaveFile,installNativeLifecycle} from './runtime-platform.mjs';
import {treasureDesign} from './data/design/treasures.mjs';
import {treasuresMarkup,treasureUnitMarkup} from './treasure-view.mjs';
import {grantTreasure,equipTreasure,storeTreasure} from './treasures.mjs';
import {buildingEffectText} from './building-rules.mjs';
import {setCityBudget,updateCityBudgetAlerts} from './city-budget.mjs';
import {combatType,combatFamily,equipmentNames,troopTypes} from './troop-equipment.mjs';
import {siegeFigureMarkup,siegeAppearance} from './unit-appearance.mjs';
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
import {animateArmyMarch,captureArmyMarch} from './strategic-army-markers.mjs';
import {historicalBattleDraft} from './historical-battle-library.mjs';
import {BATTLE_MAPS,battleMap} from './data/design/battle-maps.mjs';
import {createBattleMapEditor} from './battle-map-editor.mjs';
import {mapCatalog,applyMapToDraft} from './battle-map-library.mjs';
import {battleMapArtwork} from './battle-map-view.mjs';
import {battleBuildingArtwork,decorateBattleBuildings} from './battle-building-art.mjs';
import {formationMarkers} from './bond-battlefield.mjs';
import {configureReserveEntry,previewReserveEntry} from './reserve-entry.mjs';
import {marchModes,armyStrategicTrait} from './strategic-traits.mjs';
import {setArmyMarchMode} from './strategic-campaign.mjs';
import {battleBondsMarkup,personalBondsMarkup,bondsMarkup} from './bond-display.mjs';
import {dispatchScout,recallScout,scoutRoute} from './scouting.mjs';
import {editRouteWaypoint,attachMapRouteEditor} from './map-route-editor.mjs';
import {TARGET_TITLES,mapTargetCandidates,targetMapMarkup,syncMapTargetAttributes,mapTargetSummary,mapTargetSearchMarkup} from './map-target-picker.mjs';
import {centeredMapView} from './strategic-map-camera.mjs';
import {scoutSelection,scoutingMarkup,scoutingReportMarkup} from './scouting-view.mjs';
import {banditMarkup} from './bandit-view.mjs';
import {intelligenceWorld,cityVisible,withIntelligenceQueries} from './strategic-vision.mjs';
import {installBondHover} from './bond-hover.mjs';
import {FACTION_DIRECTORIES,factionDirectoryRows,factionDirectoryMarkup,mapQuickDirectory} from './faction-directory.mjs';
import {canPrepareSiegeDefense} from './strategic-roster.mjs';
import {frontlineCapacity,armyFrontlineCapacity} from './army-trait-rules.mjs';
import {BATTLE_LOG_KINDS} from './battle-log.mjs';
import {isAreaStratagem,stratagemScopeText} from './stratagem-area.mjs';
import {areaPreview,nearestAreaCell,stratagemZonesMarkup} from './stratagem-area-view.mjs';
import {retreatDestinations,configureRetreatDestination} from './strategic-retreat.mjs';
import {bondOverview} from './bond-reference.mjs';
import {abilityReference,abilityButton,abilityOverview} from './ability-reference.mjs';
import {traitChips} from './trait-display.mjs';
import {detailTable} from './ui-detail-table.mjs';
import {mapNode,isJunction} from './road-network.mjs';
import {hidden,decoyTargets,detected} from './battle-status-rules.mjs';
import {battleStratagemSource} from './engine.mjs';
import {battleCouncilMarkup,changeBattleCouncil,configureCouncilRetreat} from './battle-council.mjs';
import {createModalScrollMemory} from './modal-scroll.mjs';
import {pageGuideId} from './page-guides.mjs';
import {createPageGuideView} from './page-guide-view.mjs';
import {createDetailPanels,isObjectDetail,captureInteractionFocus,restoreInteractionFocus,visibleFocusTargets} from './detail-panels.mjs';
import {archiveSummary,listArchives,readArchive,writeArchive,deleteArchive,archivesMarkup} from './save-archives.mjs';
import {openSaveStorage,MAX_SAVE_BYTES} from './save-storage.mjs';
import {saveScenarioUnit,newScenarioSetup,newBattleSetup,scenarioSetupMarkup,scenarioSetupSteps,scenarioSetupError,scenarioSetupDraft,scenarioSetupUnits,scenarioSetupOfficer,changeScenarioSetup,applyBattleSetup} from './scenario-setup.mjs';
import {playerFaction,playerHome} from './player-faction.mjs';
import {setCombatPage,combatComparison} from './combat-comparison.mjs';
import {sortRows,sortButton} from './list-sort.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {newMilitaryFlow,militarySteps,previewMilitaryFlow,militaryFlowMarkup,encounterFlowMarkup,siegeDefenseOptionsMarkup} from './military-flow.mjs';
import {releaseCaptive,ransomCost} from './officer-fates.mjs';
import {battleUnitSummaryMarkup,battleTacticDetailMarkup,battleTacticConditions} from './battle-info.mjs';
import {campaignInfoMenu,campaignInfoMarkup,campaignInfoDetail,campaignInfoSections} from './campaign-info.mjs';
import {mapObjectActions} from './map-object-menu.mjs';
import {cityForce} from './city-units.mjs';
import {selectCommandOfficers,selectCommandArmy,resetCommandTarget,selectCommandPoint,editCommandWaypoint,removeCommandUnit,changeCommandUnit,newCommand,commandRoute,commandSteps,commandMarkup,commandCanAdvance,prepareCommandFormation} from './strategic-command.mjs';
import {diplomaticSelection} from './diplomacy-view.mjs';
import {previewBattlePlacement} from './battle-deployment.mjs';
import {updateAppointmentSelection} from './army-appointments-view.mjs';
import {tacticUsesLeft,tacticUseLimit} from './tactic-tempo.mjs';
import {commanderStratagems,selectStratagemSource,stratagemEffectText,stratagemEffectSummary} from './stratagems.mjs';
import {requestStrategicOrder,strategicOrderLabel} from './strategic-orders.mjs';
import {DIRECTIONS,pendingDomesticProposals,decideDomesticProposal,setDomesticAutoApprove} from './domestic.mjs';
import {domesticApprovalMarkup} from './domestic-proposal-view.mjs';
import {interruptionMarkup,officerWorkMarkup} from './strategic-order-view.mjs';
import {removeDomesticOrder} from './domestic.mjs';
import {campaignOfficers,campaignRosterMarkup,cityRosterMarkup,pickerReason,pickerTitle} from './strategic-roster.mjs';
import {initializeTacticLearning,LEARNING_TROOPS,troopAptitude} from './tactic-learning.mjs';
import {nationalLobby} from './national-lobby.mjs';
import {campaignEndingMarkup} from './campaign-ending-view.mjs';
import {nationalScenario} from './national-scenarios.mjs';
import {canTrain,dismissDomestic} from './domestic.mjs';
import {BATTLE_INTENTS,battleIntent,configureBattleIntent} from './engine.mjs';
import {art} from './art-assets.mjs';
import {BattleArt} from './art-battle.mjs';
import {BattleLabels,battleLabelMarkup,battleMapStatusMarkup} from './battle-labels.mjs';
let battleLabels=null;
import {attachStrategicMap,detachStrategicMap} from './art-strategic-map.mjs';
import {newCampaign,setObserverFaction,validateCampaign,serializeCampaign,calendar,isPlanning,canEditArmy,armyBattle,activeBattles,battleRecord,beginExecution,advanceCampaignStep,advanceCampaignDay,chooseEncounter,takeOverBattle,viewCampaignMap,orderCampaignArmy,recruitCampaign,splitCampaignArmy,mergeCampaignArmies,createCampaignArmy,transferOfficer,commissionProject,relieveCity,appointGovernor,changeCampaignTroop,assignDomestic,prepareAutoSiegeDefense,relinquishSiegeDefense} from './strategic-campaign.mjs';
import {cityDomesticMarkup,strategicView,campaignJournalMarkup,campaignBattleBar,snapshotMarkup,commandMap,factionAffairsMarkup,battlesPanel,replayMarkup,campaignBattleName,campaignBattleDate} from './strategic-view.mjs';
import {domesticDirectionMarkup} from './domestic-direction-view.mjs';
const newGame = (scenarioId='guandu-200',faction='cao',options={}) => newCampaign(521200,scenarioId,faction,options);
function nationalResume(){try{const data=JSON.parse(saveStorage.peek('sango-sovereign-v2'));return nationalScenario(data?.campaign?.scenarioId)?{scenarioId:data.campaign.scenarioId,day:data.campaign.day,playerFaction:playerFaction(data),allAI:data.campaign.allAI}:null;}catch{return null;}}
const validateSave=validateGameSave;
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
import {GameAudio} from './game-audio.mjs';
import {BattleAudioReader,interactionCue} from './audio-events.mjs';
import {BattleVoiceReader,StrategicVoiceReader,isVoiceRuler} from './officer-voice-events.mjs';
import {officerVoiceLine} from './officer-voice-lines.mjs';
import {MusicDirector} from './music-director.mjs';
import {assetCatalog} from './asset-catalog.mjs';
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
const saveStorage=await openSaveStorage();
let state, loadWarning = '';
const campaignRunner=new CampaignRunner();
const archiveReader=new ArchiveReader(),archiveReadOptions={inspect:(...args)=>archiveReader.inspect(...args)};
function cancelCampaignCalculation(){const busy=campaignRunner.busy;campaignRunner.cancel();ui.campaignComputing=false;if(busy)campaignProgress();}
try { const raw = saveStorage.peek(routeKey()); state = raw ? validateSave(JSON.parse(raw)) : newGame(); }
catch {
  const failedLab=['#battle-lab','#historical-battle'].includes(location.hash);
  state = newGame(); loadWarning = '存档已过期或无法读取，已按当前规则创建新局。';
  try { await saveStorage.removeItem(routeKey()); } catch {}
  if(failedLab){
    // A stale trial must not overwrite a separate, valid current campaign.
    try { const raw=saveStorage.peek(SAVE_KEY);if(raw){state=validateSave(JSON.parse(raw));loadWarning='试炼存档已过期或无法读取，已返回天下进度。';} } catch {}
    history.replaceState(null,'',location.pathname+location.search);
  }
}
const ui = { army: state.armies.find(a => a.faction === playerFaction(state))?.id, city: playerHome(state), mode: 'map', order: false, modal: null, paused: true, speed: 1, effectMode: 'clear', deploymentSelection: null, zoom: 1, showArmies: true, selectedSplit: new Set(), savedAt: null, lastTime: 0, catalogQuery:'',catalogKind:'all',catalogSort:'source',catalogPage:0,catalogSelected:[...(state.testScenario?.officerIds||[])] };
const battlePortrait=matchMedia('(max-width: 600px) and (orientation: portrait)');
battlePortrait.addEventListener('change',()=>{if(state.battle&&ui.mode!=='lobby'&&battlePortrait.matches){ui.paused=true;updateBattle();}});
let guideWasPaused=true;
let guideStorage;try{guideStorage=localStorage;}catch{}
const audio=new GameAudio({storage:guideStorage,onChange:refreshAudioControls,onError:message=>toast(message,'error'),onVoice:showOfficerVoice});
const battleAudio=new BattleAudioReader();
const battleVoice=new BattleVoiceReader(),strategicVoice=new StrategicVoiceReader();
const musicDirector=new MusicDirector();
function showOfficerVoice(line){
 const el=document.getElementById('officer-voice');if(!el)return;el.hidden=!line;if(!line)return;
 el.dataset.side=String(line.side??0);el.querySelector('[data-voice-name]').textContent=(line.side===1?'敌 · ':'')+line.name+(line.context||line.label?' · '+(line.context||line.label):'');el.querySelector('[data-voice-text]').textContent=line.text;
}
function acknowledgeOfficer(id,event='acknowledge'){
 const officer=OFFICER_BY_ID[id];if(officer)void audio.playOfficer({...officerVoiceLine(officer,event,{sovereign:isVoiceRuler(state,id)}),priority:7});
}
function refreshAudioControls(){
 for(const button of document.querySelectorAll('[data-action="audio-toggle"]')){const muted=audio.preferences.muted;button.setAttribute('aria-pressed',String(muted));button.setAttribute('aria-label',muted?'开启声音':'静音');button.title=muted?'开启声音':'静音；音量可在设置中调整';}
 for(const el of document.querySelectorAll('[data-audio-status]'))el.textContent=audio.statusText();
}
let audioModal,voiceState,voiceBattle,voiceLobby,voicePaused,voiceModal;
function syncAudioScene(){
 const lobby=ui.mode==='lobby'||(!state.battle&&!!state.testScenario),b=!lobby?state.battle:null;
 if(voiceState!==undefined&&(voiceState!==state||voiceBattle!==b||voiceLobby!==lobby||voiceModal!==ui.modal||b&&ui.paused&&!voicePaused))audio.stopOfficerSpeech();
 voiceState=state;voiceBattle=b;voiceLobby=lobby;voicePaused=ui.paused;voiceModal=ui.modal;
 if(!b){battleAudio.read(null);battleVoice.read(null);}
 const reportIds=ui.modal==='domestic-alerts'&&!ui.textDetails&&!pageGuides.isOpen?[...document.querySelectorAll('#overlay-root [data-report-node]')].map(el=>el.dataset.reportNode):[];
 const currentReport=audio.officerVoice.current?.line.reportId;if(currentReport&&!reportIds.includes(currentReport))audio.stopOfficerSpeech();
 for(const line of strategicVoice.read(state,{faction:playerFaction(state),audible:!lobby&&!b&&!document.hidden&&!pageGuides.isOpen,reportIds}))void audio.playOfficer(line);
 audio.setScene(musicDirector.update(state,ui,performance.now()/1000),{soft:!!ui.modal||!!ui.textDetails||pageGuides.isOpen||!!b&&ui.paused});
 if(audioModal!==undefined&&audioModal!==ui.modal&&['domestic-alerts','domestic-proposals','encounter'].includes(ui.modal))audio.play('notify',{priority:5});
 audioModal=ui.modal;refreshAudioControls();
}
document.addEventListener('pointerdown',()=>{void audio.unlock();},{capture:true,passive:true});
document.addEventListener('keydown',event=>{if(!event.repeat&&!event.ctrlKey&&!event.metaKey&&!event.altKey)void audio.unlock();},{capture:true});
document.addEventListener('click',event=>{
 const element=event.target.closest?.('button,a[data-action],[role="button"],[data-city],[data-command-city],[data-campaign-army],[data-unit]');
 const cue=interactionCue(element);if(!cue)return;
 if(audio.active)audio.play(cue);else void audio.unlock().then(ok=>{if(ok)audio.play(cue);});
},true);
document.addEventListener('input',event=>{
 if(event.target.dataset.cityBudgetKey){const el=event.target;ui.cityBudgetDrafts??={};ui.cityBudgetDrafts[el.dataset.cityBudgetId]??={};ui.cityBudgetDrafts[el.dataset.cityBudgetId][el.dataset.cityBudgetKey]=el.value;el.removeAttribute('aria-invalid');const status=document.querySelector(`[data-budget-draft-status="${el.dataset.cityBudgetId}"]`);if(status)status.textContent='未保存';return;}
 if(event.target.id==='archive-name')ui.archiveName=event.target.value;
 const key=event.target.dataset?.audioVolume;if(!['music','sfx','voice'].includes(key))return;
 audio.setPreferences({[key]:Number(event.target.value)/100});
 const output=document.querySelector(`[data-audio-output="${key}"]`);if(output)output.textContent=event.target.value+'%';
});
document.addEventListener('change',event=>{if(event.target.matches?.('[data-audio-track]')){audio.setPreferences({track:event.target.value});syncAudioScene();void audio.unlock();}});
const pageGuides=createPageGuideView({root:document.getElementById('page-guide-root'),storage:guideStorage,getTopic:()=>pageGuideId(ui,state),decorate:root=>art.decorate(root),
 onOpen(){guideWasPaused=ui.paused;cancelCampaignCalculation();ui.paused=true;syncAudioScene();},
 onClose(){ui.paused=guideWasPaused;ui.lastTime=performance.now();pageGuides.schedule();syncAudioScene();},
 onPreferences(){renderModal();},
 onStorageError(){toast('浏览器无法保存指引偏好，本次关闭仍然有效');}
});
ui.mode = location.hash==='#strategy'||(location.hash==='#historical-battle'&&currentScenario()?.campaign)||(location.hash==='#battle-lab'&&state.testScenario&&!currentScenario()?.campaign) ? 'map' : 'lobby';
ui.historySelection = currentScenario()?.campaign ? state.testScenario.id : 'custom-battle';
ui.customBattle = structuredClone(state.testScenario?.customBattle??defaultCustomBattle());
try { const draft=localStorage.getItem('sango-custom-draft-v46');if(draft)ui.customBattle=validateCustomBattle(JSON.parse(draft)); } catch {}
function saveCustomDraft(){try{localStorage.setItem('sango-custom-draft-v46',JSON.stringify(validateCustomBattle(ui.customBattle)));}catch{}}
function refreshCustomDraft(){for(const key of ['ownTeam','enemyTeam'])ui.customBattle[key+'Roles']??=customRoles(ui.customBattle,key);saveCustomDraft();render();}
const mapEditor=await createBattleMapEditor({onRender:render,onMessage:message=>toast(message),onBack:()=>showLobby('custom'),onApply:map=>{ui.customBattle=applyMapToDraft(ui.customBattle,map);saveCustomDraft();showLobby('custom');}});
if(ui.mode !== 'lobby')ui.modal=state.report?'report':state.pending?'encounter':null;
try { ui.effectMode = localStorage.getItem('sango-effects-mode') === 'clear' ? 'clear' : 'full'; } catch { ui.effectMode='full'; }
let toastTimer;
let battleFx = null;
let battleArt = null;
const commandCue = new CommandCue();
function toast(text,cue='notify') { audio.play(cue,{priority:cue==='order'?7:cue==='error'?5:3}); $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3400); }
async function save(silent = true) {
  mapNeedsRefresh=true;
  cancelCampaignCalculation();
  if(state.campaign){updateCityBudgetAlerts(state);recordOfficerActivities(state);}
  try { await saveStorage.setItem(storageKey(), state.campaign?serializeCampaign(state):JSON.stringify(state)); ui.savedAt = new Date(); if (!silent) toast(state.testScenario ? '战役进度已单独保存' : '进度已保存到本机'); return true; }
  catch { cancelCampaignCalculation();ui.paused=true;render();toast('本机存档写入失败，原存档已保留，请在设置中导出当前进度','error');return false; }
}
function openArchives(){
  ui.paused=true;ui.archiveConfirm=null;ui.archiveEntries=null;ui.archiveError=null;const summary=archiveSummary(state);
  ui.archiveName=summary.scenario+(summary.faction?' · '+summary.faction:'')+' · '+summary.progress;
  openModal('archives');
  void refreshArchives();
}
async function refreshArchives(){
 const request=ui.archiveRequest=(ui.archiveRequest||0)+1;
 try{const entries=await listArchives(saveStorage,validateSave,archiveReadOptions);if(request!==ui.archiveRequest)return;ui.archiveEntries=entries;ui.archiveError=null;}
 catch{ui.archiveError='本机存储不可用，无法读取存档列表。可返回设置导出当前进度。';}
 if(ui.modal==='archives')renderModal();
}
function archiveListMarkup(){return ui.archiveError?`<p>${ui.archiveError}</p>`:ui.archiveEntries?archivesMarkup(ui.archiveEntries,{canSave:ui.mode!=='lobby',name:ui.archiveName}):'<p role="status">正在读取存档…</p>';}
function selectedArmy() { return armyById(state, ui.army) || state.armies.find(a => a.faction === playerFaction(state)); }
function currentScenario() { const s=SCENARIOS.find(s => s.id === state.testScenario?.id),map=state.testScenario?.customBattle?.mapData||BATTLE_MAPS[state.testScenario?.customBattle?.mapId];return map?{...s,name:map.name}:s; }
function historicalResume() {
  try {
    const raw=saveStorage.peek(HISTORY_SAVE_KEY);
    if(!raw)return null;
    const saved=validateSave(JSON.parse(raw)),scenario=SCENARIOS.find(s=>s.id===saved.testScenario?.id&&s.campaign);
    if(!scenario||(!saved.battle&&!saved.report))return null;
    return {name:saved.testScenario.customBattle?.mapData?.name||BATTLE_MAPS[saved.testScenario.customBattle?.mapId]?.name||scenario.name,finished:!!saved.report,stage:saved.report?'本役已结束':isDeploying(saved.battle)?'待布阵':`第 ${battleDay(saved.battle.tick)} 天 · 已暂停`};
  } catch { return {name:'战役试玩存档不可用',stage:'版本不兼容或数据损坏，请重新开始',invalid:true}; }
}
function showLobby(page = 'modes') {
  ui.lobbyPage=page;
  if(page==='national')ui.nationalDraft={...ui.nationalDraft,step:'scenario'};
  ui.paused=true;ui.modal=null;ui.mode='lobby';ui.battlePanel=null;
  history.replaceState(null,'',location.pathname+location.search);render();window.scrollTo(0,0);
}
function continueHistory() {
  try {
    const raw=saveStorage.peek(HISTORY_SAVE_KEY);
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
    const raw = saveStorage.peek(SAVE_KEY);
    let next,warning='';
    try { next=raw?validateSave(JSON.parse(raw)):newGame(); }
    catch { next=newGame();warning='天下存档已过期或无法读取，已按当前规则创建新局。'; }
    save(); state = next; history.replaceState(null, '', location.pathname + location.search);
    restoreUI();save();if(warning)toast(warning);
  } catch (error) { toast(`天下存档读取失败：${error.message}`); }
}
function scenarioModal() {
  return modalShell('战役试炼', '', `<label class="scenario-seed" hidden>随机种子 <input id="scenario-seed" type="number" min="0" max="4294967295" step="1" placeholder="留空使用各战役固定种子"></label><label class="scenario-seed">守方首发护盾 <input id="scenario-shield" type="number" min="0" max="100" step="1" value="${state.testScenario?.shieldPercent ?? 20}" aria-label="守方首发护盾百分比"><small>% · 仅攻守城</small></label><div class="scenario-grid">${SCENARIOS.filter(s=>!s.campaign).map(s => `<article class="scenario-card"><div class="eyebrow">${s.kind} · ${s.difficulty}</div><h3>${s.name}</h3><div class="scenario-strength"><span>我军 <b>${fmt(s.own*s.ownTroops)}</b><small>${s.own} 队 · Lv.${s.level}</small></span><span>敌军 <b>${fmt(s.enemy*s.enemyTroops)}</b><small>${s.enemy} 队 · Lv.${s.enemyLevel}</small></span></div><p class="scenario-waves">${s.id==='officer-lab'?'可选 1～6 人':s.waves.length ? s.waves.map((w,i)=>`第 ${i+1} 批：${w.count} 队 · ${w.tick ? battleDays(w.tick)+' 天到达' : '开局待命'}`).join('<br>') : `我军 ${Math.min(6,s.own)} 队、敌军 ${Math.min(6,s.enemy)} 队首发，无预备队`}</p><small class="scenario-goal">${s.goal}</small><button class="button primary full" data-action="launch-scenario" data-scenario="${s.id}">布阵</button><button class="button secondary full" data-action="preset-edit" data-scenario="${s.id}">编辑战役</button></article>`).join('')}</div>`, state.testScenario ? '<button class="button secondary" data-action="exit-scenario">返回</button>' : '', true);
}
function scenarioControls(b) {
  const s = currentScenario();
  if (!s) return '';
  return `<div class="scenario-toolbar"><div><b>${esc(s.name)}</b></div><div><button class="button secondary" data-action="step-scenario" data-steps="1" title="推进1个战斗回合" ${isDeploying(b)||b.result?'disabled':''}>单步</button><button class="button secondary" data-action="step-scenario" data-steps="10" title="推进10个战斗回合" ${isDeploying(b)||b.result?'disabled':''}>十步</button><button class="button secondary" data-action="retry-scenario">同局重试</button><button class="button secondary" data-action="rematch-scenario">换局再战</button><button class="button secondary" data-action="${s.campaign?'campaign-lobby':'scenarios'}">切换战役</button><button class="button secondary" data-action="lobby">模式首页</button></div></div>`;
}
function siegeTerrain(b) {
  return [...(b.siege?.gate?[b.siege.gate]:[]),...(b.buildings||[])].map(g=>buildingMarker(b,g)).join('');
}
function buildingMarker(b,g) {
  return `<button class="siege-gate has-building-art side-${g.side} ${g.hp===0?'is-destroyed':''}" data-action="${g.type==='gate'?'inspect-gate':'inspect-building'}" data-building="${esc(g.id)}" style="${hexCellStyle(g.x,g.y)}" aria-label="${g.side===0?'我方':'敌方'}${esc(g.name)}，耐久${g.hp}/${g.maxHp}" title="${esc(g.name)} · ${fmt(g.hp)} / ${fmt(g.maxHp)}">${battleBuildingArtwork(g)}<span class="unit-name">${esc(g.name)}</span><span class="unit-health"><i style="width:${g.hp/g.maxHp*100}%"></i></span><span class="unit-number">${compact(g.hp)}/${compact(g.maxHp)}</span>${b.sides[0].focus===g.id&&b.sides[0].focusUntil>b.tick?'<span class="target-ring"></span>':''}</button>`;
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
  const stats = b.sides.map((s,i) => battleStrength(b,i));
  return `<div class="arena-header"><div class="arena-title"><h1>${currentScenario()?.name || (state.campaign?battleRecord(state,state.campaign.focusId)?.name:null) || cityById(state,b.cityId).name+'之战'}</h1><span>意图：${BATTLE_INTENTS[battleIntent(b)]}${isDeploying(b)?' · 战前可调整':' · 已锁定'} · ${BATTLE_TERRAINS[b.terrain]} · ${battleTimeText(b)}</span></div><div class="arena-strength" aria-label="双方兵力：在场、后备、未抵达">${stats.map((s,i)=>`<span class="side-${i}">${i?(currentScenario()?.enemyName||'敌军'):(currentScenario()?.ownName||'我军')} <b>${fmt(s.active)} <small>在场</small></b><small class="strength-breakdown">后备 ${fmt(s.reserve)} · 待援 ${fmt(s.pending)}${s.withdrawn?" · 撤离 "+fmt(s.withdrawn):""}</small><i><em style="width:${s.hp/Math.max(1,s.total)*100}%"></em></i></span>`).join('')}</div><div class="battle-header-tools"><button class="button secondary toolbar-icon-button" data-action="lobby" title="保存并返回模式首页" aria-label="保存并返回模式首页">${icon('home')}</button><button class="button secondary toolbar-icon-button" data-action="battle-panel" data-panel="tools" title="战斗工具" aria-label="战斗工具">${icon('gear')}</button></div></div>`;
}

function battlePlayback(b){
 return `${isBattleCouncil(b)?'<button class="button secondary" data-action="show-council" aria-expanded="'+!!ui.councilOpen+'">'+(isReinforcementCouncil(b)?'援军军议':'首发 / 后备')+'</button>':''}<button class="button primary" data-action="pause">${icon(ui.paused?'play':'pause')}${isDeploying(b)?'确认开战':isReinforcementCouncil(b)?'继续作战':ui.paused?'继续战斗':'暂停'}</button><button class="button secondary" data-action="speed" title="切换战斗速度" aria-label="切换战斗速度">${ui.speed}×</button>`;
}

function tacticCondition(u,s,b) {return battleTacticConditions(b,u,s).join(' · ')||'等待目标与自动施放检查';}

function tacticChips(u,b) {
  return '<div class="tactic-chips">'+unitTactics(u).map(s=>'<button class="tactic-chip '+(s.special?'special':'')+'" data-action="tactic-detail" data-inspect="'+u.id+'" data-skill="'+s.id+'"><strong>'+(s.special?'★ ':'')+esc(s.name)+'</strong>'+(inspectionBattle()?'<em>剩余 '+tacticUsesLeft(u,s)+'/'+tacticUseLimit(u,s)+' 次</em>':'')+'</button>').join('')+'</div>';
}

function battleUnitMarkup(u, b) {
  const targeted = b.sides[0].focus === u.id && b.sides[0].focusUntil > b.tick;
  const health=Math.max(0,Math.min(100,u.hp/u.maxHp*100)),intent=Math.max(0,Math.min(100,(u.intent||0)/COMBAT.intentCap*100));
  const statuses=inspectionStatuses(b,u),summary=statuses.map(s=>`${s.name} · ${s.time}`).join('；');
  return `${siegeFigureMarkup(u)}<span class="unit-type">${TROOPS[combatType(u)].icon}</span>
  <span class="unit-map-caption" style="--troop-health:${health}%;" title="${esc(summary)}">
    <span class="map-portrait-row"><span class="map-portrait-ring">${avatar(u,true)}</span><span class="map-troop-type">${TROOPS[combatType(u)].icon}</span></span>
    <b>${esc(u.name)}</b><span class="map-troops">${Math.round(u.hp)}</span>
    <span class="map-statuses">${battleMapStatusMarkup(statuses)}</span>
    <span class="map-intent-pips" aria-label="战意 ${Math.round(u.intent||0)} / ${COMBAT.intentCap}">${Array.from({length:5},(_,i)=>`<span><span style="width:${Math.max(0,Math.min(100,(intent-i*20)*5))}%"></span></span>`).join('')}</span>
    <span class="unit-current-action" hidden></span>
  </span>${targeted ? '<span class="target-ring"></span>' : ''}`;
}
function enemyCommandMarkup(b){
  const c=b.enemyCommand,last=c.lastCommand;
  return '<div class="enemy-command-state"><b>敌军军略 '+Math.floor(c.commandProgress/COMMAND_RESOURCE.capacity*100)+'%</b><p>已掌握：'+(battleStratagems(b,1).map(k=>STRATAGEMS[k].name).join(' · ')||'暂无')+'</p><span>'+(last?'最近施放：'+(STRATAGEMS[last.key]?.name||last.key)+'':'蓄势中')+'</span></div>';
}
function battleSidebar(b) {
  return `<aside class="battle-sidebar">${reinforcementPanel(b)}${enemyCommandMarkup(b)}<p class="terrain-note"><b>${esc(battleMap(b).name)}</b> · ${BATTLE_TERRAINS[b.terrain]}</p><div class="section-heading"><h3>战场态势</h3></div><div class="battle-summary"><div><b>${activeUnits(b, 0).length}<small> / ${frontlineCapacity(b,0)}</small></b><span>我军在场</span></div><div><b>${b.sides[0].units.filter(u => u.status === 'reserve').length}</b><span>预备部队</span></div></div><div class="combo-summary"><span>我军连携 <b>${b.comboCounts?.[0]||0}</b></span><span>敌军连携 <b>${b.comboCounts?.[1]||0}</b></span></div><button class="button secondary full" data-action="unit-stats">部队详情</button><h4>前线诸将 <small>自动作战</small></h4><div class="frontline-list">${activeUnits(b, 0).map(u => `<div>${avatar(u, true, 'unit-stats')}<div><b><button class="unit-inspect-link" data-action="unit-stats" data-inspect="${u.id}">${u.name}</button><span>${compact(u.hp)}</span></b><small>${esc(u.action)} · 战法 ${u.skillCasts || 0} 次</small><small>${TERRAIN_NAMES[unitTerrain(b,u)]} · 本场伤兵 ${battleWounded(u)} · 射程 ${attackRange(b,u)}</small><small class="intent-label">战意 <b>${u.intent || 0} / ${COMBAT.intentCap}</b></small>${tacticChips(u,b)}<div class="meter"><i style="width:${u.hp / u.maxHp * 100}%"></i></div></div></div>`).join('')}</div><h4>后备序列</h4><div class="reserve-list">${b.sides[0].units.filter(u => u.status === 'reserve').map(u => `<button class="unit-inspect-link" data-action="unit-stats" data-inspect="${u.id}">${u.name}<small>${TROOPS[u.type].name} · 战意 ${u.intent || 0}</small></button>`).join('') || '<p class="muted">暂无待命预备队</p>'}</div><h4>战况记录</h4><div class="battle-logs">${b.logs.slice(0, 8).map(l => `<p><time>${String(l.tick).padStart(3, '0')}</time>${esc(l.text)}</p>`).join('')}</div></aside>`;
}
function marchModeMetrics(army,mode){
 const trait=armyStrategicTrait(army,mode==='light'?'lightMarch':'forcedMarch');
 if(mode==='normal'||!trait)return '';
 const r=trait.strategic,rows=[['速度','×'+r.speed],...(mode==='light'?[['携粮容量',Math.round(r.capacity*100)+'%']]:[['每日士气','−'+r.morale],['最低士气',r.minimum],['停行休整',r.recovery+'天']])];
 return '<dl class="info-fields march-mode-metrics">'+rows.map(([label,value])=>'<div><dt>'+label+'</dt><dd>'+value+'</dd></div>').join('')+'</dl>'+abilityButton('trait',trait.id,trait.name+'详情');
}
function commands(b) {
  const available=battleStratagems(b),intellect=commandIntellect(b),progress=(b.commandProgress||0)/COMMAND_RESOURCE.capacity;
  const command = (action, symbol, name, hint, cost, meta='') => {
    const cd = Math.max(0,(b.commandReady?.[action] || 0) - b.tick);
    return `<button class="command-button" data-command="${action}" ${(isDeploying(b) || b.result || cost && b.commandProgress < COMMAND_RESOURCE.capacity || cd && action !== 'retreat' || b.sides[0].retreat || b.sides[0].stratagemUses?.[action]) ? 'disabled' : ''}>${icon(symbol)}<span><b>${name}</b><small>${esc(hint)}</small>${meta?`<small class="command-meta">${esc(meta)}</small>`:''}${b.sides[0].stratagemUses?.[action]?'<small>本场已使用</small>':''}${cd ? `<small>冷却中</small>` : ''}</span><em>${cost ? '满条' : '免费'}</em></button>`;
  };
  const strategies = Object.entries(STRATAGEMS).filter(([key])=>available.includes(key)).map(([key,s])=>{const source=battleStratagemSource(b,key);return `<article class="stratagem-choice">${command(key,s.icon,s.name,stratagemEffectSummary(source),s.cost,(source?.name||'')+' · '+stratagemScopeText(s))}${abilityButton('stratagem',key,'详情',stratagemEffectText(source))}</article>`;}).join('');
  const statuses=b.sides.flatMap((side,index)=>Object.entries(side.stratagemEffects||{}).filter(([field,p])=>side[field]>b.tick).map(([field,p])=>`<span class="army-buff ${index?'debuff':''}">${abilityButton('stratagem',p.key,STRATAGEMS[p.key].name,stratagemEffectText(p))}<b>${index?'敌军':'我军'} · 生效中</b></span>`)).join('');
  return `<div class="command-heading"><div><span class="eyebrow">军略</span><b>${Math.floor(progress*100)}<small>%</small></b></div><p>${isDeploying(b) ? '战前筹备' : ui.paused ? '已暂停' : '交战中'}</p></div><div class="command-resource"><span>军略</span><div class="meter" role="progressbar" aria-label="军略积累" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(progress*100)}"><i style="width:${progress*100}%"></i></div><small>${!available.length?'暂无军略':progress>=1?'军略就绪':'蓄势中'}</small></div>${statuses ? `<div class="army-buffs">${statuses}</div>` : ''}<div class="command-row stratagem-options">${strategies || '<p class="muted">暂无可用军略</p>'}</div><p class="basic-order-label">基础军令</p><div class="command-row tactical-orders">${command('retreat','wind','全军撤退','向己方边缘脱离',0)}</div>`;
}
function deploymentBoard(b) {
  return Array.from({length:GRID.rows*5},(_,i)=>`<button class="deployment-cell" data-deploy-x="${i%5}" data-deploy-y="${Math.floor(i/5)}" style="${hexCellStyle(i%5,Math.floor(i/5))}" aria-label="布阵第${i%5+1}列第${Math.floor(i/5)+1}行 · ${TERRAIN_NAMES[terrainAt(b,i%5,Math.floor(i/5))]}"></button>`).join('');
}
function hexBoard(b) {
  const formation=[0,1].flatMap(side=>formationMarkers(b,side));
  const aims=b.sides.flatMap(s=>s.units).filter(u=>u.tacticAim&&u.status==='active'&&(u.side===0||!hidden(b,u)));
  const h=100*2/Math.sqrt(3),w=HEX_GRID.width*100,height=HEX_GRID.height*h;
  const cells=Array.from({length:112},(_,i)=>{
    const x=i%14,y=Math.floor(i/14),p=hexCenter(x,y),cx=p.x*w,cy=p.y*height;
    const ground=terrainAt(b,x,y);
    const mark=formation.find(p=>p.x===x&&p.y===y);
    const aim=aims.find(u=>u.tacticAim.cells.some(p=>p.x===x&&p.y===y));
    return `<polygon data-formation-side="${mark?.side??''}" data-formation-id="${mark?.id??''}" data-tactic-aim="${aim?.id??''}" class="${aim?'hex-tactic-aim aim-side-'+aim.side:''} ${mark?'hex-formation formation-'+mark.side+(mark.tier?' formation-active':''):''} hex-${ground} ${x<5?'hex-home':x>8?'hex-away':''}" points="${[[0,-.5],[.5,-.25],[.5,.25],[0,.5],[-.5,.25],[-.5,-.25]].map(([dx,dy])=>[cx+dx*100,cy+dy*h].join(',')).join(' ')}"><title>${TERRAIN_NAMES[ground]}${mark?` · ${mark.side?'敌方':'我方'}${mark.title}`:''}</title></polygon>${mark?`<text class="formation-cell-label" x="${cx}" y="${cy-h*.12}">${mark.short}</text>`:''}${ground==='land'?'':`<text class="terrain-cell-label" x="${cx}" y="${cy+h*.34}">${TERRAIN_NAMES[ground]}</text>`}`;
  }).join('');
  return `<svg class="hex-grid" viewBox="0 0 ${w} ${height}" aria-hidden="true">${battleMapArtwork(b)}${cells}</svg>`;
}
function battle() {
  const b=state.battle;
  return `${state.campaign?campaignBattleBar(state):''}<main class="battle-page arena-page"><div class="battle-rotate-notice" role="status"><span class="rotate-device" aria-hidden="true">▯ ↻ ▭</span><h2>请横屏游玩</h2><p>战斗已暂停，旋转手机后继续。</p><button class="button secondary" data-action="lobby">返回首页</button></div><div id="battle-header">${battleHeader(b)}</div><div id="stratagem-area-controls" class="stratagem-area-controls" hidden></div><div id="ability-cues" class="ability-cues" aria-label="特性与战法发动"></div><div class="battle-layout"><div id="battle-unit-labels" aria-label="部队情报名册"><aside class="roster-side roster-side-0"><header>我军<small>部队情报</small></header><div class="roster-list"></div><div id="battle-bonds" class="battle-bonds">${battleBondsMarkup(b,0)}</div></aside><aside class="roster-side roster-side-1"><header>敌军<small>部队情报</small></header><div class="roster-list"></div><div id="enemy-battle-bonds" class="battle-bonds">${battleBondsMarkup(b,1)}</div></aside></div><div class="arena-stage"><div class="battle-board" id="battle-board" style="--hex-aspect:${HEX_ASPECT}">${hexBoard(b)}<div id="siege-terrain">${siegeTerrain(b)}</div><div id="deployment-grid"></div><div id="battle-units"></div><div id="stratagem-zone-overlay"></div><div id="stratagem-area-overlay"></div><canvas id="battle-effects" aria-hidden="true"></canvas></div></div></div><button id="tactic-result" class="tactic-result" data-action="battle-panel" data-panel="events" disabled>暂无记录</button><div class="arena-context"><span class="battlefield-name" title="${esc(battleMap(b).description)}">${esc(battleMap(b).name)}</span><span class="terrain-legend">${[...new Set(Array.from({length:112},(_,i)=>terrainAt(b,i%14,Math.floor(i/14))))].map(t=>`<span class="terrain-key terrain-${t}">${TERRAIN_NAMES[t]}</span>`).join('')}</span><span id="pause-note" hidden>已暂停</span><span class="arena-legend"><i></i>我军 <i></i>敌军</span><span id="enemy-command-note" class="enemy-command-state"></span><span id="gate-summary"></span></div><div id="deployment-guide" class="deployment-guide"></div><div id="deployment-preview"></div><footer class="arena-dock"><div id="battle-playback" class="battle-playback">${battlePlayback(b)}</div><button id="command-cue" class="command-cue" data-action="choose-stratagem" aria-haspopup="dialog"><span id="command-cue-label"></span><span class="cue-track" role="progressbar" aria-label="军略进度" aria-valuemin="0" aria-valuemax="100"><i></i></span></button><button class="button secondary toolbar-icon-button" data-action="battle-panel" data-panel="intel" title="战况" aria-label="战况">${icon('info')}</button><button class="button secondary toolbar-icon-button" data-action="battle-panel" data-panel="events" title="战斗日志" aria-label="战斗日志">${icon('scroll')}</button></footer><span id="command-announcement" class="sr-only" role="status" aria-live="polite"></span><section id="arena-panel" class="arena-panel" hidden><header><b id="arena-panel-title"></b><button class="button secondary toolbar-icon-button" data-action="close-battle-panel" title="收起" aria-label="收起">${icon('close')}</button></header><div id="battle-commands"></div><div id="battle-sidebar"></div><section class="battle-events" id="battle-events" aria-label="战斗动态"><div class="battle-events-heading"><span>战斗日志</span><span>最近300条 · 随存档保留</span></div><nav id="battle-log-filters" class="battle-log-filters" aria-label="日志筛选"></nav><div id="battle-journal" class="battle-journal" role="log" aria-label="战斗日志" aria-live="off"></div><div id="skill-feed" hidden class="skill-feed" role="log" aria-label="特性与战法战斗日志" aria-live="off"></div><div id="stratagem-feedback" aria-live="polite"></div></section><div id="battle-tools"><div class="arena-tools">${state.testScenario?.customBattle?'<button class="button secondary" data-action="custom-edit">编辑战役</button>':''}<button class="button secondary" data-action="army">军团情报</button><button class="button secondary" data-action="effects-mode" id="effects-mode"></button><button class="button secondary" data-action="settings">设置</button><button class="button secondary" data-action="help">玩法说明</button></div><div id="scenario-controls">${scenarioControls(b)}</div></div></section></main>`;
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
  const g=b.siege?.gate;
  $('#gate-summary').textContent=g?`${g.side?'敌方':'我方'}城门 ${fmt(g.hp)} / ${fmt(g.maxHp)}`:'';
}

function updateBattle() {
  if(battlePortrait.matches)ui.paused=true;
  if(ui.deploymentBattleId&&ui.deploymentBattleId!==state.battle?.id){ui.deploymentSelection=null;ui.deploymentDraft=null;ui.deploymentBattleId=null;}
  if(ui.areaDraft&&(ui.areaDraft.battleId!==state.battle?.id||state.battle?.result))ui.areaDraft=null;
  if(ui.areaDraft&&battleStratagemSource(state.battle,ui.areaDraft.key)?.id!==ui.areaDraft.sourceId)ui.areaDraft=null;
  const overlay=$('#stratagem-area-overlay'),controls=$('#stratagem-area-controls');
  const preview=ui.areaDraft?areaPreview(state.battle,STRATAGEMS[ui.areaDraft.key],ui.areaDraft):null;
  const affected=new Set(preview?.targetIds||[]);
  if(overlay&&controls){

    patchMarkup(overlay,preview?.svg||'');patchMarkup(controls,preview?.controls||'');controls.hidden=!preview;
  }
  if (!state.battle || !$('#battle-units')) return;
  pageGuides.schedule();
  const b = state.battle;
  patchMarkup($('#stratagem-zone-overlay'),stratagemZonesMarkup(b));
  $('#battle-board').dataset.battleId=b.id;
  if(state.campaign&&$('#campaign-battle-bar'))$('#campaign-battle-bar').outerHTML=campaignBattleBar(state);
  patchMarkup($('#battle-header'),battleHeader(b));
  patchMarkup($('#battle-playback'),battlePlayback(b));
  const playback=$('.battle-playback');if(playback&&!playback.querySelector('[data-action="audio-toggle"]'))playback.insertAdjacentHTML('beforeend',audio.buttonMarkup());
  $('#battle-board').classList.toggle('clear-effects',ui.effectMode==='clear');
  $('#battle-board').style.setProperty('--battle-move-ms', Math.round(220/ui.speed)+'ms');
  $('#effects-mode').textContent = ui.effectMode==='clear' ? '清晰特效' : '完整特效';
  $('#effects-mode').setAttribute('aria-label','切换特效，当前'+(ui.effectMode==='clear'?'清晰模式':'完整模式'));
  patchMarkup($('#scenario-controls'),scenarioControls(b));
  patchMarkup($('#siege-terrain'),siegeTerrain(b));
  decorateBattleBuildings($('#siege-terrain'));
  patchMarkup($('#battle-sidebar'),battleSidebar(b));
  for(const side of [0,1]){const panel=$(side?'#enemy-battle-bonds':'#battle-bonds'),bondHtml=battleBondsMarkup(b,side);if(panel.innerHTML!==bondHtml){const scroll=panel.querySelector('.bond-list')?.scrollTop||0;panel.innerHTML=bondHtml;panel.querySelector('.bond-list').scrollTop=scroll;}}
  patchMarkup($('#battle-commands'),'');
  updateArena(b);
  const deploying = isDeploying(b), council = isBattleCouncil(b),entryTargeting=council&&ui.reserveEntrySelection&&b.sides[0].units.some(u=>u.id===ui.deploymentSelection&&u.status==='reserve');
  $('#ability-cues').hidden=deploying;
  $('#tactic-result').hidden=deploying;
  const grid=$('#battle-board .hex-grid');if(grid)patchElement(grid,hexBoard(b));
  $('#pause-note').hidden = !ui.paused || deploying;
  $('#battle-board').classList.toggle('deployment-on',deploying||entryTargeting);
  $('#battle-board').classList.toggle('deployment-targeting',(deploying||entryTargeting)&&!!ui.deploymentSelection);
  $('#deployment-grid').hidden = !(deploying||entryTargeting);
  $('#deployment-guide').hidden = !council||!ui.councilOpen;
  $('#deployment-preview').replaceChildren();
  if (council) {
    if ((deploying||entryTargeting) && !$('#deployment-grid').children.length) $('#deployment-grid').innerHTML = deploymentBoard(b);
    const chosen = b.sides[0].units.find(u=>u.id === ui.deploymentSelection);
    $('#deployment-guide').innerHTML = '<button class="button secondary council-close" data-action="show-council" aria-label="收起军议">'+icon('close')+'</button>'+battleCouncilMarkup(b,{appointments:ui.battleAppointmentDraft||{},armies:state.armies,destinations:state.campaign?retreatDestinations(state,b):[],appointmentsOpen:$('#deployment-guide .council-appointments')?.open,open:$('#deployment-guide .council-reserves')?.open,retreatOpen:$('#deployment-guide .retreat-council')?.open,selected:ui.retreatBattleId===b.id?ui.retreatSelected:[]})+(deploying?`<b>${chosen ? `移动 ${chosen.name} · 点格子或我军部队` : '战前布阵'}</b><div class="deployment-actions"><label>战斗意图 <select id="battle-intent" aria-label="战斗意图">${Object.entries(BATTLE_INTENTS).map(([id,name])=>`<option value="${id}" ${battleIntent(b)===id?'selected':''} ${id==='siege'&&b.siege?.attackerSide!==0?'disabled':''}>${name}</option>`).join('')}</select><small>开战后不可更改</small></label><label>地形 <select id="battle-terrain" aria-label="战场地形" ${currentScenario()?.campaign||state.campaign?'disabled':''}>${Object.entries(BATTLE_TERRAINS).map(([id,name])=>`<option value="${id}" ${b.terrain===id?'selected':''} ${id!=='river'&&b.sides.some(s=>s.units.some(u=>u.type==='ship'))?'disabled':''}>${name}</option>`).join('')}</select></label><button data-action="army">军团</button><button data-action="loadout">固定战法</button><button data-action="reset-deployment">重置阵型</button></div>`:'');
  }
  if(!council){ui.deploymentSelection=null;ui.deploymentDraft=null;ui.reserveEntrySelection=false;ui.councilOpen=false;}
  if(council&&ui.deploymentSelection){
   const chosen=b.sides[0].units.find(u=>u.id===ui.deploymentSelection),p=ui.deploymentDraft?.battleId===b.id?ui.deploymentDraft:null,swapped=p?.swapId&&b.sides[0].units.find(u=>u.id===p.swapId);
   $('#deployment-preview').insertAdjacentHTML('beforeend',`<div class="deployment-preview" role="status"><b>${esc(chosen?.name||'本方部队')}</b><span>${p?p.kind==='entry'?(p.x===null?'自动入场':'入场位置 · '+(p.x+1)+'列 '+(p.y+1)+'行'):p.kind==='reserve'?'调整后备顺序 → '+esc(b.sides[0].units.find(u=>u.id===p.toId)?.name||'队末'):`第${p.x+1}列、第${p.y+1}行${swapped?' · 与'+esc(swapped.name)+'交换':''}`:'选择落点或本方部队'}</span><button class="button secondary" data-action="deployment-cancel">取消</button><button class="button primary" data-action="deployment-confirm" ${p?'':'disabled'}>确认</button></div>`);
  }
  for(const cell of document.querySelectorAll('[data-deploy-x]'))cell.classList.toggle('deploy-preview',!!ui.deploymentDraft&&ui.deploymentDraft.kind!=='reserve'&&Number(cell.dataset.deployX)===ui.deploymentDraft.x&&Number(cell.dataset.deployY)===ui.deploymentDraft.y);
  // Keep a visible casualty's identity until its recorded killing blow lands.
  const priorIds=new Set([...$('#battle-units').children].map(el=>el.dataset.unit));
  const live = b.sides.flatMap(s => s.units).filter(u => (u.status === 'active'||!ui.paused&&u.status==='defeated'&&priorIds.has(u.id)&&b.effects.some(e=>e.to===u.id))&&(deploying||u.side===0||!hidden(b,u)));
  for(const el of document.querySelectorAll('.decoy-marker'))el.remove();
  for(const d of [0,1].flatMap(side=>decoyTargets(b,side))){const el=document.createElement('div');el.className='decoy-marker side-'+d.side;el.style.cssText=hexCellStyle(d.x,d.y);el.textContent=detected(b,d,0)?'已识破':'疑兵';el.title=d.name+' · 耐久 '+d.hp+' · 无攻击力';$('#battle-units').append(el);}
  for(const label of [...$('#battle-unit-labels').querySelectorAll('.unit-nameplate')])if(!live.some(u=>u.id===label.dataset.inspect))label.remove();
  for (const existing of [...$('#battle-units').children]) if (!existing.classList.contains('decoy-marker')&&!live.some(u => u.id === existing.dataset.unit)) existing.remove();
  for (const u of live) {
    let el = [...$('#battle-units').children].find(e => e.dataset.unit === u.id);
    if (!el) { el = document.createElement('button'); el.dataset.unit = u.id; $('#battle-units').append(el); }
    el.className = `battle-unit side-${u.side} ${combatType(u)}${siegeAppearance(u)?' equipment-deployed':''}${u.formReadyTick>b.tick?' equipment-deploying':''}${hasStatus(b,u,'decoy')?' has-illusion':''}${deploying && ui.deploymentSelection === u.id ? ' deploy-selected' : ''}`;
    el.dataset.combatType=combatType(u);
    el.classList.toggle('stratagem-affected',affected.has(u.id));
    el.classList.toggle('status-stealth',hasStatus(b,u,'stealth'));
    el.classList.toggle('buff-attack',b.sides[u.side].assaultUntil > b.tick);
    el.classList.toggle('inspected',ui.inspectUnit===u.id&&!!ui.modal);
    el.classList.toggle('buff-defense',b.sides[u.side].fortifyUntil > b.tick);
    el.classList.toggle('debuffed',b.sides[u.side].disruptUntil > b.tick);
    for(const key of ['scorch','confuse','seal','ward','confuse','phalanx','shield','burn','haste','valor'])el.classList.toggle(`status-${key}`,hasStatus(b,u,key));
    el.draggable = deploying && u.side === 0;
    el.style.cssText = hexCellStyle(u.x,u.y);
    patchMarkup(el,battleUnitMarkup(u,b)); el.title = `${u.name} · ${TROOPS[combatType(u)].name} · ${fmt(u.hp)} 人 · 战意 ${u.intent || 0} · ${u.action}`;
    el.setAttribute('aria-label', `${u.side ? '敌军' : '我军'}${u.name}，${TROOPS[combatType(u)].name}，兵力${u.hp}${visibleStatuses(b,u).map(s=>'，'+s.name+' '+s.time).join('')}，点击查看部队属性`);
    let label=[...$('#battle-unit-labels').querySelectorAll('.unit-nameplate')].find(e=>e.dataset.inspect===u.id);
    if(!label){label=document.createElement('button');label.dataset.action='unit-stats';label.dataset.inspect=u.id;$('.roster-side-'+u.side+' .roster-list').append(label);}
    label.className=`unit-nameplate side-${u.side}${ui.inspectUnit===u.id&&ui.modal?' inspected':''}${deploying&&ui.deploymentSelection===u.id?' deploy-selected':''}`;
    label.draggable=deploying&&u.side===0;
    if(label.draggable)label.dataset.councilUnit=u.id;else delete label.dataset.councilUnit;
    label.classList.toggle('stratagem-affected',affected.has(u.id));
    patchMarkup(label,battleLabelMarkup(u,b));
    label.setAttribute('aria-label',`${u.side?'敌军':'我军'}${u.name}，${TROOPS[combatType(u)].name}，兵力 ${u.hp}，战意 ${u.intent||0}，点击查看部队情报`);
    label.title=`${u.name} · ${u.action}`;
  }
  if(!battleLabels)battleLabels=new BattleLabels($('#battle-board'));
  battleLabels.onHighlight=id=>{if(battleFx){battleFx.focusedUnit=id;battleFx.invalidate();}};
  battleLabels.update(live);
  if (!battleFx) battleFx = new BattleEffects($('#battle-effects'), $('#skill-feed'), $('#tactic-result'), $('#ability-cues'));
  battleFx.focusedUnit=battleLabels.highlighted;
  battleFx.captionPositions=battleLabels.positions;
  battleFx.update(b, { paused: ui.paused || !!ui.modal, speed: ui.speed, mode: ui.effectMode });
  for(const cue of battleAudio.read(b,{audible:ui.mode!=='lobby'&&!document.hidden}))battleFx.queueAudio(cue,()=>audio.play(cue.key,cue));
  for(const cue of battleVoice.read(b,{audible:ui.mode!=='lobby'&&!document.hidden}))battleFx.queueAudio(cue,()=>{void audio.playOfficer(cue);});
  syncAudioScene();
  if(!battleArt)battleArt=new BattleArt($('#battle-board'),battleFx);
  battleArt?.update(b,{paused:ui.paused||!!ui.modal||deploying,speed:ui.speed});
  battleFx.unitPosition=id=>{const u=battleArt?.units.get(id);return u?battleArt.position(u):null;};
  battleFx.bodyAnchors=id=>battleArt?.bodies.get(id);
  art.decorate($('#app'));
  bondHover.refresh();
  const feedback = $('#stratagem-feedback');
  const enemy=state.battle.enemyCommand.lastCommand;
  if(enemy&&STRATAGEMS[enemy.key]&&b.tick-enemy.tick<=2){
    const s=STRATAGEMS[enemy.key];
    feedback.dataset.enemy='true';
    clearTimeout(ui.commandFeedbackTimer);
    feedback.innerHTML='<div class="stratagem-banner enemy"><span>敌军军略</span><b>'+s.name+'</b><strong>'+esc(stratagemEffectSummary(enemy.source).replaceAll('敌军','我方部队'))+'</strong></div>';
    return;
  }
  if(feedback.dataset.enemy){feedback.innerHTML='';delete feedback.dataset.enemy;}
  if (b.lastCommand && b.tick-b.lastCommand.tick <= 1 && feedback.dataset.serial !== String(b.commandSerial)) {
    feedback.dataset.serial = String(b.commandSerial);
    const s = STRATAGEMS[b.lastCommand.key];
    if (s) {
      feedback.innerHTML = `<div class="stratagem-banner ${s.side ? 'enemy' : ''}"><span>军略生效</span><b>${s.name}</b><strong>${esc(stratagemEffectSummary(b.lastCommand.source))}</strong><small>${b.lastCommand.source.duration ? '生效中' : '立即生效'}</small></div>`;
      clearTimeout(ui.commandFeedbackTimer); ui.commandFeedbackTimer = setTimeout(()=>{ feedback.innerHTML=''; },3500);
    }
  }
}
function presentDomesticAlerts(){
 if(!state.campaign||state.finished||state.campaign.allAI||ui.mode==='lobby'||ui.modal||ui.rewardMapReport)return false;
 if(pendingDomesticProposals(state).length&&!ui.domesticProposalDeferred){ui.paused=true;ui.modal='domestic-proposals';return true;}
 const events=pendingDomesticAlerts(state);if(!events.length)return false;
 ui.paused=true;ui.domesticAlertIds=events.map(e=>e.id);ui.modal='domestic-alerts';return true;
}
let mapHoverCleanup;
let mapMarchDay=null;
let mapNeedsRefresh=true,renderedWorld=null,renderedMapView='';
const mapViewKey=()=>JSON.stringify([ui.mode,ui.city,ui.army,ui.strategyTab,ui.mapPanelOpen,ui.mapDirectoryOpen,ui.mapQuickKind]);
function finishModalClose(){
 if(state.battle&&$('#battle-board')?.dataset.battleId===state.battle.id){renderModal();updateBattle();return;}
 if(ui.mapCommandView||mapNeedsRefresh||renderedWorld!==state||renderedMapView!==mapViewKey()){render();return;}
 renderModal();if(state.battle)updateBattle();
 $('.strategy-map-first')?.classList.toggle('map-paused',ui.paused);campaignProgress();
}
function render() {
  mapEditor.unmount();
  ui.mapCommandView=false;
  const marchPositions=captureArmyMarch($('#app'));
  const advanceMarch=mapMarchDay===state.campaign?.day;mapMarchDay=null;
  mapHoverCleanup?.();mapHoverCleanup=null;
  detachStrategicMap($('#app'));
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
  const ending=!!state.campaign&&!!state.finished&&!ui.endingMap&&!lobby;
  document.body.classList.toggle('battle-view',!!state.battle&&!lobby&&!ending);
  if(state.battle&&!lobby&&battlePortrait.matches)ui.paused=true;
  const preserveTerrain=!lobby&&!ending&&!state.battle&&!!state.campaign?.scenarioId&&!!$('#app>.strategy-map-first')&&!!$('#app .national-map-terrain .ancient-atlas-terrain');
  const markup=lobby ? (ui.lobbyPage==='maps'?mapEditor.markup():['campaign','custom'].includes(ui.lobbyPage) ? campaignLobby(ui.historySelection,historicalResume(),ui.customBattle,ui.lobbyPage==='custom',mapEditor.library) : ui.lobbyPage==='national' ? nationalLobby(nationalResume(),ui.nationalDraft) : modeLobby()) : ending ? campaignEndingMarkup(state,ui) : state.battle ? battle() : state.campaign ? withIntelligenceQueries(state,()=>strategicView(state,ui,{preserveTerrain,deferHiddenPanel:true})) : `${header()}<div class="app-body">${rail()}${campaign()}</div>`;
  if(!preserveTerrain||!patchStrategicDOM($('#app'),markup)){$('#app').innerHTML=markup;rememberStrategicDOM($('#app'));}
  if(lobby&&ui.lobbyPage==='maps')mapEditor.mount($('#app'));
  const quickList=$('.map-quick-directory .city-directory-list');if(quickList?.clientHeight)quickList.scrollTop=ui.mapQuickScrolls[ui.mapQuickKind||'city']||0;
  if (state.battle&&!lobby&&!ending) updateBattle();
  if(scroll&&$('.arena-stage')){$('.arena-stage').scrollLeft=scroll.x;$('.arena-stage').scrollTop=scroll.y;}
  else if(state.battle&&!isDeploying(state.battle)&&$('.arena-stage')){const stage=$('.arena-stage');stage.scrollLeft=(stage.scrollWidth-stage.clientWidth)/2;stage.scrollTop=(stage.scrollHeight-stage.clientHeight)/2;}
  document.querySelectorAll('.roster-list,.battle-bonds .bond-list').forEach((el,i)=>{if(rosterScroll[i]){el.scrollLeft=rosterScroll[i].x;el.scrollTop=rosterScroll[i].y;}});
  renderModal();
  art.decorate();
  bondHover.refresh();
  if(!ending&&!ui.mapCommandView)attachStrategicMap($('#app'),ui,render);
  if(state.campaign&&!state.battle&&!lobby&&!ending)animateArmyMarch($('#app'),marchPositions,{advance:advanceMarch});
  if(state.campaign&&!state.battle&&!lobby&&!ending)mapHoverCleanup=attachArmyHover($('#app').firstElementChild,state);
  const tools=$('#battle-tools .arena-tools')||$('.strategy-heading>div:last-child')||$('.mode-selection');
  if(tools&&!tools.querySelector('[data-action="art-mode"]')){const button=document.createElement('button');button.className='button secondary';button.dataset.action='art-mode';button.textContent=art.active?'人物美术':'默认美术';button.title='切换美术，不改变本局规则与存档';tools.append(button);}
  const soundTools=$('.lobby-nav')||$('.battle-playback')||$('.world-toolbar')||$('.strategy-heading>div:last-child');
  if(soundTools&&!soundTools.querySelector('[data-action="audio-toggle"]'))soundTools.insertAdjacentHTML('beforeend',audio.buttonMarkup());
  syncAudioScene();
  pageGuides.schedule();
  if(state.campaign&&!state.battle&&!lobby&&!ending)campaignProgress();
  mapNeedsRefresh=false;renderedWorld=state;renderedMapView=mapViewKey();
}
function modalShell(title, subtitle, body, footer = '', wide = false) {
  const inspection=state.battle&&['unit-stats','unit-officer','tactic-detail','battle-building','gate'].includes(ui.modal);
  const detail=isObjectDetail(ui);
  return `<div class="modal-backdrop ${inspection?'battle-inspection':''} ${detail?'detail-inspection':''}"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="${!detail}" aria-labelledby="modal-title"><header class="modal-header"><div>${subtitle?`<div class="eyebrow">${subtitle}</div>`:''}<h2 id="modal-title">${title}</h2></div><button class="close-button" data-action="close" aria-label="关闭弹窗">×</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}</section></div>`;
}
function loadoutUnits() {
  return state.battle ? state.battle.sides[0].units : state.armies.filter(a=>a.faction===playerFaction(state)&&(!state.campaign||canEditArmy(state,a))).flatMap(a=>a.units);
}
function inspectContext(unit) {
  const inspected=inspectionBattle();if (inspected) return { unit, battle:inspected, stats:unitAttributes(unit,inspected) };
  const army=ui.scenarioInspect?{units:scenarioSetupUnits(ui.scenarioSetup),...ui.scenarioSetup.roles,tactic:ui.scenarioSetup.tactic}:state.armies.find(a=>a.units.some(u=>u.id===unit.id));
  const role=key=>army?.units.find(u=>u.id===army[key]);
  const preview={...unit,hp:unit.troops,maxHp:Math.max(1,unit.troops),side:0,commandBonus:(role('leader')?.leadership||60)/1000,advisorBonus:(role('advisor')?.intellect||0)/1000};
  const battle={tick:0,terrain:ui.scenarioInspect?(ui.scenarioSetup.terrain||ui.scenarioSetup.draft.terrain):'land',sides:[{tactic:army?.tactic}]};
  return {unit:preview,battle,stats:unitAttributes(preview,battle)};
}
function growthLabel(u) {
  return `等级 ${officerLevel(u)} / 10 · ${officerLevel(u)===10?`满级 · 功绩余额 ${u.merit||0}`:`功绩 ${u.merit||0} / ${meritNeeded(officerLevel(u))}`}`;
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
  return modalShell(u.name+' · 武将属性','',
    campaignInspectionStatus(u.id)+'<div class="inspection-heading">'+avatar(u,false,null,'detail')+'<div><h3>'+esc(u.name)+(u.courtesy?' <small>字 '+esc(u.courtesy)+'</small>':'')+'</h3><p>'+growthLabel(u)+' · 忠诚 '+(state.campaign?.domestic.loyalty[u.id]??u.loyalty)+'</p></div></div><div class="officer-four">'+[['统率',u.leadership],['武力',u.force],['智力',u.intellect],['政治',u.politics],['魅力',u.charm??profile.charm]].map(([n,v])=>'<div><span>'+n+'</span><b>'+v+'</b></div>').join('')+'</div>'+treasureUnitMarkup(u,{manage:!!state.campaign&&campaignOfficers(state).some(r=>r.unit.id===u.id)})+campaignLearningMarkup(u)+passiveMarkup(u,inspectionBattle())+officerCommandMarkup(u.id,u)+officerProfileMarkup(u,state.battle?.relationshipScores||state.relationshipScores,state.battle?.relationshipTypes||state.relationshipTypes)+'<details class="profile-disclosure"><summary>人物生平</summary><p>'+esc(profile.biography||'暂无记录')+'</p></details>',
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
  return modalShell(skill.name,u.name+' · '+CATEGORY_NAMES[skill.category]+'类',
    (inspectionBattle()?battleTacticDetailMarkup(battle,unit,skill):'')+'<div class="info-strip">'+(skill.passive?'持续光环 · 占用一个战法槽':'战意 ≥ '+skill.threshold+' · 冷却 '+skill.cooldown+' 战斗回合 · '+(inspectionBattle()?'剩余 '+tacticUsesLeft(unit,skill)+'/'+tacticUseLimit(unit,skill)+' 次':'每场 '+skill.maxUses+' 次'))+'</div><h3>效果</h3><p>'+esc(skill.description)+'</p><p class="power-preview">'+esc(tacticPowerPreview(skill,statusPower(unit,skill,battle)))+'</p><details class="profile-disclosure"><summary>威力、成功率与暴击</summary><p>'+esc(skill.powerDescription)+'</p></details><p>地形：'+esc(skill.terrainDescription)+'</p>'+(skill.tradeoff?'<p>取舍：'+esc(skill.tradeoff)+'</p>':''),'<button class="button secondary" data-action="inspection-back">返回</button>');
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
  const states=[['原兵种',TROOPS[u.type].name],['当前形态',TROOPS[combatType(u)].name],['携带装备',equipmentNames(u)],['宝物',u.treasureId?esc(treasureDesign(u.treasureId).name):'未装备'],['士兵数',fmt(inBattle?u.hp:u.troops)],['带兵上限',fmt(troopCapacity(u))],...(inBattle?[['本场初始兵力',fmt(u.initial)]]:[]),['战意',`${u.intent||0} / ${COMBAT.intentCap}`],['普攻战意',`+${intentIncome(u).attack}`],['受击战意',`+${intentIncome(u).hit}`],...(u.tactics?.includes('camp')?[['修缮物资',`${Math.max(0,3-(u.tacticCasts?.camp||0))} / 3 组`]]:[]),['护盾',fmt(layers.reduce((n,l)=>n+l.amount,0))],['伤兵数',fmt(inBattle?battleWounded(u):u.wounded)]];
  if(inBattle&&u.status==='active')states.push(['所在格',TERRAIN_NAMES[unitTerrain(b,u)]]);
  const statuses=inBattle?statusCards(b,u):'<p class="muted">尚未交战</p>';
  return modalShell(u.name+' · 部队属性',(inBattle?'已暂停':'出战预览'),
    campaignInspectionStatus(u.id)+'<div class="loadout-toolbar"><label>选择部队<select id="inspect-unit">'+units.map(a=>'<option value="'+a.id+'" '+(a.id===u.id?'selected':'')+'>'+(inBattle?(a.side?'敌军 · ':'我军 · '):'')+a.name+' · '+TROOPS[combatType(a)].name+'</option>').join('')+'</select></label><button class="officer-entry" data-action="unit-officer" data-inspect="'+u.id+'">'+avatar(u,true)+'<span><small>所属武将</small><b>'+u.name+' →</b></span></button></div><div class="unit-state-grid">'+states.map(([name,value])=>'<div><span>'+name+'</span><b>'+value+'</b></div>').join('')+'</div><div class="inspection-section-heading"><h3>当前状态效果</h3></div>'+(inBattle&&!inspectionStatuses(b,u).length?'<p class="muted">暂无临时状态</p>':statuses)+passiveMarkup(u,b)+'<div class="inspection-section-heading"><h3>携带战法</h3></div>'+tacticChips(u,b)+'<div class="inspection-section-heading"><h3>当前战斗属性</h3></div><div class="attribute-grid">'+cards+'</div><details class="profile-disclosure"><summary>减伤与普攻</summary><dl class="info-fields">'+[['普攻间隔',precise(stats.attackInterval)+' 日'],['普攻减伤',mitigation('basic')+'%'],['武技减伤',mitigation('force')+'%'],['谋略减伤',mitigation('intellect')+'%'],['持续减伤',mitigation('dot')+'%'],['控制减免',precise(stats.controlResistance*100)+'%']].map(([name,value])=>'<div><dt>'+name+'</dt><dd>'+value+'</dd></div>').join('')+'</dl></details>',
    (inBattle&&isDeploying(b)&&u.side===0&&['active','reserve'].includes(u.status)&&u.arrivalConfirmed!==false&&(u.arrivalTick||0)<=b.tick&&!detailPanels.hasSource?'<button class="button secondary" data-action="deployment-select" data-inspect="'+u.id+'">调整站位</button>':'')+'<button class="button primary" data-action="close">返回</button>',true);

}
function loadoutModal() {
  const units=loadoutUnits();if(!units.length)return modalShell('固定战法','暂无部队','');
  const u=units.find(u=>u.id===ui.loadoutUnit)||units[0];ui.loadoutUnit=u.id;
  const skills=unitTactics(u),grade=['C','B','A','S'][troopAptitude(u)];
  const options=units.map(a=>'<option value="'+a.id+'" '+(a.id===u.id?'selected':'')+'>'+a.name+' · '+TROOPS[a.type].name+'</option>').join('');
  const cards=skills.map((skill,i)=>'<article class="loadout-card compact-loadout"><header><b>优先级 '+(i+1)+'</b><span class="type-badge '+skill.category+'">'+(skill.special?'★ 专属':skill.learningTier==='low'?'小战法':'大战法')+'</span></header><h3>'+esc(skill.name)+'</h3><footer>每场 '+skill.maxUses+' 次 · 门槛 '+skill.threshold+' · 施放消耗 '+skill.intentCost+' · 冷却 '+skill.cooldown+' 战斗回合</footer><button class="unit-inspect-link" data-action="tactic-detail" data-inspect="'+u.id+'" data-skill="'+skill.id+'">战法说明</button></article>').join('');
  const ledger=LEARNING_TROOPS.map(type=>{const p=u.tacticLearning.byTroop[type];return '<li><b>'+TROOPS[type].name+' · '+['C','B','A','S'][troopAptitude(u,type)]+'</b><p>小战法：'+p.low.map(id=>TACTICS_BOOK[id].name).join('、')+'；大战法：'+(p.high.map(id=>TACTICS_BOOK[id].name).join('、')||'无')+'</p></li>';}).join('');
  return modalShell('部队固定战法','',
    '<div class="loadout-toolbar"><label>选择部队<select id="loadout-unit">'+options+'</select></label><span>'+growthLabel(u)+' · '+TROOPS[u.type].name+'适性 '+grade+'</span></div>'+
    '<h3>本场携带 · '+skills.length+' 项</h3><div class="loadout-grid">'+cards+'</div>'+
    '<details class="profile-disclosure"><summary>全部兵种固定配置</summary><ul>'+ledger+'</ul></details>',
    '<button class="button primary" data-action="close">完成</button>',true);
}

function armyModal() {
  const army = selectedArmy(); if (!army) return '';
  const locked = !!state.battle || !!state.campaign&&!canEditArmy(state,army);
  const opts = Object.entries(TACTICS).map(([id, name]) => `<option value="${id}" ${army.tactic === id ? 'selected' : ''}>${name}</option>`).join('');
  const leaders = role => army.units.map(u => `<option value="${u.id}" ${army[role] === u.id ? 'selected' : ''}>${u.name}</option>`).join('');
  return modalShell('整军经武', '', `<div class="roster-overview"><div><b>${esc(army.name)}</b><span>${cityById(state, army.location).name} · ${fmt(armyTroops(army))} 人</span></div><div class="roster-controls"><label>主将<select data-role="leader" ${locked ? 'disabled' : ''}>${leaders('leader')}</select></label><label>军师<select data-role="advisor" ${locked ? 'disabled' : ''}>${leaders('advisor')}</select></label></div></div>${locked?'<p class="info-strip">战斗中，编制锁定</p>':''}${bondsMarkup(army.units,{army})}<section class="commander-repertoire"><h3>军团军略 · ${armyStratagems(army).length} 种</h3>${armyCommanders(army).map(c=>`<div><b>${c.role==='leader'?'主将':'军师'} · ${c.name}</b><div class="repertoire-skills">${commanderStratagems(c).map(key=>abilityButton('stratagem',key,STRATAGEMS[key].name,stratagemEffectText(selectStratagemSource(armyCommanders(army),key)))).join('') || '暂无军略'}</div></div>`).join('')}</section><div class="roster-table"><div class="roster-table-head"><span>${[['first','首发'],['name','武将']].map(([k,n])=>sortButton('army',k,n,ui.armySort?.sort,ui.armySort?.direction)).join('')}</span><span>${[['leadership','统'],['force','武'],['intellect','智'],['politics','政']].map(([k,n])=>sortButton('army',k,n,ui.armySort?.sort,ui.armySort?.direction)).join('')}</span><span>${sortButton('army','type','所率兵种',ui.armySort?.sort,ui.armySort?.direction)}</span><span>${sortButton('army','formation','战场位置',ui.armySort?.sort,ui.armySort?.direction)}</span><span>${[['troops','兵力'],['wounded','伤兵']].map(([k,n])=>sortButton('army',k,n,ui.armySort?.sort,ui.armySort?.direction)).join('')}</span></div>${(ui.armySort?.sort?sortRows(army.units,ui.armySort.sort,ui.armySort.direction,(u,k)=>k==='type'?TROOPS[u.type].name:k==='formation'?({front:0,middle:1,back:2,left:3,right:4})[u.formation]:u[k]):army.units).map(u => `<div class="roster-row"><div><input type="checkbox" data-first="${u.id}" aria-label="${u.name}首发" ${u.first ? 'checked' : ''} ${locked ? 'disabled' : ''}>${avatar(u, true, 'unit-stats')}<div><button class="unit-inspect-link" data-action="unit-stats" data-inspect="${u.id}">${u.name} · ${officerLevel(u)} 级 ↗</button><small>${unitTactics(u).map(s=>`${s.special ? '★' : ''}${s.name} ${s.threshold}`).join(' · ')}</small></div></div><div class="stat-trio"><span>${u.leadership}</span><span>${u.force}</span><span>${u.intellect}</span><span>${u.politics}</span></div><select data-type="${u.id}" aria-label="${u.name}兵种" ${locked ? 'disabled' : ''}>${troopTypes().map(key=>[key,TROOPS[key]]).map(([key, t]) => `<option value="${key}" ${u.type === key ? 'selected' : ''} ${state.campaign&&!canTrain(cityById(state,army.location),key)?'disabled':''}>${t.name}${state.campaign&&!canTrain(cityById(state,army.location),key)?'（本城未解锁）':''}</option>`).join('')}</select><select data-formation="${u.id}" aria-label="${u.name}位置" ${locked ? 'disabled' : ''}>${Object.entries({ front: '前排', middle: '中排', back: '后排', left: '左翼', right: '右翼' }).map(([key, name]) => `<option value="${key}" ${u.formation === key ? 'selected' : ''}>${name}</option>`).join('')}</select><div class="troop-count"><b>${fmt(u.troops)}<small> / ${fmt(troopCapacity(u))}</small></b><small>伤兵 ${fmt(u.wounded)}</small></div></div>`).join('')}</div>`, `<button class="button secondary" data-action="loadout">固定战法</button><button class="button secondary" data-action="split" ${locked || state.pending ? 'disabled' : ''}>拆分军团</button><button class="button secondary" data-action="merge" ${locked || state.pending ? 'disabled' : ''}>合并军团</button><button class="button primary" data-action="close">完成编制</button>`, true);
}
const modalScroll=createModalScrollMemory(),mapCommandScroll=createModalScrollMemory();
const detailPanels=createDetailPanels($('#overlay-root'));
const detailContext=()=>Object.fromEntries(['modal','domesticDirection','textDetails','textDetailsTab','scenarioInspect','commandInspect','infoView','infoReturn','personnelReturn','militaryReturn','snapshotReturn','inspectionReturn','inspectBattleId'].map(key=>[key,ui[key]]).concat([['infoHistory',[...(ui.infoHistory||[])]]]));
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
function openCityCommands(id,anchor,event,{keepDirectory=false}={}){
 const rect=anchor?.getBoundingClientRect();
 const x=keepDirectory?rect?.left-260:(event?.clientX||rect?.right||innerWidth/2)+12;
 const y=(event?.clientY||rect?.top||innerHeight/2)+12;
 ui.city=id;ui.strategyTab='city';ui.mapFocusKey=null;ui.mapPanelOpen=false;ui.mapDirectoryOpen=keepDirectory;
 ui.modal=null;ui.textDetails=null;ui.infoReturn=null;ui.infoHistory=[];
 ui.mapObject={kind:'city',id,x,y};render();
 if(!event?.detail)document.querySelector('.city-command-grid button:not(:disabled)')?.focus({preventScroll:true});
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
 name==='domestic-direction'?[ui.city,ui.domesticDirection]:null,
 ['officers','custom-person-picker'].includes(name)?[ui.catalogQuery,ui.catalogKind,ui.catalogPage]:null,
 ['unit-stats','unit-officer','tactic-detail'].includes(name)?[ui.inspectUnit,name==='tactic-detail'?ui.inspectSkill:null]:null,
 name==='encounter-flow'?[ui.encounterFlow?.id,ui.encounterFlow?.step]:null]);
}
function mapTargetContext(){return {scout:ui.scout||{},command:ui.officerPick||{},battle:state.battle};}
function captureDiplomacyForm(){
 ui.diplomacyForm=Object.fromEntries([...document.querySelectorAll('.diplomacy-panel input,.diplomacy-panel select')].filter(el=>el.id).map(el=>[el.id,el.value]));
 ui.diplomacyDetails=[...document.querySelectorAll('.diplomacy-panel details')].map(el=>el.open);
}
function updateTransferCargo(input){
 const p=ui.officerPick,key=input.dataset.transferCargo;
 if(ui.modal!=='campaign-picker'||p?.task!=='transfer'||p.step!=='target'||!['gold','grain','manpower'].includes(key))return;
 p.cargo[key]=input.value===''?0:input.valueAsNumber;
 input.setAttribute('aria-invalid',String(!Number.isSafeInteger(p.cargo[key])||p.cargo[key]<0||p.cargo[key]>Number(input.max)));
 input.setAttribute('aria-describedby','command-readiness');
 // Keep the input and action button alive during pointerdown/blur/click.
 // Only the read-only preview changes while the player edits a quantity.
 const m=commandMarkup(state,ui,''),template=document.createElement('template');template.innerHTML=m.body+m.footer;
 for(const selector of ['.command-sidebar-summary','#command-readiness']){
  const current=document.querySelector(selector),next=template.content.querySelector(selector);
  if(current&&next)current.replaceChildren(...next.childNodes);
 }
 const next=template.content.querySelector('[data-action="campaign-command-next"]'),button=document.querySelector('.map-command-footer [data-action="campaign-command-next"]');
 if(button&&next)button.disabled=next.disabled;
}
function renderScouting(){
 const focusSnapshot=captureInteractionFocus($('#app'));
 const p=ui.scout??={},selected=scoutSelection(state,p),focus=selected.city||mapNode(state,p.city)||state.cities.find(c=>c.owner===playerFaction(state))||state.cities[0];
 p.mapUI??={city:focus.id,strategyTab:'city',strategicMapView:centeredMapView(focus,360,360),mapCameraManual:true};
 const map=targetMapMarkup(commandMap(state,p.mapUI),(selected.officer?selected.targets:selected.cities).map(n=>n.id),selected.officer?selected.target?.id:selected.city?.id);
 ui.mapCommandView=true;detailPanels.clear();$('#app').removeAttribute('inert');document.body.classList.remove('modal-open');
 $('#app').innerHTML=`<main class="map-command-screen scouting-screen"><header><h1>侦察</h1><button class="button secondary" data-action="close">返回舆图</button></header>${scoutingMarkup(state,p,map)}</main>`;
 attachStrategicMap($('#app'),p.mapUI,renderModal);
 syncMapTargetAttributes($('#app'));
 if(selected.route)attachMapRouteEditor($('#app'),state,{from:selected.city.id,target:selected.target.id,route:selected.route,waypoints:p.waypoints,candidates:selected.targets.filter(n=>!n.units).map(n=>n.id),edit:(index,id)=>{
  const next=editRouteWaypoint({...p,route:selected.route},selected.city.id,selected.target.id,index,id,via=>scoutRoute(state,selected.city.id,selected.target.id,via));
  if(!next)return false;Object.assign(p,next);renderModal();return true;
 },onError:message=>toast(message,'error')});
 mapCommandScroll.restore($('#app'),JSON.stringify(['scout',p.city]));restoreInteractionFocus($('#app'),focusSnapshot,{fallback:false});
 pageGuides.schedule();
}
function attachCommandRouteEditor(p){
 syncMapTargetAttributes($('#app'));
 const route=commandRoute(state,p);if(!route||!['march','expedition'].includes(p.task))return;
 const observed=intelligenceWorld(state);
 attachMapRouteEditor($('#app'),observed,{from:route.from,target:p.destination,route:route.route,waypoints:p.waypoints,candidates:[...observed.cities,...observed.junctions].map(n=>n.id),edit:(index,id)=>{
  if(!editCommandWaypoint(state,p,index,id))return false;renderModal();return true;
 },onError:message=>toast(message,'error')});
}
function openMapTarget(kind){
 if(!TARGET_TITLES[kind]||!state.campaign||state.campaign.allAI)return;
 const candidates=mapTargetCandidates(state,kind,mapTargetContext());
 let selected=kind==='scout-city'?ui.scout?.city:kind==='scout-target'?ui.scout?.target:kind==='relay'?ui.officerPick?.relay:kind==='retreat'?state.battle?.sides[0].retreatDestination:null;
 if(kind==='diplomacy'){
  // Preserve every unfinished form control across the map round trip.
  captureDiplomacyForm();
  selected=candidates.find(c=>c.owner===ui.diplomacyForm['diplomacy-target'])?.id;
 }
 const home=kind.startsWith('scout-')?ui.scout?.city:kind==='relay'?ui.officerPick?.city:ui.city;
 const focus=mapNode(state,selected||home)||candidates[0];
 ui.targetPick={kind,selected: selected||null,returnModal:ui.modal,battleForm:kind==='retreat'?{open:$('.retreat-council')?.open,councilOpen:$('.council-reserves')?.open,appointmentsOpen:$('.council-appointments')?.open,batch:$('[data-retreat-batch]')?.value}:null,mapUI:{city:focus?.id,strategyTab:'city',strategicMapView:focus?centeredMapView(focus,360,360):undefined,mapCameraManual:true}};
 const source=document.querySelector('.map-command-screen')||detailPanels.panelRoot;
 ui.targetPick.sourceScroll={x:window.scrollX,y:window.scrollY};ui.targetPick.sourceDetails=[...source.querySelectorAll('details')].map(el=>el.open);
 openModal('map-target');
 window.scrollTo(0,0);$('.map-target-screen h1')?.focus({preventScroll:true});
}
function renderMapTarget(){
 const focusSnapshot=captureInteractionFocus($('#app'));
 const p=ui.targetPick,context=mapTargetContext(),candidates=mapTargetCandidates(state,p.kind,context),selected=candidates.find(n=>n.id===p.selected);
 const map=targetMapMarkup(commandMap(state,p.mapUI),candidates.map(n=>n.id),selected?.id);
 ui.mapCommandView=true;detailPanels.clear();$('#app').removeAttribute('inert');document.body.classList.remove('modal-open');
 $('#app').innerHTML=`<main class="map-command-screen map-target-screen"><header><h1 tabindex="-1">${TARGET_TITLES[p.kind]}</h1></header><div class="command-target-layout"><div class="command-map">${map}</div><aside>${mapTargetSummary(state,p,selected,context)}<p>可选目标 ${candidates.length} 处</p><label class="strategy-field">查找目标<input type="search" data-map-target-search value="${esc(p.query||'')}" placeholder="输入名称定位地图"></label><div class="map-target-results">${mapTargetSearchMarkup(state,p.kind,candidates,p.query)}</div>${!candidates.length?'<p>当前没有合法目标。</p>':''}</aside></div><footer class="map-command-footer"><button class="button secondary" data-action="map-target-cancel">取消</button><button class="button primary" data-action="map-target-confirm" ${selected?'':'disabled'}>确认</button></footer></main>`;
 attachStrategicMap($('#app'),p.mapUI,renderModal);
 syncMapTargetAttributes($('#app'));
 restoreInteractionFocus($('#app'),focusSnapshot,{fallback:false});
}
function finishMapTarget(confirm){
 const p=ui.targetPick;if(!p)return;
 if(confirm){
  const n=mapTargetCandidates(state,p.kind,mapTargetContext()).find(n=>n.id===p.selected);if(!n){toast('请在地图上选择合法目标');return;}
  if(p.kind==='scout-city'&&ui.scout.city!==n.id){ui.scout={city:n.id};}
  if(p.kind==='scout-target')Object.assign(ui.scout,{target:n.id,route:null,waypoints:[]});
  if(p.kind==='relay')ui.officerPick.relay=n.id;
  if(p.kind==='diplomacy')ui.diplomacyForm['diplomacy-target']=n.owner;
  if(p.kind==='retreat'){const error=configureRetreatDestination(state,state.battle,n.id);if(error){toast(error,'error');return;}save();}
 }
 ui.targetPick=null;ui.modal=p.returnModal;render();
 const source=document.querySelector('.map-command-screen')||detailPanels.panelRoot;
 [...source.querySelectorAll('details')].forEach((el,i)=>{if(p.sourceDetails[i]!==undefined)el.open=p.sourceDetails[i];});
 if(p.battleForm){if($('.retreat-council'))$('.retreat-council').open=!!p.battleForm.open;if($('.council-reserves'))$('.council-reserves').open=!!p.battleForm.councilOpen;if($('.council-appointments'))$('.council-appointments').open=!!p.battleForm.appointmentsOpen;if($('[data-retreat-batch]'))$('[data-retreat-batch]').value=p.battleForm.batch||'';}
 if(p.kind==='diplomacy'){
  for(const [id,value] of Object.entries(ui.diplomacyForm||{})){const el=document.getElementById(id);if(el)el.value=value;}
  const label=document.querySelector('[data-diplomacy-target-label]');if(label)label.textContent=FACTIONS[ui.diplomacyForm?.['diplomacy-target']]?.name||'自主选择';
 }
 document.querySelector(`[data-action="map-target-open"][data-kind="${p.kind}"]`)?.focus({preventScroll:true});window.scrollTo(p.sourceScroll.x,p.sourceScroll.y);
}
document.addEventListener('input',event=>{
 if(!event.target.matches('[data-map-target-search]')||!ui.targetPick)return;
 const p=ui.targetPick;p.query=event.target.value;
 document.querySelector('.map-target-results').innerHTML=mapTargetSearchMarkup(state,p.kind,mapTargetCandidates(state,p.kind,mapTargetContext()),p.query);
});
function renderModal() {
  if(ui.mapCommandView&&document.querySelector('.map-command-screen'))mapCommandScroll.capture($('#app'));
  const focusSnapshot=captureInteractionFocus(detailPanels.panelRoot),mapFocusSnapshot=captureInteractionFocus($('#app'));
  const mapCommand=ui.modal==='scouting'||ui.modal==='map-target'||ui.modal==='campaign-picker'&&ui.officerPick?.step==='target'&&['march','expedition','transfer'].includes(ui.officerPick.task);
  if(ui.mapCommandView&&!mapCommand){ui.mapCommandView=false;render();return;}
  modalScroll.capture(detailPanels.panelRoot);
  if(ui.modal==='map-target'){renderMapTarget();return;}
  if(ui.modal==='scouting'){renderScouting();return;}
  let html = '';
  if(ui.modal==='campaign-confirmation'&&ui.pendingAction){const q=ui.pendingAction;html=modalShell(q.title,'',`<p class="decision-risk">${esc(q.consequence)}</p>`,'<button class="button secondary" data-action="close">取消</button><button class="button primary" data-action="campaign-confirm-action">确认</button>',true);}
  if(ui.modal==='scout-report'){const report=scoutingReportMarkup(state,ui.scoutReport);html=modalShell(report.title,'沿路侦察报告',report.body,'<button class="button secondary" data-action="scout-open">返回侦察工作</button>',true);}
  if(ui.modal==='bandit-camp'){const camp=banditMarkup(state,ui.banditCamp);html=modalShell(camp.title,'',camp.body,'',true);}
  if(ui.modal==='treasures')html=modalShell('宝物','',treasuresMarkup(state,ui.treasurePick),'',true);
  if(ui.modal==='diplomacy-interruption'){const r=ui.diplomaticInterruption;html=modalShell('外交委任','执行时机',`<p>${esc(r.name)}正在办理内政；立即执行将中止当前事务。</p>`,`<button class="button primary" data-action="diplomacy-assign-now" data-direction="${r.direction}" data-officer="${r.officerId}">立即执行</button><button class="button secondary" data-action="diplomacy-assign-after" data-direction="${r.direction}" data-officer="${r.officerId}">完成后执行</button><button class="button secondary" data-action="close">取消</button>`,true);}
  if(state.testScenario&&ui.mode!=='lobby'&&state.battle?.reinforcementCouncil==='pending'&&!ui.modal){ui.modal='reinforcement-arrival';ui.paused=true;}
  if(ui.modal==='reinforcement-arrival')html=modalShell('援军抵达','战场暂停',reinforcementArrivalMarkup(state.battle,state.armies),'<button class="button primary" data-action="battle-reinforcement-council">援军军议</button><button class="button secondary" data-action="battle-reinforcement-continue">继续作战</button>',true);
  if(state.campaign&&ui.mode!=='lobby'&&activeBattles(state).some(r=>r.battle.reinforcementCouncil==='pending')&&!ui.modal){ui.modal='campaign-encounters';ui.paused=true;}
  if(state.campaign&&ui.mode!=='lobby'&&state.battle?.deploymentLocked&&activeBattles(state).some(r=>r.awaiting&&!ui.encounterNotices?.has(r.id))&&!ui.modal){ui.modal='campaign-encounters';ui.encounterNotices??=new Set();for(const r of activeBattles(state).filter(r=>r.awaiting))ui.encounterNotices.add(r.id);}
  if (ui.mode!=='lobby' && state.report && !['scenarios','settings','archives','archive-confirm'].includes(ui.modal)) ui.modal = 'report';
  else if (ui.mode!=='lobby' && state.pending && !ui.modal) ui.modal = 'encounter';
  if (ui.modal === 'gate' && state.battle?.siege) {
    const g=state.battle.siege.gate;
    html=modalShell('城门', '', `<p class="modal-intro">耐久 ${fmt(g.hp)} / ${fmt(g.maxHp)}。耐久归零，守方立即败北。</p>`);
  }
  if(ui.modal==='battle-building'&&state.battle){
    const g=state.battle.buildings.find(a=>a.id===ui.battleBuilding);
    if(g)html=modalShell(g.name,'战场设施 · '+(g.side?'敌军':'我军'),`<p class="modal-intro">耐久 ${fmt(g.hp)} / ${fmt(g.maxHp)}${g.level!==undefined?' · '+g.level+'级':''} · ${g.hp<=0?'已损毁':g.level===0?'施工中':'已建成'}</p><div class="info-strip">${esc(buildingEffectText(g)||'可攻击 · 可修缮')}${g.hp<=0?' · 已停用':''}</div>`);
  }
  if (ui.modal === 'scenarios') html = scenarioModal();
  if(ui.modal==='stratagem-picker'&&state.battle)html=modalShell('选择军略','已暂停','<div class="stratagem-picker">'+commands(state.battle)+'</div>','<button class="button secondary" data-action="close">取消</button>',true);
  if(ui.modal==='march-mode'){const a=state.armies.find(a=>a.id===ui.marchArmy);html=modalShell('行军方式','',a?`<p>${a.name} · 士气 ${a.morale} · 携粮 ${Math.floor(a.supply)} / ${a.supplyCapacity}</p>${marchModeMetrics(a,ui.marchChoice)}<div class="button-row">${marchModes(a).map(m=>`<button class="button ${ui.marchChoice===m.id?'primary':'secondary'}" data-action="march-mode-select" data-mode="${m.id}">${m.name}</button>`).join('')}</div>`:'军团不存在','<button class="button secondary" data-action="close">取消</button><button class="button primary" data-action="march-mode-confirm">确认</button>',true);}
  if(ui.modal==='domestic-interruption')html=modalShell('事务冲突','选择时机',interruptionMarkup(state,ui.interruption),`<button class="button secondary" data-action="campaign-command-return">返回</button><button class="button secondary" data-action="campaign-order-choice" data-choice="now">立即执行</button><button class="button primary" data-action="campaign-order-choice" data-choice="after">办完执行</button>`,true);
  if(ui.modal==='faction-battle')html=modalShell('战场','本势力交战',battlesPanel({...state,campaign:{...state.campaign,battles:state.campaign.battles.filter(r=>r.id===ui.directoryBattle),archive:[]}},isPlanning(state)),'<button class="button secondary" data-action="directory-back">返回</button>',true);
  if(ui.modal==='faction-directory')html=modalShell('本势力 · '+FACTION_DIRECTORIES[ui.factionDirectoryKind],'总览',factionDirectoryMarkup(state,ui.factionDirectoryKind,ui.factionDirectories[ui.factionDirectoryKind]),'',true);
  if(ui.modal==='campaign-affairs')html=modalShell(ui.affairsTab==='diplomacy'?'外交':'内政','',factionAffairsMarkup(state,ui.affairsTab||'domestic',ui.diplomacyForm||{}),'',true);
  if(ui.modal==='campaign-battles')html=modalShell('战役','',battlesPanel(state,isPlanning(state)),'',true);
  if(ui.modal==='info-menu'){const info=campaignInfoMenu(ui.infoScope||'self');html=modalShell(info.title,'一览',info.body,'');}
  if(ui.modal==='campaign-info'){const info=campaignInfoMarkup(state,ui.infoView?.id?{...ui.infoView,objectOnly:true}:ui.infoView);html=modalShell(info.title,'',info.body,`${ui.infoHistory?.length?'<button class="button secondary" data-action="campaign-info-back">返回</button>':''}${['city','army'].includes(ui.infoView?.type)&&ui.infoView?.id?mapObjectActions(state,ui.infoView.type,ui.infoView.id):''}${ui.infoView?.objectOnly?'':'<button class="button secondary" data-action="campaign-info-home">返回名册</button>'}`,true);}
  if(ui.modal==='domestic-alerts')html=modalShell('战略奏报','已暂停',domesticAlertsMarkup(state,pendingDomesticAlerts(state)), '<button class="button primary" data-action="close">确认</button>',true);
  if(ui.modal==='domestic-proposals')html=modalShell('内政提案','已暂停',domesticApprovalMarkup(state),'<button class="button secondary" data-action="close">返回</button>',true);
  if(ui.modal==='harvest-review'){const receipt=state.campaign.activity.nodes.find(n=>n.id===ui.harvestReviewId),nodes=state.campaign.activity.nodes.filter(n=>receipt?.result.nodeIds.includes(n.id));html=modalShell('本旬成果',`第 ${receipt?.result.turn||''} 旬 · 已暂停`,domesticAlertsMarkup(state,nodes),'<button class="button secondary" data-action="close">返回</button>',true);}
  if(ui.modal==='activity-record'){const p=ui.activityRecord,node=state.campaign.activity.nodes.find(n=>n.id===p.nodeId),name=node.officerId?OFFICER_BY_ID[node.officerId].name:mapNode(state,node.siteId)?.name||'战略';html=modalShell(name+' · 事项详情','已暂停',node.officerId?officerActivityMarkup(state,node.officerId,p.beforeDay,node.id):siteActivityMarkup(state,node.siteId,p.beforeDay,node.id),`<button class="button secondary" data-action="close">${p.returnModal==='harvest-review'?'返回成果':'返回奏报'}</button>`,true);}
  if(ui.modal==='city-domestic')html=modalShell('城市内政','',cityDomesticMarkup(state,ui.city,ui),'<button class="button secondary" data-action="close">返回地图</button>',true);
  if(ui.modal==='domestic-direction')html=modalShell(DIRECTIONS[ui.domesticDirection]||'内政方向','',domesticDirectionMarkup(state,ui.city,ui.domesticDirection),'<button class="button secondary" data-action="close">返回</button>',true);
  if(ui.modal==='city-personnel')html=modalShell((state.cities.find(c=>c.id===ui.personnelCity)?.name||'据点')+' · 武将','本据点人事',cityRosterMarkup(state,ui,ui.personnelCity),'',true);
  if(ui.modal==='campaign-personnel')html=modalShell('麾下武将','人事 · 全势力名册',campaignRosterMarkup(state,ui),'',true);
  if(ui.modal==='campaign-picker'){const p=ui.officerPick,route=commandRoute(state,p),a=p.task==='expedition'?{...cityForce(state.cities.find(c=>c.id===p.city)),units:p.selected.map(id=>state.cities.find(c=>c.id===p.city).units.find(u=>u.id===id)).filter(Boolean),leader:p.leader,advisor:p.advisor,}:state.armies.find(a=>a.id===p.armyId);p.mapUI||={strategicMapView:ui.strategicMapView&&Math.min(ui.strategicMapView.width,ui.strategicMapView.height)<=360?{...ui.strategicMapView}:centeredMapView(mapNode(state,p.city),360,360)};p.mapUI.city=p.destination||p.city;p.mapUI.army=p.armyId;p.mapUI.strategyTab=!p.destination&&p.task==='march'?'army':'city';const preview=a&&route?{...a,location:route.from,travel:null,route:route.route,roadPolicy:p.policy}:a;const m=commandMarkup(state,ui,p.step==='target'?commandMap(state,p.mapUI,preview):'');if(mapCommand){ui.mapCommandView=true;detailPanels.clear();$('#app').removeAttribute('inert');document.body.classList.remove('modal-open');$('#app').innerHTML='<main class="map-command-screen"><header><h1>'+m.title+'</h1>'+(m.subtitle?'<p>'+m.subtitle+'</p>':'')+'</header>'+m.body+(m.footer?'<footer class="map-command-footer">'+m.footer+'</footer>':'')+'</main>';attachStrategicMap($('#app'),p.mapUI,renderModal);attachCommandRouteEditor(p);mapCommandScroll.restore($('#app'),JSON.stringify([p.task,p.city,p.armyId]));restoreInteractionFocus($('#app'),mapFocusSnapshot,{fallback:false});pageGuides.schedule();return;}html=modalShell(m.title,m.subtitle,m.body,m.footer,true);}
  if(ui.modal==='military-flow'){const m=militaryFlowMarkup(state,ui.militaryFlow);html=modalShell(m.title,'',m.body,m.footer,true);}
  if(ui.modal==='encounter-flow'){const m=encounterFlowMarkup(state,ui.encounterFlow);html=modalShell(m.title,'',m.body,m.footer,true);}
  if (ui.modal === 'army') html = armyModal();
  if (ui.modal === 'loadout') html = loadoutModal();
  if (ui.modal === 'unit-stats') html = unitStatsModal();
  if (ui.modal === 'unit-officer') html = officerUnitModal();
  if (ui.modal === 'tactic-detail') html = tacticDetailModal();
  if (ui.modal === 'owned-officers') html = modalShell('麾下群英', '', `<div class="field-sort-bar">${[['name','武将'],['leadership','统率'],['force','武力'],['intellect','智力'],['politics','政治'],['level','等级'],['loyalty','忠诚']].map(([k,n])=>sortButton('owned',k,n,ui.ownedSort?.sort,ui.ownedSort?.direction)).join('')}</div><div class="officer-grid">${sortRows(state.armies.filter(a=>a.faction===playerFaction(state)).flatMap(a=>a.units.map(u=>({a,u}))),ui.ownedSort?.sort,ui.ownedSort?.direction,({u},k)=>k==='loyalty'?state.campaign?.domestic.loyalty[u.id]??u.loyalty:u[k]).map(({a,u}) => `<article class="officer-card">${avatar(u,false,'unit-officer')}<div><h3>${u.name}<small>字 ${u.courtesy}</small></h3><span class="trait">${u.trait}</span><small class="officer-growth">${growthLabel(u)}</small></div><p>${unitTactics(u).map(s=>s.name).join(' · ')}<span>${TROOPS[u.type].name}</span></p><div class="officer-stats">${[['统率', u.leadership], ['武力', u.force], ['智力', u.intellect], ['政治', u.politics]].map(([n, v]) => `<div><b>${v}</b><small>${n}</small></div>`).join('')}</div><button class="button secondary full" data-action="unit-officer" data-inspect="${u.id}">属性</button><p class="officer-strategies">拥有军略：${officerStratagems(u.id).map(key=>STRATAGEMS[key].name).join(' · ') || '无'}</p><footer>${esc(a.name)} · ${cityById(state, a.location).name}<span>忠诚 ${state.campaign?.domestic.loyalty[u.id]??u.loyalty}</span></footer></article>`).join('')}</div>`, '', true);
  if(ui.modal==='scenario-setup'){const m=scenarioSetupMarkup(ui.scenarioSetup,ui.scenarioSetup.sourceArmy?state:{});html=modalShell(m.title,'',m.body,m.footer,true);}
  if(ui.modal==='scenario-review'){const d=ui.customBattle,units=customParticipants(d).map(u=>({...u,name:OFFICER_BY_ID[u.id].name})),armies=customArmyColumns(d),columns=[{team:'ownTeam',label:'我军先遣',index:null},{team:'enemyTeam',label:'敌军先遣',index:null},...(d.reinforcements||[]).map((a,i)=>({team:a.side===0?'ownTeam':'enemyTeam',label:(a.side===0?'我军':'敌军')+' · '+a.name+' · '+arrivalLabel(a,units,armies),index:i}))];html=modalShell('战前核阅','参战军团',('<p>我方总预备兵 '+customTroopBudget(d).toLocaleString()+' 人 · 已编制 '+customBattleTotals(d,0).troops.toLocaleString()+' 人 · 可用 '+customReserveTroops(d).toLocaleString()+' 人</p>')+((d.events||[]).length?'<h3>定时战役事件</h3>'+(d.events||[]).map(e=>'<p>'+esc(battleEventSummary(e))+'</p>').join(''):'')+columns.map(a=>{const p=newScenarioSetup(d,a.team,a.index);return '<h3>'+esc(a.label)+'</h3>'+combatComparison({},scenarioSetupUnits(p),p.roles,{prefix:a.label});}).join(''),'<button class="button secondary" data-action="close">返回编制</button><button class="button primary" data-action="scenario-launch-confirm">确认</button>',true);}
  if(ui.modal==='scenario-army-info'){const a=selectedArmy(),units=state.battle?.sides[0].units||a.units;html=modalShell(a?.name||'参战军团','军团情报',combatComparison(state,units,state.battle?{commanders:state.battle.sides[0].commanders}:a),'<button class="button primary" data-action="close">返回战场</button>',true);}
  if(ui.modal==='officers')html=modalShell('武将名录',Object.keys(OFFICER_BY_ID).length+' 人',rosterMarkup({query:ui.catalogQuery,sort:ui.catalogSort,direction:ui.catalogDirection,kind:ui.catalogKind,page:ui.catalogPage,selected:ui.catalogSelected}),'<button class="button secondary" data-action="owned-officers">武将</button>',true);
  if(ui.modal==='catalog-detail'){
    const u=OFFICER_BY_ID[ui.catalogInspect];
    html=modalShell(u?.name||'武将资料','',officerDetailMarkup(ui.catalogInspect,state.relationshipScores,state.relationshipTypes)+relationshipEditorMarkup(ui.catalogInspect,ui.relationshipPartner,state.relationshipScores,!!(state.battle&&!state.battle.result&&(state.battle.deploymentLocked||state.battle.tick>0)),state.relationshipTypes)+(u?passiveMarkup({...makeOfficer(u.id),level:1}):''),'<button class="button secondary" data-action="officers">返回</button>',true);
  }
  if (ui.modal === 'journal') html = modalShell('日志', '', state.campaign?campaignJournalMarkup(state,ui.journalTab):`<div class="journal">${state.logs.map(l => `<div class="${l.type}"><p>${esc(l.text)}</p></div>`).join('')}</div>`,'',true);
  if (ui.modal === 'settings') html = modalShell('游戏设置', currentScenario()?.name||'', `<div class="settings-actions"><button data-action="save" ${ui.mode==='lobby'?'disabled':''} title="新建命名存档或覆盖已有存档">${icon('save')}保存</button><button data-action="load" title="查看手动存档与自动存档">${icon('scroll')}读取</button><button data-action="export" title="下载 JSON 文件">${icon('flag')}导出</button><button data-action="import" title="选择 JSON 文件">${icon('home')}导入</button></div><div class="settings-divider"></div><div class="reset-row"><div><b>重新开始</b></div><button class="button danger" data-action="${state.testScenario?'retry-scenario':'reset-confirm'}">${state.testScenario?'重开本役':'新开一局'}</button></div>${pageGuides.settingsMarkup()}<input type="file" id="import-file" accept=".json,application/json" hidden>`);
  if(ui.modal==='archives')html=modalShell('游戏存档','',archiveListMarkup(),'<button class="button secondary" data-action="settings">返回设置</button>',true);
  if(ui.modal==='archive-confirm'&&ui.archiveConfirm){const q=ui.archiveConfirm;html=modalShell(q.kind==='delete'?'删除存档':'覆盖存档','',`<p>${q.kind==='delete'?'删除':'用当前进度替换'}「${esc(q.name)}」？</p><p class="muted">${q.kind==='delete'?'删除后无法恢复此手动存档。':'原存档内容会被当前进度替换。'}</p>`,`<button class="button secondary" data-action="archive-cancel">取消</button><button class="button ${q.kind==='delete'?'danger':'primary'}" data-action="archive-confirm">${q.kind==='delete'?'删除':'覆盖'}</button>`);}
  if (ui.modal === 'reset') html = modalShell('再起风云', '', '<p class="modal-intro">将覆盖自动存档；手动存档保留。</p>', '<button class="button secondary" data-action="settings">返回存档</button><button class="button primary" data-action="reset">新局</button>');
  if (ui.modal === 'encounter' && state.pending) {
    const p = state.pending, city = cityById(state, p.cityId), attack = armyById(state, p.attackerId);
    const friendlyAttack = attack.faction === playerFaction(state), defenders = p.defenderIds.map(id => armyById(state, id));
    const own = friendlyAttack ? [attack] : defenders, enemy = friendlyAttack ? defenders : [attack];
    const ownN = own.reduce((n, a) => n + armyTroops(a), 0) + (city.owner === playerFaction(state) ? city.garrison : 0);
    const enemyN = enemy.reduce((n, a) => n + armyTroops(a), 0) + (city.owner !== playerFaction(state) && city.owner !== attack.faction ? city.garrison : 0);
    if (own[0]) ui.army = own[0].id;
    html = modalShell('两军相逢', `${city.name} · ${friendlyAttack ? '我军进攻' : '敌军来袭'}`, `<div class="encounter-symbol">${icon('sword')}</div><h3 class="encounter-title">${city.name}之战</h3><p class="center muted"></p><div class="encounter-versus"><div><span class="faction-token cao">曹</span><b>曹操军</b><strong>${fmt(ownN)}</strong></div><span>VS</span><div><span class="faction-token yuan">${FACTIONS[friendlyAttack ? p.defenderFaction : attack.faction].short}</span><b>${FACTIONS[friendlyAttack ? p.defenderFaction : attack.faction].name}军</b><strong>${fmt(enemyN)}</strong></div></div><div class="info-strip">平原战场 · 通常每方最多6队同时作战，奸雄统军可达7队 · 其余部队列入预备队</div>`, `<button class="button secondary" data-action="loadout">固定战法</button><button class="button secondary" data-action="army" ${own.length ? '' : 'disabled'}>战前编制</button><button class="button primary" data-action="start-battle">${icon('sword')}进入战场</button>`);
  }
  if (ui.modal === 'report' && state.report) {
    const r = state.report, won = r.winner === 0;
    html = modalShell(won ? '此战告捷' : r.winner === null ? '罢兵收军' : r.reason === '撤退' ? '全军收撤' : '此战失利', `${currentScenario()?.name || r.city+'之战'} · 战果呈报`, `<div class="report-seal ${won ? '' : 'lost'}">${won ? '捷' : r.winner === null ? '和' : '退'}</div><p class="center">${state.testScenario ? esc(r.reason) : r.captured ? `${r.city}现归${FACTIONS[r.owner].name}势力所有` : `${r.city}归属未变`} · 交战 ${battleDays(r.tick)} 天 / ${r.tick} 战斗回合（每天24回合）</p>${r.gate?`<div class="info-strip">${esc(r.reason)} · 城门耐久 ${fmt(r.gate.remaining)} / ${fmt(r.gate.initial)}</div>`:''}${battleAppointmentsMarkup(r.appointments,state.armies)}<table class="report-table"><thead><tr><th>战果</th><th>我军</th><th>敌军</th></tr></thead><tbody>${[['总编制兵力', 'initial'], ['存活兵力', 'remaining'], ['伤兵', 'wounded'], ['阵亡', 'killed']].map(([name, key]) => `<tr><td>${name}</td><td>${fmt(r.stats[0][key])}</td><td>${fmt(r.stats[1][key])}</td></tr>`).join('')}</tbody></table>${participationMarkup(r)}<div class="info-strip">${state.testScenario ? '独立战役' : (won ? '声望 +30 · 府库 +300' : '退回己方城池')}</div>${(r.growth||[]).some(g=>g.side===0)?`<h3 class="stats-section-title">${state.testScenario?"本场贡献与成长":"武将成长"}</h3><div class="growth-report">${r.growth.filter(g=>g.side===0).map(g=>`<div><b>${esc(g.name)}</b><span>功绩 ${g.gained>=0?'+':'−'}${Math.abs(g.gained)} · ${g.after!==g.before?`${g.before} → ${g.after} 级`:`${g.after} 级`}</span><small>${esc(contributionText(g.contribution))} · 奖励 ${g.award}，扣罚 ${g.penalty||0}</small><small>${g.unlocked.length?`习得：${g.unlocked.map(esc).join("、")}`:g.after===10?"满级后继续积累功绩":"继续积累功绩"}</small></div>`).join("")}</div>`:""}${state.finished ? `<div class="campaign-complete"><b>${state.finished === 'victory' ? '中原已定，天下归心！' : '城池尽失，此番霸业未成。'}</b><p>可在设置中开启新的征程。</p></div>` : ''}`, currentScenario()?.campaign ? (state.testScenario?.customBattle?'<button class="button secondary" data-action="custom-edit">编辑战役</button>':'')+'<button class="button primary" data-action="retry-scenario">同局重试</button><button class="button secondary" data-action="rematch-scenario">换局再战</button><button class="button secondary" data-action="lobby">首页</button>' : state.testScenario ? '<button class="button primary" data-action="retry-scenario">重开本局</button><button class="button secondary" data-action="scenarios">选择战役</button><button class="button secondary" data-action="exit-scenario">返回天下</button>' : '<button class="button primary full" data-action="close-report">返回天下</button>');
  }
  if (ui.modal === 'split') {
    const army = selectedArmy();
    html = modalShell('分兵立营', '', `<p class="modal-intro">双方至少各留一支有兵部队</p><div class="split-list">${army.units.map(u => `<label><input type="checkbox" data-split="${u.id}" ${ui.selectedSplit.has(u.id) ? 'checked' : ''}>${avatar(u, true)}<b>${u.name}</b><span>${fmt(u.troops)} 人</span></label>`).join('')}</div>`, '<button class="button secondary" data-action="army">返回编制</button><button class="button primary" data-action="confirm-split">组建军团</button>');
  }
  if (ui.modal === 'merge') {
    const army = selectedArmy(), others = state.armies.filter(a => a.id !== army.id && a.faction === playerFaction(state) && a.location === army.location && !a.route.length);
    html = modalShell('合兵一处', '', `<p class="modal-intro">并入 ${esc(army.name)} · 全部部队及携粮</p><div class="settings-actions">${others.map(a => `<button data-merge="${a.id}">${esc(a.name)}<span>${a.units.length} 名武将 · ${fmt(armyTroops(a))} 人 → 合并</span></button>`).join('') || '<p class="muted">同城暂无可合并的军团。</p>'}</div>`, '<button class="button secondary" data-action="army">返回编制</button>');
  }
  if(ui.modal==='campaign-encounters'&&state.campaign)html=modalShell('战斗准备','全局暂停',activeBattles(state).filter(r=>r.awaiting||r.battle.reinforcementCouncil==='pending').map(r=>`<article class="strategy-battle-card"><h3>${r.battle.reinforcementCouncil?'援军抵达 · ':''}${esc(r.name)}</h3>${r.battle.reinforcementCouncil?reinforcementArrivalMarkup(r.battle,state.armies):'<p>请确认本战指挥方式。</p>'}${siegeDefenseOptionsMarkup(state,r)}<button class="button primary" data-action="${r.battle.reinforcementCouncil?'campaign-focus':'campaign-prepare'}" data-battle="${r.id}">${r.battle.reinforcementCouncil?'援军军议':'战前准备'}</button>${r.battle.reinforcementCouncil?`<button class="button secondary" data-action="reinforcement-continue" data-battle="${r.id}">继续作战</button>`:''}</article>`).join(''));
  if(ui.modal==='campaign-archive'&&state.campaign){const r=intelligenceWorld(state).campaign.archive.find(r=>r.id===ui.campaignHistory);if(r)html=modalShell(campaignBattleName(r),'战役战报',`<p>发生时间：${esc(campaignBattleDate(state,r.startedDay))}</p><p>结束时间：${esc(campaignBattleDate(state,r.endedDay))}</p><p>${r.winner?esc(FACTIONS[r.winner].name)+'获胜':'双方收兵'} · ${esc(r.reason)}</p><p class="muted">该战役仅保留战报摘要。</p>`,'',true);}
  if(ui.modal==='campaign-replay'&&state.campaign){const r=battleRecord(intelligenceWorld(state),ui.campaignHistory);if(r)html=modalShell(campaignBattleName(r),'历史回放 · 只读',replayMarkup(state,r,ui.replayIndex||0,ui.replayPlaying),'',true);}
  if(ui.modal==='campaign-history'&&state.campaign){const r=battleRecord(intelligenceWorld(state),ui.campaignHistory);if(r)html=modalShell(campaignBattleName(r),'每日快照 · 只读',snapshotMarkup(state,r,ui.campaignSnapshotDay,ui.snapshotSort),'',true);}
  html=ui.textDetails?modalShell(ui.textDetails.title,'详情',detailTable(ui.textDetails,ui.textDetailsTab||0),'<button class="button secondary" data-action="close">返回</button>',true):html;
  if(ui.modal==='settings')html=html.replace('存档保存在当前浏览器。',saveLocationText()).replace('<input type="file"',audio.settingsMarkup()+'<input type="file"');
  if(ui.mode!=='lobby'&&pendingArmyAppointments(state).length){
   ui.modal='postbattle-appointments';ui.paused=true;ui.postbattleAppointmentDraft??={};
   html=modalShell('战果与任命','补齐任命后继续', appointmentResultMarkup(state,pendingArmyAppointments(state),currentScenario()?.name)+'<h3>战后军团任命</h3>'+ pendingArmyAppointments(state).map(p=>{const a=state.armies.find(a=>a.id===p.armyId);return appointmentFields(a,armyAppointmentCandidates(a),ui.postbattleAppointmentDraft[a.id]||a,{kind:'postbattle',locked:true});}).join(''),'',true);
  }
  const overlay=detailPanels.render(html,detailContext());
  for(const input of document.querySelectorAll('[data-city-budget-key]')){const draft=ui.cityBudgetDrafts?.[input.dataset.cityBudgetId];if(draft&&Object.hasOwn(draft,input.dataset.cityBudgetKey))input.value=draft[input.dataset.cityBudgetKey];const status=document.querySelector(`[data-budget-draft-status="${input.dataset.cityBudgetId}"]`);if(status)status.textContent=draft?'未保存':'';}
  if(ui.modal==='campaign-affairs'&&ui.affairsTab==='diplomacy'){
   for(const [id,value] of Object.entries(ui.diplomacyForm||{})){const el=document.getElementById(id);if(el)el.value=value;}
   [...document.querySelectorAll('.diplomacy-panel details')].forEach((el,i)=>{if(ui.diplomacyDetails?.[i]!==undefined)el.open=ui.diplomacyDetails[i];});
   const label=document.querySelector('[data-diplomacy-target-label]');if(label)label.textContent=FACTIONS[document.querySelector('#diplomacy-target')?.value]?.name||'自主选择';
  }
  modalScroll.restore(detailPanels.panelRoot,html?modalScrollKey():null,overlay.restored);
  art.decorate($('#overlay-root'));
  if(ui.modal==='campaign-picker'&&ui.officerPick.step==='target')attachStrategicMap(detailPanels.panelRoot,ui.officerPick.mapUI,renderModal);
  document.body.classList.toggle('modal-open',overlay.blocking);
  $('#app').toggleAttribute('inert',overlay.blocking);
  if(html){if(state.battle)ui.paused=true;restoreInteractionFocus(detailPanels.panelRoot,overlay.focus||focusSnapshot);}
  pageGuides.schedule();
  syncAudioScene();
}
let musterRenderFrame=null;
function renderMusterChange(el){
 if(!el.closest('.unit-muster,.troop-slider')){renderModal();return;}
 // Let a blur's click or Tab reach its destination before restoring focus.
 if(musterRenderFrame!==null)cancelAnimationFrame(musterRenderFrame);
 musterRenderFrame=requestAnimationFrame(()=>{musterRenderFrame=null;renderModal();});
}
function openModal(name) { cancelCampaignCalculation();ui.mapObject=null;document.querySelector('.map-object-menu')?.remove();if(!['unit-stats','unit-officer','tactic-detail'].includes(name))ui.commandInspect=false;ui.textDetails=null;ui.textDetailsTab=0;ui.modal = name; if (state.battle) ui.paused = true; renderModal(); if (state.battle&&ui.mode!=='lobby') updateBattle(); }
function closeModal() {if(ui.modal==='map-target'){finishMapTarget(false);return;}if(ui.modal==='postbattle-appointments'){ui.modal=null;save();render();return;}
 if(ui.modal==='campaign-confirmation'){restoreCampaignConfirmation();return;}
 if(ui.modal==='domestic-direction'&&!ui.textDetails){openModal('city-domestic');return;}
 if(!ui.textDetails&&isObjectDetail(ui)&&detailPanels.hasSource){restoreDetailSource(detailPanels.returnContext());renderModal();if(state.battle&&ui.mode!=='lobby')updateBattle();return;}
 if(ui.modal==='diplomacy-interruption'){ui.diplomaticInterruption=null;openModal('campaign-affairs');return;}
 if(ui.modal==='campaign-affairs'&&ui.diplomacyReportReturn){ui.diplomacyReportReturn=false;openModal('domestic-alerts');return;}
 if(ui.modal==='activity-record'){const target=ui.activityRecord?.returnModal||'domestic-alerts';ui.activityRecord=null;openModal(target);return;}
 if(ui.modal==='domestic-proposals'){ui.domesticProposalDeferred=true;ui.paused=true;} if(ui.modal==='domestic-alerts'){acknowledgeDomesticAlerts(state,ui.domesticAlertIds||[]);ui.domesticAlertIds=[];ui.paused=pendingDomesticProposals(state).length>0;ui.lastTime=performance.now();save();} if(ui.modal==='faction-battle'&&!ui.textDetails){openModal('faction-directory');return;}if(['campaign-history','campaign-replay','campaign-archive'].includes(ui.modal)&&ui.snapshotReturn&&!ui.textDetails){const target=ui.snapshotReturn;ui.snapshotReturn=null;openModal(target);return;} if(ui.modal==='campaign-info'&&!ui.textDetails){const target=ui.infoReturn;ui.infoReturn=null;if(target){openModal(target);return;}}  if(ui.textDetails){ui.textDetails=null;ui.textDetailsTab=0;renderModal();return;} if(ui.modal==='archive-confirm'){ui.archiveConfirm=null;openModal('archives');return;}if(ui.modal==='archives'){ui.modal=null;finishModalClose();return;} if(ui.scenarioInspect){ui.scenarioInspect=false;openModal('scenario-setup');return;}if(ui.modal==='scenario-setup')ui.scenarioSetup=null; if(ui.militaryReturn&&['unit-stats','unit-officer','tactic-detail'].includes(ui.modal)){const target=ui.militaryReturn;ui.militaryReturn=null;openModal(target);return;} if(['military-flow','encounter-flow'].includes(ui.modal)){ui.militaryFlow=null;ui.encounterFlow=null;}  if(['unit-officer','unit-stats','tactic-detail'].includes(ui.modal)&&['campaign-picker','city-domestic','domestic-direction','city-personnel','campaign-personnel'].includes(ui.personnelReturn)){openModal(ui.personnelReturn);return;} if(ui.modal==='domestic-interruption'&&(ui.officerPick||ui.commandReturn)){ui.interruption=null;openModal(ui.officerPick?'campaign-picker':ui.commandReturn);if(!ui.officerPick)ui.commandReturn=null;return;} if(ui.modal==='campaign-picker'){ui.officerPick=null;ui.personnelReturn=null;if(ui.commandReturn){const target=ui.commandReturn;ui.commandReturn=null;openModal(target);return;}} if(ui.mode==='lobby'){ui.modal=null;finishModalClose();return;} if (state.report) return closeReport(); ui.modal = state.pending ? 'encounter' : null; finishModalClose(); }
function closeReport() { if (currentScenario()?.campaign) return showLobby(); if (state.testScenario) { ui.modal = 'scenarios'; renderModal(); return; } state.report = null; ui.modal = null; ui.city = selectedArmy()?.location || playerHome(state); save(); render(); }
async function act(action, el) {
  if(ui.archiveBusy)return;
  cancelCampaignCalculation();
 if(action==='ending-export'){return act('export',el);}
 if(action==='ending-map'){viewCampaignMap(state);ui.endingMap=true;ui.paused=true;ui.modal=null;render();return;}
 if(action==='ending-show'){ui.endingMap=false;ui.modal=null;render();return;}
 if(action==='ending-page'){ui[el.dataset.kind==='officers'?'endingOfficersPage':'endingEventsPage']=Number(el.dataset.page);render();return;}
 if(action==='ending-new'){if(!await save())return;showLobby('national');return;}
 if(action==='audio-toggle'){audio.setPreferences({muted:!audio.preferences.muted});if(!audio.preferences.muted)void audio.unlock().then(ok=>{if(ok)audio.play('confirm');});return;}
 if(action==='audio-voice-preview'){
  if(audio.preferences.muted||!audio.preferences.voice){toast('请先开启声音并调高武将语音音量','error');return;}
  void audio.unlock().then(async ok=>{if(!ok)return toast('声音暂不可用','error');const played=await audio.playOfficer({...officerVoiceLine(OFFICER_BY_ID.cao,'start',{signature:true}),priority:10},{preview:true});if(!played)toast('中文语音暂不可用，请检查语音素材或设备中文语音设置','error');});return;
 }
 if(action==='audio-preview'){if(audio.preferences.muted){toast('请先开启声音','error');return;}if(!audio.preferences.sfx){toast('请先调高操作音效音量','error');return;}void audio.unlock().then(ok=>{if(ok)audio.play('order',{priority:7});else toast('声音暂不可用，请检查浏览器声音设置','error');});return;}
 if(action==='map-target-open'){openMapTarget(el.dataset.kind);return;}
 if(action==='map-target-confirm'){finishMapTarget(true);return;}
 if(action==='map-target-cancel'){finishMapTarget(false);return;}
 if(action==='transfer-relay-clear'){ui.officerPick.relay=null;renderModal();return;}
 if(action==='diplomacy-target-clear'){document.getElementById('diplomacy-target').value='';document.querySelector('[data-diplomacy-target-label]').textContent='自主选择';return;}
 if(action==='map-target-locate'){const n=mapNode(state,el.dataset.id);if(n&&ui.targetPick){ui.targetPick.mapUI.strategicMapView=centeredMapView(n,360,360);ui.targetPick.mapUI.mapFocusKey='place:'+ui.targetPick.mapUI.city;renderModal();}return;}
 if(action==='help')return pageGuides.open(null);
 if(action==='battle-map-editor'){mapEditor.open(ui.customBattle);showLobby('maps');return;}
 if(action==='bond-overview'){ui.textDetails=bondOverview();ui.textDetailsTab=0;renderModal();return;}
 if(action==='ability-reference'||action==='tactic-detail'){const data=el.dataset.details?JSON.parse(el.dataset.details):abilityReference(action==='tactic-detail'?'tactic':el.dataset.kind,el.dataset.id||el.dataset.skill);if(data){if(action==='tactic-detail'){const u=inspectionUnits().find(u=>u.id===el.dataset.inspect),skill=TACTICS_BOOK[el.dataset.skill];if(u&&skill){const {unit,battle}=inspectContext(u);data.groups[0].rows.push(['威力','',tacticPowerPreview(skill,statusPower(unit,skill,battle))],['施放次数','',inspectionBattle()?'剩余 '+tacticUsesLeft(unit,skill)+'/'+tacticUseLimit(unit,skill)+' 次':'每场 '+skill.maxUses+' 次']);if(inspectionBattle())data.groups[0].rows.push(['当前限制','',tacticCondition(unit,skill,battle)]);}}if(el.dataset.effect)data.groups[0].rows.push(['当前效果','',el.dataset.effect]);ui.textDetails=data;ui.textDetailsTab=0;renderModal();}return;}

 if(action==='treasure-open'){ui.treasurePick={officerId:el.dataset.officer||null};ui.scenarioInspect=false;return openModal('treasures');}
 if(action==='treasure-select'){ui.treasurePick={...ui.treasurePick,id:el.dataset.id,recipientId:ui.treasurePick?.officerId||null,equip:false};renderModal();return;}
 if(action==='treasure-cancel'){ui.treasurePick={officerId:ui.treasurePick?.officerId,filter:ui.treasurePick?.filter};renderModal();return;}
 if(['treasure-confirm','treasure-equip','treasure-unequip','treasure-store'].includes(action)){const p=ui.treasurePick||{},error=action==='treasure-confirm'?grantTreasure(state,p.id,p.recipientId,{equip:!!p.equip}):action==='treasure-store'?storeTreasure(state,el.dataset.id):equipTreasure(state,el.dataset.officer,action==='treasure-equip'?el.dataset.id:null);if(error)return toast(error,'error');ui.treasurePick={officerId:p.officerId,filter:p.filter};save();renderModal();return;}
 if(action==='text-details'){ui.textDetails=JSON.parse(el.dataset.details);ui.textDetailsTab=0;renderModal();return;}
 if(action==='text-details-tab'){ui.textDetailsTab=Number(el.dataset.index);renderModal();return;}
 if(action==='map-city-inspect'){if(!cityVisible(state,el.dataset.town||ui.city)){ui.infoView={type:'city',id:el.dataset.town||ui.city,objectOnly:true};openModal('campaign-info');return;}ui.city=el.dataset.town||ui.city;ui.strategyTab=isJunction(state,ui.city)?'node':'city';ui.modal=null;ui.mapObject=null;ui.mapPanelOpen=false;render();$('#app .national-world')?.dispatchEvent(new CustomEvent('map-inspect-city',{detail:{id:ui.city}}));return;}
  if(action==='map-object-close'){const id=ui.mapObject?.id;ui.mapObject=null;render();document.querySelector(`.strategy-world [data-city="${id}"]`)?.focus({preventScroll:true});return true;}
 if(action==='map-city-commands'){if(ui.mapObject?.kind==='city'){ui.mapObject.group=el.dataset.group||null;render();document.querySelector('.city-command-grid button:not(:disabled)')?.focus({preventScroll:true});}return true;}
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
  if(action==='scenario-unit-save'){const error=saveScenarioUnit(ui.scenarioSetup);if(error)toast(error,'error');renderModal();return;}
  if(action==='scenario-setup-page'){ui.scenarioSetup.filter.page=Math.max(0,Number(el.dataset.page)||0);renderModal();return;}
  if(action==='scenario-setup-unit-detail'){ui.scenarioInspect=true;ui.personnelReturn=null;ui.inspectUnit=el.dataset.officer||el.dataset.id;return openModal('unit-stats');}
  if(action==='scenario-setup-detail'){ui.scenarioInspect=true;ui.personnelReturn=null;ui.inspectUnit=el.dataset.officer||el.dataset.id;return openModal('unit-officer');}
  if(action==='scenario-setup-cancel'){ui.scenarioSetup=null;ui.scenarioInspect=false;ui.modal=null;render();return;}
  if(action==='scenario-setup-move'){const p=ui.scenarioSetup,ids=p.armySelected??p.selected,i=ids.indexOf(el.dataset.id),j=i+Number(el.dataset.offset);if(i>=0&&j>=0&&j<ids.length)[ids[i],ids[j]]=[ids[j],ids[i]];renderModal();return;}
  if(['scenario-setup-next','scenario-setup-back','scenario-setup-step'].includes(action)){
    const p=ui.scenarioSetup,steps=scenarioSetupSteps(p),index=steps.indexOf(p.step),error=scenarioSetupError(p);
    if(action==='scenario-setup-next'&&error)return toast(error,'error');
    const target=action==='scenario-setup-step'?steps.indexOf(el.dataset.step):index+(action==='scenario-setup-next'?1:-1);
    if(target>=0&&target<steps.length&&(action!=='scenario-setup-step'||target<index)){p.step=steps[target];setCombatPage('combat-本军',p.step==='commanders'?'appointments':'units');}renderModal();return;
  }
  if(action==='scenario-setup-confirm'){
    const p=ui.scenarioSetup,error=scenarioSetupError(p);if(error)return toast(error,'error');
    try{if(p.sourceArmy){state=applyBattleSetup(state,p);save();}else{ui.customBattle=scenarioSetupDraft(p);saveCustomDraft();}ui.scenarioSetup=null;ui.modal=null;render();}catch(e){toast(e.message,'error');}return;
  }
  if(action==='art-mode'){art.toggle();render();return;}
 if(action==='unit-workbench-preview'){const p=ui.modal==='scenario-setup'?ui.scenarioSetup:ui.officerPick;if(p){p.workbench={id:el.dataset.id,tab:el.dataset.tab||p.workbench?.tab||'unit'};renderModal();}return;}
  if(state.campaign&&handleCampaignAction(action,el))return;
  if(state.campaign&&['relationship-save','relationship-reset'].includes(action)&&activeBattles(state).length)return toast('交战期间人物关系锁定');

  if(action==='campaign-category'){ui.historySelection=el.dataset.category==='tactical'?'tactical-control-lv':'history-guandu';render();return;}
  if(action==='rematch-scenario')return launchScenario(state.testScenario.id,crypto.getRandomValues(new Uint32Array(1))[0],state.testScenario.shieldPercent,state.testScenario.officerIds||null,state.testScenario.customBattle);
  if(action==='historical-template'){ui.customBattle=historicalBattleDraft(el.dataset.history);refreshCustomDraft();document.querySelector('.custom-battle')?.scrollIntoView({behavior:'smooth',block:'start'});toast('已载入历史战役，可调整双方军团后开战');return;}
  if(action==='launch-custom'){try{validateCustomBattle(ui.customBattle);openModal('scenario-review');}catch(e){toast(e.message,'error');}return;}
  if(action==='scenario-launch-confirm')return launchScenario('custom-battle',ui.customBattle.seed,ui.customBattle.shieldPercent??20,null,ui.customBattle);
  if(action==='custom-setup'){showLobby('custom');return;}
  if(action==='preset-edit'){ui.customBattle=scenarioDraft(el.dataset.scenario);refreshCustomDraft();showLobby('custom');return;}
  if(action==='custom-reinforcement-add'){
    const used=new Set(customParticipants(ui.customBattle).map(u=>u.id)),officer=Object.values(OFFICER_BY_ID).find(u=>!used.has(u.id));if(!officer)return toast('暂无未参战武将');
    ui.customBattle.reinforcements??=[];ui.customBattle.reinforcements.push({side:1,name:'援军'+(ui.customBattle.reinforcements.length+1),tick:Math.min(battleSteps(2),Math.max(0,(ui.customBattle.limit??480)-1)),team:[{id:officer.id,type:highestAptitudeTroop(officer,battleTroopTypes(ui.customBattle.terrain)),troops:Math.min(3000,troopCapacity({...officer,level:5})),level:5}],roles:{leader:officer.id,advisor:officer.id,}});refreshCustomDraft();return;
  }
  if(action==='custom-reinforcement-remove'){removeCustomReinforcement(ui.customBattle,Number(el.dataset.index));refreshCustomDraft();return;}
  if(action==='custom-event-add'){ui.customBattle.events??=[];if(ui.customBattle.events.length<32)ui.customBattle.events.push({kind:'supply-cut',side:1,tick:Math.min(48,(ui.customBattle.limit??480)-1),duration:BATTLE_EVENTS['supply-cut'].duration});refreshCustomDraft();return;}
  if(action==='custom-event-remove'){ui.customBattle.events.splice(Number(el.dataset.index),1);refreshCustomDraft();return;}
  if(action==='battle-appointments-confirm'){
   const armyId=el.dataset.armyId,roles=ui.battleAppointmentDraft?.[armyId]||Object.fromEntries(['leader','advisor'].map(role=>[role,state.battle.sides[0].commanders.find(c=>c.armyId===armyId&&c.role===role)?.id??null]));
   const error=state.campaign?appointEncounterRoles(state,armyId,roles):appointBattleRoles(state.battle,armyId,roles);if(error)return toast(error,'error');delete ui.battleAppointmentDraft?.[armyId];save();updateBattle();return;
  }
  if(action==='postbattle-appointments-confirm'){
   const armyId=el.dataset.armyId,a=state.armies.find(a=>a.id===armyId),error=confirmPostbattleAppointments(state,armyId,ui.postbattleAppointmentDraft?.[armyId]||{leader:a.leader,advisor:a.advisor});
   if(error)return toast(error,'error');delete ui.postbattleAppointmentDraft?.[armyId];ui.modal=null;save();render();return;
  }
  if(action==='battle-reinforcement-council'){const error=openReinforcementCouncil(state.battle);if(error)return toast(error,'error');ui.paused=true;ui.councilOpen=true;ui.modal=null;save();render();return;}
  if(action==='battle-reinforcement-continue'){const error=confirmReinforcementCouncil(state.battle);if(error)return toast(error,'error');ui.modal=null;ui.paused=false;ui.lastTime=performance.now();save();render();return;}
  if(action==='custom-wave-add'){ui.customBattle.waves??=[];if(ui.customBattle.waves.length<4)ui.customBattle.waves.push({count:1,tick:(ui.customBattle.waves.at(-1)?.tick??0)+25});refreshCustomDraft();return;}
  if(action==='custom-wave-remove'){ui.customBattle.waves.splice(Number(el.dataset.index),1);refreshCustomDraft();return;}
  if(action==='custom-edit'){ui.customBattle=structuredClone(state.testScenario.customBattle);ui.customBattle.seed=state.testScenario.seed;saveCustomDraft();showLobby('custom');return;}
  if(action==='custom-swap'){try{ui.customBattle=swapCustomBattle(ui.customBattle);refreshCustomDraft();}catch(e){toast(e.message,'error');}return;}
  if(action==='lobby')return showLobby();
  if(action==='campaign-lobby')return showLobby('custom');
  if(action==='strategy'){ui.nationalDraft??={step:'scenario'};return showLobby('national');}
  if(action==='select-national-scenario'){if(!nationalScenario(el.dataset.scenario))return;const old=ui.nationalDraft;ui.nationalDraft={step:'faction',scenarioId:el.dataset.scenario,faction:old?.scenarioId===el.dataset.scenario?old.faction:null,allAI:!!old?.allAI};render();window.scrollTo(0,0);return;}
  if(action==='national-control'){ui.nationalDraft.allAI=!ui.nationalDraft.allAI;render();return;}
  if(action==='national-back'){ui.nationalDraft.step='scenario';render();window.scrollTo(0,0);return;}
  if(action==='select-national-faction'){if(!nationalScenario(ui.nationalDraft?.scenarioId)?.factions.includes(el.dataset.faction))return;ui.nationalDraft.faction=el.dataset.faction;render();return;}
  if(action==='continue-national'){try{const raw=saveStorage.peek(SAVE_KEY);if(!raw)return toast('尚无普通模式存档');state=validateSave(JSON.parse(raw));restoreUI();}catch{toast('存档不兼容，请重新开始');}return;}
  if(action==='launch-national'){const draft=ui.nationalDraft;if(draft?.step!=='faction'||!nationalScenario(draft.scenarioId)?.factions.includes(draft.faction))return;state=newGame(draft.scenarioId,draft.faction,{allAI:!!draft.allAI});ui.strategicMapView=null;ui.strategyTab='city';restoreUI();save();return;}
  if(action==='select-history'){ui.historySelection=el.dataset.scenario;render();document.querySelector(`[data-action="select-history"][data-scenario="${ui.historySelection}"]`)?.focus({preventScroll:true});return;}
  if(action==='launch-history')return launchScenario(el.dataset.scenario);
  if(action==='continue-history')return continueHistory();
  if(action==='inspect-building'){const b=state.battle,g=[...(b?.siege?.gate?[b.siege.gate]:[]),...(b?.buildings||[])].find(a=>a.id===el.dataset.building);if(g){ui.battleBuilding=g.id;openModal(g.type==='gate'?'gate':'battle-building');}return;}
  if (action === 'inspect-gate') {
    openModal('gate');
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
    if(error)return toast(error,'error');
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
  else if(action==='journal-tab'){ui.journalTab=el.dataset.tab;renderModal();}
  else if(action==='battle-log-filter'){ui.battleLogFilter=el.dataset.kind;updateBattle();}
  else if(action==='battle-panel') { if(el.dataset.panel==='commands'){ui.battlePanel=null;openModal('stratagem-picker');return;} ui.battlePanel=ui.battlePanel===el.dataset.panel?null:el.dataset.panel; if(['commands','events'].includes(ui.battlePanel)) ui.paused=true; updateBattle(); }
  else if(action==='close-battle-panel') { ui.battlePanel=null; updateBattle(); }
  else if(action==='choose-stratagem') {ui.battlePanel=null;openModal('stratagem-picker');}
  else if(action==='unit-stats'){ui.inspectUnit=el.dataset.inspect||ui.inspectUnit;openModal('unit-stats');}
  else if(action==='deployment-select'){const u=state.battle?.sides[0].units.find(u=>u.id===el.dataset.inspect&&['active','reserve'].includes(u.status));if(!isDeploying(state.battle)||!u)return;ui.reserveEntrySelection=false;closeModal();ui.councilOpen=false;ui.deploymentBattleId=state.battle.id;ui.deploymentDraft=null;ui.deploymentSelection=u.id;updateBattle();}
  else if(action==='reserve-entry-select'){const b=state.battle,u=b?.sides[0].units.find(u=>u.id===el.dataset.inspect&&u.status==='reserve');if(!isBattleCouncil(b)||!u)return;ui.councilOpen=false;ui.deploymentSelection=u.id;ui.deploymentBattleId=b.id;ui.deploymentDraft=null;ui.reserveEntrySelection=true;updateBattle();}
  else if(action==='reserve-entry-clear'){ui.reserveEntrySelection=true;draftReserveEntry(el.dataset.inspect,null,null);}
  else if(action==='deployment-cancel'){ui.deploymentSelection=null;ui.deploymentDraft=null;ui.reserveEntrySelection=false;updateBattle();}
  else if(action==='deployment-confirm'){
   const p=ui.deploymentDraft,b=state.battle;if(!p||p.battleId!==b?.id||p.unitId!==ui.deploymentSelection)return;
   const error=p.kind==='entry'?configureReserveEntry(b,p.unitId,p.x===null?null:{x:p.x,y:p.y}):p.kind==='reserve'?reserveDeploymentUnit(b,p.unitId,p.toId):deployUnit(b,p.unitId,p.x,p.y);
   if(error)return toast(error,'error');ui.deploymentDraft=null;ui.deploymentSelection=null;ui.reserveEntrySelection=false;syncCouncilDraft();save();updateBattle();
  }
  else if(action==='unit-officer'){ui.inspectUnit=el.dataset.inspect||ui.inspectUnit;openModal('unit-officer');}
  else if(action==='tactic-detail'){ui.inspectionReturn=ui.modal;ui.inspectUnit=el.dataset.inspect;ui.inspectSkill=el.dataset.skill;openModal('tactic-detail');}
  else if(action==='inspection-back'){if(ui.inspectionReturn)openModal(ui.inspectionReturn);else closeModal();}
  else if(action==='loadout')openModal('loadout');


  else if (['army', 'officers', 'journal', 'settings', 'merge'].includes(action)) openModal(action);
  else if (action === 'close') closeModal();
  else if (action === 'order') { ui.order = true; toast('点击地图上的目的地，下达调遣令'); render(); }
  else if (action === 'cancel-order') { ui.order = false; render(); }
  else if (action === 'march') march(el.dataset.target);
  else if (action === 'cancel-march') { const a = selectedArmy(); const error = orderArmy(state, a.id, a.location); if (error) toast(error,'error'); else { save(); render(); } }
  else if (action === 'next-turn') {
    const error = advanceTurn(state); if (error) toast(error,'error');
    else { ui.modal = state.pending ? 'encounter' : null; save(); render(); if (state.finished) toast(state.finished === 'victory' ? '中原已定，剧本目标达成！' : '城池尽失，本局结束。'); }
  }
  else if (action === 'recruit') { const error = state.campaign?recruitCampaign(state,selectedArmy()?.id):recruit(state, selectedArmy()?.id); toast(error || '兵员已补充，粮草已拨付',error?'error':'confirm'); save(); render(); }
  else if (action === 'start-battle') { const error = startBattle(state); if (error) toast(error,'error'); else { ui.modal = null; ui.paused = true; ui.deploymentSelection = null; save(); render(); window.scrollTo(0, 0); } }
  else if(action==='retreat-batch-apply'){const value=$('[data-retreat-batch]').value,ids=ui.retreatBattleId===state.battle?.id?ui.retreatSelected:[];const error=configureCouncilRetreat(state.battle,ids,value===''?null:Number(value));if(error)toast(error,'error');else{syncCouncilDraft();save();}updateBattle();}
  else if (action === 'pause' || action === 'tactical-pause') { if(battlePortrait.matches)return; if(ui.deploymentSelection){toast('请先确认或取消站位调整');return;} if(ui.areaDraft){toast('请先确认或取消军略选区');return;} if(isReinforcementCouncil(state.battle)){confirmReinforcementCouncil(state.battle);ui.deploymentSelection=null;ui.paused=false;} else if (isDeploying(state.battle)) { const error=lockDeployment(state.battle);if(error){toast(error,'error');return;} ui.deploymentSelection = null; ui.paused = false; } else ui.paused = !ui.paused; if(!ui.paused) ui.battlePanel=null; ui.lastTime = performance.now(); updateBattle(); save(); }
  else if(action==='show-council'){ui.councilOpen=!ui.councilOpen;updateBattle();if(ui.councilOpen&&$('.council-reserves'))$('.council-reserves').open=true;}
  else if(action==='council-order'){const error=changeBattleCouncil(state.battle,{id:el.dataset.id,offset:Number(el.dataset.offset)});if(error)toast(error,'error');else{audio.play('confirm');ui.deploymentSelection=null;syncCouncilDraft();save();}updateBattle();}
  else if (action === 'reset-deployment') {ui.deploymentDraft=null; const error = resetDeployment(state.battle); if (error) toast(error,'error'); else { ui.deploymentSelection = null; updateBattle(); save(); } }
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
    ui.archiveBusy=true;
    try{await writeArchive(saveStorage,{name:ui.archiveName,data:state.campaign?serializeCampaign(state):JSON.stringify(state)},validateSave,archiveReadOptions);await refreshArchives();toast('手动存档已保存');}
    catch(error){toast(error.name==='QuotaExceededError'?'浏览器空间不足，请导出或删除不需要的手动存档':`保存失败：${error.message}`);}
    finally{ui.archiveBusy=false;}
  }
  else if(action==='archive-load'){
    ui.archiveBusy=true;
    try{const next=await readArchive(saveStorage,el.dataset.key,validateSave,archiveReadOptions);state=next;restoreUI();if(await save())toast('已读取所选存档，游戏已暂停');}
    catch(error){toast(`读取失败：${error.message}`);}
    finally{ui.archiveBusy=false;}
  }
  else if(action==='archive-overwrite'||action==='archive-delete'){
    if(action==='archive-overwrite'&&ui.mode==='lobby')return;
    try{const entry=ui.archiveEntries?.find(x=>x.key===el.dataset.key&&!x.automatic);if(!entry)return;ui.archiveName=$('#archive-name')?.value||ui.archiveName;ui.archiveConfirm={key:entry.key,name:entry.name,kind:action==='archive-delete'?'delete':'overwrite'};openModal('archive-confirm');}
    catch(error){toast(`无法选择存档：${error.message}`);}
  }
  else if(action==='archive-cancel'){ui.archiveConfirm=null;openModal('archives');}
  else if(action==='archive-confirm'){
    const q=ui.archiveConfirm;if(!q)return;
    ui.archiveBusy=true;
    try{if(q.kind==='delete')await deleteArchive(saveStorage,q.key);else{if(ui.mode==='lobby')return;await writeArchive(saveStorage,{key:q.key,name:q.name,data:state.campaign?serializeCampaign(state):JSON.stringify(state)},validateSave,archiveReadOptions);}ui.archiveConfirm=null;await refreshArchives();openModal('archives');toast(q.kind==='delete'?'手动存档已删除':'手动存档已更新');}
    catch(error){toast(error.name==='QuotaExceededError'?'浏览器空间不足，原存档已保留':`操作失败：${error.message}`);}
    finally{ui.archiveBusy=false;}
  }
  else if (action === 'export') {
    const name=state.testScenario?`君临-${currentScenario()?.campaign?'战役':'试炼'}-${state.testScenario.id}.json`:`君临-第${state.turn}旬.json`;
    exportSaveFile(name,state.campaign?serializeCampaign(state):JSON.stringify(state,null,2)).then(result=>{if(result!==false)toast('存档已导出');}).catch(error=>toast('未能导出存档：'+error.message));
  }
  else if (action === 'import') $('#import-file').click();
  else if (action === 'reset-confirm') openModal('reset');
  else if (action === 'reset') { closeModal();showLobby('national'); }
  else if (action === 'close-report') closeReport();
  else if (action === 'split') { ui.selectedSplit.clear(); openModal('split'); }
  else if (action === 'confirm-split') { const error = state.campaign?splitCampaignArmy(state,selectedArmy().id,[...ui.selectedSplit]):splitArmy(state, selectedArmy().id, [...ui.selectedSplit]); if (error) toast(error,'error'); else { save(); openModal('army'); toast('新军团已组建，可在军团选择框中切换'); } }
}
function march(target) { const error = orderArmy(state, selectedArmy()?.id, target); if (error) toast(error,'error'); else { ui.order = false; save(); render(); toast('军令已下达，结束回合后开始行军'); } }
function restoreUI() {ui.cityBudgetDrafts={};ui.pendingAction=null;ui.targetPick=null;ui.deploymentBattleId=null;ui.deploymentDraft=null;ui.diplomacyForm=null;ui.diplomacyDetails=null;ui.treasurePick=null;ui.officerPick=null;ui.endingMap=false;ui.endingOfficersPage=0;ui.endingEventsPage=0;ui.battleAppointmentDraft={};ui.postbattleAppointmentDraft={}; ui.domesticProposalDeferred=false;ui.encounterNotices=new Set(); ui.areaDraft=null; ui.mode='map';ui.battlePanel=null; history.replaceState(null, '', location.pathname + location.search + (currentScenario()?.campaign ? '#historical-battle' : state.testScenario ? '#battle-lab' : '#strategy')); ui.army = (state.armies.find(a => a.faction === playerFaction(state) && a.units.some(u=>OFFICER_BY_ID[u.id]?.sourceId===FACTIONS[playerFaction(state)]?.leaderSourceId))||state.armies.find(a => a.faction === playerFaction(state)))?.id; ui.city = selectedArmy()?.location || playerHome(state); ui.paused = true; ui.modal = state.report ? 'report' : state.pending ? 'encounter' : null; ui.order = false;  ui.deploymentSelection = null; ui.zoom = 1;ui.strategicMapView=null;ui.mapFocusKey=null;ui.mapCameraManual=false; render(); window.scrollTo(0, 0); }
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
  if(ui.mapObject&&!event.target.closest('.map-object-menu,[data-city],[data-action="map-quick-select"]')){ui.mapObject=null;document.querySelector('.map-object-menu')?.remove();}
  if(ui.areaDraft){
    const action=event.target.closest('[data-area-action]');
    if(action){
      if(action.disabled)return;
      if(action.dataset.areaAction==='cancel')ui.areaDraft=null;
      else if(action.dataset.areaAction==='rotate'){ui.areaDraft.rotation=ui.areaDraft.rotation===90?0:90;if(ui.areaDraft.point)ui.areaDraft.point.rotation=ui.areaDraft.rotation;}
      else {const error=issueCommand(state.battle,ui.areaDraft.key,ui.areaDraft.point);if(error)toast(error,'error');else{ui.areaDraft=null;toast('军略已施放');save();}}
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
  if(ui.modal==='scouting'&&event.target.closest('[data-command-city]')){
   const id=event.target.closest('[data-command-city]').dataset.commandCity,selected=scoutSelection(state,ui.scout);
   if(!selected.officer){
    if(!selected.cities.some(c=>c.id===id)){toast('请选择己方城市');return;}
    if(ui.scout.city===id)return;
    Object.assign(ui.scout,{city:id,officer:null,target:null,route:null,waypoints:[],mapUI:null});renderModal();return;
   }
   if(!selected.targets.some(n=>n.id===id)){toast('请选择周边终点');return;}
   if(ui.scout.target===id)return;
   Object.assign(ui.scout,{target:id,route:null,waypoints:[]});renderModal();return;
  }
  if(ui.modal==='map-target'&&event.target.closest('[data-command-city]')){const id=event.target.closest('[data-command-city]').dataset.commandCity;if(!mapTargetCandidates(state,ui.targetPick.kind,mapTargetContext()).some(n=>n.id===id)){toast('此处不能作为当前目标');return;}ui.targetPick.selected=id;renderModal();return;}
  const junction=event.target.closest('[data-junction]');
  if(junction){ui.city=junction.dataset.junction;ui.strategyTab='node';ui.mapPanelOpen=true;ui.mapObjectMenu=null;render();return;}
  const target=event.target.closest('[data-command-city]');
  if(target&&ui.modal==='campaign-picker'){const p=ui.officerPick,id=target.dataset.commandCity,c=mapNode(state,id);if(p.task==='transfer'&&(id===p.city||c.owner!==playerFaction(state))){toast('请选择其它可调入的据点');return;}if(['march','expedition'].includes(p.task)){const error=selectCommandPoint(state,p,id);if(error)toast(error,'error');}else {p.destination=id;if(p.relay===id)p.relay=null;}renderModal();return;}
  const transport=event.target.closest('[data-transport-officer]');
  if(transport&&state.campaign){openMapInspection('officer',transport.dataset.transportOfficer);render();return;}
  const legion=event.target.closest('[data-campaign-army]');
  if(legion&&state.campaign){ui.army=legion.dataset.campaignArmy;ui.strategyTab='army';ui.mapPanelOpen=false;ui.mapDirectoryOpen=false;openMapInspection('army',ui.army);render();return;}
  const action = event.target.closest('[data-action]');
  if (action) { event.preventDefault(); if (!action.disabled) act(action.dataset.action, action); return; }
  const city = event.target.closest('[data-city]');
  if (city) { if(state.campaign&&!ui.order){openCityCommands(city.dataset.city,city,event);return;}ui.city=city.dataset.city;if(ui.order)march(ui.city);else render();return; }
  const command = event.target.closest('[data-command]');
  if (command && !command.disabled && state.battle) {
    if(isAreaStratagem(STRATAGEMS[command.dataset.command])){
      ui.areaDraft={key:command.dataset.command,sourceId:battleStratagemSource(state.battle,command.dataset.command)?.id,battleId:state.battle.id,point:null,rotation:0};ui.paused=true;ui.battlePanel=null;ui.modal=null;renderModal();updateBattle();return;
    }
    ui.areaDraft=null;
    const error = issueCommand(state.battle, command.dataset.command); if(!error){ui.battlePanel=null;if(ui.modal==='stratagem-picker'){ui.modal=null;renderModal();}} toast(error || '军令已传达',error?'error':'confirm'); save(); updateBattle(); return;
  }
  const unit = event.target.closest('[data-unit]');
  if(unit&&state.battle&&isObjectDetail(ui)){ui.inspectUnit=unit.dataset.unit;openModal('unit-stats');return;}
  if (unit && isDeploying(state.battle)) {
    const target=activeUnits(state.battle,0).find(u=>u.id===unit.dataset.unit);
    if(ui.deploymentSelection&&target&&target.id!==ui.deploymentSelection){draftBattlePlacement(ui.deploymentSelection,target.x,target.y);return;}
    ui.deploymentSelection=null;ui.inspectUnit=unit.dataset.unit;openModal('unit-stats');return;
  }
  const cell = event.target.closest('[data-deploy-x]');
  if (cell && isDeploying(state.battle)) { placeSelected(cell); return; }
  if(unit&&state.battle){ui.inspectUnit=unit.dataset.unit;openModal('unit-stats');return;}
  const merge = event.target.closest('[data-merge]');
  if (merge) { const error = state.campaign?mergeCampaignArmies(state,selectedArmy().id,merge.dataset.merge):mergeArmies(state, selectedArmy().id, merge.dataset.merge); if (error) toast(error,'error'); else { save(); openModal('army'); toast('军团已合并'); } }
});
function placeSelected(cell) {
  if (!ui.deploymentSelection) return toast('请拖动我军部队，或在详情中选择“调整站位”');
  draftBattlePlacement(ui.deploymentSelection,Number(cell.dataset.deployX),Number(cell.dataset.deployY));
}
function draftBattlePlacement(id,x,y){
 ui.reserveEntrySelection=false;
 ui.deploymentBattleId=state.battle?.id;
 const draft=previewBattlePlacement(state.battle,id,x,y);ui.deploymentDraft=null;ui.deploymentSelection=id;
 if(draft.error)toast(draft.error,'error');else ui.deploymentDraft=draft;updateBattle();
}
function draftReservePlacement(id,toId=null){
 ui.reserveEntrySelection=false;
 ui.deploymentBattleId=state.battle?.id;
 const b=state.battle,error=reserveDeploymentUnit(structuredClone(b),id,toId);ui.deploymentDraft=null;ui.deploymentSelection=id;
 if(error)toast(error,'error');else ui.deploymentDraft={kind:'reserve',battleId:b.id,unitId:id,toId};updateBattle();
}

function draftReserveEntry(id,x,y){
 const draft=previewReserveEntry(state.battle,id,x,y);ui.deploymentSelection=id;ui.deploymentDraft=null;ui.reserveEntrySelection=true;
 if(draft.error)toast(draft.error,'error');else ui.deploymentDraft=draft;updateBattle();
}

// Active targeting takes precedence over the ordinary detail buttons on labels.
document.addEventListener('click',event=>{
 const el=event.target,board=el.closest('#battle-board'),marker=el.closest('.battle-unit,[data-action="unit-stats"][data-inspect]');
 if(!board&&!marker)return;
 if(ui.areaDraft){
  const b=state.battle,u=marker&&b.sides.flatMap(side=>side.units).find(u=>u.id===(marker.dataset.unit||marker.dataset.inspect));
  const point=u?{x:u.x,y:u.y}:board?nearestAreaCell(event.clientX,event.clientY,board.getBoundingClientRect()):null;
  ui.areaDraft.point=point?{...point,rotation:ui.areaDraft.rotation}:null;
  event.preventDefault();event.stopImmediatePropagation();updateBattle();return;
 }
 if(ui.deploymentSelection&&ui.reserveEntrySelection&&isBattleCouncil(state.battle)){
  const cell=el.closest('[data-deploy-x]'),u=marker&&activeUnits(state.battle,0).find(u=>u.id===(marker.dataset.unit||marker.dataset.inspect));
  if(!cell&&!u)return;
  event.preventDefault();event.stopImmediatePropagation();draftReserveEntry(ui.deploymentSelection,cell?Number(cell.dataset.deployX):u.x,cell?Number(cell.dataset.deployY):u.y);return;
 }
 if(ui.deploymentSelection&&isDeploying(state.battle)){
  const cell=el.closest('[data-deploy-x]'),u=marker&&activeUnits(state.battle,0).find(u=>u.id===(marker.dataset.unit||marker.dataset.inspect));
  if(!cell&&!u){const reserve=marker&&state.battle.sides[0].units.find(u=>u.id===marker.dataset.inspect&&u.status==='reserve');if(reserve){event.preventDefault();event.stopImmediatePropagation();draftReservePlacement(ui.deploymentSelection,reserve.id);}return;}
  event.preventDefault();event.stopImmediatePropagation();draftBattlePlacement(ui.deploymentSelection,cell?Number(cell.dataset.deployX):u.x,cell?Number(cell.dataset.deployY):u.y);
  return;
 }
 if(ui.deploymentSelection&&isBattleCouncil(state.battle)&&marker){const u=state.battle.sides[0].units.find(u=>u.id===marker.dataset.inspect&&u.status==='reserve');if(u){event.preventDefault();event.stopImmediatePropagation();draftReservePlacement(ui.deploymentSelection,u.id);}}
},true);
document.addEventListener('dragstart',event=>{
 if(!isBattleCouncil(state.battle))return;
 const el=event.target.closest(isReinforcementCouncil(state.battle)?'[data-council-unit]':'[data-council-unit],.battle-unit.side-0');if(!el)return;
 ui.reserveEntrySelection=false;ui.deploymentSelection=el.dataset.councilUnit||el.dataset.unit;
 ui.deploymentBattleId=state.battle.id;
 ui.deploymentDraft=null;
 if(isDeploying(state.battle))$('#battle-board')?.classList.add('deployment-targeting');
 event.dataTransfer.setData('text/plain',ui.deploymentSelection);event.dataTransfer.effectAllowed='move';
});
document.addEventListener('dragover',event=>{if(isBattleCouncil(state.battle)&&event.target.closest(isReinforcementCouncil(state.battle)?'[data-reserve-bench]':'[data-reserve-bench],[data-deploy-x],.battle-unit.side-0,.unit-nameplate.side-0'))event.preventDefault();});
document.addEventListener('drop',event=>{
 if(!isBattleCouncil(state.battle))return;
 const id=event.dataTransfer.getData('text/plain'),bench=event.target.closest('[data-reserve-bench]'),row=event.target.closest('[data-council-unit]'),cell=event.target.closest('[data-deploy-x]'),target=event.target.closest('.battle-unit.side-0,.unit-nameplate.side-0');
 if(!id||(!bench&&!cell&&!target))return;event.preventDefault();
 if(bench){draftReservePlacement(id,row?.dataset.councilUnit);return;}
 else {const u=target&&activeUnits(state.battle,0).find(u=>u.id===(target.dataset.unit||target.dataset.inspect));draftBattlePlacement(id,cell?Number(cell.dataset.deployX):u?.x,cell?Number(cell.dataset.deployY):u?.y);}
});
document.addEventListener('dragend',()=>{if(!ui.deploymentDraft)ui.deploymentSelection=null;updateBattle();});
const searchTimers=new WeakMap();
function deferSearch(input,selector,refresh=renderModal){
 clearTimeout(searchTimers.get(input));const modal=ui.modal;
 searchTimers.set(input,setTimeout(()=>{
  if(!input.isConnected||ui.modal!==modal)return;
  const focused=document.activeElement===input,start=input.selectionStart,end=input.selectionEnd;
  refresh();const next=document.querySelector(selector);
  if(focused&&next){next.focus({preventScroll:true});if(start!==null)next.setSelectionRange(start,end);}
 },100));
}
function renderQuickSearch(){
 const panel=document.querySelector('.map-quick-directory');if(!panel)return;
 withIntelligenceQueries(state,()=>patchElement(panel,mapQuickDirectory(intelligenceWorld(state),ui)));
 const list=panel.querySelector('.city-directory-list');if(list)list.scrollTop=0;ui.mapQuickResetScroll=false;
}
document.addEventListener('input',event=>{
 const input=event.target;if(event.isComposing)return;
 if(input.dataset.transferCargo){updateTransferCargo(input);return;}
 if(input.dataset.scenarioQuery){ui.scenarioSetup.filter.query=input.value;ui.scenarioSetup.filter.page=0;deferSearch(input,'[data-scenario-query]');return;}
 if(input.id==='map-quick-query'){ui.mapQuickQueries??={};ui.mapQuickQueries[ui.mapQuickKind||'city']=input.value;deferSearch(input,'#map-quick-query',renderQuickSearch);return;}
 if(input.id==='faction-directory-query'){ui.factionDirectories[ui.factionDirectoryKind].query=input.value;deferSearch(input,'#faction-directory-query');return;}
 if(input.id==='campaign-info-query'){ui.infoView.query=input.value;deferSearch(input,'#campaign-info-query');return;}
 if(input.dataset.personnelFilter==='query'){ui.personnel.query=input.value;deferSearch(input,'[data-personnel-filter="query"]');return;}
 if(input.id==='catalog-query'){ui.catalogQuery=input.value;ui.catalogPage=0;deferSearch(input,'#catalog-query');}
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
 if(event.target.closest('.diplomacy-panel')){
  captureDiplomacyForm();
  if(event.target.dataset.diplomacyCity)ui.diplomacyForm['diplomacy-officer-'+event.target.dataset.diplomacyCity]='';
  if(event.target.dataset.diplomacyCity||event.target.dataset.diplomacyOfficer){renderModal();return;}
 }
 if(event.target.id==='scout-city'){
  if(ui.scout?.city===event.target.value)return;
  ui.scout??={};Object.assign(ui.scout,{city:event.target.value,officer:null,target:null,route:null,waypoints:[],mapUI:null});renderModal();return;
 }
 if(event.target.id==='scout-officer'){
  if(ui.scout?.officer===event.target.value)return;
  ui.scout??={};Object.assign(ui.scout,{officer:event.target.value,target:null,route:null,waypoints:[]});
  renderModal();return;
 }
 if(event.target.id==='scout-target'){if(ui.scout.target===event.target.value)return;Object.assign(ui.scout,{target:event.target.value,route:null,waypoints:[]});renderModal();return;}
  const el = event.target, army = selectedArmy();
  if(el.hasAttribute('data-treasure-filter')){ui.treasurePick.filter=el.value;renderModal();return;}
 if(el.hasAttribute('data-treasure-recipient')){if(ui.treasurePick.recipientId!==(el.value||null))ui.treasurePick.equip=false;ui.treasurePick.recipientId=el.value||null;renderModal();return;}
 if(el.hasAttribute('data-treasure-equip')){ui.treasurePick.equip=el.checked;renderModal();return;}
 if(el.dataset.scenarioTreasure){changeScenarioSetup(ui.scenarioSetup,'treasureId',el.dataset.scenarioTreasure,el.value||null);renderModal();return;}
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
  if(el.dataset.commandArmyUnit){const p=ui.officerPick,id=el.dataset.commandArmyUnit;selectCommandOfficers(p,el.checked?[...p.selected,id]:p.selected.filter(x=>x!==id));renderModal();return;}
  if(el.dataset.battleAppointmentRole){
   const id=el.dataset.armyId;ui.battleAppointmentDraft??={};ui.battleAppointmentDraft[id]??=Object.fromEntries(['leader','advisor'].map(role=>[role,state.battle.sides[0].commanders.find(c=>c.armyId===id&&c.role===role)?.id??null]));
   ui.battleAppointmentDraft[id][el.dataset.battleAppointmentRole]=el.value||null;updateAppointmentSelection(el);return;
  }
  if(el.dataset.postbattleAppointmentRole){const id=el.dataset.armyId,a=state.armies.find(a=>a.id===id);ui.postbattleAppointmentDraft??={};ui.postbattleAppointmentDraft[id]??={leader:a.leader,advisor:a.advisor};ui.postbattleAppointmentDraft[id][el.dataset.postbattleAppointmentRole]=el.value||null;updateAppointmentSelection(el);return;}
  if(el.dataset.expeditionRole){if(ui.officerPick[el.dataset.expeditionRole]===(el.value||null))return;ui.officerPick[el.dataset.expeditionRole]=el.value||null;resetCommandTarget(ui.officerPick);renderModal();return;}
  if(el.id==='command-policy'){ui.officerPick.policy=el.value;ui.officerPick.route=null;ui.officerPick.waypoints=[];renderModal();return;}
  if(el.hasAttribute('data-transfer-cycles')){ui.officerPick.cycles=Number(el.value);renderModal();return;}
  if(el.dataset.transferCargo){updateTransferCargo(el);return;}
  if(el.id==='command-reinforce'){ui.officerPick.reinforce=el.checked;renderModal();return;}
  if(el.dataset.commandTroops){if(el.closest('.unit-muster'))changeCommandUnit(state,ui.officerPick,el.dataset.commandTroops,'troops',el.value);else (ui.officerPick.troops??={})[el.dataset.commandTroops]=Number(el.value);renderMusterChange(el);return;}
  if(el.dataset.commandSiege||el.dataset.commandShip){changeCommandUnit(state,ui.officerPick,el.dataset.commandSiege||el.dataset.commandShip,el.dataset.commandSiege?'siege':'ship',el.value);renderMusterChange(el);return;}
  if(el.dataset.commandType){if(el.closest('.unit-muster'))changeCommandUnit(state,ui.officerPick,el.dataset.commandType,'type',el.value);else ui.officerPick.types[el.dataset.commandType]=el.value;renderMusterChange(el);return;}
  if(el.dataset.personnelFilter){if(ui.personnel[el.dataset.personnelFilter]===el.value)return;ui.personnel[el.dataset.personnelFilter]=el.value;renderModal();return;}
  if(el.dataset.personnelChoice){const p=ui.officerPick,id=el.dataset.personnelChoice;p.focused=id;if(p.choosingMain){p.unitOfficer=id;(p.troops??={})[id]??=Math.max(1000,campaignOfficers(state).find(r=>r.unit.id===id)?.unit.troops||0);p.choosingMain=false;renderModal();return;}selectCommandOfficers(p,['draft','domestic','expedition','defense'].includes(p.task)?(el.checked?[...p.selected,id]:p.selected.filter(x=>x!==id)):[id]);renderModal();return;}
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
 if(el.dataset.customOption){if(el.dataset.customOption==='terrain'){delete ui.customBattle.mapId;delete ui.customBattle.mapData;}if(el.dataset.customOption==='mapId'){if(el.value){const record=mapCatalog(mapEditor.library,ui.customBattle.mapData).find(m=>m.id===el.value);if(record){ui.customBattle=applyMapToDraft(ui.customBattle,record);refreshCustomDraft();}return;}delete ui.customBattle.mapId;delete ui.customBattle.mapData;}ui.customBattle[el.dataset.customOption]=['seed','gateHp','limit','shieldPercent','holdUntil','ownTroopBudget'].includes(el.dataset.customOption)?(['limit','holdUntil'].includes(el.dataset.customOption)?battleSteps(Number(el.value)):Number(el.value)):el.value;if(el.dataset.customOption==='battleKind'&&el.value==='field')delete ui.customBattle.holdUntil;refreshCustomDraft();return;}
  if(state.campaign&&el.dataset.domesticDirection){if(el.value)submitStrategicOrder({kind:'assign',cityId:el.dataset.town,direction:el.dataset.domesticDirection,officerIds:[el.value]});return;}
  if(state.campaign&&el.dataset.cityBudgetKey){return;}
  if(state.campaign&&el.id==='campaign-governor'){const error=appointGovernor(state,el.dataset.town,el.value);if(error)toast(error,'error');save();render();return;}
  if(state.campaign&&el.id==='campaign-replay-frame'){ui.replayIndex=Number(el.value);ui.replayPlaying=false;renderModal();return;}
  if(state.campaign&&el.id==='campaign-snapshot-day'){ui.campaignSnapshotDay=Number(el.value);renderModal();return;}
  if(state.campaign&&el.id==='relationship-type'&&activeBattles(state).length){toast('交战期间人物关系锁定');renderModal();return;}
  if(state.campaign&&el.id==='battle-terrain'){toast('战略战场地形由交战位置决定');updateBattle();return;}

  if(el.id==='battle-terrain'){
    const error=configureBattleTerrain(state.battle,el.value);
    if(error){toast(error,'error');updateBattle();return;}
    ui.deploymentSelection=null;save();render();return;
  }
  if(el.id==='relationship-type'){
    const error=setRelationshipType(state,ui.catalogInspect,$('#relationship-partner').value,el.value);
    if(error){renderModal();toast(error,'error');return;}
    save();renderModal();toast('当前关系已变更');return;
  }
  if(el.id==='relationship-partner'){ui.relationshipPartner=el.value;renderModal();return;}
  if(el.id==='catalog-kind'){ui.catalogKind=el.value;ui.catalogPage=0;renderModal();return;}
  if (el.id === 'army-select') { ui.army = el.value; ui.city = selectedArmy().location;ui.mapFocusKey=null; render(); return; }
  if (el.id === 'import-file') {
    const file = el.files?.[0]; if (!file) return;
    if (file.size > MAX_SAVE_BYTES) return toast('文件过大，请选择君临导出的存档');
    try { const imported = validateSave(JSON.parse(await file.text())); state = imported; restoreUI(); if(await save())toast('存档导入成功'); }
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
  if(el.dataset.unitRetreat){
   const ids=el.dataset.unitRetreat?[el.dataset.unitRetreat]:ui.retreatBattleId===state.battle?.id?ui.retreatSelected:[];
   const error=configureCouncilRetreat(state.battle,ids,el.value===''?null:Number(el.value));
   if(error)toast(error,'error');else{syncCouncilDraft();save();}
   updateBattle();return;
  }
  if(el.id==='battle-intent'){const error=configureBattleIntent(state.battle,el.value);if(error)toast(error,'error');else save();updateBattle();return;}
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
  if (el.dataset.type) {if(state.campaign){const error=changeCampaignTroop(state,army.id,el.dataset.type,el.value);if(error){toast(error,'error');renderModal();return;}}const u=army.units.find(u=>u.id===el.dataset.type);u.type=el.value;u.tactics=defaultTacticIds(u);toast('兵种已更换');}
  if (el.dataset.formation) army.units.find(u => u.id === el.dataset.formation).formation = el.value;
  save();
  if(el.dataset.role)renderModal();
  if (el.dataset.type) { const id=el.dataset.type;renderModal();document.querySelector(`[data-type="${id}"]`)?.focus({preventScroll:true}); }
});
document.addEventListener('keydown', event => {
  const force=event.target.closest?.('.selection-map [data-action]');if(force&&(event.key==='Enter'||event.key===' ')){event.preventDefault();act(force.dataset.action,force);return;}
  if (event.key === 'Escape') { if(ui.textDetails){closeModal();return;} if(ui.deploymentSelection&&!ui.modal){ui.deploymentDraft=null;ui.deploymentSelection=null;updateBattle();return;} if(ui.areaDraft){ui.areaDraft=null;updateBattle();return;} if(ui.mapObject&&!ui.modal){const id=ui.mapObject.id;ui.mapObject=null;render();document.querySelector(`.strategy-world [data-city="${id}"]`)?.focus({preventScroll:true});return;} if(document.querySelector('.task-trait-popover:popover-open')) return; if (ui.modal) closeModal(); else { ui.order = false; ui.deploymentSelection=null; ui.battlePanel=null; if(state.battle&&ui.mode!=='lobby') updateBattle(); else render(); } }
  if (event.key === ' ' && ui.mode!=='lobby' && state.battle && !ui.modal && !['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); act('pause'); }
  if ((event.key === 'Enter' || event.key === ' ') && (event.target.dataset.roadFrom||event.target.dataset.junction||event.target.dataset.city||event.target.dataset.commandCity||event.target.dataset.campaignArmy||event.target.dataset.transportOfficer||event.target.dataset.scoutTask||event.target.matches?.('[data-map-battle-anchor],[data-action="bandit-open"]'))) { event.preventDefault(); event.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  if (event.key === 'Tab' && (ui.modal||ui.textDetails)&&(!isObjectDetail(ui)||detailPanels.hasSource)) {
    const nodes = visibleFocusTargets(ui.mapCommandView?$('#app'):$('#overlay-root'));
    if (!nodes.length) return;
    if(!nodes.includes(document.activeElement)){event.preventDefault();(event.shiftKey?nodes.at(-1):nodes[0]).focus();return;}
    if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
    if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
  }
});
setInterval(() => {
  if(state.campaign){runCampaignClock();return;}
  if (ui.mode==='lobby' || !state.battle || ui.areaDraft || ui.paused || ui.modal || pageGuides.isOpen || document.hidden) return;
  // Finish the recorded action window before advancing another simulation step.
  // Playback remains single-step and never catches up in a burst afterwards.
  if (battleFx?.isPresentationPlaying()) return;
  if (state.battle.result) {
    // Let the killing blow and casualty numbers finish before replacing the board.
    if (!battleFx?.isBusy()) { settleBattle(state); ui.paused = true;  ui.modal = 'report'; save(); render(); }
    return;
  }
  const now = performance.now(); if (now - ui.lastTime < (battleFx?.stepDelay(COMBAT.stepMs)??COMBAT.stepMs/ui.speed)) return; ui.lastTime = now;
  stepBattle(state.battle);
  if(state.battle.reinforcementCouncil){ui.paused=true;renderModal();}
  updateBattle(); save();
}, 50);

function submitStrategicOrder(command,choice=null){
 const people=campaignOfficers(state).filter(r=>command.officerIds?.includes(r.unit.id)).map(r=>r.unit.name),subject=command.armyId?state.armies.find(a=>a.id===command.armyId)?.name:command.kind==='expedition'?`${mapNode(state,command.cityId)?.name} · ${people.length} 队`:people.join('、'),orderLabel=strategicOrderLabel(state,command);
 const result=requestStrategicOrder(state,command,choice);
 if(result.error){toast(result.error,'error');return;}
 if(result.confirmation){ui.interruption=result.confirmation;openModal('domestic-interruption');return;}
 ui.modal=ui.commandReturn||(ui.modal==='city-domestic'?'city-domestic':null);ui.commandReturn=null;ui.officerPick=null;ui.interruption=null;ui.personnelReturn=null;toast(`${subject}：${result.queued?'办完后'+orderLabel:'已下令'+orderLabel}`,'order');save();render();
 const speaker=command.leader||command.officerIds?.[0]||state.armies.find(a=>a.id===command.armyId)?.leader;
 acknowledgeOfficer(speaker,!result.queued&&['expedition','march'].includes(command.kind)?'march':'acknowledge');
}
function restoreCampaignConfirmation(){
 const q=ui.pendingAction;if(!q)return null;
 ui.pendingAction=null;detailPanels.clear();
 // Rebuild the original source before reopening its detail. A confirmation is
 // never a source list and must not remain behind the restored object panel.
 if(q.returnSource){restoreDetailSource(q.returnSource);renderModal();}
 restoreDetailSource(q.returnContext);renderModal();return q;
}
function handleCampaignAction(action,el){
 if(action==='city-budget-reset'){delete ui.cityBudgetDrafts?.[el.dataset.city];renderModal();return true;}
 if(action==='campaign-confirm-action'){const q=restoreCampaignConfirmation();if(!q)return true;return handleCampaignAction(q.action,{dataset:{...q.data,confirmed:'true'}});}
 if(['campaign-defense-relinquish','personnel-release','personnel-ransom'].includes(action)&&el.dataset.confirmed!=='true'){
  if(state.campaign.allAI){toast('全 AI 观战由 AI 安排军政事务');return true;}
  const r=action==='campaign-defense-relinquish'?battleRecord(state,el.dataset.battle):null,p=state.campaign.domestic.people.find(p=>p.id===el.dataset.id&&p.status==='CAPTIVE');
  if(!r&&!p)return true;
  const name=r?mapNode(state,r.cityId)?.name:p.unit.name;
  ui.pendingAction={action,data:{id:el.dataset.id,battle:el.dataset.battle},returnContext:detailContext(),returnSource:isObjectDetail(ui)?detailPanels.returnContext():null,title:(r?'放弃守城':action==='personnel-ransom'?'赎回':'释放')+' · '+name,consequence:r?`${name}将交给敌军。`:action==='personnel-ransom'?`支付 ${ransomCost(p)} 金，${name}获释后沿路返城。`:`${name}将获释返城，不能撤销。`};
  openModal('campaign-confirmation');return true;
 }
 if(action==='city-budget-save'){
  const id=el.dataset.city,fields=[...document.querySelectorAll('[data-city-budget-key]')].filter(input=>input.dataset.cityBudgetId===id),preview=structuredClone(state);
  for(const input of fields){const error=input.value.trim()===''||setCityBudget(preview,id,input.dataset.cityBudgetKey,Number(input.value));if(error){input.setAttribute('aria-invalid','true');toast('保留金粮须为允许范围内的非负整数','error');input.focus();return true;}}
  if(fields.length!==2)return true;
  state=preview;ui.cityBudgetDrafts??={};delete ui.cityBudgetDrafts[id];updateCityBudgetAlerts(state);save();render();toast('预算已保存');return true;
 }
 if(action==='bandit-open'){ui.banditCamp=el.dataset.camp;openModal('bandit-camp');return true;}
 if(action==='observer-next'){const factions=nationalScenario(state.campaign.scenarioId).factions;const error=setObserverFaction(state,factions[(factions.indexOf(playerFaction(state))+1)%factions.length]);if(error)toast(error,'error');else{ui.city=playerHome(state);ui.army=null;ui.mapObject=null;ui.mapFocusKey=null;}save();render();return true;}
 if(state.campaign.allAI&&/^(campaign-pick|campaign-order|campaign-command|campaign-clear-governor|campaign-project|campaign-relief|campaign-create-army|campaign-transfer|campaign-defense-|city-idle-assign|domestic-dismiss|domestic-assign|domestic-auto|domestic-proposal-|faction-priority-|faction-appoint|scout-|diplomacy-|treasure-grant|treasure-equip|treasure-store|treasure-remove|march-mode-|interruption-)/.test(action)){toast('全 AI 观战由 AI 安排军政事务');return true;}
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
   if(p.kind==='split'){if(!units.length||units.length===a.units.length||!units.some(u=>u.troops>0)||!a.units.some(u=>!p.selected.includes(u.id)&&u.troops>0)){toast('两支军团都须保留有兵力的部队');return true;}for(const role of ['leader','advisor'])if(!units.some(u=>u.id===p.roles[role]))p.roles[role]=units[0].id;}
   else {const result=previewMilitaryFlow(state,p);if(result.error){toast(result.error,'error');return true;}}
  }
  if(next>=0&&next<steps.length){p.step=steps[next];if(p.step==='commanders')setCombatPage('combat-本军','appointments');}renderModal();return true;
 }
 if(action==='military-confirm'){const kind=ui.militaryFlow.kind,result=previewMilitaryFlow(state,ui.militaryFlow);if(result.error){toast(result.error,'error');return true;}state=result.state;ui.army=result.army.id;ui.militaryFlow=null;ui.modal=null;save();render();toast(`${result.army.name}：已${({adjust:'调整编制',split:'拆分军团',merge:'合并军团',recruit:'补充兵员'})[kind]} · ${result.army.units.length} 队`);return true;}
 if(['campaign-manual','campaign-auto','campaign-prepare'].includes(action)||action==='campaign-focus'&&battleRecord(state,el.dataset.battle)?.awaiting){ui.encounterFlow={id:el.dataset.battle,step:0,control:action==='campaign-auto'?'auto':'manual'};ui.city=battleRecord(state,el.dataset.battle).cityId;ui.paused=true;openModal('encounter-flow');return true;}
 if(action==='encounter-select'){ui.encounterFlow={id:el.dataset.id,step:0,control:'manual'};ui.city=battleRecord(state,el.dataset.id).cityId;renderModal();return true;}
 if(action==='encounter-next'||action==='encounter-back'){ui.encounterFlow.step+=action==='encounter-next'?1:-1;renderModal();return true;}
 if(action==='encounter-confirm'){const p=ui.encounterFlow,error=chooseEncounter(state,p.id,p.control==='manual');if(error){toast(error,'error');return true;}ui.paused=true;ui.modal=null;ui.encounterFlow=null;ui.battlePanel=null;save();render();return true;}
 if(action==='personnel-ransom'||action==='personnel-release'){
  const ransom=action==='personnel-ransom',name=state.campaign.domestic.people.find(p=>p.id===el.dataset.id)?.unit.name,error=releaseCaptive(state,el.dataset.id,{ransom});
  if(error)toast(error,'error');else{
   const detail=detailContext(),source=detailPanels.returnContext();detailPanels.clear();
   if(source){restoreDetailSource(source);renderModal();if(ransom)restoreDetailSource(detail);}
   else if(!ransom&&ui.modal==='campaign-info')ui.modal=ui.infoReturn||null;
   save();render();toast(`${name}${ransom?'已赎回':'已释放'}`);
  }return true;
 }
  let error=null;
  if(action==='map-quick-open'){ui.mapQuickKind=el.dataset.kind;ui.mapDirectoryOpen=true;ui.mapPanelOpen=false;ui.mapObject=null;render();return true;}
  if(action==='map-city-filter'){ui.mapCityFilter=el.dataset.filter==='idle'?'idle':'all';ui.mapQuickResetScroll=true;render();return true;}
  if(action==='city-idle-assign'){const c=state.cities.find(c=>c.id===el.dataset.town&&c.owner===playerFaction(state));if(!c){render();return true;}ui.city=c.id;ui.strategyTab='city';ui.mapFocusKey=null;ui.mapPanelOpen=false;ui.mapObject=null;ui.paused=true;ui.modal='city-domestic';render();return true;}
  if(action==='map-quick-manage'){ui.mapDirectoryOpen=false;ui.mapPanelOpen=true;ui.strategyTab=el.dataset.kind;if(el.dataset.kind==='city')ui.city=el.dataset.id;else ui.army=el.dataset.id;ui.mapFocusKey=null;render();return true;}
  if(action==='map-quick-select'){
   const kind=el.dataset.kind,row=factionDirectoryRows(state,kind).find(r=>String(r.id)===el.dataset.id);if(!row){render();return true;}
   if(kind==='city')ui.city=row.id;else if(kind==='army')ui.army=row.id;else ui.directoryBattle=row.id;
   if(kind==='city'){openCityCommands(row.id,el,null,{keepDirectory:true});return true;}
   ui.strategyTab=kind;ui.mapDirectoryOpen=true;ui.mapPanelOpen=false;ui.mapObject=null;ui.mapFocusKey=null;if(kind==='army')switchMapInspection(kind,row.id);render();return true;
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
  if(action==='scout-open'){if(ui.modal!=='scout-report')ui.scout={city:el.dataset.town||null};openModal('scouting');return true;}
  if(action==='scout-dispatch'){const error=dispatchScout(state,el.dataset.city,el.dataset.officer,el.dataset.target,{route:scoutSelection(state,ui.scout).route});if(error)toast(error,'error');else{ui.scout={city:el.dataset.city,mapUI:ui.scout.mapUI};save();render();toast(`${mapNode(state,el.dataset.city)?.name}：${campaignOfficers(state).find(r=>r.unit.id===el.dataset.officer)?.unit.name}负责侦察${mapNode(state,el.dataset.target)?.name}`);acknowledgeOfficer(el.dataset.officer);}return true;}
  if(action==='scout-recall'){const error=recallScout(state,el.dataset.officer);if(error)toast(error,'error');else{save();render();}return true;}
  if(action==='campaign-battles'){openModal(action);return true;}
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
  if(action==='campaign-activity-page'){if(ui.modal==='activity-record')ui.activityRecord.beforeDay=Number(el.dataset.day);else{ui.infoView.activityBefore=Number(el.dataset.day);ui.infoView.page='当前动态';}renderModal();return true;}
  if(action==='campaign-info-peer'){ui.infoView={...ui.infoView,type:el.dataset.kind,id:el.dataset.id};renderModal();return true;}
  if(action==='campaign-info-back'){ui.infoView=ui.infoHistory.pop()||{type:'city'};renderModal();return true;}
  if(action==='campaign-info-tab'||action==='campaign-info-home'){ui.infoView={scope:ui.infoView.scope,type:el.dataset.kind||ui.infoView.type,query:''};ui.infoHistory=[];renderModal();return true;}
  if(action==='campaign-order-choice'){submitStrategicOrder(ui.interruption.command,el.dataset.choice);return true;}
  if(action==='campaign-cancel-order'){if(!state.campaign.domestic.orders.some(q=>q.id===Number(el.dataset.order)&&q.faction===playerFaction(state)))return true;removeDomesticOrder(state,Number(el.dataset.order));save();render();return true;}
  if(action==='campaign-city-personnel'||action==='campaign-personnel'&&el.dataset.town){ui.personnelCity=el.dataset.town;ui.cityPersonnelFilters??={};ui.personnel=ui.cityPersonnelFilters[ui.personnelCity]??={};ui.personnelReturn=null;openModal('city-personnel');return true;}
  if(action==='campaign-personnel'){ui.personnel=ui.factionPersonnelFilter??={};ui.personnelReturn=null;openModal('campaign-personnel');return true;}
  if(action==='campaign-candidate-focus'){ui.officerPick.focused=el.dataset.officer;renderModal();return true;}
  if(action==='campaign-unit-detail'){ui.commandInspect=ui.modal==='campaign-picker';ui.personnelReturn=ui.commandInspect?'campaign-picker':null;ui.inspectUnit=el.dataset.officer||el.dataset.id;openModal('unit-stats');return true;}
  if(action==='campaign-person-detail'){ui.personnelReturn=['campaign-picker','campaign-personnel','city-personnel','city-domestic','domestic-direction'].includes(ui.modal)?ui.modal:null;ui.inspectUnit=el.dataset.officer;openModal('unit-officer');return true;}
  if(action==='campaign-person-back'){if(detailPanels.hasSource)closeModal();else openModal(ui.personnelReturn||'campaign-personnel');return true;}
  if(action==='campaign-defense-prepare'){const r=battleRecord(state,el.dataset.battle);if(!canPrepareSiegeDefense(state,r)){toast('没有可临时编制的武将，请使用现有守军进入战前准备');return true;}ui.encounterFlow??={id:r.id,step:1,control:'manual'};ui.commandReturn='encounter-flow';ui.officerPick=newCommand(state,'defense',r.cityId);ui.officerPick.battleId=r.id;ui.personnel={city:r.cityId};openModal('campaign-picker');return true;}
  if(action==='campaign-defense-auto'){
   const result=prepareAutoSiegeDefense(state,el.dataset.battle);if(result.error){toast(result.error,'error');return true;}
   state=result.state;ui.encounterFlow={id:el.dataset.battle,step:1,control:ui.encounterFlow?.control||'manual'};ui.modal='encounter-flow';ui.paused=true;save();render();return true;
  }
  if(action==='campaign-defense-relinquish'){
   const error=relinquishSiegeDefense(state,el.dataset.battle);if(error){toast(error,'error');return true;}
   ui.encounterFlow=null;ui.modal=activeBattles(state).some(r=>r.awaiting)?'campaign-encounters':null;ui.paused=true;save();render();return true;
  }
  if(action==='route-reset'){
   if(ui.modal==='scouting'){ui.scout.route=null;ui.scout.waypoints=[];}
   else if(ui.officerPick?.destination)selectCommandPoint(state,ui.officerPick,ui.officerPick.destination,{resetRoute:true});
   renderModal();return true;
  }
  if(action==='march-mode-open'){if(el.dataset.army)ui.army=el.dataset.army;const a=selectedArmy();if(a){ui.marchArmy=a.id;ui.marchChoice=a.marchMode||'normal';openModal('march-mode');}return true;}
  if(action==='march-mode-select'){ui.marchChoice=el.dataset.mode;renderModal();return true;}
  if(action==='march-mode-confirm'){const error=setArmyMarchMode(state,ui.marchArmy,ui.marchChoice);if(error)toast(error,'error');else {ui.modal=null;save();}render();return true;}
  if(action==='domestic-direction-open'){const c=state.cities.find(c=>c.id===el.dataset.town);if(c?.owner!==playerFaction(state)||!DIRECTIONS[el.dataset.direction])return true;ui.city=c.id;ui.domesticDirection=el.dataset.direction;openModal('domestic-direction');return true;}
  if(action==='campaign-pick'||action==='campaign-order'){
   if(el.dataset.task==='domestic'&&el.dataset.direction&&ui.modal!=='domestic-direction'){ui.city=el.dataset.town;ui.domesticDirection=el.dataset.direction;openModal('domestic-direction');return true;}
   ui.commandReturn=['city-domestic','domestic-direction'].includes(ui.modal)?ui.modal:null;ui.mapObject=null;
   if(action==='campaign-order'&&el.dataset.army)ui.army=el.dataset.army;
   const a=action==='campaign-order'?selectedArmy():null;
   ui.officerPick=newCommand(state,a?'march':el.dataset.task,a?.location||el.dataset.town,{direction:el.dataset.direction,armyId:a?.id});
   if(el.dataset.banditTarget){ui.officerPick.destination=el.dataset.banditTarget;ui.officerPick.contextDestination=el.dataset.banditTarget;ui.officerPick.banditTarget=ui.banditCamp;}
   ui.personnel={city:ui.officerPick.city};ui.personnelReturn=null;openModal('campaign-picker');return true;
  }
  if(action==='campaign-selection-remove'){
   const p=ui.officerPick;if(p?.step!=='unit-select'||!p.selected.includes(el.dataset.id))return true;
   const index=p.selected.indexOf(el.dataset.id);selectCommandOfficers(p,p.selected.filter(id=>id!==el.dataset.id));renderModal();
   const chips=[...document.querySelectorAll('[data-action="campaign-selection-remove"]')];
   (chips[Math.min(index,chips.length-1)]||document.querySelector('[data-command-army-unit]:not(:disabled)'))?.focus({preventScroll:true});return true;
  }
  if(action==='campaign-unit-choose'||action==='campaign-unit-picker-back'){ui.officerPick.choosingMain=action==='campaign-unit-choose';renderModal();return true;}
  if(action==='campaign-unit-disband'){const error=removeCommandUnit(state,ui.officerPick,el.dataset.id);if(error)toast(error,'error');renderModal();return true;}
  if(action==='campaign-unit-edit'||action==='campaign-unit-list'){const p=ui.officerPick;if(p.task==='expedition'&&p.step==='unit-select'){p.armySelection=[...p.selected];p.selected=[...(p.formationPool||[])];}Object.assign(p,{step:action==='campaign-unit-edit'?'formation':'unit-review',unitOfficer:el.dataset.id||null,choosingMain:false});renderModal();return true;}
  if(action==='campaign-unit-new'){const p=ui.officerPick;if(['unit-select','commanders','target','review'].includes(p.step)){p.armySelection=[...p.selected];if(p.formationPool)p.selected=[...p.formationPool];}Object.assign(p,{step:'formation',unitOfficer:null,choosingMain:false});renderModal();return true;}
  if(action==='campaign-command-cancel'){ui.officerPick=null;ui.personnelReturn=null;ui.interruption=null;closeModal();return true;}
  if(action==='campaign-command-return'){ui.interruption=null;if(ui.officerPick)openModal('campaign-picker');else closeModal();return true;}
  if(action==='campaign-command-army'){const error=selectCommandArmy(state,ui.officerPick,el.dataset.army);if(error)toast(error,'error');renderModal();return true;}
  if(action==='campaign-command-direction'){ui.city=ui.officerPick.city;ui.domesticDirection=el.dataset.direction;ui.officerPick=null;ui.commandReturn=null;openModal('domestic-direction');return true;}
  if(action==='campaign-command-next'||action==='campaign-command-back'||action==='campaign-command-step'){
   const p=ui.officerPick,steps=commandSteps(p),index=steps.indexOf(p.step);
   if(action==='campaign-command-next'&&!commandCanAdvance(state,p))return true;
   if(action==='campaign-command-next'&&p.step==='formation'){p.selected=[...new Set([...p.selected,p.unitOfficer])];p.formationPool=[...p.selected];}
   const next=action==='campaign-command-step'?steps.indexOf(el.dataset.step):index+(action==='campaign-command-next'?1:-1);
   if(next>=0&&next<steps.length&&(action!=='campaign-command-step'||next<index)){if(p.step==='unit-select')p.armySelection=[...p.selected];if(steps[next]==='unit-select'&&index<next){p.formationPool=[...p.selected];if(p.armySelection)p.selected=p.armySelection.filter(id=>p.formationPool.includes(id)||state.cities.find(c=>c.id===p.city)?.units.some(u=>u.id===id));}if(['formation','unit-review'].includes(steps[next])&&p.formationPool)p.selected=[...p.formationPool];if(steps[next]==='commanders'){if(!p.selected.includes(p.leader))p.leader=rankOfficerCandidates(state,campaignOfficers(state).filter(r=>p.selected.includes(r.unit.id)).map(r=>r.unit),{task:'role',role:'leader',city:p.city})[0]?.unit.id;if(!p.selected.includes(p.advisor))p.advisor=rankOfficerCandidates(state,campaignOfficers(state).filter(r=>p.selected.includes(r.unit.id)).map(r=>r.unit),{task:'role',role:'advisor',city:p.city})[0]?.unit.id;}p.step=steps[next];if(p.step==='commanders')setCombatPage('combat-本军','appointments');renderModal();}return true;
  }
  if(action==='campaign-pick-confirm'){
   const p=ui.officerPick,rows=campaignOfficers(state),chosen=p?.selected||[];
   if(!p||(p.step!=='review'&&!(['domestic','governor'].includes(p.task)&&p.step==='officers')))return true;
   if(p.task==='expedition'){submitStrategicOrder({kind:'expedition',cityId:p.city,officerIds:p.selected,leader:p.leader,advisor:p.advisor,target:p.destination,policy:p.policy,...(p.route?{route:p.route}:{}),formation:{types:p.types,equipment:p.equipment,reinforce:p.reinforce,troops:p.troops,disbandIds:p.disbandIds}});return true;}
   if(p.task==='march'){submitStrategicOrder({kind:'march',armyId:p.armyId,target:p.destination,policy:p.policy,...(p.route?{route:p.route}:{})});return true;}
   if(!chosen.length&&!p.disbandIds?.length)return true;
   error=chosen.map(id=>{const row=rows.find(r=>r.unit.id===id);return row?pickerReason(state,row,p.task==='draft'&&row.cityUnit?{...p,task:'defense'}:p):'武将已离开';}).find(Boolean);
   if(!error){
    if(p.task==='domestic'){submitStrategicOrder({kind:'assign',cityId:p.city,direction:p.direction,officerIds:chosen});return true;}
    else if(p.task==='governor')error=appointGovernor(state,p.city,chosen[0]);
    else if(p.task==='transfer'){submitStrategicOrder({kind:'transfer',cityId:p.city,officerIds:chosen,target:p.destination,cargo:p.cargo,relay:p.relay,cycles:p.cycles});return true;}
    else if(['draft','defense'].includes(p.task)){const result=prepareCommandFormation(state,p);error=result.error;if(!error){state=result.state;ui.city=p.city;ui.strategyTab='city';}}
   }
   if(error)toast(error,'error');else {ui.modal=p.task==='defense'&&ui.encounterFlow?'encounter-flow':null;ui.commandReturn=null;ui.officerPick=null;ui.personnelReturn=null;toast(p.task==='governor'?`${mapNode(state,p.city)?.name}：${rows.find(r=>r.unit.id===chosen[0])?.unit.name}任太守`:`${mapNode(state,p.city)?.name}：已更新编制 · ${mapNode(state,p.city)?.units.length} 队`);}save();render();return true;
  }
  if(action==='campaign-clear-governor'){error=appointGovernor(state,el.dataset.town,null);if(error)toast(error,'error');save();render();return true;}
  if(action==='map-panel-toggle'){ui.mapObject=null;ui.mapPanelOpen=!ui.mapPanelOpen;ui.mapDirectoryOpen=false;render();return true;}
  if(action==='map-directory-toggle'){ui.mapObject=null;ui.mapDirectoryOpen=!ui.mapDirectoryOpen;render();return true;}
  if(action==='campaign-tab'){ui.strategyTab=el.dataset.tab;render();return true;}
  if(action==='faction-domestic'||action==='faction-diplomacy'||action==='diplomacy-review'){if(action==='diplomacy-review'){ui.diplomacyReportReturn=ui.modal==='domestic-alerts';ui.paused=true;}ui.affairsTab=action==='faction-domestic'?'domestic':'diplomacy';openModal('campaign-affairs');if(el.dataset.proposal)document.querySelector(`[data-diplomatic-proposal="${Number(el.dataset.proposal)}"]`)?.scrollIntoView({block:'center'});return true;}
  if(action==='diplomacy-goal'){const error=setDiplomaticGoal(state,document.querySelector('#diplomacy-goal').value,document.querySelector('#diplomacy-target').value||null);if(error)toast(error,'error');save();renderModal();return true;}
  if(action==='diplomacy-budget'){const values=Object.fromEntries(['feeBudget','goldReserve','grainReserve','manpowerReserve'].map(k=>[k,Number(document.querySelector('#diplomacy-'+k).value)])),error=setDiplomaticBudget(state,values);if(error)toast(error,'error');save();renderModal();return true;}
  if(action==='diplomacy-assign'||action==='diplomacy-assign-now'||action==='diplomacy-assign-after'){
   const direction=el.dataset.direction,id=el.dataset.officer||document.querySelector('#diplomacy-officer-'+direction)?.value;
   if(action==='diplomacy-assign'){captureDiplomacyForm();if(diplomaticSelection(state,ui.diplomacyForm,direction).officer?.unit.id!==id){toast('请先选择派出城市和本城执行人');return true;}}
   const result=assignDiplomat(state,id,direction,{choice:action==='diplomacy-assign-now'?'now':action==='diplomacy-assign-after'?'after':null});
   if(result.confirmation){ui.diplomaticInterruption=result.confirmation;openModal('diplomacy-interruption');return true;}
   if(result.error)toast(result.error,'error');else if(ui.diplomacyForm)delete ui.diplomacyForm['diplomacy-officer-'+direction];save();ui.modal='campaign-affairs';ui.affairsTab='diplomacy';render();if(!result.error)acknowledgeOfficer(id);return true;
  }
  if(action==='diplomacy-dismiss'){const error=dismissDiplomat(state,el.dataset.officer);if(error)toast(error,'error');save();render();return true;}
  if(action==='diplomacy-cancel-order'){const error=cancelDiplomaticOrder(state,Number(el.dataset.order));if(error)toast(error,'error');save();renderModal();return true;}
  if(['diplomacy-approve','diplomacy-renegotiate','diplomacy-reject'].includes(action)){const id=Number(el.dataset.proposal),error=action==='diplomacy-approve'?approveDiplomaticProposal(state,id,Number(el.dataset.version)):decideDiplomaticProposal(state,id,action==='diplomacy-renegotiate'?'renegotiate':'reject');if(error)toast(error,'error');else toast(action==='diplomacy-approve'?'已批准，后台将复核并履行':'已交执行武将处理');save();render();return true;}
  if(action==='domestic-proposals'){ui.domesticProposalDeferred=false;ui.paused=true;openModal('domestic-proposals');return true;}
  if(action==='domestic-auto-approve'){const enabled=!state.campaign.domestic.autoApprove,error=setDomesticAutoApprove(state,enabled,{approvePending:false});if(error)toast(error,'error');else toast(enabled?'后续提案将自动同意':'后续提案将逐案审批');save();render();return true;}
  if(action==='domestic-proposal-approve-page'){const proposals=pendingDomesticProposals(state).filter(a=>!el.dataset.city||a.cityId===el.dataset.city);let approved=0,firstError='';for(const a of proposals){const error=decideDomesticProposal(state,a.proposal.id,true);if(error)firstError||=error;else approved++;}save();render();toast(`已同意 ${approved} 项${firstError?'；'+firstError:''}`,firstError?'error':'order');return true;}
  if(action==='domestic-proposal-approve'||action==='domestic-proposal-reject'){const officer=pendingDomesticProposals(state).find(a=>a.proposal.id===Number(el.dataset.proposal))?.officerId,error=decideDomesticProposal(state,Number(el.dataset.proposal),action==='domestic-proposal-approve');if(error)toast(error,'error');save();render();if(!error&&action==='domestic-proposal-approve')acknowledgeOfficer(officer);return true;}

  if(action==='faction-priority-up'){const p=[...domesticPriority(state)],i=p.indexOf(el.dataset.direction);if(i>0){[p[i-1],p[i]]=[p[i],p[i-1]];const error=setDomesticPriority(state,p);if(error)toast(error,'error');else save();}renderModal();return true;}
  if(action==='faction-appoint'){const result=fillFactionAppointments(state);toast(result.error||('已补齐 '+result.count+' 项委任'));save();renderModal();return true;}
  if(action==='campaign-archive'){ui.snapshotReturn=ui.modal;ui.campaignHistory=el.dataset.battle;openModal('campaign-archive');return true;}
  if(action==='campaign-replay'){ui.snapshotReturn=ui.modal;ui.campaignHistory=el.dataset.battle;ui.replayIndex=0;ui.replayPlaying=false;ui.paused=true;openModal('campaign-replay');return true;}
  if(action.startsWith('replay-')){const r=battleRecord(intelligenceWorld(state),ui.campaignHistory),last=replayFrames(r).length-1;if(action==='replay-toggle')ui.replayPlaying=!ui.replayPlaying;else{ui.replayPlaying=false;ui.replayIndex=action==='replay-reset'?0:Math.max(0,Math.min(last,(ui.replayIndex||0)+(action==='replay-next'?1:-1)));}ui.replayTime=performance.now();renderModal();return true;}
  if(action==='campaign-history'){ui.snapshotReturn=ui.modal;ui.campaignHistory=el.dataset.battle;ui.campaignSnapshotDay=null;ui.paused=true;openModal('campaign-history');return true;}
  if(action==='campaign-map'){viewCampaignMap(state);ui.paused=true;ui.modal=null;ui.strategyTab='battles';save();render();return true;}
  if(action==='campaign-begin'||action==='next-turn'){
    ui.domesticProposalDeferred=false;
    if(!state.battle&&typeof Worker!=='undefined'){ui.paused=false;void calculateCampaign('begin');return true;}
    error=beginExecution(state);if(!error){ui.paused=false;ui.lastTime=performance.now();}
  }
  else if(action==='campaign-run'){ui.domesticProposalDeferred=false;ui.paused=!ui.paused;ui.lastTime=performance.now();}
  else if(action==='campaign-day'){
    ui.domesticProposalDeferred=false;
    ui.paused=true;
    if(state.battle&&isBattleCouncil(state.battle))error='请先确认部署';
    else if(isPlanning(state))error='请先完成战略操作并点击进行';
    else if(!state.battle&&typeof Worker!=='undefined'){void calculateCampaign('day');return true;}
    else {advanceCampaignDay(state);mapMarchDay=state.campaign.day;ui.strategyTab=activeBattles(state).some(r=>r.awaiting)?'battles':ui.strategyTab;}
  }
  else if(action==='campaign-manual') {error=chooseEncounter(state,el.dataset.battle,true);ui.paused=true;ui.modal=null;ui.battlePanel=null;}
  else if(action==='campaign-auto'){error=chooseEncounter(state,el.dataset.battle,false);ui.modal=null;ui.paused=activeBattles(state).some(r=>r.awaiting);}
  else if(action==='reinforcement-continue'){error=confirmReinforcementCouncil(battleRecord(state,el.dataset.battle)?.battle);ui.modal=null;ui.paused=isPlanning(state)||activeBattles(state).some(r=>r.awaiting||r.battle.reinforcementCouncil);ui.lastTime=performance.now();}
  else if(action==='campaign-focus'){error=takeOverBattle(state,el.dataset.battle);ui.paused=true;ui.councilOpen=isReinforcementCouncil(state.battle);ui.modal=null;ui.battlePanel=null;}
  else if(action==='campaign-project')error=commissionProject(state,el.dataset.town,el.dataset.project);
  else if(action==='domestic-dismiss'){if(['city-domestic','domestic-direction'].includes(ui.modal))ui.commandReturn=ui.modal;const row=campaignOfficers(state).find(r=>r.unit.id===el.dataset.officer);submitStrategicOrder({kind:'dismiss',cityId:state.campaign.domestic.assignments.find(a=>a.officerId===el.dataset.officer)?.cityId||row?.location,officerIds:[el.dataset.officer]});return true;}
  else if(action==='campaign-relief')error=relieveCity(state,el.dataset.town);
  else if(action==='campaign-create-army'){error=createCampaignArmy(state,el.dataset.town,[...document.querySelectorAll('[data-draft-officer]:checked')].map(x=>x.dataset.draftOfficer));if(!error){ui.army=state.armies.find(a=>a.location===el.dataset.town&&a.faction===playerFaction(state)&&!a.travel&&!a.route.length)?.id;ui.strategyTab='army';}}
  else if(action==='campaign-transfer'){const row=campaignOfficers(state).find(r=>r.unit.id===el.dataset.officer);submitStrategicOrder({kind:'transfer',cityId:state.campaign.domestic.assignments.find(a=>a.officerId===el.dataset.officer)?.cityId||row?.location,officerIds:[el.dataset.officer],target:document.querySelector('[data-transfer-target="'+el.dataset.officer+'"]').value});return true;}
  else return false;
  if(error)toast(error,'error');save();render();return true;
}
function runCampaignClock(){
  if(campaignRunner.busy)return;
  if(ui.mode==='lobby'||ui.paused||ui.modal||pageGuides.isOpen||document.hidden){ui.lastTime=performance.now();return;}
  if((isPlanning(state)&&!state.campaign.allAI)||state.finished){ui.paused=true;render();return;}
  if(state.battle&&battleFx?.isPresentationPlaying())return;
  if(state.battle?.result&&battleFx?.isBusy())return;
  // Map playback advances one day every three seconds; battle speed is local
  // to watching combat and must not accelerate marching after returning here.
  const now=performance.now(),delay=state.battle?(battleFx?.stepDelay(COMBAT.stepMs)??COMBAT.stepMs/ui.speed):3000;
  if(now-ui.lastTime<delay)return;ui.lastTime=now;
  if(!state.battle&&typeof Worker!=='undefined'){void calculateCampaign('day');return;}
  const previous=state.battle,day=state.campaign.day;
  const result=previous?advanceCampaignStep(state):advanceCampaignDay(state);
  mapMarchDay=state.campaign.day;
  if(result.appointments||result.paused||result.encounter||result.reinforcement||result.deployment||result.planning||(isPlanning(state)&&!state.campaign.allAI)||state.finished)ui.paused=true;
  if(result.proposals)ui.domesticProposalDeferred=false;
  const domesticAlert=presentDomesticAlerts();
  if(domesticAlert||previous!==state.battle||!state.battle||result.encounter||result.reinforcement){if(result.encounter||result.reinforcement)ui.strategyTab='battles';render();}
  else updateBattle();
  if(day!==state.campaign.day||result.encounter||result.reinforcement||result.deployment||previous!==state.battle)save();
}

function campaignProgress(){
 const running=$('.turn-seal'),day=$('.turn-day');
 if(running){running.dataset.action=ui.campaignComputing?'campaign-run':isPlanning(state)?'campaign-begin':'campaign-run';running.textContent=ui.campaignComputing&&!ui.paused?'暂停':isPlanning(state)||ui.paused?'进行':'暂停';}
 if(day)day.disabled=!!ui.campaignComputing||isPlanning(state)||!!state.finished;
 $('.world-turn')?.setAttribute('aria-busy',String(!!ui.campaignComputing));
}
async function calculateCampaign(operation){
 const source=state,day=source.campaign.day;ui.campaignComputing=true;campaignProgress();
 try{
  const computed=await campaignRunner.run(source,operation);
  if(!computed||state!==source)return;
  ui.campaignComputing=false;
  if(typeof computed.result==='string'&&computed.result){ui.paused=true;toast(computed.result,'error');campaignProgress();return;}
  state=computed.state;const result=computed.result||{};ui.lastTime=performance.now();
  if(operation==='day')mapMarchDay=state.campaign.day;
  if(result.appointments||result.paused||result.encounter||result.reinforcement||result.deployment||result.planning||(isPlanning(state)&&!state.campaign.allAI)||state.finished)ui.paused=true;
  if(result.proposals)ui.domesticProposalDeferred=false;
  if(result.encounter||result.reinforcement)ui.strategyTab='battles';
  presentDomesticAlerts();
  // Commit a completed day once. Camera movement may finish before its DOM patch.
  if(operation==='begin'||day!==state.campaign.day||result.encounter||result.reinforcement||result.deployment)void save();
  const refresh=()=>{if(state!==computed.state)return;if($('#app .map-camera-moving')){setTimeout(refresh,100);return;}render();};refresh();
 }catch(error){ui.campaignComputing=false;ui.paused=true;console.error('Campaign calculation:',error);toast('本日推演未完成，已暂停；可重新点击进行','error');campaignProgress();}
}

document.addEventListener('visibilitychange', () => { void audio.setHidden(document.hidden); if (document.hidden){battleFx?.clearVoiceAudio();strategicVoice.read(state,{audible:false});save();} });
window.addEventListener('pagehide', () => {campaignRunner.destroy();archiveReader.destroy();battleFx?.clearVoiceAudio();strategicVoice.read(state,{audible:false});void audio.setHidden(true);save();});
window.addEventListener('pageshow', () => {if(!document.hidden)void audio.setHidden(false);});
if (!isNativeApplication()&&'serviceWorker' in navigator){navigator.serviceWorker.addEventListener('controllerchange',()=>{void audio.officerVoice.warmLibrary();},{once:true});navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(() => {});}
installNativeLifecycle({pauseAndSave(){ui.paused=true;battleFx?.clearVoiceAudio();strategicVoice.read(state,{audible:false});void audio.setHidden(true);return save();},back(){
 if(pageGuides.isOpen){pageGuides.close();return true;}
 const open=!!(ui.modal||ui.textDetails||ui.areaDraft||ui.mapObject||ui.order||ui.deploymentSelection||ui.battlePanel);
 if(open)document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 return open;
}}).catch(error=>console.error('Native lifecycle:',error));
// Art is optional. Refresh only presentation after each catalog becomes ready;
// rebuilding the page here would discard in-progress inputs and battle clocks.
const readyArtKinds=new Set();let artRefreshFrame=0;
function refreshReadyArt(kind){
 readyArtKinds.add(kind);if(artRefreshFrame)return;
 artRefreshFrame=requestAnimationFrame(()=>{
  artRefreshFrame=0;
  if(readyArtKinds.has('catalog')){audio.setLibrary(assetCatalog.music);audio.setVoiceLibrary(assetCatalog.voices);}
  for(const changed of readyArtKinds)document.dispatchEvent(new CustomEvent('sango-art-ready',{detail:changed}));
  readyArtKinds.clear();art.decorate();
  if(state.battle&&$('#battle-board')?.dataset.battleId===state.battle.id){
   patchMarkup($('#siege-terrain'),siegeTerrain(state.battle));decorateBattleBuildings($('#siege-terrain'));
   battleArt?.update(state.battle,{paused:ui.paused||!!ui.modal||isDeploying(state.battle),speed:ui.speed});battleFx?.invalidate();
  }
  for(const button of document.querySelectorAll('[data-action="art-mode"]'))button.textContent=art.active?'人物美术':'默认美术';
 });
}
const artReady=art.init({onChange:refreshReadyArt});
render();
if (loadWarning) { save(); toast(loadWarning); }

document.addEventListener('toggle',event=>{const key=event.target.dataset.cityDisclosure;if(key&&event.target.isConnected){ui.cityDisclosures||={};ui.cityDisclosures[key]=event.target.open;}},true);

function syncCouncilDraft(){
 const side=state.battle.sides[0];
 for(const a of state.armies.filter(a=>side.units.some(u=>u.armyId===a.id))){a.tactic=side.tactic;const ids=side.units.filter(u=>u.armyId===a.id).map(u=>u.id);a.units.sort((x,y)=>ids.indexOf(x.id)-ids.indexOf(y.id));for(const u of a.units){const live=side.units.find(x=>x.id===u.id);u.first=live?.status==='active';if(live)u.retreatAt=live.retreatAt;}}
 const d=state.testScenario?.customBattle;if(d){d.ownTeamTactic=side.tactic;for(const [armyId,team]of [['a1',d.ownTeam],...(d.reinforcements||[]).flatMap((a,i)=>a.side===0?[['a'+(i+3),a.team]]:[])])for(const entry of team){const live=side.units.find(u=>u.id===entry.id&&u.armyId===armyId);if(live){entry.first=live.status==='active';entry.retreatAt=live.retreatAt;}}}
}

document.addEventListener('dragend',()=>{ui.councilDrag=null;});
