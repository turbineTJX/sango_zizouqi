import {hexDistance} from './hex-grid.mjs';
import {STATUS_DEFINITIONS,statusOn} from './battle-status-rules.mjs';

// Only completed casts with an actual benefit can open a support link.
// No relationship/name checks here: the engine rolls the current relationship.
export function tacticSupportRecipients(b,caster,before,events) {
  const own=events.filter(e=>e.from===caster.id&&!e.ongoing);
  return b.sides[caster.side].units.filter(t=>{
    if(t.id===caster.id||!cooperatingUnit(b,t))return false;
    const old=before.get(t.id),hits=own.filter(e=>e.to===t.id);
    if(!old||!hits.length)return false;
    if(hits.some(e=>e.healing>0||e.tacticUseChange?.amount>0)||t.intent>old.intent)return true;
    if(Object.keys(old.ready).some(id=>t.skillReady[id]<old.ready[id]))return true;
    if(Object.entries(old.statuses).some(([key,s])=>s.until>b.tick&&['debuff','control','damage'].includes(STATUS_DEFINITIONS[key]?.tone)&&!t.statuses[key]))return true;
    return Object.entries(t.statuses).some(([key,s])=>STATUS_DEFINITIONS[key]?.tone==='buff'&&s.until>b.tick&&JSON.stringify(s)!==JSON.stringify(old.statuses[key])&&(
      s.sourceId===caster.id||key==='shield'&&s.layers?.some(l=>l.source.startsWith(caster.id+':')&&(!old.statuses.shield?.layers?.some(p=>p.source===l.source&&p.amount>=l.amount&&p.until>=l.until)))
    ));
  }).map(t=>t.id);
}
export function cooperatingUnit(b,u) {
  return u?.status==='active'&&u.hp>0&&!u.withdrawing&&!u.disengage&&!b.sides[u.side].retreat&&!statusOn(b,u,'stasis');
}
export function cooperationCandidate(b,u,s,target,rules) {
  if(s.attackOrb||s.effect==='repair'||['phalanx','gallop','valor','bulwark','riposte','anchor','emplace'].includes(s.effect))return null;
  const units=b.sides[u.side].units;
  if((b.comboWindows||[]).some(c=>c.side===u.side&&c.targetId===target.id&&b.tick-c.tick<=rules.window&&c.actors.some(a=>a.id===u.id&&cooperatingUnit(b,u))))return null;
  const candidates=(b.comboWindows||[]).filter(c=>c.side===u.side&&b.tick-c.tick<=rules.window).map(c=>{
    const actors=c.actors.filter(a=>cooperatingUnit(b,units.find(v=>v.id===a.id)));
    if(!actors.length||actors.some(a=>a.id===u.id))return null;
    const partner=units.find(v=>v.id===actors.at(-1).id);
    const provider=units.find(v=>v.id===c.actors.at(-1).id);
    const nearby=cooperatingUnit(b,provider)&&partner.id===provider.id&&hexDistance(u,partner)<=rules.supportRange;
    const kind=c.targetId===target.id?'focus':nearby&&c.supportIds.includes(u.id)?'supported':nearby&&target.side===u.side&&target.id===partner.id?'cover':null;
    return kind?{previous:c,actors,kind}:null;
  }).filter(Boolean).sort((a,c)=>Number(c.kind==='focus')-Number(a.kind==='focus')||c.previous.tick-a.previous.tick||a.previous.targetId.localeCompare(c.previous.targetId));
  const link=candidates[0],actor={id:u.id,name:u.name,skillId:s.id,x:u.x,y:u.y};
  return {previous:link?.previous||null,kind:link?.kind||'focus',record:{side:u.side,targetId:target.id,tick:link?link.previous.tick:b.tick,actors:[...(link?.actors||[]),actor],supportIds:[]}};
}
