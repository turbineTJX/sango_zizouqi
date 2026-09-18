import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment} from '../engine.mjs';
import {configureTactics} from '../tactics.mjs';
import {holdsLine,isMelee} from '../engagement.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

const seeds=[521208,1009,1103,1201,1301,1409,1511,1601,1709,1801,1907,2003];
const variants={control:'控制＋冲阵',noControl:'撤掉控制',noCharge:'撤掉冲阵',overlap:'敌方双前排重叠 ZOC'};
const rows=[];
for(const [variant,label] of Object.entries(variants))for(const seed of seeds)for(const mirror of [false,true]){
  const b=createScenario('breach',seed).battle;
  if(variant==='noControl'){
    configureTactics(b.sides[0].units[0],['strike','thrust','ward']);
    configureTactics(b.sides[0].units[2],['scatter','rally','fire']);
  }
  if(variant==='noCharge')configureTactics(b.sides[0].units[1],['harass','gallop','valor']);
  if(variant==='overlap'){
    const u=b.sides[1].units[1];u.type='spear';configureTactics(u,['cleanse','phalanx','ward']);Object.assign(u,{x:8,y:4});
  }
  const own=mirror?1:0;
  if(mirror){b.sides.reverse();b.sides.forEach((s,side)=>s.units.forEach(u=>{u.side=side;u.x=13-u.x;u.y=7-u.y;}));}
  lockDeployment(b);const events=[];
  while(!b.result){
    stepBattle(b);
    for(const e of b.effects)if(e.side===own&&['拦截中断','突入后阵'].includes(e.text)){
      const front=b.sides[1-own].units.filter(u=>isMelee(u)&&u.status==='active'&&u.hp>0);
      events.push({tick:b.tick,name:e.name,tactic:e.label,event:e.text,frontAlive:front.length,frontHp:front.reduce((n,u)=>n+u.hp,0),activeZocOwners:front.filter(u=>holdsLine(b,u)).length});
    }
  }
  rows.push({variant,label,seed,mirror,win:b.result.winner===own,ticks:b.tick,breakthrough:events.find(e=>e.event==='突入后阵'&&e.frontAlive>0)||null,events});
}
const summary=Object.entries(variants).map(([variant,label])=>{
  const group=rows.filter(r=>r.variant===variant),success=group.filter(r=>r.breakthrough);
  return {variant,label,runs:group.length,success:success.length,wins:group.filter(r=>r.win).length,meanFirstBreakTick:success.length?Math.round(success.reduce((n,r)=>n+r.breakthrough.tick,0)/success.length*100)/100:null};
});
const out=`docs/zoc-v${RULES_VERSION}`;mkdirSync(out,{recursive:true});
const files=['engine.mjs','engagement.mjs','tactics.mjs','scenarios.mjs','scenario-catalog.mjs','combat-rules.mjs'];
writeFileSync(`${out}/audit.json`,JSON.stringify({rulesVersion:RULES_VERSION,count:rows.length,seeds,hashes:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),summary,rows},null,2));
const example=rows.find(r=>r.variant==='control'&&r.seed===521208&&!r.mirror);
writeFileSync(`${out}/验证报告.md`,['# ZOC 与突破协同验证','',`规则 ${RULES_VERSION}；共 ${rows.length} 场完整战斗。使用可游玩的「演武 · 控阵突击」场景，12 种子、双方镜像，从零战意正常积累，经真实施法、寻路及结算，不注入待施放状态。`,'','成功定义：本方冲阵产生「突入后阵」时，敌方至少一支近战前排仍存活。此指标衡量提前切入，不等于获胜；重叠组同时改变兵种、输出和防御能力，不能当作单变量胜率比较。','','| 配置 | 前排存活时突入 | 平均首次突入步 | 获胜 |','|---|---:|---:|---:|',...summary.map(r=>`| ${r.label} | ${r.success}/${r.runs} | ${r.meanFirstBreakTick??'—'} | ${r.wins}/${r.runs} |`),'','## 默认种子过程','',...example.events.map(e=>`- 第 ${e.tick} 步：${e.name}「${e.tactic}」→ ${e.event}；敌方前排余兵 ${e.frontHp}，有效 ZOC 来源 ${e.activeZocOwners}。`),'','控制窗口会被净化、控制保护、其他前排的重叠 ZOC 或格子占用阻断。定点测试还验证侧翼诱敌挪开 ZOC 后冲阵，以及枪阵免疫诱敌。范围穿透仍不等于移动突破。','',`复测：node scripts/zoc-audit.mjs。原始逐场事件与源码校验值见 audit.json。`,''].join('\n'));
console.log(JSON.stringify(summary,null,2));
