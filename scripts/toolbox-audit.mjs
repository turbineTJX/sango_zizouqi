// Exhaustive core loadouts, held officer stats, real intent buildup and both initiatives.
import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment} from '../engine.mjs';
import {availableTactics,roleTacticIds,configureTactics,TACTICS_BOOK} from '../tactics.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

export function combinations(type) {
  const ids=availableTactics({id:'ordinary',type}).map(s=>s.id),out=[];
  for(let i=0;i<4;i++)for(let j=i+1;j<5;j++)for(let k=j+1;k<6;k++)out.push([ids[i],ids[j],ids[k]].sort((a,b)=>TACTICS_BOOK[b].threshold-TACTICS_BOOK[a].threshold));
  return out;
}
export function fixture(type,context,seed=1,profile='force') {
  const state=createScenario('officer-lab',seed,20,['person-99','person-186','person-290']),b=state.battle;
  b.sides[1].units=b.sides[1].units.slice(0,3);
  b.maxTicks=160;
  const own=[[4,3],[2,2],[2,4]],enemy=context==='dense'?[[7,3],[8,3],[8,4]]:context==='charge'?[[6,2],[6,4],[8,3]]:[[10,0],[10,3],[10,6]];
  for(const side of b.sides)for(const [i,u] of side.units.entries()){
    Object.assign(u,{hp:3000,maxHp:3000,initial:3000,troops:3000,intent:0,cooldown:0,skillReady:{},statuses:{},tacticCasts:{},skillCasts:0,level:1,commandBonus:0,deputyBonus:0,advisorBonus:0});
    [u.x,u.y]=(u.side?enemy:own)[i];
    if(u.side){u.type=context==='charge'?'cavalry':context==='ranged'?'crossbow':'spear';u.tactics=roleTacticIds(u,'assault');}
  }
  const u=b.sides[0].units[0];u.type=type;
  if(profile!=='named')Object.assign(u,{id:'toolbox-focal',name:'固定属性测试将',leadership:85,force:profile==='force'?95:30,intellect:profile==='force'?30:95,politics:70});
  b.relationshipScores={};b.relationshipTypes={};
  return state;
}
export function simulate(state,ids,mirror=false) {
  const b=structuredClone(state.battle);let ownSide=0;
  const u=b.sides[0].units[0];assert.equal(configureTactics(u,ids),null);
  if(mirror){b.sides.reverse();for(const [i,side] of b.sides.entries())for(const a of side.units){a.side=i;a.x=13-a.x;a.y=7-a.y;}ownSide=1;}
  lockDeployment(b);let damage=0;
  while(!b.result){stepBattle(b);damage+=b.effects.filter(e=>e.from===u.id&&e.damage>0).reduce((n,e)=>n+e.damage,0);assert.ok(b.tick<=b.maxTicks);}
  const hp=side=>b.sides[side].units.reduce((n,a)=>n+a.hp,0);
  return {margin:hp(ownSide)-hp(1-ownSide),damage,remaining:u.hp,backline:b.sides[ownSide].units.slice(1).reduce((n,a)=>n+a.hp,0),casts:u.tacticCasts};
}
const average=rows=>Object.fromEntries(['margin','damage','remaining','backline'].map(k=>[k,Math.round(rows.reduce((n,r)=>n+r[k],0)/rows.length)]));
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const count=Number(process.argv[2]||4);assert.ok(Number.isInteger(count)&&count>0);
  const results=[],guan=[];
  for(const type of ['spear','cavalry','archer','crossbow'])for(const profile of ['force','intellect'])for(const context of ['dense','charge','ranged']){
    const rows=combinations(type).map(ids=>{
      const runs=[];for(let seed=1;seed<=count;seed++)for(const mirror of [false,true])runs.push(simulate(fixture(type,context,seed,profile),ids,mirror));
      return {ids,...average(runs)};
    }).sort((a,b)=>b.margin-a.margin);
    results.push({type,profile,context,rows});
  }
  for(const context of ['dense','charge','ranged'])for(const role of ['assault','guard','control']){
    const rows=[];for(let seed=1;seed<=count;seed++)for(const mirror of [false,true])rows.push(simulate(fixture('cavalry',context,seed,'named'),roleTacticIds({type:'cavalry'},role),mirror));
    guan.push({context,role,...average(rows)});
  }
  mkdirSync('docs/toolbox-v10',{recursive:true});
  const report={rulesVersion:RULES_VERSION,seeds:count,runs:count*2*(results.length*20+guan.length),results,guan};
  writeFileSync('docs/toolbox-v10/audit.json',JSON.stringify(report,null,2));
  const names=ids=>ids.map(id=>TACTICS_BOOK[id].name).join('、');
  const lines=['# 六选三组合实战抽样','',`规则 ${RULES_VERSION}；${count} 个种子、交换双方先后手，共 ${report.runs} 场。每个兵种、每种固定属性都遍历 20 组；同一组合按门槛从高到低排列，不穷举六种优先级。所有战斗从零战意开始，不人工触发战法，不使用军略。`,'','固定三人阵容、一级武将、3000 兵；敌人分别为密集枪阵、近距离骑兵、分散弩阵。比较战后双方剩余兵力差；这是定位取舍的抽样，不能证明全局平衡或实战最优。','','| 兵种 | 属性侧重 | 敌阵 | 本轮兵力差最高组合 | 兵力差 |','|---|---|---|---|---:|',...results.map(r=>`| ${r.type} | ${r.profile} | ${r.context} | ${names(r.rows[0].ids)} | ${r.rows[0].margin} |`),'','## 关羽同属性换定位','', '同样搭配黄忠、诸葛亮，仅替换关羽的三个基础战法。输出统计只计直接伤害；护卫能否获益仍取决于接敌、阵位和对手。','','| 敌阵 | 定位 | 关羽直接伤害 | 关羽余兵 | 后排余兵 | 全队兵力差 |','|---|---|---:|---:|---:|---:|',...guan.map(r=>`| ${r.context} | ${r.role} | ${r.damage} | ${r.remaining} | ${r.backline} | ${r.margin} |`)];
  writeFileSync('docs/toolbox-v10/验证报告.md',lines.join('\n')+'\n');
  console.log(JSON.stringify({runs:report.runs,guan,winners:results.map(r=>({type:r.type,profile:r.profile,context:r.context,ids:r.rows[0].ids}))},null,2));
}
