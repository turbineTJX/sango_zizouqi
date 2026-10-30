import {hidden} from './battle-status-rules.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {BattleTransitionReader} from './battle-transition-events.mjs';

// One reader survives DOM rebuilds. Restored battles and revisited battles begin
// at their current position; audio never replays saved effects or commands.
export class BattleAudioReader{
 constructor(){this.snapshots=new WeakMap();this.current=null;this.transitions=new BattleTransitionReader();}
 read(b,{audible=true}={}){
  if(!b){this.current=null;this.transitions.reset();return [];}
  const transitions=this.transitions.read(b,{silent:!audible});
  const units=b.sides.flatMap(s=>s.units),byId=new Map(units.map(u=>[u.id,u])),old=this.current===b?this.snapshots.get(b):null,effects=b.effects||[];
  this.current=b;
  const visible=u=>!u||u.side!==1||!hidden(b,u);
  const current={tick:b.tick,count:effects.length,serials:[b.commandSerial||0,b.enemyCommand?.commandSerial||0],locked:!!b.deploymentLocked,result:!!b.result,status:new Map(units.map(u=>[u.id,u.status]))};
  this.snapshots.set(b,current);
  if(!old||!audible||b.tick<old.tick)return [];
  const cues=[],push=(key,pan=0,priority=1,event=null)=>cues.push({key,pan,priority,...(event?{from:event.from,label:event.label}:{})});
  if(!old.locked&&current.locked)push('start',0,8);
  for(const side of [0,1])if(current.serials[side]>old.serials[side])cues.push({key:'order',pan:side?.35:-.35,priority:7,side,serial:current.serials[side]});
  const seen=new Set();
  for(const e of effects.slice(old.tick===b.tick?old.count:0)){
   if(e.ongoing||e.intentOnly||e.enchantment||e.phase==='cast'||!visible(byId.get(e.from))||!visible(byId.get(e.to)))continue;
   const pan=Number.isFinite(e.x)?Math.max(-.65,Math.min(.65,(e.x/13-.5)*1.2)):0;
   let key;
   if(e.skill||e.combo)key=e.healing>0?'heal':e.visual==='fire'?'fire':'tactic';
   else if(e.damage>0||e.shieldAbsorbed>0)key=e.critical?'critical':e.visual==='volley'?'arrow':TROOP_DESIGNS[e.troop]?.family==='siege'?'impact':'melee';
   if(!key)continue;
   const group=(e.skill||e.combo)?`${e.from}:${e.label}:${key}`:key;
   if(seen.has(group))continue;seen.add(group);push(key,pan,(e.skill||e.combo)?5:e.critical?4:1,e);
  }
  // One sound per transition kind per batch; several arrivals form one signal.
  for(const kind of ['rout','retreat','exit','entry']){
   const e=transitions.find(e=>e.kind===kind);if(!e)continue;
   cues.push({key:kind==='entry'?'reinforcement':kind==='exit'?'withdraw':kind,pan:Math.max(-.65,Math.min(.65,(e.x/13-.5)*1.2)),priority:8,transition:kind,unitId:e.id});
  }
  if(b.result&&!old.result)push(b.result.winner===0?'victory':b.result.winner===1?'defeat':'draw',0,10);
  // Prioritize a decisive cue; a whole damage batch cannot become an audio wall.
  return cues.sort((a,b)=>b.priority-a.priority).slice(0,3);
 }
}

export function interactionCue(element){
 if(!element||element.disabled||element.getAttribute?.('aria-disabled')==='true')return null;
 const action=element.dataset?.action||'';
 if(action.startsWith('audio-'))return null;
 if(/^(close|cancel|back|lobby)$|-(cancel|back)$/.test(action))return 'back';
 if(element.matches?.('[data-city],[data-unit],[data-campaign-army],[data-command-city],[data-inspect]')||/select|choose|inspect|detail|unit-stats/.test(action))return 'select';
 return 'tap';
}
