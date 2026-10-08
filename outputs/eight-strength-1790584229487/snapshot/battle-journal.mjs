import {appendBattleLog} from './battle-log.mjs';
import {outcomeLines} from './tactic-outcomes.mjs';
import {hidden} from './battle-status-rules.mjs';

// Capture resolved events once, independently of rendering or simulation speed.
export function recordBattleEffects(b){
 const units=b.sides.flatMap(s=>s.units),groups=new Map();
 for(const e of b.effects||[]){
  if(e.journaled)continue;e.journaled=true;
  if(e.phase==='cast'||e.intentOnly)continue;
  const source=units.find(u=>u.id===e.from),target=units.find(u=>u.id===e.to)||b.siege?.gate;
  if(e.abilityKind==='trait'&&source?.side===1&&hidden(b,source))continue;
  const kind=e.abilityKind==='trait'?'trait':e.damageKind==='dot'||e.ongoing?'ongoing':e.skill?'tactic':'attack';
  const key=[kind,e.side,e.from,kind==='attack'?e.to:e.label,!!e.combo].join(':');
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push({...e,kind,targetName:target?.name||e.targetName||'目标'});
 }
 for(const events of groups.values()){
  const e=events[0],title=e.kind==='attack'?'普攻':e.label||'持续效果';
  const header=`${e.side?'敌军':'我军'} · ${e.name||units.find(u=>u.id===e.from)?.name||'部队'}「${title}」`;
  for(const line of outcomeLines(events))appendBattleLog(b,header+' → '+line,e.kind,e.side);
 }
}
