import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {HISTORICAL_BATTLES,historicalBattleDraft} from '../historical-battle-library.mjs';
import {customBattleTotals,customSideEntries,customParticipants,swapCustomBattle} from '../custom-battle.mjs';
import {customArmyColumns,arrivalLabel} from '../reinforcement-arrival.mjs';
import {BATTLE_EVENTS,battleEventSummary} from '../battle-events.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {battleDays} from '../player-time.mjs';
import {DEV_SEEDS} from './xiapi-player-lab.mjs';
import {officerQuality} from './audit-historical-reinforcements.mjs';
import {sourceHash} from './basic-balance-lib.mjs';

const path='outputs/historical-reinforcements/final-results.json',data=JSON.parse(readFileSync(path,'utf8'));
assert.equal(data.rulesVersion,RULES_VERSION,'请重新运行当前规则验证');
assert.equal(data.sourceHash,sourceHash(),'运行时数据已变化，请重新验证');
assert.ok(data.seeds.length>=8&&data.seeds.every(s=>!DEV_SEEDS.includes(s)),'至少八个独立种子');
const summaries=[];
for(const h of HISTORICAL_BATTLES){
 const draft=historicalBattleDraft(h.id),rows=data.rows.filter(r=>r.id===h.id),forces=[0,1].map(side=>customBattleTotals(draft,side)),quality=[0,1].map(side=>officerQuality(customSideEntries(draft,side)));
 assert.deepEqual(data.drafts[h.id],draft,'验证配置与当前模板不同');assert.equal(rows.length,data.seeds.length*2);
 for(const seed of data.seeds)for(const swapped of [false,true])assert.equal(rows.filter(r=>r.seed===seed&&r.swapped===swapped).length,1);
 assert.ok(rows.filter(r=>r.seed===data.seeds[0]).every(r=>r.resumed),'缺少双向续战验证');
 for(const r of rows){
  const config=r.swapped?swapCustomBattle(draft):draft;
  assert.equal(r.reinforcementArmies.length,config.reinforcements.length);
  for(const a of r.reinforcementArmies){
   const expected=config.reinforcements[a.index];assert.equal(a.side,expected.side);assert.equal(a.name,expected.name);assert.deepEqual(a.condition,expected.arrivalCondition??null);
   assert.ok(a.fielded<=a.arrived&&a.arrived<=expected.team.length);assert.equal(a.arrived,a.arrivedAt===null?0:expected.team.length);
   if(expected.tick!==undefined){assert.equal(a.scheduledTick,expected.tick);assert.equal(a.arrivedAt,expected.tick<=r.ticks?expected.tick:null);}
   else if(a.arrivedAt!==null)assert.ok(a.arrivedAt>0&&a.arrivedAt<=r.ticks);
  }
  assert.deepEqual(r.arrivals,[0,1].map(side=>r.reinforcementArmies.filter(a=>a.side===side).reduce((n,a)=>n+a.arrived,0)));
  assert.deepEqual(r.events,config.events.map(e=>({...e,triggeredAt:e.tick<=r.ticks?e.tick:null})));
 }
 const wins=[0,1].map(side=>rows.filter(r=>r.originalWinner===side).length),draws=rows.filter(r=>r.originalWinner===null).length;
 if(h.expectedWinner===null){
  for(const key of ['troops','units','reinforcementUnits'])assert.equal(forces[0][key],forces[1][key]);
  assert.ok(wins.every(n=>n/rows.length<=.7),'五丈原单方优势超过均势观察范围');
 }else{
  assert.ok(wins[h.expectedWinner]/rows.length>=.7,h.name+'历史胜方不足七成');assert.ok(quality[h.expectedWinner]>quality[1-h.expectedWinner]);
  for(const key of ['troops','units','reinforcementUnits'])assert.ok(forces[h.numericalSide][key]>forces[1-h.numericalSide][key]);
 }
 summaries.push({h,draft,rows,forces,quality,wins,draws});
}
const number=n=>n.toLocaleString('en-US'),force=f=>`${number(f.troops)}／${f.units}／${f.reinforcementUnits}`;
const score=s=>s.h.expectedWinner===null?`蜀军${s.wins[0]}胜、魏军${s.wins[1]}胜、${s.draws}平`:`${s.h.expectedWinner?s.h.enemyName:s.h.ownName} ${s.wins[s.h.expectedWinner]}胜、${s.wins[1-s.h.expectedWinner]}败、${s.draws}平`;
const range=values=>Math.min(...values)+'～'+Math.max(...values);
const original=(r,key,side)=>r[key][r.swapped?1-side:side];
const schedule=s=>{const units=customParticipants(s.draft).map(u=>({...u,name:OFFICER_BY_ID[u.id].name})),armies=customArmyColumns(s.draft);return s.draft.reinforcements.map(a=>a.name+'：'+arrivalLabel(a,units,armies)+'（'+a.team.length+'队）').join('；');};
const table=(heads,rows)=>'| '+heads.join(' | ')+' |\n| '+heads.map(()=>'---').join(' | ')+' |\n'+rows.map(r=>'| '+r.join(' | ')+' |').join('\n')+'\n';
let doc=`# 历史战役兵力、援军与玩家操作（规则${RULES_VERSION}）

六张历史地图均使用自定义生成器及现有战斗规则，全员10级，每军团最多十队，全场武将唯一。用户确认按游戏尺度压缩兵力差距，保留数量劣势及历史胜方的武将优势；五丈原保留均势对峙。预期胜方只是验证元数据，不参与结算。

## 当前参战规模

格式为“总兵力／总队数／援军队数”。总规模包括全部条件援军；实际战斗只有条件满足且已经抵达的部队参与，不把待援兵力计入久战结算。

${table(['战役','默认我方','默认敌方','换边合并战果'],summaries.map(s=>[s.h.name,s.h.ownName+' '+force(s.forces[0]),s.h.enemyName+' '+force(s.forces[1]),score(s)]))}
官渡袁军、赤壁曹军、合肥孙军及夷陵刘军有更多兵力、部队和援军；下邳曹刘联军也有数量优势。历史胜方采用整体统率、武力与智力更强的真实阵容，适性、战法、军略与羁绊沿用人物库。实际战果还受地图、守城目标、后备和定时状态影响，不能把全部收益归因于武将静态指标。

## 援军与事件日程

${table(['战役','援军条件／日期','定时负面状态'],summaries.map(s=>[s.h.name,schedule(s),s.draft.events.map(battleEventSummary).join('；')||'无']))}
乌巢被烧对应现有粮道中断。在大地图中，粮道中断停止补给，军团先消耗携粮，再逐步缺粮，严重时按既有规则减员与解散。独立战役没有实际大地图粮道，沿用用户要求的日期触发，以缺粮状态抽象；战斗惩罚与大地图共用 army-supply.mjs 的原有计算，没有另设倍率。伏兵复用混乱、失阵。日期仅决定何时施加已有状态；不存在战役专属火攻、偷粮、倒戈、渡江或病逝判定，也不直接删兵或强制胜负。所有事件均可在自定义编辑器修改、删除，交换双方同时交换目标。

${table(['事件','现有状态效果'],Object.values(BATTLE_EVENTS).map(e=>[e.name,e.description]))}
合肥守军仅张辽、李典、乐进三队，沿用普通守城规则，城门未失且仍有可战部队守住${battleDays(summaries.find(s=>s.h.id==='hefei').draft.holdUntil)}天获胜。战役日程、队伍规模和接应编制为压缩后的玩法配置，不能当作同一时刻的史实复原。

## 实际触发与独立验证

使用未参与开发调参的${data.seeds.length}个种子，每役交换双方，合计${data.rows.length}局。双方使用同一AI首发、简单布阵、后备补位和军略，不刻意凑羁绊。每役两种朝向均完成当前存档的确定性续战。历史胜方至少七成、五丈原任一方胜局不超过七成的观察线是样本检查，不保证任意种子或玩家操作。

${table(['战役','实际到达：我／敌（队）','实际补入：我／敌（队）'],summaries.map(s=>[s.h.name,[0,1].map(side=>range(s.rows.map(r=>original(r,'arrivals',side)))).join('／'),[0,1].map(side=>range(s.rows.map(r=>original(r,'fielded',side)))).join('／')]))}
完整种子、配置、败局、到达时刻、补入、援军施法、事件触发及续战结果见[逐局记录](../${path})。条件援军允许不触发，报告按实际抵达记录，不要求预定军团全部到场。

## 历史与系列战役参考

《三国志》人物传用于战役双方、年代与战局背景；历代游戏资料用于压缩比例、分阶段援军和事件节奏。11代战役资料是玩家整理，不能作为原始史料。只借鉴能够用当前配置表达的部分，名单增补和具体日期属于战术改编。

${summaries.map(s=>'### '+s.h.name+'\n\n'+s.h.designNote+'\n\n'+s.h.sources.map(r=>'['+r.title+']('+r.url+')').join('、')).join('\n\n')}

援军按相邻区域出发并经过时间抵达的系列参考：[三国志8 Remake官方战斗说明](https://www.gamecity.ne.jp/manual/sangokushi8-re/jp/4300.html)。本作直接使用已存在的时间、指定部队消灭、指定军团全灭三种设置。

## 玩家操作与复核

下邳吕军${force(summaries[0].forces[0])}、曹刘联军${force(summaries[0].forces[1])}。开战前可合法改兵种、分兵、任职、首发、布阵和后备；原名单的倾国、护卫、勇武与疾驰仍受在场名额、适性和存活限制。援军抵达后的军议只改后备顺序与撤离，在场部队、意图与地形锁定，不推进时间或恢复资源。

当前验证证明双AI历史方向及机制合法性，尚未验证具体玩家翻盘方案的胜率。运行 npm run audit:historical-reinforcements 和 npm run report:historical-reinforcements 复核当前配置与运行时哈希；数据变化必须重新验证。npm run test:historical-reinforcements 检查规则、条件和续战，npm run verify:battle-events-ui 与 npm run verify:custom-reinforcements-ui 检查编辑、核阅、换边、移动端及到达军议。
`;
writeFileSync('docs/玩家布阵与羁绊强度-下邳.md',doc);
writeFileSync('docs/多战役玩家操作空间实测.md',`# 多战役玩家操作与验证

当前规则${RULES_VERSION}的兵力、援军、定时状态和双AI验证见[当前历史战役报告](玩家布阵与羁绊强度-下邳.md)。配置可在自定义编辑器修改。开战前允许合法选将、兵种、分兵、任职、首发、布阵及后备顺序，战中使用现有军略；援军军议只调整后备和撤离。

scripts/historical-player-lab.mjs 与 scripts/xiapi-player-lab.mjs 使用真实全部参战预算。换边调用共用函数，同时翻转援军归属、先遣军团条件、守城方向及事件目标；玩家方案只选已抵达先遣部队首发，不把接应军提前上场。合肥只有三将，夷陵使用蜀将张南。模拟控制器可自动继续援军军议，仍遵守抵达限制。

方案强度须用同预算双AI对照、固定开发种子及独立验证种子，记录实际触发、败局、平局和续战，不能把混合调整全部归因于羁绊。当前未报告新版玩家方案的推荐胜率；五丈原不指定蜀魏任一方应胜。
`);
console.log(JSON.stringify({rulesVersion:RULES_VERSION,games:data.rows.length,accepted:true,results:summaries.map(s=>({id:s.h.id,wins:s.wins,draws:s.draws}))}));
