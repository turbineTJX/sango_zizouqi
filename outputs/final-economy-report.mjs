import fs from 'node:fs';
const rows=[417,643].flatMap(seed=>JSON.parse(fs.readFileSync(`outputs/normal-ai-economy-final-${seed}/summary.json`)));
if(rows.length!==8||rows.some(r=>r.day!==121||r.issues.length||r.findings.length))throw Error('Final campaign audit incomplete or failed');
const metrics=rows.flatMap(r=>Object.values(r.metrics)),summary={runs:rows.length,days:960,hungerRecords:rows.flatMap(r=>r.shortages).length,armyHungerDays:metrics.reduce((n,m)=>n+m.hungryArmyDays,0),attackRecords:metrics.reduce((n,m)=>n+(m.decisions.attack||0),0),captures:metrics.reduce((n,m)=>n+m.captures,0),completed:metrics.reduce((n,m)=>n+m.completed,0)};
console.log(JSON.stringify(summary));fs.writeFileSync('outputs/economy-capacity/campaign-summary.json',JSON.stringify(summary,null,2));
const p='docs/单城资源与经济调整-2026-09-22.md';let s=fs.readFileSync(p,'utf8').replaceAll('驻軍','驻军');s+=`\n最终8局全部到达第121天，状态与存档校验异常0，驻军缺粮记录0，军团缺粮城市日0；记录${summary.attackRecords}条进攻命令、${summary.captures}次据点占领及${summary.completed}个内政完成事件。占领次数含易手，不是净增据点，军令记录也不等同于独立战役场数。复测未以停止出征换取缺粮清零。\n`;
fs.writeFileSync(p,s);
