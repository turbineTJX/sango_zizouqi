import {STRATAGEMS,stratagemProfile,commanderStratagems} from './stratagems.mjs';
import {TACTIC_DESIGNS} from './data/design/tactics.mjs';
import {allLearnedTacticIds} from './tactic-learning.mjs';
import {tacticSlot,tacticUseLimit,tacticUsesLeft} from './tactic-tempo.mjs';
import {stratagemAreaContains} from './stratagem-area.mjs';
import {HEX_GRID} from './hex-grid.mjs';

export const arrivedReserves=(b,side)=>b.sides[side].units.filter(u=>u.status==='reserve'&&u.hp>0&&(u.arrivalTick||0)<=b.tick&&u.arrivalConfirmed!==false);
export const refreshCandidates=(b,side)=>b.sides[side].units.filter(u=>['active','reserve'].includes(u.status)&&u.hp>0&&(u.arrivalTick||0)<=b.tick&&u.arrivalConfirmed!==false&&!u.withdrawing);
const skills=u=>allLearnedTacticIds(u).map(id=>({...TACTIC_DESIGNS[id],id})).filter(s=>!s.passive);
export const needsCommandRefresh=u=>skills(u).some(s=>tacticUsesLeft(u,s)<tacticUseLimit(u,s));
export function commandRefresh(u,p,tick){
 const record={id:u.id,casts:{...u.tacticCasts},restoredBefore:{...u.tacticRestored},bonus:{...u.tacticUseBonus},restored:{},readyBefore:{...u.skillReady},readyAfter:{}};
 const seen=new Set();
 for(const s of skills(u)){
  const slot=tacticSlot(s);if(seen.has(slot))continue;seen.add(slot);
  const n=tacticUseLimit(u,s)-tacticUsesLeft(u,s);if(n>0)record.restored[s.id]=n;
 }
 u.tacticCommandRestored={...record.restored};
 for(const [id,ready]of Object.entries(u.skillReady))record.readyAfter[id]=tick+Math.ceil(Math.max(0,ready-tick)*(1-p.strength));
 u.skillReady={...record.readyAfter};return record;
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const integer=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const validMap=(m,ids)=>m&&typeof m==='object'&&!Array.isArray(m)&&Object.entries(m).every(([id,n])=>ids.includes(id)&&integer(n));
export function validStratagemEvents(b,sideIndex){
 const side=b.sides[sideIndex],events=side.stratagemEvents;
 if(!Array.isArray(events)||events.length>3||new Set(events.map(e=>e.key)).size!==events.length)return false;
 for(const key of ['reinforce','refresh','storm'])if((side.stratagemUses[key]||0)!==events.filter(e=>e.key===key).length)return false;
 for(const e of events){
  if(!['reinforce','refresh','storm'].includes(e.key)||!integer(e.castTick,b.tick)||!b.deploymentLocked)return false;
  const c=side.commanders.find(c=>c.id===e.source?.id&&c.role===e.source?.role&&commanderStratagems(c).includes(e.key));
  if(!c||!same(e.source,stratagemProfile(e.key,c)))return false;
  const caster=side.units.find(u=>u.id===c.id);if(!caster||(caster.arrivalTick||0)>e.castTick||caster.arrivalConfirmed===false)return false;
  if(e.key==='reinforce'){
   if(!Array.isArray(e.units)||e.units.length<1||e.units.length>e.source.count||new Set(e.units).size!==e.units.length)return false;
   if(e.units.some(id=>{const u=side.units.find(u=>u.id===id);return !u||(u.arrivalTick||0)>e.castTick||u.arrivalConfirmed===false||!u.passiveState.reserveEntered;}))return false;
  }
  if(e.key==='refresh'){
   if(!Array.isArray(e.units)||!e.units.length||new Set(e.units.map(r=>r.id)).size!==e.units.length)return false;
   for(const r of e.units){
    const u=side.units.find(u=>u.id===r.id);if(!u||(u.arrivalTick||0)>e.castTick||u.arrivalConfirmed===false)return false;
    const ids=allLearnedTacticIds(u);if(![r.casts,r.restoredBefore,r.bonus,r.restored,r.readyBefore,r.readyAfter].every(m=>validMap(m,ids)))return false;
    const snapshot={...u,tacticCasts:r.casts,tacticRestored:r.restoredBefore,tacticUseBonus:r.bonus,tacticCommandRestored:{},skillReady:r.readyBefore};
    const expected=commandRefresh(snapshot,e.source,e.castTick);
    if(!same(r.restored,expected.restored)||!same(r.readyAfter,expected.readyAfter)||!same(u.tacticCommandRestored,r.restored))return false;
    for(const s of skills(u)){
     const total=(m)=>Object.entries(m).filter(([id])=>tacticSlot({...TACTIC_DESIGNS[id],id})===tacticSlot(s)).reduce((n,[,v])=>n+v,0);
     if(total(r.restoredBefore)>total(r.casts)||total(r.casts)>tacticUseLimit(snapshot,s)+total(r.restoredBefore))return false;
     if(total(u.tacticCasts)<total(r.casts)||total(u.tacticRestored)<total(r.restoredBefore))return false;
    }
   }
  }
  if(e.key==='storm'){
   const s=STRATAGEMS.storm,shape={scope:{shape:'circle',radius:s.strikeRadius}};
   if(!integer(e.seedBefore,4294967295)||!integer(e.seedAfter,4294967295)||!Array.isArray(e.strikes)||e.strikes.length!==s.strikes)return false;
   let seed=e.seedBefore;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   for(const strike of e.strikes){
    if(strike.point?.x!==Math.floor(random()*HEX_GRID.cols)||strike.point?.y!==Math.floor(random()*HEX_GRID.rows)||!Array.isArray(strike.hits)||new Set(strike.hits.map(h=>h.id)).size!==strike.hits.length)return false;
    for(const hit of strike.hits){
     const u=b.sides.flatMap(s=>s.units).find(u=>u.id===hit.id),roll=s.randomDamage.min+random()*(s.randomDamage.max-s.randomDamage.min);
     if(!u||!stratagemAreaContains(shape,strike.point,hit)||hit.roll!==roll||hit.raw!==Math.round(u.initial*e.source.strength*roll)||!integer(hit.damage,hit.raw)||!integer(hit.absorbed,hit.raw))return false;
    }
   }
   if(e.seedAfter!==seed)return false;
  }
 }
 for(const u of side.units){const r=events.find(e=>e.key==='refresh')?.units.find(r=>r.id===u.id);if(!r&&Object.keys(u.tacticCommandRestored||{}).length)return false;}
 return true;
}
