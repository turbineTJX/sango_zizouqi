import {cityPersonnel} from './city-personnel.mjs';
import {cityRoads} from './road-network.mjs';
import {intelligenceWorld} from './strategic-vision.mjs';
import {activePlans,plannedOfficer} from './strategic-intent.mjs';
import {diplomaticAssignment,factionsHostile} from './diplomacy-relations.mjs';
import {pendingDomesticOrder} from './domestic.mjs';
import {officerRecommendation} from './officer-recommendation.mjs';
import {STRATEGIC_PLANNING_RULES} from './data/design/strategic-planning-rules.mjs';

const rules=()=>STRATEGIC_PLANNING_RULES.personnel;
export function personnelCityProfile(s,c,{departing=[]}={}){
 const view=intelligenceWorld(s,c.owner),own=new Set(s.cities.filter(x=>x.owner===c.owner).map(x=>x.id));
 const border=cityRoads(s).some(([a,b])=>a===c.id&&!own.has(b)||b===c.id&&!own.has(a));
 const incoming=view.armies.some(a=>factionsHostile(s,a.faction,c.owner)&&a.travel?.to===c.id);
 const operational=activePlans(s).some(p=>p.faction===c.owner&&(p.phase!=='consolidate'&&p.staging===c.id||p.phase==='consolidate'&&p.target===c.id));
 const front=border||incoming||operational,ignore=new Set(departing);
 const available=cityPersonnel(s,c.id).filter(o=>!o.unit.mission&&!o.unit.scouting&&!diplomaticAssignment(s,o.unit.id)&&(ignore.has(o.unit.id)||!plannedOfficer(s,o.unit.id)&&!pendingDomesticOrder(s,o.unit.id)));
 const military=u=>officerRecommendation(s,u,{task:'expedition',city:c.id}).score;
 const keepOfficerIds=front?[...available].sort((a,b)=>military(b.unit)-military(a.unit)||a.unit.id.localeCompare(b.unit.id)).slice(0,rules().frontKeepOfficers).map(o=>o.unit.id):[];
 const guards=available.filter(o=>o.cityUnit&&o.unit.troops>0).map(o=>o.unit);
 return {role:front?'front':'rear',border,operational,incoming,keepOfficerIds,guards,
  minimumGuardUnits:front?Math.min(rules().frontGuardUnits,guards.length):0,
  minimumGuardTroops:front?Math.min(rules().frontGuardTroops,guards.reduce((n,u)=>n+u.troops,0)):0};
}
export function staffingDepartureError(s,c,ids,profile=null){
 const p=profile||personnelCityProfile(s,c,{departing:ids});if(p.role!=='front')return null;
 if(ids.some(id=>p.keepOfficerIds.includes(id)))return '前线保留主要军事人才，另选内政调任人选';
 const staying=p.guards.filter(u=>!ids.includes(u.id));
 if(staying.length<p.minimumGuardUnits||staying.reduce((n,u)=>n+u.troops,0)<p.minimumGuardTroops)return '前线保留实际驻城守备，不将城墙或在途援军算作留守部队';
 return null;
}
export function personnelRoleScore(s,u,from,score,fromRole,toRole){
 const military=officerRecommendation(s,u,{task:'expedition',city:from.id}).score;
 const civil=Math.max(u.politics||0,u.intellect||0,u.charm||0),r=rules();
 return score+(toRole==='front'?military*r.frontMilitaryWeight:(civil-military)*r.rearCivilianWeight)
  -(fromRole==='front'&&toRole==='rear'?military*r.frontDepartureWeight:0);
}
