import {treasureOptions,treasureUnitMarkup} from './treasure-view.mjs';
import {emptyEquipment,equipmentTypes,validEquipment} from './troop-equipment.mjs';
import {initializeTacticLearning} from './tactic-learning.mjs';
import {armyDetailsMarkup} from './army-details.mjs';
import {makeOfficer,TROOPS,TACTICS,armyCommanders,isDeploying,fillSlots} from './engine.mjs';
import {defaultTacticIds} from './tactics.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {validateCustomBattle,customRoles,customFrontlineCapacity,customParticipants,customSideEntries,customTroopBudget,customReserveTroops} from './custom-battle.mjs';
import {highestAptitudeTroop,battleTroopTypes} from './troop-choice.mjs';
import {taskPickerMarkup} from './strategic-roster.mjs';
import {rankOfficerCandidates} from './officer-recommendation.mjs';
import {sortRows} from './list-sort.mjs';
import {unitManagementMarkup,unitCommanderField,unitFormationMarkup,unitReviewMarkup,commanderSetupMarkup,setupTrail,FORMATIONS} from './army-setup-view.mjs';
import {bondsMarkup} from './bond-display.mjs';
import {combatComparison} from './combat-comparison.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,extra='')=>`<button class="button secondary" data-action="${action}" ${extra}>${label}</button>`;
export const scenarioSetupSteps=p=>['formation','unit-review','unit-select','commanders','review'];
export function newScenarioSetup(draft,team,reinforcementIndex=null){
 const originalDraft=reinforcementIndex===null?null:structuredClone(draft),copy=structuredClone(draft);
 copy.ownTroopBudget=customTroopBudget(draft);if(originalDraft)originalDraft.ownTroopBudget=copy.ownTroopBudget;
 const column=reinforcementIndex===null?null:copy.reinforcements[reinforcementIndex];
 if(column){copy[team]=column.team;copy[team+'Roles']=column.roles;copy[team+'Tactic']=column.tactic;copy.reinforcements=[];}
 const roles=customRoles(copy,team);
 return {draft:copy,originalDraft,reinforcementIndex,team,blockedOfficers:customParticipants(draft).filter(u=>!copy[team].some(v=>v.id===u.id)).map(u=>u.id),editorId:copy[team][0]?.id,step:'unit-review',selected:copy[team].map(u=>u.id),entries:Object.fromEntries(copy[team].map(u=>[u.id,{...u,first:u.first??(copy[team].indexOf(u)<customFrontlineCapacity(copy,team)),formation:u.formation||OFFICER_BY_ID[u.id].formation||'front'}])),roles:{...roles,deputy:null},tactic:copy[team+'Tactic']||'balanced',filter:{sort:'recommended',direction:'desc'}};
}
export function newBattleSetup(s,armyId){
 const army=s.armies.find(a=>a.id===armyId);
 if(!army||!isDeploying(s.battle)||!s.battle.sides[0].units.some(u=>u.armyId===armyId))throw new Error('只能在开战前调整己方军团');
 const d=s.testScenario?.customBattle;
 return {sourceArmy:structuredClone(army),...(d?{troopBudget:customTroopBudget(d),availableTroops:customReserveTroops(d)}:{}),editorId:army.units[0]?.id,step:'unit-review',selected:army.units.map(u=>u.id),entries:Object.fromEntries(army.units.map(u=>[u.id,structuredClone(u)])),roles:{leader:army.leader,advisor:army.advisor,deputy:null},tactic:army.tactic,terrain:s.battle.terrain,filter:{}};
}
const catalogCache=new Map();
export function scenarioAvailableTroops(p,excludeId=null){
 if(p.sourceArmy||p.team!=='ownTeam')return Infinity;
 const full=p.originalDraft||p.draft,column=p.reinforcementIndex===null?full.ownTeam:full.reinforcements[p.reinforcementIndex].team;
 const currentIds=new Set(column.map(u=>u.id));
 const outside=customSideEntries(full,0).filter(u=>!currentIds.has(u.id)).reduce((n,u)=>n+u.troops,0);
 return customTroopBudget(full)-outside-p.selected.filter(id=>id!==excludeId).reduce((n,id)=>n+(p.entries[id]?.troops||0),0);
}
export const scenarioTroopsMax=(p,u)=>Math.max(0,Math.min(troopCapacity(u),scenarioAvailableTroops(p,u.id)));
function defaultScenarioEntry(p,id){
 const source=OFFICER_BY_ID[id],level=5;
 return {id,type:highestAptitudeTroop(source,battleTroopTypes(p.terrain||p.draft.terrain)),level,troops:Math.max(0,Math.min(3000,troopCapacity({...source,level}),scenarioAvailableTroops(p,id))),first:p.selected.length<6,formation:source.formation||'front'};
}
export function scenarioSetupOfficer(p,id){
 const entry=p.entries[id]||defaultScenarioEntry(p,id);
 if(p.sourceArmy){const source=p.sourceArmy.units.find(x=>x.id===id);if(!source)throw new Error('剧本武将不可替换');const u={...structuredClone(source),type:entry.type,equipment:structuredClone(entry.equipment||emptyEquipment()),formation:entry.formation,first:entry.first};initializeTacticLearning(u);return u;}
 const level=Number.isInteger(entry.level)&&entry.level>=1&&entry.level<=10?entry.level:1;
 const troops=Number.isInteger(entry.troops)&&entry.troops>=0?Math.min(entry.troops,troopCapacity({...OFFICER_BY_ID[id],level})):0;
 const key=[id,p.draft.seed,level,troops,entry.type,entry.formation,entry.first,entry.retreatAt,entry.treasureId,JSON.stringify(entry.equipment)].join(':');
 if(!catalogCache.has(key)){
  const u=makeOfficer(id,troops,0,level,p.draft.seed);Object.assign(u,{type:entry.type,...(entry.treasureId?{treasureId:entry.treasureId}:{}),equipment:structuredClone(entry.equipment||emptyEquipment()),formation:entry.formation,first:entry.first,retreatAt:entry.retreatAt??null});initializeTacticLearning(u,p.draft.seed);
  if(catalogCache.size>2500)catalogCache.clear();catalogCache.set(key,u);
 }
 return structuredClone(catalogCache.get(key));
}
const armyIds=p=>p.armySelected??p.selected;
export const scenarioSetupUnits=p=>(['commanders','review'].includes(p.step)?armyIds(p):p.selected).map(id=>scenarioSetupOfficer(p,id));
export function changeScenarioSetup(p,field,id,value){
 if(field==='unit-main'){if(p.sourceArmy&&!p.selected.includes(id))return;if(!p.sourceArmy&&p.blockedOfficers?.includes(id))return;p.entries[id]??={...scenarioSetupOfficer(p,id)};p.editorId=id;p.choosingMain=false;return;}
 if(field==='army-selected'){if(p.sourceArmy)return;p.armySelected??=[...p.selected];p.armySelected=value?[...new Set([...p.armySelected,id])]:p.armySelected.filter(x=>x!==id);for(const role of ['leader','advisor','deputy'])if(!p.armySelected.includes(p.roles[role]))p.roles[role]=role==='deputy'?null:p.armySelected[0];return;}
 if(field==='role'){p.roles[id]=value||null;return;}
 if(field==='tactic'){p.tactic=value;return;}
 if(field==='selected'){
  if(p.sourceArmy)return;
  if(value){if(!p.selected.includes(id)&&p.selected.length<10&&!p.blockedOfficers?.includes(id)&&!p.draft[p.team==='ownTeam'?'enemyTeam':'ownTeam'].some(u=>u.id===id)){p.entries[id]??=defaultScenarioEntry(p,id);p.entries[id].first=p.selected.length<6;p.selected.push(id);}}
  else p.selected=p.selected.filter(x=>x!==id);
  if(p.armySelected)p.armySelected=p.armySelected.filter(x=>p.selected.includes(x));
  for(const role of ['leader','advisor','deputy'])if(!p.selected.includes(p.roles[role]))p.roles[role]=role==='deputy'?null:p.selected[0];
  return;
 }
 if(['siege','ship'].includes(field)&&p.entries[id]){p.entries[id].equipment??=emptyEquipment();p.entries[id].equipment[field]=value||null;return;}
 if(!p.entries[id]||!['type','formation','first','level','troops','treasureId'].includes(field)||p.sourceArmy&&['level','troops','treasureId'].includes(field))return;
 p.entries[id][field]=['level','troops'].includes(field)?Number(value):value;
 if(field==='level')p.entries[id].troops=Math.max(1000,Math.min(p.entries[id].troops,troopCapacity({...OFFICER_BY_ID[id],level:Number(value)})));
}
export function scenarioSetupError(p){
 if(['formation','unit-review'].includes(p.step)&&p.armySelected){const q={...p,armySelected:undefined,roles:{...p.roles}};for(const role of ['leader','advisor','deputy'])if(!q.selected.includes(q.roles[role]))q.roles[role]=role==='deputy'?null:q.selected[0];return scenarioSetupError(q);}
 if(p.sourceArmy&&(p.selected.length!==p.sourceArmy.units.length||new Set(p.selected).size!==p.selected.length||p.selected.some(id=>!p.sourceArmy.units.some(u=>u.id===id))))return '剧本指定武将不可增减或替换';
 if(['unit-select','commanders','review'].includes(p.step)&&!armyIds(p).length)return '请选择加入军团的已编制部队';
 if(!p.selected.length||p.selected.length>(p.sourceArmy?p.sourceArmy.units.length:10))return '请选择一至十支部队';
 if(!Object.hasOwn(TACTICS,p.tactic))return '请选择全军策略';
 for(const role of ['leader','advisor','deputy'])if((role!=='deputy'||p.roles[role])&&!p.selected.includes(p.roles[role]))return '请从本军武将中任命军团长、军师与副将';
 for(const id of p.selected){const u=p.entries[id];if(!u||!Object.hasOwn(TROOPS,u.type)||!Object.hasOwn(FORMATIONS,u.formation))return '部队配置无效';if(u.type==='ship'&&(p.terrain||p.draft.terrain)!=='river')return '舰船只能参加河流战役';}
 if(scenarioAvailableTroops(p)<0)return '我方兵力超过总预备兵，请减少兵力';
 if(!p.sourceArmy){try{scenarioSetupDraft(p);}catch(e){return e.message;}}
 return '';
}
export function scenarioSetupDraft(p){
 const result=structuredClone(p.originalDraft||p.draft),entries=armyIds(p).map(id=>({...p.entries[id]}));
 if(p.reinforcementIndex!==null&&p.reinforcementIndex!==undefined){const column=result.reinforcements[p.reinforcementIndex];column.team=entries;column.roles={...p.roles};column.tactic=p.tactic;}
 else{result[p.team]=entries;result[p.team+'Roles']={...p.roles};result[p.team+'Tactic']=p.tactic;}
 return validateCustomBattle(result);
}
export function scenarioSetupMarkup(p,context={}){
 const steps=scenarioSetupSteps(p),index=steps.indexOf(p.step),units=scenarioSetupUnits(p),title=p.sourceArmy?.name||(p.team==='ownTeam'?'我军':'敌军')+'军团',error=scenarioSetupError(p);
 const available=scenarioAvailableTroops(p),canAdd=p.selected.length<10&&available>=1000;
 let editorError='';
 if(!p.sourceArmy&&p.editorId&&p.step==='formation'&&!p.choosingMain){
  const u=scenarioSetupOfficer(p,p.editorId),max=scenarioTroopsMax(p,u),troops=p.entries[p.editorId]?.troops??u.troops;
  if(max<1000)editorError='可用预备兵不足1000，无法编制';
  else if(!Number.isInteger(troops)||troops<1000||troops>max)editorError='兵力须为1000～'+max+'人';
 }
 let pagination='';
 let body=setupTrail(steps.filter(x=>x!=='formation'),p.step==='formation'?'unit-review':p.step,'scenario-setup-step');
 if(p.step==='formation'&&p.choosingMain){
  const blocked=new Set(p.sourceArmy?[]:p.blockedOfficers||[]),all=(p.sourceArmy?p.selected:Object.keys(OFFICER_BY_ID)).map(id=>({unit:scenarioSetupOfficer(p,id),status:blocked.has(id)?'已在另一方阵容':'可参军'})),pick={task:'expedition',single:true,selected:p.editorId?[p.editorId]:[]};
  const ranked=rankOfficerCandidates(context,all.map(r=>r.unit),pick),recs=new Map(ranked.map(r=>[r.unit.id,r.recommendation]));
  let rows=ranked.map(r=>all.find(x=>x.unit.id===r.unit.id)).filter(r=>!p.filter.query||[r.unit.name,r.unit.courtesy].some(n=>n?.includes(p.filter.query.trim())));
  if(p.filter.sort!=='recommended')rows=sortRows(rows,p.filter.sort,p.filter.direction,(r,key)=>r.unit[key]);else if(p.filter.direction==='asc')rows.reverse();
  rows.sort((a,b)=>Number(blocked.has(a.unit.id))-Number(blocked.has(b.unit.id)));
  const pages=Math.max(1,Math.ceil(rows.length/24)),page=Math.min(p.filter.page||0,pages-1);
  body+=taskPickerMarkup(context,{personnel:p.filter},pick,rows.slice(page*24,(page+1)*24),recs,p.filter.sort,{rows:all,title,limit:10,sortScope:'scenario',queryAttribute:'data-scenario-query',choiceAttribute:'data-scenario-choice',detailAction:'scenario-setup-detail',reason:r=>blocked.has(r.unit.id)?'已在另一方阵容':!p.selected.includes(r.unit.id)&&p.selected.length>=10?'已编满十队':''});
  pagination=`<nav class="picker-row-pages" aria-label="候选武将翻页">${button('scenario-setup-page','上一页',`data-page="${page-1}" ${page===0?'disabled':''}`)}<span>共 ${rows.length} 人 · ${page+1} / ${pages}</span>${button('scenario-setup-page','下一页',`data-page="${page+1}" ${page+1>=pages?'disabled':''}`)}</nav>`;
 }
 if(p.step==='formation'&&!p.choosingMain)body+=unitManagementMarkup(units,{detailAction:'scenario-setup-detail',unitDetailAction:'scenario-setup-unit-detail',editAction:'scenario-unit-edit',newAction:p.sourceArmy?null:'scenario-unit-new',canAdd,editorId:p.editorId,editorHtml:unitCommanderField(p.editorId?scenarioSetupOfficer(p,p.editorId):null,'scenario-unit-choose')+unitFormationMarkup(p.editorId?[scenarioSetupOfficer(p,p.editorId)]:[],{types:battleTroopTypes(p.terrain||p.draft.terrain),troopsMax:u=>scenarioTroopsMax(p,u),troopsValue:u=>p.entries[u.id].troops,typeAttribute:'data-scenario-type',levelAttribute:p.sourceArmy?null:'data-scenario-level',troopsAttribute:p.sourceArmy?null:'data-scenario-troops',detailAction:'scenario-setup-detail'})});
 if(p.step==='unit-review')body+=unitManagementMarkup(units,{detailAction:'scenario-setup-detail',unitDetailAction:'scenario-setup-unit-detail',editAction:'scenario-unit-edit',disbandAction:p.sourceArmy?null:'scenario-unit-disband',terrain:p.terrain||p.draft.terrain,newAction:p.sourceArmy?null:'scenario-unit-new',canAdd,workbench:p.workbench,types:battleTroopTypes(p.terrain||p.draft.terrain),typeAttribute:'data-scenario-type',troopsAttribute:p.sourceArmy?null:'data-scenario-troops',troopsMax:u=>scenarioTroopsMax(p,u),troopsValue:u=>p.entries[u.id].troops,levelAttribute:p.sourceArmy?null:'data-scenario-level'});
 if(!p.sourceArmy&&['formation','unit-review'].includes(p.step))body+='<section class="scenario-treasures"><h3>宝物配装</h3><p>全场含后备与援军，同一宝物仅可装备一次。</p>'+units.map(u=>treasureOptions(u,'data-scenario-treasure')).join('')+'</section>';
 if(p.step==='unit-select')body+=combatComparison(context,units.filter(u=>armyIds(p).includes(u.id)),null,{only:['relations'],relationCandidates:units,relationPicker:{attribute:'data-scenario-army-unit',locked:!!p.sourceArmy}});
 if(p.step==='commanders')body+='<h3>第二阶段 · 将部队编成军团</h3>'+ bondsMarkup(units,{army:p.roles})+commanderSetupMarkup(context,units,p.roles,{attribute:'data-scenario-role'});
 if(p.step==='review')body+=`<h3>核阅编制结果</h3><div class="command-decree"><h2>${esc(title)}</h2><p>${units.length} 队 · ${units.reduce((n,u)=>n+u.troops,0)} 人</p><p>${['leader','advisor','deputy'].map(role=>({leader:'军团长',advisor:'军师',deputy:'副将'})[role]+' '+esc(units.find(u=>u.id===p.roles[role])?.name||'无')).join(' · ')}</p></div>`+armyDetailsMarkup({...p.sourceArmy,morale:p.sourceArmy?.morale??80,hunger:p.sourceArmy?.hunger??0,units,...p.roles})+combatComparison(context,units,p.roles)+'';
 if(!p.sourceArmy){
  const total=customTroopBudget(p.originalDraft||p.draft);
  body=(p.team==='ownTeam'?`<p class="command-reserves" data-scenario-budget>总预备兵 ${total.toLocaleString()} 人 · 已编制 ${(total-available).toLocaleString()} 人 · 可用 ${Math.max(0,available).toLocaleString()} 人</p>`:'<p class="command-reserves">预备兵：inf</p>')+body;
 }else if(p.troopBudget!==undefined)body=`<p class="command-reserves" data-scenario-budget>总预备兵 ${p.troopBudget.toLocaleString()} 人 · 可用 ${p.availableTroops.toLocaleString()} 人</p>`+body;
 if(p.choosingMain)return {title:'选择主将',body,footer:pagination+button('scenario-unit-picker-back','返回')};
 if(editorError||error)body+=`<p role="alert">${esc(editorError||error)}</p>`;
 return {title:({'unit-select':'选择部队',formation:'编制部队','unit-review':'部队管理',commanders:'编组军团',review:'核阅结果'}[p.step])+' · '+title,body:`<div class="command-flow">${body}</div>`,footer:pagination+(!p.sourceArmy&&p.step!=='unit-review'?button('scenario-unit-new','新增部队',!canAdd?'disabled':''):'')+button('scenario-setup-cancel','取消')+(p.step==='formation'?button('scenario-unit-list','返回'):index>1?button('scenario-setup-back','上一步'):'')+button(p.step==='review'?'scenario-setup-confirm':p.step==='formation'?'scenario-unit-save':'scenario-setup-next',p.step==='review'?'确认':p.step==='formation'?'确认':p.step==='unit-review'?'编组':'下一步',(p.step==='formation'?!p.editorId||!!editorError:!!error)?'disabled':'')};
}
// A standalone battle owns its participants. No city resource or personnel
// movement functions are called by this adapter.
export function applyBattleSetup(s,p){
 if(!isDeploying(s.battle)||!p.sourceArmy)throw new Error('开战后不能修改编制');
 const error=scenarioSetupError(p);if(error)throw new Error(error);
 const next=structuredClone(s),army=next.armies.find(a=>a.id===p.sourceArmy.id);
 if(!army||JSON.stringify(army)!==JSON.stringify(p.sourceArmy))throw new Error('军团已变化，请重新编制');
 army.units=scenarioSetupUnits(p);Object.assign(army,p.roles,{tactic:p.tactic});
 const side=next.battle.sides[0],leader=army.units.find(u=>u.id===army.leader),advisor=army.units.find(u=>u.id===army.advisor),deputy=army.units.find(u=>u.id===army.deputy);
 const old=new Map(side.units.map(u=>[u.id,u]));
 const others=side.units.filter(u=>u.armyId!==army.id);
 side.units=[...army.units].sort((a,b)=>Number(b.first)-Number(a.first)).map(u=>({...old.get(u.id),...u,commandBonus:(leader?.leadership||60)/1000,advisorBonus:(advisor?.intellect||0)/1000,deputyBonus:(deputy?.force||0)/2000,status:'reserve',x:-1,y:-1}));
 side.units.push(...others);
 if(next.testScenario?.customBattle){const d=next.testScenario.customBattle,entries=army.units.map(({id,type,troops,level,formation,first,retreatAt,equipment,treasureId})=>({id,type,troops,level,formation,first,retreatAt,equipment,...(treasureId?{treasureId}:{})})),index=Number(army.id.slice(1))-3;
  if(index>=0){d.reinforcements[index].team=entries;d.reinforcements[index].roles={...p.roles};d.reinforcements[index].tactic=p.tactic;}
  else{d.ownTeam=entries;d.ownTeamRoles={...p.roles};d.ownTeamTactic=p.tactic;}
 }
 side.commanders=next.armies.filter(a=>a.faction===army.faction).flatMap(armyCommanders);side.tactic=army.tactic;fillSlots(next.battle,0);
 return next;
}

export function saveScenarioUnit(p){
 if(!p.editorId)return '请选择主将';
 const q=structuredClone(p);if(!q.selected.includes(q.editorId))changeScenarioSetup(q,'selected',q.editorId,true);
 if(!q.selected.includes(q.editorId))return '部队数量已达上限';
 const error=scenarioSetupError(q);if(error)return error;
 Object.assign(p,q,{step:'unit-review'});return '';
}
