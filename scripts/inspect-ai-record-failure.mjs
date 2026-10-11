import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const out=resolve('work/ai-unification-20261010/guandu-200-20261010');
const s=JSON.parse(await readFile(join(out,'failed-save.json'),'utf8'));
const keys=['gold','grain','manpower'],valid=(r,signed=false)=>r&&Object.keys(r).sort().join(',')==='gold,grain,manpower'&&keys.every(k=>Number.isFinite(r[k])&&(signed||r[k]>=0));
const failures=[];
for(const n of s.campaign.activity.nodes.filter(n=>n.phase==='harvest')){
 const r=n.result,badCities=r.cities.filter(c=>!valid(c.credited)||!valid(c.work));
 if(!valid(r.recurring)||!valid(r.work)||!valid(r.stocks)||r.net!==null&&!valid(r.net,true)||badCities.length)failures.push({id:n.id,sourceId:n.sourceId,day:n.day,recurring:r.recurring,work:r.work,stocks:r.stocks,net:r.net,badCities});
}
const result={day:s.campaign.day,failedHarvestRecords:failures,stocks:s.cities.filter(c=>failures.some(n=>n.badCities.some(b=>b.id===c.id))).map(c=>({id:c.id,name:c.name,owner:c.owner,grain:c.grain,granary:c.granary,manpower:c.manpower}))};
await writeFile(join(out,'record-failure-diagnosis.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
