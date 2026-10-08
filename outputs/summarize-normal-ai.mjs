import fs from 'node:fs';
const a=JSON.parse(fs.readFileSync('outputs/normal-ai-audit-417/summary.json')),b=JSON.parse(fs.readFileSync('outputs/normal-ai-audit-643/summary.json'));
const totals={};for(const r of [...a,...b])for(const [f,m] of Object.entries(r.metrics)){const t=totals[f]??={name:m.name,runs:0,completed:[],captures:[],attacks:[],interrupted:0};t.runs++;t.completed.push(m.completed);t.captures.push(m.captures);t.attacks.push(m.decisions.attack||0);t.interrupted+=m.interrupted;}
console.log(JSON.stringify(totals,null,2));
for(const r of b){const rows=r.shortages.filter(x=>x.men>0&&!x.besieged);console.log(JSON.stringify({scenario:r.scenario,player:r.player,nonSiegeCityDays:rows.length,serious:rows.filter(x=>x.hunger>=3).length,cities:[...new Set(rows.map(x=>x.name))],sample:rows.find(x=>x.hunger>=3),recruit:rows.find(x=>x.work.some(w=>w.key==='recruit'))}));}
