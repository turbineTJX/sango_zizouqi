import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir='docs/zoc-balance-v12',d=JSON.parse(readFileSync(`${dir}/audit.json`,'utf8'));
assert.ok(d.six?.length,'Run the --followup audit first');
const mean=a=>a.reduce((n,x)=>n+x,0)/a.length,round=n=>Math.round(n*100)/100;
const keys=Object.keys(d.teams),labels=d.labels;
function teamRows(rows,team,world){return rows.filter(r=>r.world===world&&(r.left===team||r.right===team)).map(r=>r.left===team?r:{...r,win:1-r.win,margin:-r.margin});}
const stats=rows=>Object.fromEntries(['win','margin','rearHp','rearDamage','frontDamage','frontAlive60','tauntCasts','ticks'].map(k=>[k,k==='win'?Math.round(mean(rows.map(r=>r[k]))*10000)/10000:round(mean(rows.map(r=>r[k])))]));
function paired(a,b,metric){
  const id=r=>[r.left,r.right,r.formation,r.level,r.seed,r.mirror,r.named].join('|'),base=new Map(b.map(r=>[id(r),r]));
  const bySeed=new Map();
  for(const r of a){const old=base.get(id(r));assert.ok(old,'Missing paired run');const group=bySeed.get(r.seed)||[];group.push(r[metric]-old[metric]);bySeed.set(r.seed,group);}
  const xs=[...bySeed.values()].map(mean),avg=mean(xs),sd=Math.sqrt(xs.reduce((n,x)=>n+(x-avg)**2,0)/(xs.length-1)),half=2.201*sd/Math.sqrt(xs.length);
  const precision=metric==='win'?10000:100;
  return {mean:Math.round(avg*precision)/precision,low:Math.round((avg-half)*precision)/precision,high:Math.round((avg+half)*precision)/precision};
}
const rankings=rows=>keys.map(team=>({team,label:labels[team],open:stats(teamRows(rows,team,'open')),zoc:stats(teamRows(rows,team,'zoc')),delta:paired(teamRows(rows,team,'zoc'),teamRows(rows,team,'open'),'win')}));
const sixLabels={spears:'六枪输出',riders:'六骑突击',ranged:'六队远程输出',fireline:'两坦＋四输出',balanced:'两坦＋两输出＋两辅助',supports:'两坦＋四辅助',doubleFront:'四前排＋两输出',breach:'两组控制突破'};
const three=rankings(d.rows),six=rankings(d.six).map(r=>({...r,label:sixLabels[r.team]})),named=[];
for(const left of ['fireline','balanced','supports'])named.push({team:left,label:labels[left],open:stats(d.named.filter(r=>r.world==='open'&&r.left===left)),zoc:stats(d.named.filter(r=>r.world==='zoc'&&r.left===left))});
const taunts=['zoc','noWard','tauntMelee','tauntAll'].map(world=>({world,...stats(d.taunts.filter(r=>r.world===world))}));
const deltas=[];
for(const world of ['tauntMelee','tauntAll'])for(const baseline of ['noWard','zoc'])for(const right of [null,...keys]){
  const select=w=>d.taunts.filter(r=>r.world===w&&(!right||r.right===right));
  deltas.push({world,baseline,right,win:paired(select(world),select(baseline),'win'),margin:paired(select(world),select(baseline),'margin'),rearHp:paired(select(world),select(baseline),'rearHp')});
}
const matrix=keys.map(left=>({label:labels[left],scores:Object.fromEntries(keys.filter(right=>right!==left).map(right=>[labels[right],round(mean(teamRows(d.rows,left,'zoc').filter(r=>r.left===right||r.right===right).map(r=>r.win))*100)]))}));
const strata=[];
for(const level of [1,10])for(const formation of Object.keys(d.formations))for(const team of ['fireline','balanced','supports','riders']){
  const rows=teamRows(d.rows,team,'zoc').filter(r=>r.level===level&&r.formation===formation);
  strata.push({level,formation,team,score:round(mean(rows.map(r=>r.win))*100)});
}
const summary={count:d.count,three,six,named,taunts,deltas,matrix,strata};
writeFileSync(`${dir}/summary.json`,JSON.stringify(summary,null,2));
const pct=n=>round(n*100)+'%',interval=r=>`[${r.low}, ${r.high}]`;
const table=rows=>['| 阵容 | 无 ZOC 得分率 | 有 ZOC 得分率 | 变化（百分点） |','|---|---:|---:|---:|',...rows.map(r=>`| ${r.label} | ${pct(r.open.win)} | ${pct(r.zoc.win)} | ${round((r.zoc.win-r.open.win)*100)} |`)];
const names={zoc:'原镇军',noWard:'撤掉镇军的空槽基线',tauntMelee:'只嘲讽近战',tauntAll:'也能嘲讽弓弩'};
const lines=['# ZOC、嘲讽候选与后排阵容验证','',`共 ${d.count.toLocaleString('en-US')} 场真实流程战斗；规则 12。正式游戏只删除 ZOC 覆盖显示及开关，没有新增嘲讽、修改战法数值或改变存档版本。`,'','## 结果判读','',
'1. **嘲讽仍有增量收益，但当前候选不值得直接替换镇军。** 空槽基线得分率 56.67%，只嘲讽近战 65.76%，可嘲讽弓弩 65.01%，原镇军 78.09%。对纯骑兵，嘲讽相对空槽的后排余兵变化为 −2.86，区间跨零，ZOC 的功能重叠尤其明显。',
'2. **不能通过扩大嘲讽对象就断言更强。** 允许嘲讽弓弩的候选，面对纯远程阵容反而比空槽少保留 347.74 后排兵力；主动施放占用行动、坦克承伤和后续战意／索敌变化可能共同影响结果，本测试没有单独归因。',
'3. **受保护的输出阵容有偏强信号，而且部分优势早于 ZOC。** 三队的一坦两输出由无 ZOC 的 81.55% 升到 88.91%；六队两坦四输出由 75.30% 升到 87.50%。不能把全部强度都归因于 ZOC，也不宜据此削弱所有弓弩。',
'4. **辅助的危险在于成套配合和规模。** 六队两坦两输出两辅助由 83.63% 升到 94.20%，高于两坦四输出；两坦四辅助只有 43.30%。三队一坦两辅助也只有 35.04%。不是辅助越多越强，较大规模的保护、封技与持续输出组合更值得限制。',
'5. **突破可发生，但尚未形成足够可靠的阵容反制。** 六骑从 53.87% 降到 14.58%，控制突破从 33.63% 到 32.29%；证明存在突破事件，并不等于突破阵容已具有足够强度。',
'6. **名将结果不能直接照搬等属性排名。** 关羽、黄忠、诸葛亮对应三种配装在有 ZOC 时仅 25.52%、30.99%、18.49%；相对无 ZOC 均有提升，但不是自动形成无敌阵容。武将属性、被动和配装适配仍然重要。',
'建议下一轮分别验证保护覆盖／续航、封技与护盾的配合，以及突破后能否存活并持续输出。嘲讽应争取 ZOC 尚未覆盖的保护价值，同时保留施法和占槽代价。以上是后续测试方向，本轮没有据此改正式数值。','',
'## 方法与边界','',
'- 正式版本没有嘲讽战法。候选在临时目录复制的运行模块中实现，原始源码校验值保存在 audit.json。测试仍经零战意开局、合法三槽、战意门槛、自动索敌、实际移动和 stepBattle 结算；没有注入旧式待施放状态。候选的真实施放和强制改变远程普攻目标另有自检。',
'- 三队循环赛：8 种阵容两两交战，1／10 级、贴身／分散两种站位，12 个固定种子双方镜像。六队复核：将各阵容配置复制为两组三队，10 级、两种站位、12 种子镜像。双方同为 85 四维、每队 3,000 兵，主副将加成归零，保留兵种成长、正常战意与关系连携。',
'- 无 ZOC 对照只关闭空间拦截和接战目标限制，沿用当前战法与突破 AI；不是回退到旧版游戏。名将复核使用关羽、黄忠、诸葛亮真实属性和被动，改变兵种／配装，敌方仍为等属性测试队。',
'- 得分率 = 胜场计 1、平局计 0.5、败场计 0。不同阵容只比较固定配装；没有搜索全部组合，不代表全游戏胜率。三／六队循环赛不包含自身内战；嘲讽和名将复核含内战。',
'- 嘲讽候选替换指定前排的镇军槽：35 战意、24 步冷却、3 格内单体、持续 4 步、无伤害且不附送减伤。两种候选分别限近战或允许弓弩，优先弓弩／高战意目标。仅当施法者仍存活且是射程和 ZOC 允许的合法目标时，强制改变普攻及敌对战法主目标；不影响支援、自身增益及范围波及，可被净化。其他部队的镇军不变。',
'- 空槽基线保留其他两招、让镇军槽不施放，用于隔离嘲讽本身的收益；与原镇军相比则检验占槽代价。候选都只在实验副本，尚未加入正式配装。',
'- 置信区间先合并每个种子的全部配对场景／镜像，再用 12 个种子均值计算近似 95% t 区间；仅反映本测试集随机波动，不覆盖场景选择偏差。未校正多重比较。无手动军略、无援军与城门，结果不证明全部名将／地图平衡。','',
'## 三队循环赛','',...table(three),'','## 六队循环赛（10 级）','',...table(six),'','## 关羽、黄忠、诸葛亮复核（10 级、贴身站位）','',...table(named),'',
'## 嘲讽的收益与占槽代价','',
'| 前排槽位 | 得分率 | 全队剩余兵力差 | 后两队平均余兵 | 前排前60步存活时间 | 嘲讽施放次数 |','|---|---:|---:|---:|---:|---:|',...taunts.map(r=>`| ${names[r.world]} | ${pct(r.win)} | ${r.margin} | ${r.rearHp} | ${r.frontAlive60} | ${r.tauntCasts} |`),'',
'| 候选／对照 | 敌方阵容 | 后排余兵变化 | 近似95%区间 | 全队兵力差变化 |','|---|---|---:|---|---:|',...deltas.map(r=>`| ${names[r.world]} / ${names[r.baseline]} | ${r.right?labels[r.right]:'全部'} | ${r.rearHp.mean} | ${interval(r.rearHp)} | ${r.margin.mean} |`),'',
'## 有 ZOC 时的三队对局矩阵（得分率）','',`| 我方／敌方 | ${keys.map(k=>labels[k]).join(' | ')} |`,`|---|${keys.map(()=>'---:').join('|')}|`,...matrix.map(r=>`| ${r.label} | ${keys.map(k=>r.scores[labels[k]]===undefined?'—':r.scores[labels[k]]+'%').join(' | ')} |`),'',
'## 分层检查','', '| 等级 | 布阵 | 阵容 | 有 ZOC 得分率 |','|---|---|---|---:|',...strata.map(r=>`| ${r.level} | ${r.formation==='compact'?'贴身':'分散'} | ${labels[r.team]} | ${r.score}% |`),'',
'复测依次执行 `node scripts/zoc-balance-audit.mjs`、`node scripts/zoc-balance-audit.mjs --followup`、`node scripts/summarize-zoc-balance.mjs`。原始逐场结果、完整配装、阵型坐标及源码校验值见 audit.json；汇总见 summary.json。',''];
writeFileSync(`${dir}/测试报告.md`,lines.join('\n'));
console.log(JSON.stringify({count:d.count,three,six,named,taunts,deltas:deltas.filter(r=>!r.right)},null,2));
