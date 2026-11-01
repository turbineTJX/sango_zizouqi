import {battleWounded} from './engine.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {OFFICER_FATE_RULES} from './data/design/officer-fate-rules.mjs';

// Called after actual troop/wound writeback, before officer fates and army cleanup.
// Historical battle wounds remain unchanged; this receipt records their transfer.
export function settleCapturedWounded(s,r){
 if(r.woundedCapture)return r.woundedCapture;
 if(!r.battle.result)return null;
 const b=r.battle,receipt={rate:OFFICER_FATE_RULES.woundedCaptureRate,available:0,received:0,transfers:[]};
 r.woundedCapture=receipt;
 const winner=b.result?.winner;
 if(winner===undefined||winner===null||r.diplomaticCeasefire)return receipt;
 const actual=u=>{
  if(u.isDecoy||u.cityGuard||u.retreatDispatched||u.status==='withdrawn'||u.arrivalConfirmed===false||(u.arrivalTick||0)>b.tick)return null;
  const army=s.armies.find(a=>a.id===u.armyId&&!a.disbanded),unit=army?.units.find(v=>v.id===u.id);
  return unit?{battle:u,unit}:null;
 };
 const receivers=b.sides[winner].units.filter(u=>u.hp>0).map(actual).filter(Boolean).sort((a,b)=>a.unit.id.localeCompare(b.unit.id));
 const donors=b.sides[1-winner].units.map(actual).filter(Boolean).sort((a,b)=>a.unit.id.localeCompare(b.unit.id));
 for(const donor of donors){
  const available=Math.min(battleWounded(donor.battle),donor.unit.wounded);
  receipt.available+=available;
  let remaining=Math.floor(available*receipt.rate);
  for(const receiver of receivers){
   const amount=Math.min(remaining,Math.max(0,troopCapacity(receiver.unit)-receiver.unit.troops-receiver.unit.wounded));
   if(!amount)continue;
   donor.unit.wounded-=amount;receiver.unit.wounded+=amount;remaining-=amount;receipt.received+=amount;
   receipt.transfers.push({from:donor.unit.id,to:receiver.unit.id,fromArmyId:donor.battle.armyId,toArmyId:receiver.battle.armyId,amount});
   if(!remaining)break;
  }
 }
 return receipt;
}

export function validWoundedCapture(r){
 const receipt=r.woundedCapture,b=r.battle,int=n=>Number.isSafeInteger(n)&&n>=0;
 if(!receipt||receipt.rate!==OFFICER_FATE_RULES.woundedCaptureRate||!int(receipt.available)||!int(receipt.received)||!Array.isArray(receipt.transfers))return false;
 const winner=b.result?.winner;
 if(winner===null||winner===undefined||r.diplomaticCeasefire)return !receipt.available&&!receipt.received&&!receipt.transfers.length;
 const donors=new Map(b.sides[1-winner].units.map(u=>[u.id,u])),receivers=new Map(b.sides[winner].units.map(u=>[u.id,u])),used=new Map();
 let total=0;
 for(const t of receipt.transfers){
  const from=donors.get(t.from),to=receivers.get(t.to);
  if(!from||!to||from.armyId!==t.fromArmyId||to.armyId!==t.toArmyId||!int(t.amount)||!t.amount||to.hp<=0||[from,to].some(u=>u.isDecoy||u.cityGuard||u.retreatDispatched||u.status==='withdrawn'||u.arrivalConfirmed===false||(u.arrivalTick||0)>b.tick))return false;
  total+=t.amount;used.set(t.from,(used.get(t.from)||0)+t.amount);
 }
 return total===receipt.received&&receipt.received<=Math.floor(receipt.available*receipt.rate)&&receipt.available<=b.sides[1-winner].units.reduce((n,u)=>n+battleWounded(u),0)&&[...used].every(([id,n])=>n<=Math.floor(battleWounded(donors.get(id))*receipt.rate));
}

export function woundedCaptureMarkup(receipt){return receipt?.received?`<p class="battle-wounded-capture">胜方接收敌方伤兵 ${receipt.received.toLocaleString('zh-CN')} 人，仍须休养恢复。</p>`:'';}
