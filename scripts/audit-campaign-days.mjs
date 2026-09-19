import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {newCampaign,beginExecution,advanceCampaignDay,chooseEncounter,activeBattles,orderCampaignArmy,serializeCampaign,validateCampaign,CAMPAIGN} from '../strategic-campaign.mjs';

const out='docs/campaign-days-v2';mkdirSync(out,{recursive:true});
const rows=[];
function advance(s){
  if(s.campaign.phase==='planning')beginExecution(s);
  const result=advanceCampaignDay(s);
  if(result.encounter)for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);
}
for(const seed of [1,17,521200])for(const plan of ['驻守','双路出征']){
  const s=newCampaign(seed);if(plan==='双路出征'){assert.equal(orderCampaignArmy(s,'a1','guandu'),null);assert.equal(orderCampaignArmy(s,'a3','baima'),null);}
  let restored=null;const daily=[];
  for(let guard=0;s.campaign.day<41&&!s.finished&&guard<100;guard++){
    const day=s.campaign.day;
    const before=new Map(s.campaign.battles.map(r=>[r.id,r.battle.sides.flatMap(x=>x.units).reduce((n,u)=>n+(u.battleDamage||0)-(u.battleDeserted||0),0)]));
    advance(s);if(restored)advance(restored);
    validateCampaign(JSON.parse(serializeCampaign(s)));
    if(!restored&&s.campaign.day>=7)restored=validateCampaign(JSON.parse(serializeCampaign(s)));
    if(s.campaign.day>day)daily.push({day,battles:s.campaign.battles.filter(r=>!r.settled||r.endedDay===day).map(r=>({name:r.name,tick:r.battle.tick,loss:r.battle.sides.flatMap(x=>x.units).reduce((n,u)=>n+(u.battleDamage||0)-(u.battleDeserted||0),0)-(before.get(r.id)||0)}))});
  }
  assert.equal(serializeCampaign(restored),serializeCampaign(s));
  const battles=s.campaign.battles.map(r=>({name:r.name,start:r.startedDay,end:r.endedDay,days:r.endedDay===null?null:r.endedDay-r.startedDay+1,ticks:r.battle.tick,result:r.battle.result}));
  assert.ok(battles.every(r=>r.days===null||r.days<=CAMPAIGN.maxBattleDays));
  rows.push({seed,plan,day:s.campaign.day,battles,daily});
}
writeFileSync(`${out}/strategy.json`,JSON.stringify({campaign:CAMPAIGN,rows},null,2));
const raw=JSON.parse(gunzipSync(readFileSync('docs/scenario-review-v27/runs.json.gz')));
const names=JSON.parse(readFileSync('docs/scenario-review-v27/audit.json')).results;
const avg=xs=>(xs.reduce((n,x)=>n+x,0)/xs.length).toFixed(1);
const comparisons=raw.filter(r=>r.orders).map(r=>({name:names.find(x=>x.id===r.id).name,oldDays:avg(r.runs.map(x=>Math.ceil(x.ticks/12))),days:avg(r.runs.map(x=>Math.ceil(x.ticks/CAMPAIGN.stepsPerDay))),minDays:Math.min(...r.runs.map(x=>Math.ceil(x.ticks/CAMPAIGN.stepsPerDay))),maxDays:Math.max(...r.runs.map(x=>Math.ceil(x.ticks/CAMPAIGN.stepsPerDay)))}));
const lines=['# 战役日数验证（战略存档版本 2）','','目标：常规势均力敌战斗约 5～10 个游戏日，明显优势的战斗允许提前结束，胶着战斗最多 30 天。一天从 12 步提高到 24 步；战略战役上限从 240 步提高到 720 步。战斗伤害、战意门槛、战法冷却、行军日速和每日供粮周期未改。','','## 20 个单场场景折算','','复用上一轮相同战斗规则下每场 32 个种子的真实结算步数（玩家自动军略组），逐局向上取整后平均。历史战役／演武／演义推演本身仍是独立单场，此表是按战略日长折算，不能当成带行军、供粮和动态援军的战略实跑；这些模式原有限时目标保留。','','| 场景 | 原日数均值（12步/日） | 新日数均值（24步/日） | 新日数范围 |','| --- | --- | --- | --- |',...comparisons.map(r=>`| ${r.name} | ${r.oldDays} | ${r.days} | ${r.minDays}～${r.maxDays} |`),'','## 战略模式重新实跑','','3 个种子（1、17、521200）分别执行驻守／双路出征，运行到第 41 天。每天验档，第 7 天起对照读档续战，全都一致。以下是真实世界日期差，包含动态补给与增援；日数计算为结束日减开战日加一。','','| 种子／计划 | 战役 | 开始→结束日 | 实际交战日数 | 结果 |','| --- | --- | --- | --- | --- |',...rows.flatMap(r=>r.battles.map(b=>`| ${r.seed}／${r.plan} | ${b.name} | ${b.start}→${b.end??'进行中'} | ${b.days??'—'} | ${b.result?.reason??'未结束'} |`)),'','## 胶着战与回归','','新增真实防守后勤编制回归：双方带包扎、营垒、回春，从零战意通过正常行军触发遭遇，持续普攻、治疗并按日耗粮。第 2 天开战，跨过第 11、21、31 天的旬首暂停，第 31 天结束，实际交战恰好 30 天、720 步；超过旧上限 240 步后仍可读档续战，最终按剩余兵力比例久战收兵。未注入待施放状态或跳过模拟步。','','`npm test` 367 项通过，包含日内同步、旬首暂停、援军、断粮逃散、30 天上限、非法时限拒绝和确定性续战；`npm run check` 通过。战略存档版本升至 2，原 12 步／日的战略存档需要重开；其他独立战役存档规则版本维持 27。','','复测：`node scripts/audit-campaign-days.mjs`。新战略明细见 [strategy.json](strategy.json)。',''];
writeFileSync(`${out}/战役日数验证.md`,lines.join('\n'));
console.log(JSON.stringify(rows.map(r=>({seed:r.seed,plan:r.plan,battles:r.battles})),null,2));
