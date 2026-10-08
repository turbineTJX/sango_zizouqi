import {validTreasureId} from './data/design/treasures.mjs';
import {validEquipment,emptyEquipment} from './troop-equipment.mjs';
import {battleDays} from './player-time.mjs';
import {armyFrontlineCapacity} from './army-trait-rules.mjs';
import {validRetreatAt} from './battle-retreat.mjs';
import {chooseArmyAdvisor,makeOfficer} from './engine.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {TROOPS} from './unit-stats.mjs';
import {TACTICS} from './engine.mjs';
import {BATTLE_TERRAINS} from './battlefield.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {BATTLE_MAPS} from './data/design/battle-maps.mjs';
import {customArmyColumns,validateArrivalDependencies,arrivalLabel} from './reinforcement-arrival.mjs';
import {validateBattleEvents,battleEventsMarkup} from './battle-events.mjs';
import {highestAptitudeTroop,battleTroopTypes} from './troop-choice.mjs';

export function defaultCustomBattle(){
  const entry=id=>({id,type:highestAptitudeTroop(OFFICER_BY_ID[id],battleTroopTypes('land')),troops:3000,level:5});
  return {battleKind:'field',gateHp:12000,terrain:'land',seed:521306,ownTroopBudget:30000,ownTeam:[entry('cao')],enemyTeam:[entry('shao')]};
}
export const customParticipants=d=>[...(d.ownTeam||[]),...(d.enemyTeam||[]),...(d.reinforcements||[]).flatMap(a=>a.team||[])];
export const customSideEntries=(d,side)=>[...(d[side===0?'ownTeam':'enemyTeam']||[]),...(d.reinforcements||[]).filter(a=>a.side===side).flatMap(a=>a.team)];
export const customTroopBudget=d=>d.ownTroopBudget??customSideEntries(d,0).reduce((n,u)=>n+u.troops,0);
export const customReserveTroops=d=>customTroopBudget(d)-customSideEntries(d,0).reduce((n,u)=>n+u.troops,0);
export function customBattleTotals(d,side){
 const key=side===0?'ownTeam':'enemyTeam',reinforcements=(d.reinforcements||[]).filter(a=>a.side===side),main=d[key]||[];
 return {units:main.length+reinforcements.reduce((n,a)=>n+a.team.length,0),troops:main.reduce((n,u)=>n+u.troops,0)+reinforcements.reduce((n,a)=>n+a.team.reduce((n,u)=>n+u.troops,0),0),reinforcementUnits:reinforcements.reduce((n,a)=>n+a.team.length,0),reinforcementTroops:reinforcements.reduce((n,a)=>n+a.team.reduce((n,u)=>n+u.troops,0),0),armies:1+reinforcements.length};
}
export function validateCustomBattle(draft){
 if(!draft||!Object.hasOwn(BATTLE_TERRAINS,draft.terrain))throw Error('请选择有效地形');
 if(draft.mapId&&(!Object.hasOwn(BATTLE_MAPS,draft.mapId)||BATTLE_MAPS[draft.mapId].terrain!==draft.terrain))throw Error('战役地图与地形不一致');
 if(!Number.isSafeInteger(draft.seed)||draft.seed<0||draft.seed>0xffffffff)throw Error('种子须为 0～4294967295 的整数');
 const battleKind=draft.battleKind??'field',limit=draft.limit??480,shieldPercent=draft.shieldPercent??20,holdUntil=draft.holdUntil??0,waves=draft.waves??[],reinforcements=draft.reinforcements??[];
 if(!['field','defense','siege'].includes(battleKind))throw Error('请选择有效战役场景');
 if(draft.gateHp!==undefined&&(!Number.isInteger(draft.gateHp)||draft.gateHp<1||draft.gateHp>1000000))throw Error('城门耐久须为1～1000000');
 if(!Number.isInteger(limit)||limit<1||limit>2000)throw Error('战斗时限须为1～2000日');
 if(!Number.isInteger(shieldPercent)||shieldPercent<0||shieldPercent>100)throw Error('开场护盾须为0～100%');
 if(!Number.isInteger(holdUntil)||holdUntil<0||holdUntil>limit||holdUntil>0&&battleKind==='field')throw Error('坚守目标仅用于守城，且不能超过时限');
 if(!Array.isArray(waves)||waves.length>4||waves.some((w,i)=>!w||!Number.isInteger(w.count)||w.count<1||!Number.isInteger(w.tick)||w.tick<0||w.tick>=limit||i>0&&w.tick<waves[i-1].tick))throw Error('援军批次、数量或到达时间无效');
 if(!Array.isArray(reinforcements)||reinforcements.length>Object.keys(OFFICER_BY_ID).length-2)throw Error('援军军团配置无效');
 function team(entries,name,main=true){
  if(!Array.isArray(entries)||entries.length<1||entries.length>10)throw Error(name+'须选 1～10 支部队');
  for(const u of entries){
   if(!u||!Object.hasOwn(OFFICER_BY_ID,u.id)||TROOPS[u.type]?.category!=='troop')throw Error(name+'武将或兵种无效');
   if(!Number.isInteger(u.level)||u.level<1||u.level>10)throw Error('武将等级须为 1～10');
   const cap=troopCapacity({...OFFICER_BY_ID[u.id],level:u.level});
   if(!Number.isInteger(u.troops)||u.troops<1000||u.troops>cap)throw Error(OFFICER_BY_ID[u.id].name+'兵力须为 1000～'+cap);
   if(u.formation!==undefined&&!['front','middle','back','left','right'].includes(u.formation))throw Error('部队位置无效');
   if(u.retreatAt!==undefined&&!validRetreatAt(u.retreatAt))throw Error('撤离设置无效');
   if(u.first!==undefined&&typeof u.first!=='boolean')throw Error('首发设置无效');
   if(!validTreasureId(u.treasureId))throw Error('宝物无效');
   if(u.equipment!==undefined&&!validEquipment(u.equipment))throw Error('携带装备无效');
  }
  if(main&&entries.every(u=>u.first===false))throw Error('至少需要一支首发部队');
  return entries.map(({id,type,troops,level,formation,first,retreatAt,equipment,treasureId})=>({id,type,troops,level,...(treasureId?{treasureId}:{}),equipment:structuredClone(equipment||emptyEquipment()),...(retreatAt!==undefined?{retreatAt}:{}),...(formation!==undefined?{formation}:{}),...(first!==undefined?{first}:{})}));
 }
 function roles(value,units){
  if(!value||!units.some(u=>u.id===value.leader)||!units.some(u=>u.id===value.advisor)||value.deputy!=null&&!units.some(u=>u.id===value.deputy))throw Error('军团长、军师与副将必须来自本军团');
  return {leader:value.leader,advisor:value.advisor,...(Object.hasOwn(value,'deputy')?{deputy:value.deputy}:{})};
 }
 const result={...(draft.mapId?{mapId:draft.mapId}:{}),limit,shieldPercent,waves:waves.map(({count,tick})=>({count,tick})),reinforcements:[],...(holdUntil?{holdUntil}:{}),battleKind,gateHp:draft.gateHp??12000,terrain:draft.terrain,seed:draft.seed};
 for(const key of ['ownTeam','enemyTeam']){
  result[key]=team(draft[key],key==='ownTeam'?'我军':'敌军');
  if(draft[key+'Roles'])result[key+'Roles']=roles(draft[key+'Roles'],result[key]);
  if(draft[key+'Tactic']!==undefined){if(!Object.hasOwn(TACTICS,draft[key+'Tactic']))throw Error('全军策略无效');result[key+'Tactic']=draft[key+'Tactic'];}
 }
 if(waves.reduce((n,w)=>n+w.count,0)>customReserveEntries(result,'enemyTeam').length)throw Error('援军批次只能分配敌军实际预备队');
 result.reinforcements=reinforcements.map((a,i)=>{
  if(!a||![0,1].includes(a.side)||typeof a.name!=='string'||!a.name.trim().length||a.name.length>24||/[<>"'&]/.test(a.name))throw Error('援军阵营或名称无效');
  const c=a.arrivalCondition;let arrival;
  if(c!==undefined){
   if(!c||!['unit-defeated','army-defeated'].includes(c.type)||a.tick!==undefined)throw Error('援军到达条件无效，请选择时间或条件');
   const field=c.type==='unit-defeated'?'unitId':'armyId';
   if(typeof c[field]!=='string')throw Error('请选择援军到达条件的目标');
   arrival={arrivalCondition:{type:c.type,[field]:c[field]}};
  }else{
   if(!Number.isInteger(a.tick)||a.tick<0||a.tick>=limit)throw Error('援军到达时间须早于战斗时限');
   arrival={tick:a.tick};
  }
  const entries=team(a.team,'援军军团',false),appointments=a.roles||customRoles({ownTeam:entries,seed:draft.seed},'ownTeam');
  if(a.tactic!==undefined&&!Object.hasOwn(TACTICS,a.tactic))throw Error('援军策略无效');
  return {side:a.side,...arrival,name:a.name.trim(),team:entries,roles:roles(appointments,entries),...(a.tactic?{tactic:a.tactic}:{})};
 });
 const treasures=customParticipants(result).map(u=>u.treasureId).filter(Boolean);
 if(new Set(treasures).size!==treasures.length)throw Error('同一宝物不能重复加入双方或援军');
 const ids=customParticipants(result).map(u=>u.id);
 if(new Set(ids).size!==ids.length)throw Error('同一武将不能重复加入军团或双方，请更换重复武将');
 validateArrivalDependencies(result);
 result.events=validateBattleEvents(draft.events,limit);
 result.ownTroopBudget=draft.ownTroopBudget??customBattleTotals(result,0).troops;
 if(!Number.isSafeInteger(result.ownTroopBudget)||result.ownTroopBudget<1000||result.ownTroopBudget>10000000)throw Error('我方总预备兵须为1000～10000000的整数');
 if(customReserveTroops(result)<0)throw Error('我方兵力超过总预备兵：已编制 '+customBattleTotals(result,0).troops+' 人，总额 '+result.ownTroopBudget+' 人');
 return result;
}
export function swapCustomBattle(input){
 const d=structuredClone(input);if((d.waves||[]).length)throw Error('请先移除敌军预备队批次，再交换双方');
 const available=customReserveTroops(d);
 for(const suffix of ['', 'Roles','Tactic'])[d['ownTeam'+suffix],d['enemyTeam'+suffix]]=[d['enemyTeam'+suffix],d['ownTeam'+suffix]];
 for(const army of d.reinforcements||[]){army.side=1-army.side;const c=army.arrivalCondition;if(c?.type==='army-defeated'&&['a1','a2'].includes(c.armyId))c.armyId=c.armyId==='a1'?'a2':'a1';}
 for(const event of d.events||[])event.side=1-event.side;
 d.ownTroopBudget=customBattleTotals(d,0).troops+available;
 if(d.battleKind==='defense')d.battleKind='siege';else if(d.battleKind==='siege')d.battleKind='defense';
 return validateCustomBattle(d);
}
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function customFrontlineCapacity(draft,key){const id=draft[key+'Roles']?.leader??draft[key]?.[0]?.id;return armyFrontlineCapacity({leader:id});}
export function customReserveEntries(draft,key){const cap=customFrontlineCapacity(draft,key);return (draft[key]||[]).filter((u,i)=>!(u.first??i<cap));}
export function customRoles(draft,key){return draft[key+'Roles']??{leader:draft[key][0].id,advisor:chooseArmyAdvisor({leader:draft[key][0].id,units:draft[key].map(u=>({...makeOfficer(u.id,u.troops,0,Number.isInteger(u.level)&&u.level>=1&&u.level<=10?u.level:1),type:u.type}))})??null};}
function reinforcementEditorMarkup(draft){
 const columns=customArmyColumns(draft),units=customParticipants(draft).map(u=>({...u,name:OFFICER_BY_ID[u.id]?.name}));
 const targetName=a=>['a1','a2'].includes(a.id)?a.name:(a.side?'敌军':'我军')+' · '+a.name;
 const options=(rows,current)=>'<option value="">请选择目标</option>'+rows.map(([id,name])=>`<option value="${esc(id)}" ${current===id?'selected':''}>${esc(name)}</option>`).join('');
 return '<section class="custom-reinforcements" aria-label="援军军团"><h3>援军军团</h3>'+[0,1].map(side=>{const n=customBattleTotals(draft,side);return '<p>'+(side?'敌军':'我军')+'共 '+n.units+' 队 · '+n.troops.toLocaleString()+' 人 · 援军 '+n.reinforcementUnits+' 队</p>';}).join('')+
 (draft.reinforcements||[]).map((a,i)=>{
  const c=a.arrivalCondition,ownId='a'+(i+3),targets=columns.filter(a=>a.id!==ownId);
  const field=c?.type==='unit-defeated'?'unitId':'armyId';
  const rows=c?.type==='unit-defeated'?targets.flatMap(a=>a.team.map(u=>[u.id,targetName(a)+' · '+OFFICER_BY_ID[u.id].name+'队'])):targets.map(a=>[a.id,targetName(a)]);
  return `<article class="custom-team"><h4>${esc(a.name)} · ${a.team.length}队 · ${a.team.reduce((n,u)=>n+u.troops,0).toLocaleString()}人</h4><div class="custom-options"><label>名称<input type="text" maxlength="24" data-custom-reinforcement="name" data-index="${i}" value="${esc(a.name)}"></label><label>阵营<select data-custom-reinforcement="side" data-index="${i}"><option value="0" ${a.side===0?'selected':''}>我军</option><option value="1" ${a.side===1?'selected':''}>敌军</option></select></label><label>到达方式<select data-custom-reinforcement="arrivalType" data-index="${i}">${[['time','按时间到达'],['unit-defeated','指定部队被消灭'],['army-defeated','指定军团全灭']].map(([id,name])=>`<option value="${id}" ${(c?.type||'time')===id?'selected':''}>${name}</option>`).join('')}</select></label>${c?`<label class="custom-arrival-target">${c.type==='unit-defeated'?'目标部队':'目标军团'}<select data-custom-reinforcement="${field}" data-index="${i}">${options(rows,c[field])}</select></label>`:`<label>开战后（天）<input type="number" min="0" max="${Math.max(0,battleDays(draft.limit??480)-1)}" data-custom-reinforcement="tick" data-index="${i}" value="${battleDays(a.tick)}"></label>`}<button class="button secondary" data-action="scenario-setup-open" data-team="${a.side===0?'ownTeam':'enemyTeam'}" data-reinforcement="${i}">编制军团</button><button class="button secondary" data-action="custom-reinforcement-remove" data-index="${i}">移除</button></div><p>${a.team.map(u=>esc(OFFICER_BY_ID[u.id].name)).join('、')}</p><small>到达：${esc(arrivalLabel(a,units,columns))}</small></article>`;
 }).join('')+'<details><summary>到达说明</summary><p>到达后加入后备，按空位补入。指定部队须兵力归零且溃败；军团全灭须全部部队被消灭，包含后备。主动撤离不触发。到达条件未满足的援军不延续已全军覆灭的战斗。</p></details><button class="button secondary" data-action="custom-reinforcement-add">新增援军</button></section>';
}
export function customBattleMarkup(draft){
 let error='';try{validateCustomBattle(draft);}catch(e){error=e.message;}
 const team=(key,label)=>`<section class="custom-team"><h3>${label}先遣军团<small>${draft[key].length} / 10 队 · ${draft[key].reduce((n,u)=>n+u.troops,0).toLocaleString()} 人</small></h3><p>${draft[key].map(u=>esc(OFFICER_BY_ID[u.id].name)).join('、')}</p><button class="button primary" data-action="scenario-setup-open" data-team="${key}">编制军团</button></section>`;
 const reinforcementMarkup=reinforcementEditorMarkup(draft)+battleEventsMarkup(draft);
 return `<section class="custom-battle custom-muster" aria-label="自由对战配置"><div class="lobby-section-title"><h2>自定义战役</h2></div><div class="custom-options"><label>战役场景<select data-custom-option="battleKind">${[['field','野战'],['defense','我军守城'],['siege','我军攻城']].map(([id,name])=>`<option value="${id}" ${(draft.battleKind||'field')===id?'selected':''}>${name}</option>`).join('')}</select></label>${draft.battleKind&&draft.battleKind!=='field'?`<label>城门耐久<input type="number" min="1" max="1000000" data-custom-option="gateHp" value="${draft.gateHp??12000}"></label>`:''}<label>战役地图<select data-custom-option="mapId"><option value="">通用地形</option>${Object.entries(BATTLE_MAPS).map(([id,m])=>`<option value="${id}" ${draft.mapId===id?'selected':''}>${esc(m.name)}</option>`).join('')}</select></label><label>战场地形<select data-custom-option="terrain">${Object.entries(BATTLE_TERRAINS).map(([id,name])=>`<option value="${id}" ${id===draft.terrain?'selected':''}>${name}</option>`).join('')}</select></label><label>我方总预备兵<input type="number" min="1000" max="10000000" step="1" data-custom-option="ownTroopBudget" value="${customTroopBudget(draft)}"></label><label>战斗时限（日）<input type="number" min="1" max="83" data-custom-option="limit" value="${battleDays(draft.limit??480)}"></label><label>守军首发护盾（%）<input type="number" min="0" max="100" data-custom-option="shieldPercent" value="${draft.shieldPercent??20}"></label>${draft.battleKind&&draft.battleKind!=='field'?`<label>坚守获胜日（0为不设置）<input type="number" min="0" max="${battleDays(draft.limit??480)}" data-custom-option="holdUntil" value="${battleDays(draft.holdUntil??0)}"></label>`:''}<button class="button secondary" data-action="custom-swap">交换双方</button></div><p class="custom-budget-summary" data-custom-budget-summary>我方总预备兵 ${customTroopBudget(draft).toLocaleString()} 人 · 已编制 ${customBattleTotals(draft,0).troops.toLocaleString()} 人 · 可用 ${Math.max(0,customReserveTroops(draft)).toLocaleString()} 人</p><div class="custom-teams">${team('ownTeam','我军')}${team('enemyTeam','敌军')}</div>${reinforcementMarkup}<details><summary>先遣敌军后备到达时间</summary><section class="custom-options" aria-label="敌军援军批次"><h3>敌军预备队到达时间</h3><p>批次按敌军实际预备队名单依次分配；未分配的预备队开局待命，均须等空位才能上场。</p>${(draft.waves||[]).map((w,i)=>`<label>第 ${i+1} 批队数<input type="number" min="1" max="4" data-custom-wave="count" data-index="${i}" value="${w.count}"></label><label>到达日<input type="number" min="0" max="${Math.max(0,battleDays(draft.limit??480)-1)}" data-custom-wave="tick" data-index="${i}" value="${battleDays(w.tick)}"></label><button class="button secondary" data-action="custom-wave-remove" data-index="${i}" aria-label="移除第${i+1}批援军">移除</button>`).join('')}<button class="button secondary" data-action="custom-wave-add" ${(draft.waves||[]).length>=4?'disabled':''}>新增批次</button></section></details><div class="custom-launch"><p role="status">${error?esc(error):'双方军团已就绪'}</p><button class="button primary full" data-action="launch-custom" ${error?'disabled':''}>布阵</button></div></section>`;
}
