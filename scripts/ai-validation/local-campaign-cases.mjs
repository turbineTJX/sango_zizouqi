// Declared synthetic submaps. All distances/terrain come from the original map;
// six real officers per city use the ordinary initializer's stores and troops.
export const LOCAL_CASES=Object.freeze([
 {id:'four-cities',name:'四城双势力',groups:{cao:['xuchang','chenliu'],yuan:['town-12','town-10']}},
 {id:'six-cities',name:'六城三势力',groups:{cao:['xuchang','wan','runan'],yuan:['chenliu','town-12'],'force-7':['town-10']}},
]);

export function buildLocalCampaignInput(api,caseId,{suffix='v1'}={}){
 const recipe=LOCAL_CASES.find(c=>c.id===caseId);if(!recipe)throw Error('Unknown local campaign case');
 const sourceScenario='guandu-200',base=api.nationalWorld(sourceScenario),selected=new Set(Object.values(recipe.groups).flat());
 const nodes=new Set(selected);
 for(const [a,b]of api.cityRoads(base))if(selected.has(a)&&selected.has(b))for(const id of api.adjacentCityPath(base,a,b)||[])nodes.add(id);
 const roads=base.roads.filter(e=>e.every(id=>nodes.has(id))),keys=new Set(roads.map(e=>[...e].sort().join(':')));
 const world={cities:base.cities.filter(c=>selected.has(c.id)).map(c=>({...c,owner:Object.keys(recipe.groups).find(f=>recipe.groups[f].includes(c.id))})),
  roads,junctions:base.junctions.filter(n=>nodes.has(n.id)),roadSegments:Object.fromEntries(Object.entries(base.roadSegments).filter(([k])=>keys.has(k)))};
 const originals=api.nationalRoster(sourceScenario,base.cities),roster=[];
 for(const [faction,cityIds]of Object.entries(recipe.groups)){
  const lord=api.NATIONAL_FACTIONS[faction].leaderSourceId;
  // Keep catalogue/source order except putting the actual ruler in the capital.
  const pool=originals.filter(o=>o.faction===faction).sort((a,b)=>Number(api.OFFICER_BY_ID[b.id].sourceId===lord)-Number(api.OFFICER_BY_ID[a.id].sourceId===lord));
  if(pool.length<cityIds.length*6)throw Error('Not enough real opening officers for '+faction);
  for(const [i,cityId]of cityIds.entries())for(const o of pool.slice(i*6,i*6+6))roster.push({id:o.id,faction,cityId});
 }
 const talentIds=api.OFFICER_CATALOG.filter(u=>api.talentScenarioEntry(sourceScenario,u,world.cities).activityCityIds.length).map(u=>u.id);
 const spec={id:'audit-local-'+caseId+'-'+suffix,name:recipe.name,era:'局部战略验证',year:200,kind:'historical',rosterDistribution:'reference',
  capital:recipe.groups.cao[0],factions:Object.keys(recipe.groups),auditOnly:true,sourceScenario,
  note:'构造的局部剧本；非全国自然局。保留原始路段及默认经济，每城六名真实人员，区域外未登场人员不挤入小图。'};
 return {spec,world,roster,talentIds};
}
