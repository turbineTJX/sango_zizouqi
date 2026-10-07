import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fightHistorical,summarizeHistorical,HIST_VALIDATION_SEEDS} from './historical-player-lab.mjs';
import {sourceHash} from './basic-balance-lib.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
const id=process.argv[2],root='outputs/historical-player/',frozen=JSON.parse(readFileSync(root+id+'-frozen.json','utf8'));
const source=createHash('sha256').update(sourceHash()).update(readFileSync(new URL('./historical-player-lab.mjs',import.meta.url))).update(readFileSync(new URL('./audit-historical-player.mjs',import.meta.url))).digest('hex');
assert.equal(source,frozen.sourceHash,'engine or player controller changed after freeze');
const plan=id==='guandu'?frozen.plan:(frozen.fullPlan||frozen.plan),ratio=id==='guandu'?frozen.case.pressure:1;
const variants=[{...plan,id:'仅首发与队列',weights:undefined,types:undefined,formation:'original'},{...plan,id:'固定军略',policy:'fixed'},...(id==='hefei'?[]:[{...plan,id:'反向后备',reverseQueue:true}])],rows=[],summaries=[];
for(const variant of variants){
 const group=[];
 for(const [i,seed]of HIST_VALIDATION_SEEDS.slice(0,8).entries()){
  const result=fightHistorical(id,variant,seed,{ratio,replay:i===0});rows.push(result);group.push(result);
  if((i+1)%4===0)console.log(id,variant.id,`${i+1}/8`);
 }
 summaries.push({plan:variant,ratio,...summarizeHistorical(group)});
 writeFileSync(root+id+'-components.json',JSON.stringify({rulesVersion:RULES_VERSION,sourceHash:source,frozen,ratio,referencePlan:plan.id,rows,summaries},null,2));
 console.log(JSON.stringify(summaries.at(-1)));
}
