import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PLAYER_CASES,CANDIDATES,HIST_DEV_SEEDS,HIST_VALIDATION_SEEDS,BASE_AI,BASE_PLAYER,fightHistorical,summarizeHistorical,historyName,historicalPlayerState} from './historical-player-lab.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {sourceHash} from './basic-balance-lib.mjs';
import {createHash} from 'node:crypto';

const mode=process.argv[2]||'screen',id=process.argv[3],c=PLAYER_CASES.find(c=>c.id===id);assert.ok(c,'choose guandu, chibi, yiling, wuzhang or hefei');
const root='outputs/historical-player/',source=createHash('sha256').update(sourceHash()).update(readFileSync(new URL('./historical-player-lab.mjs',import.meta.url))).update(readFileSync(new URL('./audit-historical-player.mjs',import.meta.url))).digest('hex'),rows=[],summaries=[];mkdirSync(root,{recursive:true});
const file=root+id+'-'+mode+'.json';let frozen;
if(mode==='validate'||mode==='components')frozen=JSON.parse(readFileSync(root+id+'-frozen.json','utf8'));
const snapshot=()=>writeFileSync(file,JSON.stringify({rulesVersion:RULES_VERSION,sourceHash:source,mode,id,case:c,frozen,rows,summaries},null,2));
const run=(plan,ratio,seeds,tag=plan.id,options={})=>{
 const group=[];
 for(const [i,seed]of seeds.entries()){
  const result=fightHistorical(id,plan,seed,{ratio,replay:i===0&&mode!=='screen',...options});result.tag=tag;rows.push(result);group.push(result);
  if((i+1)%4===0)console.log(id,mode,tag,`${i+1}/${seeds.length}`,result.reason);
 }
 const result={tag,plan,ratio,...summarizeHistorical(group)};summaries.push(result);snapshot();console.log(JSON.stringify(result));return result;
};
assert.ok(HIST_DEV_SEEDS.every(seed=>!HIST_VALIDATION_SEEDS.includes(seed)));
if(mode==='screen'){
 run(BASE_AI,1,HIST_DEV_SEEDS,'AI原兵力');run(BASE_AI,c.pressure,HIST_DEV_SEEDS,'AI压力');run(BASE_PLAYER,c.pressure,HIST_DEV_SEEDS,'原阵手动军略');
 for(const plan of CANDIDATES[id])run(plan,c.pressure,HIST_DEV_SEEDS);
 const best=summaries.filter(s=>CANDIDATES[id].some(p=>p.id===s.tag)).sort((a,b)=>b.wins-a.wins||b.draws-a.draws||b.remaining-a.remaining||a.tag.localeCompare(b.tag))[0];
 run(best.plan,1,HIST_DEV_SEEDS,'推荐原兵力');
 frozen={rulesVersion:RULES_VERSION,sourceHash:source,id,case:c,plan:best.plan,developmentSeeds:HIST_DEV_SEEDS,validationSeeds:HIST_VALIDATION_SEEDS,
  targets:{pressureWinRate:.5,pressureGainOverFixedAI:.25},selectedFrom:summaries.filter(s=>CANDIDATES[id].some(p=>p.id===s.tag)).map(s=>({tag:s.tag,wins:s.wins,draws:s.draws,remaining:s.remaining}))};
 writeFileSync(root+id+'-frozen.json',JSON.stringify(frozen,null,2));snapshot();
}else if(mode==='validate'){
 assert.equal(frozen.sourceHash,source,'engine changed after plan freeze');
 run(BASE_AI,1,HIST_VALIDATION_SEEDS,'AI原兵力');run(BASE_AI,c.pressure,HIST_VALIDATION_SEEDS,'AI压力');
 run({...BASE_PLAYER,policy:frozen.plan.policy},c.pressure,HIST_VALIDATION_SEEDS,'原阵手动军略');
 run(frozen.fullPlan||frozen.plan,1,HIST_VALIDATION_SEEDS,'推荐原兵力');run(frozen.plan,c.pressure,HIST_VALIDATION_SEEDS,'推荐压力');
 const state=historicalPlayerState(id,frozen.plan,198000+({guandu:200,chibi:208,yiling:222,wuzhang:234,hefei:215}[id]),{ratio:c.pressure,lock:false});
 writeFileSync(root+id+'-推荐布阵.json',JSON.stringify(state,null,2));
 const full=historicalPlayerState(id,frozen.fullPlan||frozen.plan,198000+({guandu:200,chibi:208,yiling:222,wuzhang:234,hefei:215}[id]),{lock:false});
 writeFileSync(root+id+'-推荐原兵力.json',JSON.stringify(full,null,2));
}else if(mode==='components'){
 assert.equal(frozen.sourceHash,source,'engine changed after plan freeze');const seeds=HIST_VALIDATION_SEEDS.slice(0,8),plan=frozen.plan;
 run({...plan,id:'仅首发与队列',weights:undefined,types:undefined,formation:'original'},c.pressure,seeds);
 // Fixed orders are a separate legal controller, with the same deployment.
 run({...plan,id:'固定军略',policy:'fixed'},c.pressure,seeds);
 if(id!=='hefei')run({...plan,id:'反向后备',reverseQueue:true},c.pressure,seeds);
 snapshot();
}else throw Error('unknown audit mode');
console.log('COMPLETE',historyName(id),mode);
