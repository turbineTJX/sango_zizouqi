import {DIPLOMACY_RULES,DIPLOMACY_DIRECTIONS} from './data/design/diplomacy-rules.mjs';
export const diplomaticPair=(a,b)=>[a,b].sort().join(':');
export function diplomaticAssetReserve(s,faction,kind,cityId=null,exclude=null){return (s.campaign?.diplomacy?.proposals||[]).filter(p=>p.id!==exclude&&['outbound','negotiating','pending','approved'].includes(p.status)&&(!cityId||p.sites[faction]===cityId)).reduce((n,p)=>n+p.clauses.filter(c=>c.from===faction&&!c.deferred&&(c.kind===kind||kind==='grain'&&c.kind==='supply')).reduce((t,c)=>t+c.amount,0),0);}
export function diplomaticFeeReserve(s,faction,cityId=null){const d=s.campaign?.diplomacy,p=d?.policies[faction];if(!p)return 0;const appointments=d.assignments.filter(a=>a.faction===faction&&!a.dismissed&&(!cityId||a.homeCity===cityId)),missions=[...s.cities.flatMap(c=>c.units),...s.campaign.idle.map(o=>o.unit)].filter(u=>u.mission?.type==='diplomacy'&&u.mission.faction===faction&&(!cityId||u.mission.homeCity===cityId)),fees=p.feeTurn===Math.floor((s.campaign.day-1)/10)?p.fees:0,planned=appointments.filter(a=>!a.projectId).reduce((n,a)=>n+DIPLOMACY_DIRECTIONS[a.direction].fee,0)+missions.length*DIPLOMACY_RULES.dailyFare*10;return Math.max(0,Math.min(p.feeBudget-fees,planned));}
export const diplomaticAssignment=(s,id)=>s.campaign?.diplomacy?.assignments.find(a=>a.officerId===id);
export const diplomaticClauses=s=>(s.campaign?.diplomacy?.contracts||[]).flatMap(p=>p.clauses.map(c=>({p,c})));
export const activeDiplomaticClause=(s,p,c)=>p.status==='signed'&&c.status==='active'&&c.effectiveDay<=s.campaign.day&&(c.untilDay===null||s.campaign.day<=c.untilDay);
let clauseQueries=null;
export function withDiplomaticQueries(evaluate){
 if(clauseQueries)return evaluate();clauseQueries=new WeakMap();
 try{return evaluate();}finally{clauseQueries=null;}
}
// Search live contracts in their saved order. Expired history remains saved,
// but frequent route/threat queries need not allocate every historical clause.
function findActiveClause(s,accept){
 if(clauseQueries){
  let active=clauseQueries.get(s);
  if(!active){active=[];for(const p of s.campaign?.diplomacy?.contracts||[])if(p.status==='signed')for(const c of p.clauses)if(activeDiplomaticClause(s,p,c))active.push({p,c});clauseQueries.set(s,active);}
  return active.find(({p,c})=>accept(p,c));
 }
 for(const p of s.campaign?.diplomacy?.contracts||[]){
  if(p.status!=='signed')continue;
  for(const c of p.clauses)if(activeDiplomaticClause(s,p,c)&&accept(p,c))return {p,c};
 }
}
export function diplomaticProtection(s,a,b){return findActiveClause(s,(p,c)=>((c.from===a&&c.to===b)||(['peace','alliance'].includes(c.kind)&&c.from===b&&c.to===a))&&['peace','nonaggression','alliance'].includes(c.kind));}
export function factionsHostile(s,a,b){
 if(a===b)return false;if(!s.campaign?.diplomacy)return true;
 if(a==='neutral'||b==='neutral')return true;
 if(diplomaticProtection(s,a,b)||diplomaticProtection(s,b,a))return false;
 return s.campaign.diplomacy.wars[diplomaticPair(a,b)]?.active===true;
}
export const factionsAllied=(s,a,b)=>a===b||!!findActiveClause(s,(p,c)=>c.kind==='alliance'&&p.factions.includes(a)&&p.factions.includes(b));
export function diplomaticPassage(s,faction,node,kind='military',contractId=null,army=null){
 const owner=(s.cities.find(c=>c.id===node)||s.junctions?.find(c=>c.id===node))?.owner;
 if(!owner||owner==='neutral'||owner===faction)return true;
 const kinds=kind==='trade'?['tradePass']:kind==='envoy'?['envoyPass']:kind==='station'?['station']:['militaryPass','station'];
 return !!findActiveClause(s,(p,c)=>c.from===owner&&c.to===faction&&kinds.includes(c.kind)&&(!contractId||p.id===contractId)&&(!c.cityId||c.cityId===node)&&(!c.route?.length||c.route.includes(node))&&(!army||(!c.armyIds?.length||c.armyIds.includes(army.id))&&(!c.officerIds?.length||army.units.every(u=>c.officerIds.includes(u.id)))&&(!c.troopCap||army.units.reduce((n,u)=>n+u.troops,0)<=c.troopCap)));
}
export function militaryAidRestricted(s,from,recipient){return !!findActiveClause(s,(p,c)=>c.kind==='restrictAid'&&c.from===from&&c.enemy===recipient);}
export function protectedDiplomaticTraffic(s,from,other,contractId,envoyOfficerId=null){
 if(from===other||!factionsHostile(s,from,other))return true;
 const d=s.campaign?.diplomacy,p=d?.contracts.find(p=>p.id===contractId&&p.status==='signed');
 if(envoyOfficerId){const visit=[...(d?.proposals||[]),...(d?.contracts||[])].find(p=>p.id===contractId&&p.visitPermit?.officerId===envoyOfficerId&&p.visitPermit.untilDay>=s.campaign.day&&p.factions.includes(from)&&p.factions.includes(other));if(visit)return true;}
 return !!p&&p.factions.includes(from)&&p.factions.includes(other)&&p.clauses.some(c=>c.kind===(envoyOfficerId?'envoyPass':'tradePass')&&c.from===other&&c.to===from&&activeDiplomaticClause(s,p,c));
}
