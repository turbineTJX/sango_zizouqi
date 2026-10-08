import {cityRoads,adjacentCityPath} from './road-network.mjs';
import {playerFaction} from './player-faction.mjs';
import {cityUnitRows} from './city-units.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {FACTIONS,battleWounded} from './engine.mjs';
import {relationshipInfo} from './relationships.mjs';
import {compatibilityInfo} from './domestic-cooperation.mjs';
import {diplomaticFeeReserve,diplomaticAssetReserve} from './diplomacy-relations.mjs';

export const TALENT_RULES=Object.freeze({version:2,standardSoldiers:6000,adultAge:16,seekDays:180,graceDays:90});
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const talentTurn=s=>Math.floor((s.campaign.day-1)/10);
export const talentKey=(id,faction)=>`${id}:${faction}`;
export const talentQuality=u=>Math.max(...['leadership','force','intellect','politics','charm'].map(k=>u[k]??0));
export const righteousness=id=>{const raw=OFFICER_BY_ID[id]?.righteousness;return raw>=1&&raw<=5?(raw-1)*25:50;};
export const relation=(s,a,b)=>!a||!b?50:a===b?100:relationshipInfo(a,b,s.relationshipScores,s.relationshipTypes).score;
export function affinityFit(a,b){const {distance}=compatibilityInfo(OFFICER_BY_ID[a],OFFICER_BY_ID[b]);return distance===null?50:100-distance*100/75;}
export function servingPeople(s){
 const result=new Map(cityUnitRows(s).map(o=>[o.unit.id,o]));
 for(const a of s.armies)for(const unit of a.units)result.set(unit.id,{unit,faction:a.faction,location:a.location,army:a});
 for(const o of s.campaign.idle)result.set(o.unit.id,o);
 // A dissolved army can hold returnees until its current encounter settles.
 for(const a of s.armies)for(const o of a.returningOfficers||[])result.set(o.unit.id,o);
 return result;
}
const lordIds=new Map();
export function factionLord(s,faction){
 if(lordIds.has(faction))return lordIds.get(faction);
 const source=FACTIONS[faction]?.leaderSourceId;
 const id=Object.values(OFFICER_BY_ID).find(u=>u.sourceKind==='common'&&u.sourceId===source)?.id||({cao:'cao',yuan:'shao'}[faction])||null;lordIds.set(faction,id);return id;
}
export const isLord=(s,id,faction)=>factionLord(s,faction)===id;
export {factionGold} from './city-resources.mjs';
export {addCityGold} from './city-resources.mjs';
export const cityReserve=(s,c)=>c.budget.goldReserve+diplomaticFeeReserve(s,c.owner,c.id)+diplomaticAssetReserve(s,c.owner,'gold',c.id)+(s.campaign.domestic?.orders||[]).filter(q=>q.kind==='transfer'&&q.cityId===c.id).reduce((n,q)=>n+(q.cargo?.gold||0),0);
export const factionReserve=(s,f)=>s.cities.filter(c=>c.owner===f).reduce((n,c)=>n+cityReserve(s,c),0);
export const cityBesieged=(s,id)=>s.campaign.battles.some(b=>!b.settled&&b.kind==='siege'&&b.cityId===id);
export const nearby=(s,a,b)=>a===b||cityRoads(s).some(([x,y])=>x===a&&y===b||x===b&&y===a);
export function legalRoad(s,a,b){
 return !cityBesieged(s,a)&&!cityBesieged(s,b)&&s.roads.some(([x,y])=>x===a&&y===b||x===b&&y===a)&&!s.armies.some(x=>x.travel&&x.units.some(u=>u.troops>0)&&[x.travel.from,x.travel.to].includes(a)&&[x.travel.from,x.travel.to].includes(b));
}
export const localContact=(s,a,b)=>!cityBesieged(s,a)&&!cityBesieged(s,b)&&(a===b||(()=>{let from=a;const path=adjacentCityPath(s,a,b);return !!path&&path.every(to=>{const ok=legalRoad(s,from,to);from=to;return ok;});})());
export function refreshTalentDemand(s,force=false){
 const t=s.campaign.talent,month=Math.floor(talentTurn(s)/3);
 const signature=JSON.stringify([s.cities.map(c=>[c.id,c.owner,c.units.map(u=>u.id)]),s.armies.map(a=>[a.id,a.faction,a.units.map(u=>u.id)]),s.campaign.idle.map(o=>[o.unit.id,o.faction])]);
 if(!force&&t.demandSignature===signature&&t.demandMonth===month)return;
 t.demandSignature=signature;t.demandMonth=month;
 const factions=new Set([...s.cities.map(c=>c.owner),...servingPeople(s).values()].map(x=>typeof x==='string'?x:x.faction));
 for(const f of factions){
  if(f==='neutral')continue;
  const cities=s.cities.filter(c=>c.owner===f&&(!c.kind||c.kind==='city')).length,seen=new Set();let soldiers=0;
  for(const a of s.armies.filter(a=>a.faction===f&&!a.disbanded)){
   const battle=s.campaign.battles.find(r=>!r.settled&&r.armyIds.includes(a.id));
   for(const u of a.units){if(seen.has(u.id))continue;seen.add(u.id);const live=battle?.battle.sides.flatMap(x=>x.units).find(x=>x.armyId===a.id&&x.id===u.id);soldiers+=live?live.hp+u.wounded+battleWounded(live):u.troops+u.wounded;}
  }
  for(const c of s.cities.filter(c=>c.owner===f))for(const u of c.units)if(!seen.has(u.id)){seen.add(u.id);soldiers+=u.troops+u.wounded;}
  for(const o of s.campaign.idle.filter(o=>o.faction===f))if(!seen.has(o.unit.id)){seen.add(o.unit.id);soldiers+=o.unit.troops+o.unit.wounded;}
  const military=Math.ceil(soldiers/TALENT_RULES.standardSoldiers);
  t.demands[f]={cities,soldiers,demand:Math.max(1,4*cities+military+Math.ceil(.25*military))};
 }
}
export function talentContext(s){
 const serving=servingPeople(s),rosters={};for(const o of serving.values())(rosters[o.faction]??=[]).push(o.unit);
 const factions={};for(const f of new Set([...Object.keys(rosters),...Object.keys(s.campaign.talent.demands)])){
  const units=rosters[f]||[],q=units.map(talentQuality).sort((a,b)=>a-b),n=q.length;
  factions[f]={N:n,D:s.campaign.talent.demands[f]?.demand??1,median:n?(q[Math.floor((n-1)/2)]+q[Math.floor(n/2)])/2:0,lord:factionLord(s,f),units};
 }return {serving,factions};
}
export function willingness(s,id,faction,context=talentContext(s)){
 const f=context.factions[faction]||{N:0,D:1,median:0,lord:factionLord(s,faction),units:[]},q=talentQuality(context.serving.get(id)?.unit||OFFICER_BY_ID[id]);
 const O=f.N<f.D?15:f.N>=Math.ceil(1.25*f.D)?-30:q>=f.median+10?5:-15;
 const A=affinityFit(id,f.lord),R=relation(s,id,f.lord),friends=f.units.filter(u=>u.id!==f.lord&&u.id!==id),friend=friends.length?Math.max(...friends.map(u=>relation(s,id,u.id))):50,F=clamp(.3*(friend-60),0,12);
 let H=0;
 for(const h of s.campaign.talent.records[id]?.defeatHistory||[]){if(h.defeatingFactionId!==faction)continue;const joined=s.campaign.talent.records[h.formerLordId]?.voluntaryFaction;
  if(joined===faction&&context.serving.get(h.formerLordId)?.faction===faction)continue;
  H=Math.max(H,Math.round(.2*righteousness(id)+.2*Math.max(relation(s,id,h.formerLordId)-50,0)));
 }
 return {W:clamp(50+.4*(A-50)+.4*(R-50)+F+O-H,0,100),A,R,F,O,H,friend,N:f.N,D:f.D,Q:q};
}
export const projectNeed=(id,mode='hire')=>Math.round(80+2*Math.max(talentQuality(OFFICER_BY_ID[id])-70,0))+(mode==='persuade'?40:0);
export const progressFor=factor=>factor>1?20:factor===1?12:factor>0?6:0;
export function reassuranceCap(s,id){const idle=s.campaign.talent.records[id]?.idleTurns||0;return idle>=18?55:idle>=9?75:100;}
export const TALENT_REASONS=Object.freeze({ready:'愿意洽谈',unknown:'尚无有效位置情报',range:'不在可通行接洽范围',waiting:'暂不求仕',hardWait:'战后／辞官整理期',rejoin:'暂不接受原势力邀请',cooldown:'接洽冷却',unwilling:'观望／拒绝考虑',loyal:'忠诚稳定，不接受劝说',difference:'改仕意愿不足',invalid:'人物身份或归属已改变',lord:'在位君主不可劝说',full:'进度已满，等待签约复核',limit:'并行接洽名额已占用'});
export function talentEligibility(s,id,faction,cityId,mode,context=talentContext(s),{ignoreCooldown=false}={}){
 const t=s.campaign.talent,record=t.records[id],w=willingness(s,id,faction,context),p=t.projects[talentKey(id,faction)],free=s.campaign.domestic.people.find(p=>p.id===id),owned=context.serving.get(id),now=s.campaign.day;
 const fail=reason=>({ok:false,reason,...w});
 if(!record||s.cities.find(c=>c.id===cityId)?.owner!==faction)return fail('invalid');
 if(mode==='hire'){
  if(!free||free.status!=='FREE'||free.travel)return fail('invalid');
  const k=t.knowledge[faction]?.[id];if(!k?.locationConfirmed||k.lastKnownCityId!==free.cityId)return fail('unknown');
  if(!localContact(s,cityId,free.cityId))return fail('range');
  if(now<record.hardWaitUntilDay)return fail('hardWait');if(now<(record.rejoinBlocks[faction]||0))return fail('rejoin');
  if(record.phase!=='SEEK'&&!(w.W>=85&&Math.max(w.friend,w.R)>=80))return fail('waiting');
 }else {
  if(!owned||owned.faction===faction||owned.faction==='neutral'||owned.army||owned.unit.mission||owned.destination||s.cities.some(c=>c.governor===id))return fail('invalid');
  if(p?.state!=='CLOSED'&&p?.targetFaction&&p.targetFaction!==owned.faction)return fail('invalid');
  if(isLord(s,id,owned.faction))return fail('lord');
  if(!localContact(s,cityId,owned.location))return fail('range');
  if((s.campaign.domestic.loyalty[id]??85)>=70)return fail('loyal');
  if(w.W-willingness(s,id,owned.faction,context).W<15+.2*righteousness(id))return fail('difference');
 }
 if(w.W<60)return fail('unwilling');
 if(!ignoreCooldown&&now<(p?.nextAttemptDay||0))return fail('cooldown');
 return {ok:true,reason:'ready',...w};
}
