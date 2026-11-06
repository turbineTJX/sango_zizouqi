import {armySupplyCapacity} from '../army-supply.mjs';
import {isAIControlled} from '../player-faction.mjs';
import {diplomaticAssetReserve} from '../diplomacy-relations.mjs';

// One projection of real commitments, never a second mutable treasury.
// Requirements are floors for preparation, not bills; only concrete reserved
// loads and promised cargo appear here. Child orders share their parent load.
export function resourceCommitments(s,cityId,key,{excludeDiplomacyId=null,cargoOnly=false}={}){
 const rows=[],plans=(s.campaign.ai?.plans||[]).filter(p=>!['complete','cancelled'].includes(p.phase));
 const orders=s.campaign.domestic?.orders||[],city=s.cities.find(c=>c.id===cityId);
 const add=(kind,owner,amount)=>{if(amount)rows.push({kind,owner,cityId,key,amount});};
 const load=(ids,troops={})=>armySupplyCapacity((city?.units||[]).filter(u=>ids.includes(u.id)).map(u=>({...u,troops:troops[u.id]??u.troops})));
 for(const q of orders)if(q.kind==='transfer'&&q.cityId===cityId&&isAIControlled(s,q.faction))add('cargo',q,q.cargo?.[key]||0);
 add('diplomatic-cargo',null,diplomaticAssetReserve(s,city?.owner,key,cityId,excludeDiplomacyId));
 if(key!=='grain'||cargoOnly)return rows;
 for(const p of plans)add('capture',p,p.reserves[cityId]||0);
 for(const q of orders)if(q.kind==='expedition'&&q.cityId===cityId&&!plans.some(p=>p.reserves[cityId]&&q.officerIds.some(id=>p.officerIds.includes(id))))add('expedition',q,load(q.officerIds,q.troops));
 for(const p of [...(s.campaign.diplomacy?.proposals||[]),...(s.campaign.diplomacy?.contracts||[])]){
  if(p.id===excludeDiplomacyId||!(['outbound','negotiating','pending','approved'].includes(p.status)||p.status==='signed'&&p.clauses.some(c=>c.kind==='deploy'&&c.status==='waiting'&&!c.armyId)))continue;
  for(const c of p.clauses)if(c.kind==='deploy'&&c.cityId===cityId)add('diplomatic-deploy',p,load(c.officerIds));
 }
 return rows;
}
