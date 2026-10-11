import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve('work/ai-unification-20261010');
const {validateCampaign,advanceCampaignDay}=await import(pathToFileURL(join(root,'indexed-source/strategic-campaign.mjs')));
const s=validateCampaign(JSON.parse(await readFile(join(root,'baseline-day-811.json'),'utf8'))),c=s.cities.find(c=>c.id==='town-8');
let stock=c.manpower;const writes=[];let hungerDays=0;
Object.defineProperty(c,'manpower',{enumerable:true,configurable:true,get:()=>stock,set(value){if(value>30000&&value!==stock||stock>30000&&value<=30000)writes.push({day:s.campaign.day,before:stock,after:value,stack:new Error().stack});stock=value;}});
while(s.campaign.day<900&&!s.finished){advanceCampaignDay(s);if(s.cities.some(c=>c.hunger>0)||s.armies.some(a=>!a.disbanded&&a.hunger>0))hungerDays++;}
const result={startDay:811,endDay:s.campaign.day,manpowerWrites:writes,hungerDays};
await writeFile(join(root,'guandu-200-20261010/stock-cap-trace.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
