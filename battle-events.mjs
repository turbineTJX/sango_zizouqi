import {BATTLE_EVENT_DESIGNS} from './data/design/battle-events.mjs';
import {setStatus} from './tactics.mjs';
import {appendBattleLog} from './battle-log.mjs';
import {battleDays} from './player-time.mjs';
import {hungerPenalty} from './army-supply.mjs';
export const BATTLE_EVENTS=BATTLE_EVENT_DESIGNS;
export function assertBattleEventDesigns(definitions=BATTLE_EVENTS){
 const states={'supply-cut':['hunger'],ambush:['confuse','disrupted']};
 if(Object.keys(definitions).length!==2||Object.entries(states).some(([kind,keys])=>{
  const d=definitions[kind];return !d||typeof d.name!=='string'||!d.name||typeof d.description!=='string'||!d.description||!Number.isInteger(d.duration)||d.duration<1||d.duration>2000||JSON.stringify(d.statuses)!==JSON.stringify(keys)||kind==='supply-cut'&&(!Number.isFinite(d.hunger)||d.hunger<=0||d.hunger>5);
 }))throw Error('定时事件设计数据无效');
}
assertBattleEventDesigns();
export function validateBattleEvents(events=[],limit=480){
 if(!Array.isArray(events)||events.length>32)throw Error('定时事件最多32项');
 return events.map(e=>{
  if(!e||!Object.hasOwn(BATTLE_EVENTS,e.kind)||![0,1].includes(e.side)||!Number.isInteger(e.tick)||e.tick<1||e.tick>=limit||!Number.isInteger(e.duration)||e.duration<1||e.duration>2000)throw Error('定时事件类型、阵营、日期或持续时间无效');
  return {kind:e.kind,side:e.side,tick:e.tick,duration:e.duration};
 });
}
export function applyBattleEvents(b){
 for(const [index,e] of (b.battleEvents||[]).entries()){
  if(b.tick<e.tick)continue;
  const d=BATTLE_EVENTS[e.kind],first=e.triggeredAt===null,until=e.tick+e.duration+1;
  if(first){e.triggeredAt=b.tick;appendBattleLog(b,`${e.side?'敌军':'我军'} · ${d.name}事件触发，${d.description}`);}
  if(!first&&e.kind!=='supply-cut'||b.tick>=until)continue;
  for(const u of b.sides[e.side].units){
   if(u.hp<=0||u.withdrawing||u.arrivalConfirmed===false||!['active','reserve'].includes(u.status)||(u.arrivalTick??0)>b.tick||e.kind==='ambush'&&u.status!=='active')continue;
   for(const key of d.statuses){
    if(u.statuses[key]?.until>until||u.statuses[key]?.sourceEvent===index)continue;
    setStatus(b,u,key,until-b.tick-1,{sourceEvent:index,sourceName:'战役事件',sourceSkillName:d.name,...(key==='hunger'?{fraction:hungerPenalty(d)}:{})});
   }
  }
 }
}
export function validBattleEventStatus(b,u,key,s){
 const e=s&&b.battleEvents?.[s.sourceEvent],d=e&&BATTLE_EVENTS[e.kind];
 return Number.isInteger(s.sourceEvent)&&e&&d.statuses.includes(key)&&u.side===e.side&&e.triggeredAt===e.tick&&b.tick>=e.tick&&s.until===e.tick+e.duration+1&&s.sourceName==='战役事件'&&s.sourceSkillName===d.name&&(key!=='hunger'||s.fraction===hungerPenalty(d));
}
export const battleEventSummary=e=>`${e.side?'敌军':'我军'} · 开战后${battleDays(e.tick)}天 · ${BATTLE_EVENTS[e.kind]?.name||'事件'} · 持续${battleDays(e.duration)}天`;
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function battleEventsMarkup(draft){
 return '<section class="custom-events" aria-label="定时战役事件"><h3>定时战役事件</h3><p>到指定日期施加负面状态，可修改目标阵营与持续时间。交换双方会同时交换目标。</p>'+(draft.events||[]).map((e,i)=>`<article class="custom-team"><div class="custom-options"><label>事件<select data-custom-event="kind" data-index="${i}">${Object.entries(BATTLE_EVENTS).map(([id,d])=>`<option value="${id}" ${e.kind===id?'selected':''}>${d.name}</option>`).join('')}</select></label><label>目标<select data-custom-event="side" data-index="${i}"><option value="1" ${e.side===1?'selected':''}>敌军</option><option value="0" ${e.side===0?'selected':''}>我军</option></select></label><label>开战后（天）<input type="number" min="1" max="${Math.max(1,battleDays(draft.limit??480)-1)}" data-custom-event="tick" data-index="${i}" value="${battleDays(e.tick)}"></label><label>持续（天）<input type="number" min="1" max="83" data-custom-event="duration" data-index="${i}" value="${battleDays(e.duration)}"></label><button class="button secondary" data-action="custom-event-remove" data-index="${i}">移除</button></div><p>${esc(BATTLE_EVENTS[e.kind]?.description||'请选择事件')}</p></article>`).join('')+'<button class="button secondary" data-action="custom-event-add" '+((draft.events||[]).length>=32?'disabled':'')+'>新增事件</button></section>';
}
