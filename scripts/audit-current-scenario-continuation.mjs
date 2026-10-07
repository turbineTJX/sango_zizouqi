import assert from 'node:assert/strict';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {fillFactionAppointments} from '../faction-affairs.mjs';
import {factionGold} from '../talent-core.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('='))),days=Number(args.days||60),base='outputs/scenario-economy';
const manifest=JSON.parse(await readFile(`${base}/runtime-manifest.json`,'utf8')),raw=`${manifest.runtimeDirectory}/outputs/scenario-economy`,out=`${base}/current-continuation`;
await mkdir(out,{recursive:true});
const files=['strategic-campaign.mjs','strategic-ai.mjs','domestic.mjs','diplomacy.mjs','diplomacy-relations.mjs','data/design/diplomacy-rules.mjs','data/design/economy-rules.mjs','scripts/audit-current-scenario-continuation.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));
const sources=await hashes();
const inputs=[...(await readdir(raw)).filter(n=>/-360-save\.json$/.test(n)).map(n=>({file:`${raw}/${n}`,id:n.replace('-save.json',''),kind:'natural',seed:Number(n.split('-').find(x=>['417','1709'].includes(x)))})),...(await readdir(`${raw}/warfare`)).filter(n=>/-180-save\.json$/.test(n)).map(n=>({file:`${raw}/warfare/${n}`,id:n.replace('-save.json',''),kind:'warfare',seed:2027}))].filter(r=>!args.seed||r.seed===Number(args.seed));
const sum=(rows,fn)=>rows.reduce((n,r)=>n+fn(r),0);
for(const input of inputs){
 const state=JSON.parse(await readFile(input.file,'utf8')),start=performance.now(),startDay=state.campaign.day,factions=Object.keys(state.campaign.diplomacy.policies),rows=[],issues=[];let error=null,guard=0;
 function sample(){for(const f of factions){const cities=state.cities.filter(c=>c.owner===f),armies=state.armies.filter(a=>a.faction===f&&!a.disbanded);rows.push({day:state.campaign.day,faction:f,cities:cities.length,gold:factionGold(state,f),grain:sum(cities,c=>c.grain),manpower:sum(cities,c=>c.manpower),hungryCities:cities.filter(c=>c.hunger>0).map(c=>({id:c.id,hunger:c.hunger})),hungryArmies:armies.filter(a=>a.hunger>0).map(a=>({id:a.id,hunger:a.hunger}))});}}
 try{
  assert.equal(serializeCampaign(validateCampaign(structuredClone(state))),serializeCampaign(state),'Current loader must preserve the complete state');sample();
  console.log(JSON.stringify({phase:'start',case:input.id,startDay,days}));
  while(state.campaign.day<startDay+days&&!state.finished){assert.ok(guard++<days*20,'The daily engine stopped advancing');if(performance.now()-start>600000)throw Error('Continuation exceeded its wall-time budget');const day=state.campaign.day;
   if(state.campaign.phase==='planning'){fillFactionAppointments(state);assert.equal(beginExecution(state),null);}
   for(const b of activeBattles(state).filter(b=>b.awaiting))assert.equal(chooseEncounter(state,b.id,false),null);
   advanceCampaignDay(state);if(state.campaign.day!==day){sample();if((state.campaign.day-startDay)%10===0)validateCampaign(JSON.parse(serializeCampaign(state)));}
  }
  const saved=serializeCampaign(state);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);await writeFile(`${out}/${input.id}-save.json`,saved);
 }catch(e){error=e.stack;await writeFile(`${out}/${input.id}-failed-save.json`,serializeCampaign(state));}
 for(const r of rows)if(r.cities&&(r.hungryCities.some(c=>c.hunger>=3)||r.hungryArmies.some(a=>a.hunger>=3)||r.gold<300))issues.push(r);
 const after=await hashes(),changedSources=files.filter(f=>after[f]!==sources[f]);
 const result={input,startDay,completedDay:state.campaign.day,days,finished:state.finished||null,error,changedSources,sources,complete:!error&&!changedSources.length&&(state.campaign.day>=startDay+days||!!state.finished),rows,issues,seconds:Math.round((performance.now()-start)/1000),scope:'Load the full audited state with current workspace code, then continue 60 real days under unchanged AI, economics, supply, diplomacy and combat; selected player delegates domestic vacancies only. This is a current-code save/load and continuation check, not a replacement for the fresh-start annual audit.'};
 await writeFile(`${out}/${input.id}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({phase:'finish',case:input.id,day:state.campaign.day,complete:result.complete,error,changedSources,issues:issues.length,seconds:result.seconds}));if(!result.complete)process.exitCode=1;
}
