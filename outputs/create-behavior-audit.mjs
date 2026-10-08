import fs from 'node:fs';let s=fs.readFileSync('scripts/audit-normal-ai.mjs','utf8');
s="import {residentOfficer} from '../city-personnel.mjs';\n"+s;
s=s.replace('const shortages=[],expeditions=[],seenArmies=new Set();','const shortages=[],expeditions=[],seenArmies=new Set(),planTrace=[],battleTrace=[],queueTrace=[],seenQueues=new Set(),planVersions=new Map();');
s=s.replace(' const sample=()=>{',` const sample=()=>{
  for(const p of s.campaign.ai.plans){const key=JSON.stringify([p.phase,p.reason]);if(planVersions.get(p.id)===key)continue;planVersions.set(p.id,key);planTrace.push({...structuredClone(p),observedDay:s.campaign.day,actors:p.officerIds.map(id=>{const o=residentOfficer(s,id),a=s.armies.find(a=>a.units.some(u=>u.id===id));return {id,location:o?.location||a?.location,army:a?.id,travel:a?.travel,route:a?.route,troops:o?.unit.troops??a?.units.find(u=>u.id===id)?.troops,mission:o?.unit.mission?.kind};})});}
  for(const q of s.campaign.domestic.orders){const key=q.id+':'+s.campaign.day;if(!seenQueues.has(key)){seenQueues.add(key);queueTrace.push({day:s.campaign.day,...structuredClone(q)});}}
`);
s=s.replace("seenBattles.add(b.id);for(const [i,side]", "seenBattles.add(b.id);battleTrace.push({id:b.id,day:b.endedDay,startedDay:b.startedDay,target:b.cityId,kind:b.kind,attackSide:b.attackSide,report:b.report,sides:b.battle.sides.map(side=>({faction:side.faction,initial:side.units.reduce((n,u)=>n+u.initial,0),remaining:side.units.reduce((n,u)=>n+u.hp,0),retreat:side.retreat}))});for(const [i,side]");
s=s.replace('issues,findings,metrics,expeditions,shortages,plans:', 'issues,findings,metrics,planTrace,battleTrace,queueTrace,expeditions,shortages,plans:');
s=s.replace('expeditions:undefined,shortages:undefined','planTrace:undefined,battleTrace:undefined,queueTrace:undefined,expeditions:undefined,shortages:undefined');
s=s.replace('validateCampaign(JSON.parse(serializeCampaign(s)));\n }catch', 'validateCampaign(JSON.parse(serializeCampaign(s)));await writeFile(`${dir}/${spec.id}-${player}-final-save.json`,serializeCampaign(s));\n }catch');
fs.writeFileSync('scripts/audit-normal-ai-behavior.mjs',s);
