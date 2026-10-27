import {hidden} from './battle-status-rules.mjs';
import {officerVoiceLine} from './officer-voice-lines.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {NATIONAL_FACTIONS} from './national-scenarios.mjs';
import {importantActivityNode} from './activity-nodes.mjs';

export function isVoiceRuler(s,id,faction=s.campaign?.playerFaction||'cao'){
 const source=NATIONAL_FACTIONS[faction]?.leaderSourceId;return source!==undefined&&OFFICER_BY_ID[id]?.sourceId===source;
}

const ranked=(cues,limit=2)=>cues.sort((a,b)=>b.priority-a.priority).slice(0,limit);
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
  this.current=b;this.previous={tick:b.tick,count:effects.length,locked:b.deploymentLocked,result:!!b.result,serials:[b.commandSerial||0,b.enemyCommand?.commandSerial||0]};
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
   if(!e.skill||e.ongoing||e.damageKind==='dot'||e.enchantment||e.intentOnly||e.phase==='cast'||e.militaryOrder||e.abilityKind==='trait'||e.combo)continue;
   const u=units.find(u=>u.id===e.from),target=units.find(u=>u.id===e.to),key=e.from+':'+e.label;
   if(!visible(b,u)||target&&!visible(b,target)||seen.has(key))continue;
   seen.add(key);push(u,e.healing>0?'heal':'tactic',{from:e.from,label:e.label,variant:b.tick,signature:e.label===u.skill,priority:e.label===u.skill?7:5});
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

const reportEvent=n=>{
 if(n.category==='domestic'&&n.phase==='complete'&&importantActivityNode(n))return 'complete';
 if(n.category==='talent'&&n.phase==='signed')return 'recruit';
 if(n.category==='talent'&&n.phase==='discovered')return 'discovered';
 return null;
};

// Observe new player outcomes, then speak only when their report is presented.
// Loading, changing perspective and hidden-tab processing never replay reports.
export class StrategicVoiceReader{
 constructor(){this.state=null;this.faction=null;this.sequence=null;this.pending=new Map();}
 read(s,{faction=s.campaign?.playerFaction||'cao',audible=true,reportIds=[]}={}){
  const ledger=s.campaign?.activity,sequence=ledger?.nextSequence;
  if(!ledger){this.state=null;this.sequence=null;this.pending.clear();return [];}
  const old=this.state===s&&this.faction===faction?this.sequence:null;
  this.state=s;this.faction=faction;this.sequence=sequence;
  if(old===null||!audible||sequence<old){this.pending.clear();return [];}
  if(sequence>old)for(const n of ledger.nodes){
   if(n.sequence>=old&&n.faction===faction&&!n.read&&n.officerId&&reportEvent(n))this.pending.set(n.id,n);
  }
  const out=[],presented=new Set(reportIds);
  for(const [id,n] of this.pending){
   if(n.read){this.pending.delete(id);continue;}
   if(!presented.has(id))continue;
   this.pending.delete(id);
   const event=reportEvent(n),city=s.cities?.find(c=>c.id===n.cityId),context=[city?.name,event==='complete'?'任务完成':event==='recruit'?'人才入仕':'发现人才'].filter(Boolean).join(' · ');
   const c=cue({id:n.officerId,...s.campaign.idle?.find(r=>r.unit.id===n.officerId)?.unit},event,{priority:['complete','recruit'].includes(event)?8:6,variant:n.sequence,sovereign:isVoiceRuler(s,n.officerId,faction),reportId:id,context});
   if(c)out.push(c);
  }
  // One report batch gets one line; the other reports never form a speech queue.
  return ranked(out,1);
 }
}
