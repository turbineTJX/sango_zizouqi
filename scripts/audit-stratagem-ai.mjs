import {mkdir,writeFile} from 'node:fs/promises';
import {STRATAGEMS} from '../stratagems.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {AI_TEST_SEEDS,stratagemAiFixture,runStratagemAiProbe} from '../tests/helpers/stratagem-ai.mjs';
const out='outputs/stratagem-ai-every',rows=[],failures=[];
await mkdir(out+'/saves',{recursive:true});
for(const [key,s]of Object.entries(STRATAGEMS))for(const side of [0,1]){
 for(const [group,seeds]of Object.entries(AI_TEST_SEEDS))for(const seed of seeds){
  const state=stratagemAiFixture(key,side,seed);
  try{rows.push({...runStratagemAiProbe(state,key,side),group,passed:true});if(group==='validation'&&seed===seeds[0])await writeFile(`${out}/saves/${key}-side-${side}.json`,JSON.stringify(state));}
  catch(e){failures.push({key,name:s.name,side,seed,group,message:e.message});await writeFile(`${out}/failed-${key}-${side}-${seed}.json`,JSON.stringify(state));}
 }
 const seed=AI_TEST_SEEDS.validation[1],state=stratagemAiFixture(key,side,seed,false);
 try{rows.push({...runStratagemAiProbe(state,key,side,{positive:false}),group:'negative',passed:true});}
 catch(e){failures.push({key,name:s.name,side,seed,group:'negative',message:e.message});await writeFile(`${out}/failed-negative-${key}-${side}-${seed}.json`,JSON.stringify(state));}
}
const summary=Object.entries(STRATAGEMS).map(([key,s])=>{
 const positive=rows.filter(r=>r.key===key&&r.condition),negative=rows.filter(r=>r.key===key&&!r.condition),ticks=positive.map(r=>r.tick);
 return {key,name:s.name,ai:s.ai,autoCast:positive.length,expectedAutoCast:8,hold:negative.length,expectedHold:2,tickMin:Math.min(...ticks),tickMax:Math.max(...ticks),resumed:positive.filter(r=>r.resumedBeforeCast&&r.resumedAfterCast).length};
});
const result={rulesVersion:RULES_VERSION,scope:'机制验收；合法武将、固定战法、自然军略充能和正式stepBattle自动下令；仅固定无关战斗条件，不注入进度、不手动下军略。非胜率或平衡结论。',seeds:AI_TEST_SEEDS,summary,rows,failures};
await writeFile(out+'/result.json',JSON.stringify(result,null,2));
await writeFile(out+'/result.md',`# 十五种军略逐项AI验收\n\n规则${RULES_VERSION}。4个种子（2个开发、2个独立验证），双方交换；每项8次AI自动施放及2次条件不足。正式充能、stepBattle自动选择与施放，没有手动下军略或注入进度；验证施放前、施放后的存档续战。无关行动固定，仅用于机制验收，不代表战役平衡。\n\n| 军略 | AI配置 | 自动施放 | 条件不足保留进度 | 施放回合 | 读档续战 |\n| --- | --- | --- | --- | --- | --- |\n${summary.map(r=>`| ${r.name} | ${r.ai} | ${r.autoCast}/8 | ${r.hold}/2 | ${r.tickMin}～${r.tickMax} | ${r.resumed}/8 |`).join('\n')}\n\n原始记录见 result.json，独立验证种子的双方存档见 saves/；失败记录另存 failed-*.json。当前失败${failures.length}例。\n`);
console.log(JSON.stringify({strategies:summary.length,autoCast:rows.filter(r=>r.condition).length,held:rows.filter(r=>!r.condition).length,failures:failures.length}));if(failures.length)process.exitCode=1;
