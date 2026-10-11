import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const out=resolve(args.out||'work/ai-unification-20261010/guandu-200-20261010');
const path=join(out,args.save||'checkpoint-save.json'),s=JSON.parse(await readFile(path,'utf8'));
const config=JSON.parse(await readFile(join(out,'run-config.json'),'utf8'));
const {strategicPower}=await import(pathToFileURL(join(config.source,'strategic-ai.mjs')));
const {cityForce}=await import(pathToFileURL(join(config.source,'city-units.mjs')));
const reasons={};
const factions=Object.fromEntries(Object.entries(s.campaign.ai.factions).map(([f,p])=>{
 const cities=s.cities.filter(c=>c.owner===f),units=cities.flatMap(c=>c.units),idle=s.campaign.idle.filter(o=>o.faction===f&&!o.destination);
 const rows=p.strategy.trace.flatMap(t=>t.admission);for(const a of rows){const k=a.stage+':'+a.reason;reasons[k]=(reasons[k]||0)+1;}
 return [f,{cities:cities.length,cityTroops:units.reduce((n,u)=>n+u.troops,0),wounded:units.reduce((n,u)=>n+u.wounded,0),gold:cities.reduce((n,c)=>n+c.gold,0),grain:cities.reduce((n,c)=>n+c.grain,0),manpower:cities.reduce((n,c)=>n+c.manpower,0),cityUnits:units.length,idleOfficers:idle.length,domestic:s.campaign.domestic.assignments.filter(a=>cities.some(c=>c.id===a.cityId)).length,cityUnitCounts:cities.reduce((o,c)=>(o[c.units.length]=(o[c.units.length]||0)+1,o),{}),goal:p.strategy.goal,admissionCounts:rows.reduce((o,a)=>(o[a.stage]=(o[a.stage]||0)+1,o),{}),lastAdmissions:p.strategy.trace.at(-1)?.admission||[],plans:s.campaign.ai.plans.filter(p=>p.faction===f&&!['complete','cancelled'].includes(p.phase)),supports:s.campaign.ai.supports.filter(p=>p.faction===f)}];
}));
const clauses=s.campaign.diplomacy.contracts.filter(p=>p.status==='signed').map(p=>({id:p.id,factions:p.factions,goal:p.goal,clauses:p.clauses.filter(c=>c.status==='active').map(c=>({kind:c.kind,from:c.from,to:c.to,enemy:c.enemy,untilDay:c.untilDay}))}));
const guardGaps=s.cities.filter(c=>s.campaign.ai.cities[c.id]).map(c=>({id:c.id,name:c.name,faction:c.owner,units:c.units.length,troops:c.units.reduce((n,u)=>n+u.troops,0),power:Math.round(strategicPower(s,cityForce(c))),defenseNeed:s.campaign.ai.cities[c.id].defenseNeed,gold:c.gold,grain:c.grain,manpower:c.manpower}));
const result={day:s.campaign.day,finished:s.finished,sourceSave:path,factions,guardGaps,activeDiplomacy:clauses,reasons:Object.entries(reasons).sort((a,b)=>b[1]-a[1]),decisions:s.campaign.ai.decisions};
await writeFile(join(out,'checkpoint-diagnosis.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({day:result.day,factions:Object.fromEntries(Object.entries(factions).map(([f,d])=>[f,{cities:d.cities,cityTroops:d.cityTroops,units:d.cityUnits,gold:d.gold,grain:d.grain,manpower:d.manpower,cityUnitCounts:d.cityUnitCounts,goal:d.goal.kind,admission:d.admissionCounts}])),reasons:result.reasons.slice(0,8),guardGaps:guardGaps.filter(c=>c.power<c.defenseNeed).sort((a,b)=>b.defenseNeed-b.power-a.defenseNeed+a.power).slice(0,8),activeDiplomacy:clauses},null,2));
