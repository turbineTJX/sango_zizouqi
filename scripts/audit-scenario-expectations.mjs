import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {SCENARIOS,createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,issueCommand,battleStratagems,STRATAGEMS,validateSave} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {TACTICS_BOOK} from '../tactics.mjs';
import {isMelee} from '../engagement.mjs';
import {COMBAT,RULES_VERSION} from '../combat-rules.mjs';

const count=Number(process.argv[2]||32),start=2700000;
assert.ok(Number.isInteger(count)&&count>0);
const out=`docs/scenario-review-v${RULES_VERSION}`;mkdirSync(out,{recursive:true});
const files=[...readdirSync('.').filter(f=>f.endsWith('.mjs')&&!f.startsWith('art-')&&!['local-art-server.mjs','server.mjs','strategic-map-art.mjs'].includes(f)),...readdirSync('data').filter(f=>f.endsWith('.mjs')).map(f=>'data/'+f),'battle-effects.mjs','scripts/audit-scenario-expectations.mjs'];
const hashes=()=>Object.fromEntries([...new Set(files)].map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]));
const initialHashes=hashes();
const avg=xs=>xs.length?+(xs.reduce((n,x)=>n+x,0)/xs.length).toFixed(1):null;
const median=xs=>{if(!xs.length)return null;const a=[...xs].sort((a,b)=>a-b);return +((a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2).toFixed(1);};
const low=s=>s.threshold>0&&s.threshold<=30;
const damageIds=new Set(['thrust','strike','fire','repeat','scatter','rush','retreatShot','cleave','bombard','ram','navalRam','broadside','wildfire','doubt']);

function fight(c,seed,orders,{resumeCheck=false}={}){
  const state=createScenario(c.id,seed),b=state.battle;lockDeployment(b);
  const tracks=b.sides.flatMap(s=>s.units).map(u=>({id:u.id,side:u.side,name:u.name,type:u.type,tactics:[...u.tactics],initial:u.initial,activeSteps:0,peakIntent:0,first:{}}));
  const units=b.sides.flatMap(s=>s.units);const dailyLoss=[];let lastDamage=0,ordersUsed=0,cinematics=0,breakthrough=false,resumed=null;
  const command=b=>{if(orders&&b.commandProgress>=12000){const key=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);if(key&&!issueCommand(b,key))return 1;}return 0;};
  while(!b.result){
    assert.ok(b.tick<c.limit,`${c.id}: failed to terminate`);
    const frontAlive=b.sides[1].units.some(u=>u.status==='active'&&u.hp>0&&isMelee(u));
    ordersUsed+=command(b);stepBattle(b);
    if(resumed){command(resumed.battle);stepBattle(resumed.battle);}
    if(resumeCheck&&!resumed&&b.tick===24)resumed=validateSave(structuredClone(state));
    for(const side of b.sides){const active=side.units.filter(u=>u.status==='active');assert.ok(active.length<=6);}
    const active=units.filter(u=>u.status==='active');assert.equal(new Set(active.map(u=>`${u.x}:${u.y}`)).size,active.length);
    for(let i=0;i<units.length;i++){
      const u=units[i],t=tracks[i];assert.ok(Number.isFinite(u.hp)&&u.hp>=0&&u.hp<=u.maxHp);
      assert.ok(Number.isInteger(u.intent)&&u.intent>=0&&u.intent<=100);
      if(u.status==='active'){t.activeSteps++;assert.ok((u.arrivalTick||0)<=b.tick);}
      t.peakIntent=Math.max(t.peakIntent,u.intent);
      for(const [id,n]of Object.entries(u.tacticCasts))if(n)t.first[id]??=b.tick;
    }
    const damage=units.reduce((n,u)=>n+(u.battleDamage||0),0);
    if(b.tick%12===0||b.result){dailyLoss.push({tick:b.tick,loss:damage-lastDamage});lastDamage=damage;}
    const casts=new Set(b.effects.filter(e=>e.phase!=='cast'&&!e.ongoing&&e.skill&&!e.combo).map(e=>`${e.side}:${e.from}:${e.label}`));cinematics+=casts.size;
    if(frontAlive&&b.effects.some(e=>e.side===0&&e.text==='突入后阵'))breakthrough=true;
  }
  if(resumed)assert.deepEqual(resumed.battle,b,`${c.id}: save continuation diverged`);
  if(resumeCheck)validateSave(structuredClone(state));
  if(b.result.reason==='城门失守')assert.equal(b.siege.gate.hp,0);
  if(b.result.reason==='坚守成功'){assert.equal(b.tick,c.holdUntil);assert.equal(b.result.winner,0);assert.ok(b.siege.gate.hp>0);}
  if(b.result.reason==='击溃')assert.ok(b.sides[1-b.result.winner].units.every(u=>!['active','reserve'].includes(u.status)||u.hp===0));
  return {seed,orders,winner:b.result.winner,reason:b.result.reason,ticks:b.tick,ordersUsed,cinematics,
    // Estimate from the current playback formula; excludes user pauses and rendering overhead.
    estimated1xSeconds:+(b.tick*COMBAT.stepMs/1000+cinematics*1.9).toFixed(1),estimated4xSeconds:+(b.tick*COMBAT.stepMs/4000+cinematics*1.4).toFixed(1),
    remaining:b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0)),gate:b.siege?.gate.hp,breakthrough,dailyLoss,units:tracks};
}
function summarize(runs){
  const own=runs.flatMap(r=>r.units.filter(u=>u.side===0&&u.activeSteps>0));
  const eligible=own.flatMap(u=>u.tactics.filter(id=>TACTICS_BOOK[id].threshold===100).map(id=>({unit:u.id,name:u.name,id,cast:!!u.first[id],first:u.first[id]??null,reached:u.peakIntent===100||!!u.first[id]})));
  const perTactic=Object.fromEntries([...new Set(eligible.map(e=>e.id))].map(id=>{const es=eligible.filter(e=>e.id===id);return[id,{name:TACTICS_BOOK[id].name,equipped:es.length,cast:es.filter(e=>e.cast).length,reached:es.filter(e=>e.reached).length,first:median(es.filter(e=>e.cast).map(e=>e.first))}];}));
  return {n:runs.length,wins:runs.filter(r=>r.winner===0).length,losses:runs.filter(r=>r.winner===1).length,draws:runs.filter(r=>r.winner===null).length,
    ticks:avg(runs.map(r=>r.ticks)),minTicks:Math.min(...runs.map(r=>r.ticks)),maxTicks:Math.max(...runs.map(r=>r.ticks)),
    seconds1x:avg(runs.map(r=>r.estimated1xSeconds)),seconds4x:avg(runs.map(r=>r.estimated4xSeconds)),orders:avg(runs.map(r=>r.ordersUsed)),
    openingLoss:avg(runs.map(r=>r.dailyLoss[0]?.loss||0)),dailyLossMedian:median(runs.flatMap(r=>r.dailyLoss.filter(d=>d.tick%12===0).map(d=>d.loss))),
    reasons:Object.fromEntries([...new Set(runs.map(r=>r.reason))].map(reason=>[reason,runs.filter(r=>r.reason===reason).length])),
    firstLow:median(own.flatMap(u=>Object.entries(u.first).filter(([id])=>low(TACTICS_BOOK[id])).map(([,tick])=>tick))),
    firstDamage:median(own.flatMap(u=>Object.entries(u.first).filter(([id])=>damageIds.has(id)).map(([,tick])=>tick))),
    hundred:perTactic,breakthroughs:runs.filter(r=>r.breakthrough).length};
}
const results=[],raw=[];
for(const c of SCENARIOS){
  const modes=[];
  for(const orders of [false,true]){
    const runs=Array.from({length:count},(_,i)=>fight(c,start+i*7919,orders));
    const defaultRun=fight(c,c.seed,orders,{resumeCheck:true});
    modes.push({orders,...summarize(runs),defaultRun});raw.push({id:c.id,orders,runs});
    console.log(c.name,orders?'军略':'无军略',JSON.stringify({wins:modes.at(-1).wins,ticks:modes.at(-1).ticks,reasons:modes.at(-1).reasons}));
  }
  results.push({id:c.id,name:c.name,group:c.historical?'历史':c.campaign?'演义':'演武',difficulty:c.difficulty,goal:c.goal,limit:c.limit,holdUntil:c.holdUntil,modes});
  writeFileSync(`${out}/progress.json`,JSON.stringify(results,null,2));
}
assert.deepEqual(hashes(),initialHashes,'Runtime changed during audit; rerun');
writeFileSync(`${out}/audit.json`,JSON.stringify({createdAt:new Date().toISOString(),rulesVersion:RULES_VERSION,count,start,total:SCENARIOS.length*(count+1)*2,hashes:initialHashes,results},null,2));
writeFileSync(`${out}/runs.json.gz`,gzipSync(JSON.stringify(raw)));
const pct=(n,d)=>`${(n/d*100).toFixed(1)}%`;
const lines=[`# 全场景验证（规则 ${RULES_VERSION}）`,'',`${SCENARIOS.length} 个场景 × ${count} 个种子 × 有／无玩家军略，共 ${SCENARIOS.length*count*2} 场抽样；另跑全部默认种子两种操作共 ${SCENARIOS.length*2} 场，并验证第 24 步存档后的确定性续战。`, '',
'双方使用正式预设布阵、配装和零战意；敌军保持 AI。玩家军略组用现有 AI 在资源足够时发合法军令，未优化布阵与配装，胜率不是人类玩家胜率。抽样种子为 2700000 + i × 7919。未修改战斗数值。','',
'| 场景 | 定位 | 无军略胜率 | 军略胜率 | 平均步数（无／有） | 首 12 步兵损（无／有） | 默认局（无／有） |',
'| --- | --- | --- | --- | --- | --- | --- |',...results.map(r=>{const [a,b]=r.modes;return `| ${r.name} | ${r.difficulty} | ${pct(a.wins,count)} | ${pct(b.wins,count)} | ${a.ticks}／${b.ticks} | ${a.openingLoss}／${b.openingLoss} | ${r.modes.map(m=>`${m.defaultRun.winner===0?'胜':m.defaultRun.winner===1?'负':'平'}·${m.defaultRun.ticks}步·${m.defaultRun.reason}`).join('／')} |`;}),'',
'## 出手顺序与观看时长','',
'首次出手为我方各个实际施放过的战法的首次步数中位数，不同队伍的目标与配装会影响统计；小战法指 1～30 门槛。100 战意使用率的分母为装备该战法且实际上场的部队。首日兵损包含双方战斗受损与可恢复伤兵，不等于永久阵亡。','',
'| 场景（玩家军略组） | 小战法／直接伤害首次步数 | 100 战意战法：施放／上场装备次数 | 估算观看分钟（1×／4×） | 突入后排且前排仍活场次 |',
'| --- | --- | --- | --- | --- |',...results.map(r=>{const m=r.modes[1];return `| ${r.name} | ${m.firstLow??'—'}／${m.firstDamage??'—'} | ${Object.values(m.hundred).map(x=>`${x.name} ${x.cast}/${x.equipped}`).join('；')||'无'} | ${(m.seconds1x/60).toFixed(1)}／${(m.seconds4x/60).toFixed(1)} | ${m.breakthroughs}/${count} |`;}),'',
'观看时间是源码估算，包含结算步与连续战法演出，不是浏览器实测。当前每个战法演出 1× 约 1.9 秒、4× 仍约 1.4 秒；不含玩家暂停、面板阅读和渲染开销。不能把“步数 × 0.7 秒”当成实际观看时长。','',
'## 结束原因','',...results.map(r=>`- ${r.name}：无军略 ${JSON.stringify(r.modes[0].reasons)}；军略 ${JSON.stringify(r.modes[1].reasons)}。`),'',
'每步检查人数上限、格位唯一、兵力／战意边界、援军到达时间；结束时核验城门与坚守目标。全部默认局额外验证保存读取与确定性续战。运行哈希和汇总见 [audit.json](audit.json)，完整逐局数据见 runs.json.gz。',''];
writeFileSync(`${out}/全场景验证.md`,lines.join('\n'));
console.log('COMPLETE',out);
