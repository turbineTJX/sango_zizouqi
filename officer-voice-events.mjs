import {hidden} from './battle-status-rules.mjs';
import {officerVoiceLine} from './officer-voice-lines.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {NATIONAL_FACTIONS} from './national-scenarios.mjs';

export function isVoiceRuler(s,id,faction=s.campaign?.playerFaction||'cao'){
 const source=NATIONAL_FACTIONS[faction]?.leaderSourceId;return source!==undefined&&OFFICER_BY_ID[id]?.sourceId===source;
}

const ranked=cues=>cues.sort((a,b)=>b.priority-a.priority).slice(0,2);
const cue=(officer,event,extra={})=>{const line=officerVoiceLine({...OFFICER_BY_ID[officer?.id],...officer},event,extra);return line?{...line,key:'voice',voice:true,priority:5,...extra}:null;};
const visible=(b,u)=>u&&!u.isDecoy&&(u.side!==1||!hidden(b,u));
const leader=(b,side)=>{
 const s=b.sides[side],c=s.commanders.find(c=>c.role==='leader');
 return s.units.find(u=>u.id===c?.id&&visible(b,u)&&u.hp>0&&u.status==='active')||s.units.find(u=>visible(b,u)&&u.hp>0&&u.status==='active');
};
export class BattleVoiceReader{
 constructor(){this.current=null;this.previous=null;}
 read(b,{audible=true}={}){
  if(!b){this.current=null;this.previous=null;return [];}
  const old=this.current===b?this.previous:null,units=b.sides.flatMap(s=>s.units),effects=b.effects||[];
  this.current=b;this.previous={tick:b.tick,count:effects.length,locked:b.deploymentLocked,result:!!b.result,serials:[b.commandSerial||0,b.enemyCommand?.commandSerial||0],status:new Map(units.map(u=>[u.id,{status:u.status,withdrawing:!!u.withdrawing}]))};
  if(!old||!audible||b.tick<old.tick)return [];
  const out=[],push=(u,event,extra)=>{if(visible(b,u)){const c=cue(u,event,{side:u.side,...extra});if(c)out.push(c);}};
  if(!old.locked&&b.deploymentLocked)push(leader(b,0),'start',{priority:8,signature:true});
  for(const side of [0,1]){
   const resource=side?b.enemyCommand:b,last=resource?.lastCommand;
   if((resource?.commandSerial||0)>old.serials[side]&&last){
    const source=last.source?units.find(u=>u.id===last.source.id):leader(b,side);
    push(source,last.key==='retreat'?'retreat':'order',{key:'order',side,serial:resource.commandSerial,priority:8});
   }
  }
  const seen=new Set();
  for(const e of effects.slice(old.tick===b.tick?old.count:0)){
   if(!e.skill||e.ongoing||e.enchantment||e.intentOnly||e.phase==='cast'||e.militaryOrder)continue;
   const u=units.find(u=>u.id===e.from),target=units.find(u=>u.id===e.to),key=e.from+':'+e.label;
   if(!visible(b,u)||target&&!visible(b,target)||seen.has(key))continue;
   seen.add(key);push(u,e.healing>0?'heal':'tactic',{from:e.from,label:e.label,variant:b.tick,signature:e.label===u.skill,priority:e.label===u.skill?7:5});
  }
  for(const u of units)if(visible(b,u)&&old.status.get(u.id)?.status==='active'){
   if(u.side===0&&u.status==='defeated')push(leader(b,0),'rout',{priority:6});
   else if(u.withdrawing&&!old.status.get(u.id).withdrawing)push(u,'retreat',{priority:6});
  }
  if(b.result&&!old.result){
   // Defeated commanders cannot give a fresh line after leaving the field.
   const winner=b.result.winner,speaker=winner===0?leader(b,0):winner===1?leader(b,1):leader(b,0);
   push(speaker,winner===0?'victory':winner===1?'victory':'draw',{priority:10,terminal:true});
   // A surviving withdrawing player may react to defeat without inventing a speaker.
   if(winner===1&&!speaker)push(units.find(u=>u.side===0&&u.hp>0&&visible(b,u)),'defeat',{priority:10,terminal:true});
  }
  return ranked(out);
 }
}

// Read only the player's factual activity ledger. Never infer enemy outcomes
// from hidden state; loading, changing perspective or leaving the map primes it.
export class StrategicVoiceReader{
 constructor(){this.state=null;this.faction=null;this.sequence=null;}
 read(s,{faction=s.campaign?.playerFaction||'cao',audible=true}={}){
  const ledger=s.campaign?.activity,sequence=ledger?.nextSequence;
  if(!ledger){this.state=null;this.sequence=null;return [];}
  const old=this.state===s&&this.faction===faction?this.sequence:null;
  this.state=s;this.faction=faction;this.sequence=sequence;
  if(old===null||!audible||sequence<=old)return [];
  const out=[];
  for(const n of ledger.nodes){
   if(n.sequence<old||n.faction!==faction||n.read||!n.officerId)continue;
   let event;
   if(n.phase==='complete'&&['building','technology'].includes(n.result?.reward?.kind))event='complete';
   else if(n.category==='talent'&&n.phase==='discovered')event='discovered';
   else if(n.category==='talent'&&n.phase==='signed')event='recruit';
   else if(n.category==='personnel'&&n.phase==='SCOUT_INTEL')event='scout';
   if(!event)continue;
   const c=cue({id:n.officerId,...s.campaign.idle?.find(r=>r.unit.id===n.officerId)?.unit},event,{priority:['complete','recruit'].includes(event)?8:6,variant:n.sequence,sovereign:isVoiceRuler(s,n.officerId,faction)});
   if(c)out.push(c);
  }
  return ranked(out);
 }
}
