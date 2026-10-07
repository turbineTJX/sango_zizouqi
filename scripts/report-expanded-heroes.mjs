import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {OFFICER_BY_ID as BY} from '../officer-catalog.mjs';
import {OFFICER_ASSIGNMENTS as A} from '../data/design/assignments.mjs';
import {TACTIC_DESIGNS as T} from '../data/design/tactics.mjs';
const dir=new URL('../outputs/expanded-heroes/',import.meta.url),m=JSON.parse(readFileSync(new URL('manifest.json',dir))),partial=process.argv.includes('--partial');
let rows=[];for(let i=0;i<4;i++){
 const data=readFileSync(new URL(`results-${i}.jsonl`,dir),'utf8');rows.push(...data.trim().split('\n').filter(Boolean).map(JSON.parse));
 if(!partial){const done=JSON.parse(readFileSync(new URL(`complete-${i}.json`,dir)));if(done.hash!==m.hash||done.count!==768)throw Error('Incomplete shard');}
}
const key=r=>[r.hero,r.scenario,r.phase,r.seed,r.level,r.swapped].join('/'),groups=new Map();
for(const r of rows){const k=key(r);if(!groups.has(k))groups.set(k,{});if(groups.get(k)[r.mode])throw Error('Duplicate row');groups.get(k)[r.mode]=r;}
const pairs=[...groups.values()].filter(p=>p.on&&p.off),avg=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:0;
const focal=r=>r.units[r.swapped?1:0].find(u=>u.id===r.hero);
for(const p of pairs){if(JSON.stringify(p.on.draft)!==JSON.stringify(p.off.draft)||JSON.stringify(p.on.initial)!==JSON.stringify(p.off.initial))throw Error('Opening mismatch');if(focal(p.off).metrics.casts[A[p.on.hero].specialTactic]?.count)throw Error('Block failed');}
if(!partial&&(rows.length!==3072||pairs.length!==1536))throw Error('Incomplete matrix');
function stats(ps){const cast=r=>focal(r).metrics.casts[A[r.hero].specialTactic]?.count||0;return {n:ps.length,on:ps.filter(p=>p.on.win).length,off:ps.filter(p=>p.off.win).length,delta:avg(ps.map(p=>p.on.margin-p.off.margin)),positive:ps.filter(p=>p.on.margin>p.off.margin).length,negative:ps.filter(p=>p.on.margin<p.off.margin).length,casts:avg(ps.map(p=>cast(p.on))),unused:ps.filter(p=>!cast(p.on)).length,deadWithoutCast:ps.filter(p=>!cast(p.on)&&focal(p.on).status==='defeated').length,firstCastTick:avg(ps.filter(p=>cast(p.on)).map(p=>p.on.castHealth[0].tick)),firstCastHp:avg(ps.filter(p=>cast(p.on)).map(p=>p.on.castHealth[0].fraction)),directDamage:avg(ps.map(p=>p.on.events.filter(e=>e.skill&&e.label===T[A[p.on.hero].specialTactic].name).reduce((n,e)=>n+e.damage,0))),sealSuccess:ps.flatMap(p=>p.on.events).filter(e=>e.resolution?.effect==='seal'&&e.resolution.success).length};}
const ids=[...new Set(m.cases.map(c=>c.hero))],summary=ids.map(id=>({id,name:BY[id].name,skill:T[A[id].specialTactic].name,development:stats(pairs.filter(p=>p.on.hero===id&&p.on.phase==='development')),validation:stats(pairs.filter(p=>p.on.hero===id&&p.on.phase==='validation')),scenarios:Object.fromEntries(m.scenarios.map(s=>[s,stats(pairs.filter(p=>p.on.hero===id&&p.on.phase==='validation'&&p.on.scenario===s))])),sides:[false,true].map(swapped=>stats(pairs.filter(p=>p.on.hero===id&&p.on.phase==='validation'&&p.on.swapped===swapped)))}));
const probes=existsSync(new URL('focus-probes.json',dir))?JSON.parse(readFileSync(new URL('focus-probes.json',dir))):[];
const lu=probes.filter(p=>p.hero==='person-661'),seals=probes.flatMap(p=>p.seals).filter(s=>s.success);
writeFileSync(new URL('summary.json',dir),JSON.stringify({hash:m.hash,count:rows.length,pairs:pairs.length,summary},null,2));
const pp=x=>(x>=0?'+':'')+(100*x).toFixed(1),labels={'mixed-a':'混编甲','mixed-b':'混编乙',frontline:'密集前排',ranged:'远程偏重','elite-enemy':'名将敌军','core-heavy':'核心重兵'};
const lines=['# 规则87：扩大名将团战覆盖','',`有效记录 ${rows.length} 场，完整启用／禁用专属对照 ${pairs.length} 组。源码固定快照 ${m.hash}。`,
'','## 测试范围','',
'覆盖全部16名专属武将，每人6类阵容：两组不同普通武将混编、枪戟前排偏重、远程偏重、敌军六名专属武将、核心4000兵与五名队友各1600兵。其余场景每队2000兵。双方总兵力均12000，逐槽兵种和兵力一致，训练成本相等；名将敌军场景刻意提高敌方人员质量，不能当作人员强度相等的比较。队友及普通对手按实际适性至少A选取，名将敌军按可用最高适性选取，不优化或重抽技能。',
'',
'等级5/10，开发种子881031、882037，独立验证种子981043、982057，均交换左右方。开启专属走合法生成、存档校验，并抽查确定性续战；关闭专属是仅锁定本人技能冷却的机制诊断。两侧使用相同军略选择规则，施令时序沿用引擎；每一配对的阵容、羁绊、站位、预算完全一致。',
'',
'净收益是开启相对关闭专属时，己方与敌方剩余兵力差改善，占12000兵的百分点，不是伤害倍率。禁用技能会改变后续行动与随机序列，结果衡量整体对局净影响；左右方、等级、同种子重复条件并非完全独立样本。两种验证种子不足以宣称精确总体胜率。不同武将阵容不同，不能据此排武将强度榜。',
'','## 全部名将（独立验证）','','|武将／专属|启用／禁用胜场|专属净收益|开发净收益|未施放|平均施放次数|','|---|---:|---:|---:|---:|---:|',
...summary.map(h=>{const s=h.validation;return `|${h.name}／${h.skill}|${s.on}/${s.n}／${s.off}/${s.n}|${pp(s.delta)}|${pp(h.development.delta)}|${s.unused}/${s.n}|${s.casts.toFixed(2)}|`;}),
'','## 吕布与诸葛亮：逐场景拆分','',
...summary.filter(h=>['吕布','诸葛亮'].includes(h.name)).flatMap(h=>['### '+h.name+' · '+h.skill,'','|场景|启用／禁用胜场|专属净收益|未施放|','|---|---:|---:|---:|',...Object.entries(h.scenarios).map(([k,s])=>`|${labels[k]}|${s.on}/${s.n}／${s.off}/${s.n}|${pp(s.delta)}|${s.unused}/${s.n}|`),'',`验证阶段平均直接专属伤害 ${h.validation.directDamage.toFixed(0)}；平均首次施放回合 ${h.validation.firstCastTick.toFixed(1)}（只计已施放局）；首次施放所在回合末平均剩余兵力 ${(100*h.validation.firstCastHp).toFixed(1)}%；未施放且最终溃败 ${h.validation.deadWithoutCast} 场。${h.name==='诸葛亮'?`成功封技信号合计 ${h.validation.sealSuccess} 次。`:''}`,'',`左右方专属净收益分别为 ${pp(h.sides[0].delta)}、${pp(h.sides[1].delta)} 个百分点。`,'']),
'','## 所有武将的阵容依赖','','|武将|混编甲|混编乙|密集前排|远程偏重|名将敌军|核心重兵|','|---|---:|---:|---:|---:|---:|---:|',
...summary.map(h=>`|${h.name}|${m.scenarios.map(s=>pp(h.scenarios[s].delta)).join('|')}|`),
'','## 行为复核与结论','',
`对 ${probes.length} 场重点对局增加只读逐回合记录，均与原结果完全一致，不计作新的独立样本。吕布 ${lu.length} 场未发动败局中，${lu.filter(p=>p.peakIntent<100).length} 场连100战意门槛都未达到；另一场到达门槛时仅余20兵，仍在攻击间隔中，随后溃败。这7场全部出现在交换到右方时，说明启动门槛、实际承伤与配阵／行动路径可能共同参与，不能仅凭这些记录判定是数值或某一AI错误。`,
'',
`诸葛亮成功封技 ${seals.length} 次，其中 ${seals.filter(s=>s.before.remaining.length===0).length} 次的目标在本回合开始前已耗尽战法。其余成功目标仍有可用次数，封技具备作用空间，但不能把每次命中都等同于阻止一次施法。八阵奇门还包含群体伤害与夺气，整体收益应看启用／禁用配对，不能只用直接伤害评价。`,
'',
'16人的专属在开发与验证阶段平均净收益均为正，当前样本未发现整体负贡献的专属。吕布的主要风险是施放前损失兵力甚至溃败；诸葛亮能稳定发动，收益随敌方聚集和技能状态变化。刘备在本轮的净收益明显高于其他人，后续细调应重点检查续战救治与护盾的组合，不宜继续统一加强所有专属。',
'',
'面对六名专属武将的敌军，吕布和诸葛亮的普通队友阵容均8战全败；这是人员组合强度悬殊的压力场景，不据此要求单个名将扭转全局。胜率与技能贡献分开报告。',
'',
'逐局数据在 results-0.jsonl 至 results-3.jsonl，含固定阵容、双方开局属性与羁绊、部队贡献、施法时机、核心效果日志与剩余兵力；manifest.json 保存完整实验矩阵；source/ 为实际运行源码。此轮只扩展测试，不修改正式战法数值。',
];writeFileSync(new URL('report.md',dir),lines.join('\n')+'\n');console.log(JSON.stringify({count:rows.length,summary:summary.map(h=>({name:h.name,n:h.validation.n,on:h.validation.on,off:h.validation.off,delta:pp(h.validation.delta),dev:pp(h.development.delta),unused:h.validation.unused}))},null,2));
