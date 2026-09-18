import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TACTICAL_CAMPAIGNS,scenarioTroops} from '../tactical-campaigns.mjs';
import {sample} from './tactical-balance-lib.mjs';
import {RULES_VERSION,COMBAT} from '../combat-rules.mjs';
const count=Number(process.argv[2]||128),start=Number(process.argv[3]||2700000);
if(!Number.isInteger(count)||count<1||!Number.isInteger(start))throw new Error('Invalid sample count or seed');
const files=['engine.mjs','tactics.mjs','passives.mjs','combat-rules.mjs','unit-stats.mjs','troop-capacity.mjs','tactical-campaigns.mjs','scenarios.mjs','battle-ai.mjs','tactic-outcomes.mjs','tactic-power.mjs','engagement.mjs','terrain-rules.mjs','expanded-tactics.mjs','famous-officers.mjs','progression.mjs','officer-roster.mjs','officer-catalog.mjs','relationships.mjs','hex-grid.mjs','data/officers.mjs','data/officer-traits.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL('../'+f,import.meta.url))).digest('hex')]));
const before=hashes(),results=[];
for(const c of TACTICAL_CAMPAIGNS){
 const orders=['tactical-shu-defense','tactical-lv-cao'].includes(c.id);
 const result={name:c.name,own:scenarioTroops(c,0),enemy:scenarioTroops(c,1),orders,...sample(c.id,count,start,{orders})};
 results.push(result);console.log(c.name,result.wins,result.losses,result.draws,result.meanTicks);
}
const comparisons=[];
for(const c of TACTICAL_CAMPAIGNS.filter(c=>c.id.startsWith('tactical-control'))){
 const original=c.ownTeam.map(u=>u.tactics);
 try{
  c.ownTeam.forEach((u,i)=>u.tactics=[['thrust','phalanx','strike'],['fire','scatter','suppress'],['pierce','repeat','retreatShot']][i]);
  const r=sample(c.id,count,start);comparisons.push({name:c.name,variant:'同兵力改成物理输出配装',...r});console.log('纯输出',c.name,r.wins,r.losses,r.draws);
 }finally{c.ownTeam.forEach((u,i)=>u.tactics=original[i]);}
}
const after=hashes();if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Runtime changed during audit; rerun against current rules');
const data={rulesVersion:RULES_VERSION,tacticGap:COMBAT.tacticGap??null,seedMethod:`seed = ${start} + i × 7919`,count,hashes:before,results,comparisons};
const out=new URL('../docs/tactical-campaigns/',import.meta.url);mkdirSync(out,{recursive:true});
writeFileSync(new URL('audit.json',out),JSON.stringify(data,null,2));
const row=r=>`| ${r.name} | ${r.own?.toLocaleString('zh-CN')||'同基线'} / ${r.enemy?.toLocaleString('zh-CN')||'同基线'} | ${r.wins} / ${r.losses} / ${r.draws} | ${(r.wins/r.count*100).toFixed(1)}% | ${r.meanTicks} |`;
writeFileSync(new URL('实战抽样.md',out),`# 演义推演实战抽样\n\n当前规则 ${RULES_VERSION}，${COMBAT.tacticGap?`战法全局间隔 ${COMBAT.tacticGap} 步。`:`战法按独立冷却、战意和目标条件施放。`}每场 ${count} 个独立种子，${data.seedMethod}。相同种子、配装、布阵和操作得到相同结果；没有预写胜负或场景专用伤害倍率。\n\n| 场景 | 我 / 敌总兵力 | 胜 / 负 / 平 | 我方胜率 | 平均步数 |\n| --- | --- | --- | --- | --- |\n${results.map(row).join('\n')}\n\n前两场与三英战吕布不下达玩家军略；敌军使用正式 AI。蜀军拒曹和兖州争锋使用正式军略接口，由相同的战况评分选择我方合法军略；从零战意、零军略开局，不注入资源或控制状态。统计不等同于玩家胜率。\n\n蜀军拒曹目标是坚守 240 步、城门未失且至少一支守军仍可战；胜利并不要求全歼兵力两倍以上的曹军。\n\n## 配装对照\n\n同样的谋士、兵力、等级和种子，改成合法物理输出配装；这是整套配装的比较，不能把差异全部归因于单一控制效果。\n\n| 场景 | 我 / 敌兵力 | 胜 / 负 / 平 | 胜率 | 平均步数 |\n| --- | --- | --- | --- | --- |\n${comparisons.map(row).join('\n')}\n\n完整逐场结果、剩余兵力、受控单位步数、施法与军略次数和运行文件哈希见 [audit.json](audit.json)。后续规则修改需要重新抽样。\n`);
