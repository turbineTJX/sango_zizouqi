import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {famous,A,BY,sourceHash} from './basic-balance-lib.mjs';
import {TACTIC_DESIGNS as T} from '../data/design/tactics.mjs';
const dir=new URL(process.argv.find(a=>a.startsWith('file:'))||'../outputs/team-tactics/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',dir)));
const rows=readFileSync(new URL('results.jsonl',dir),'utf8').trim().split('\n').map(JSON.parse);
const complete=existsSync(new URL('complete.json',dir))?JSON.parse(readFileSync(new URL('complete.json',dir))):null;
if(!process.argv.includes('--partial')&&(!complete||complete.count!==2304||rows.length!==2304||complete.hash!==manifest.hash))throw Error('Audit incomplete; use --partial only for progress');
const key=r=>[r.hero,r.formation,r.phase,r.seed,r.level,r.swapped].join('/');
const groups=new Map();for(const r of rows){const k=key(r);if(!groups.has(k))groups.set(k,{});if(groups.get(k)[r.mode])throw Error('Duplicate row');groups.get(k)[r.mode]=r;}
const pairs=[...groups.values()].filter(g=>g.on&&g['exclusive-off']&&g['all-off']);
if(!process.argv.includes('--partial')&&pairs.length!==768)throw Error('Incomplete paired groups');
const avg=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const focal=r=>r.units[r.swapped?1:0].find(u=>u.id===r.hero);
for(const p of pairs){
 for(const mode of ['exclusive-off','all-off']){
  if(JSON.stringify(p.on.draft)!==JSON.stringify(p[mode].draft)||JSON.stringify(p.on.initial)!==JSON.stringify(p[mode].initial)||p.on.budget!==p[mode].budget)throw Error('Pair opening mismatch');
 }
 if(focal(p['exclusive-off']).metrics.casts[A[p.on.hero].specialTactic]?.count)throw Error('Exclusive block failed');
 if(Object.keys(focal(p['all-off']).metrics.casts).length)throw Error('All-tactics block failed');
}
const enemyCasts=r=>r.units[r.swapped?0:1].reduce((n,u)=>n+Object.values(u.metrics.casts).reduce((m,c)=>m+c.count,0),0);
const pct=x=>(x*100).toFixed(1),signed=x=>(x>=0?'+':'')+pct(x);
function stats(ps){return {n:ps.length,on:ps.filter(p=>p.on.win).length,off:ps.filter(p=>p['exclusive-off'].win).length,allOff:ps.filter(p=>p['all-off'].win).length,delta:avg(ps.map(p=>p.on.margin-p['exclusive-off'].margin)),allDelta:avg(ps.map(p=>p.on.margin-p['all-off'].margin)),casts:avg(ps.map(p=>focal(p.on).metrics.casts[A[p.on.hero].specialTactic]?.count||0)),unused:ps.filter(p=>!focal(p.on).metrics.casts[A[p.on.hero].specialTactic]?.count).length,enemyDelta:avg(ps.map(p=>enemyCasts(p.on)-enemyCasts(p['exclusive-off']))),positive:ps.filter(p=>p.on.margin>p['exclusive-off'].margin).length,negative:ps.filter(p=>p.on.margin<p['exclusive-off'].margin).length};}
const summary=famous.filter(h=>A[h.id]?.specialTactic).map(h=>({name:h.name,id:h.id,skill:T[A[h.id].specialTactic].name,development:stats(pairs.filter(p=>p.on.hero===h.id&&p.on.phase==='development')),validation:stats(pairs.filter(p=>p.on.hero===h.id&&p.on.phase==='validation')),formations:Object.fromEntries(['mixed','frontline','ranged'].map(f=>[f,stats(pairs.filter(p=>p.on.hero===h.id&&p.on.phase==='validation'&&p.on.formation===f))]))}));
writeFileSync(new URL('summary.json',dir),JSON.stringify({count:rows.length,completePairs:pairs.length,sourceMatches:sourceHash()===manifest.hash,summary},null,2));
const guo=pairs.filter(p=>p.on.hero==='jia'&&p.on.phase==='validation');
const drains=guo.flatMap(p=>p.on.events.filter(e=>e.label===T.undermine.name&&e.intentDrained!==undefined));
const probe=existsSync(new URL('guojia-targets.json',dir))?JSON.parse(readFileSync(new URL('guojia-targets.json',dir))):[];
const hits=probe.flatMap(r=>r.hits);
const lines=['# 团战战法实际收益诊断','',`规则 ${manifest.rulesVersion}；已记录 ${rows.length} 场，完整配对 ${pairs.length} 组。源码哈希：${manifest.hash}。`,sourceHash()===manifest.hash?'报告时源码与测试一致。':'工作区源码已变化，结果仅对应测试快照。','',
'## 对照方法','',
'16 名专属武将，每人三种 6 对 6 阵容：原混编、队友偏近战、队友偏远程；双方各 12,000 兵。等级 5/10，开发与独立验证各两种种子，全部交换左右方。每组保持同一武将、兵种、队友、敌人、站位及种子，仅比较正常、禁用本人专属、禁用本人全部战法。其余人的战法、羁绊与军略保留。禁用通过冷却锁定，不修改正式技能配置，是机制诊断，不能视作合法玩法胜率。',
'',
'偏近战／远程只改变非核心部队兵种，不重新优化人才适性；用于观察接敌环境变化，不代表最佳配阵。每人阵容不同，表格不是名将强度排名。技能关闭后会改变后续行动、战意消费及随机数使用，成对差异衡量整个对局的净影响，不能理解成技能的独立固定倍率。',
'',
'每个阶段只有两个独立种子，等级与左右方属于重复条件，不能把 24 场当作 24 个完全独立随机样本。此处用于机制定位与发现可重复趋势，不宣称总体显著性，也不把某一阵容的负收益直接判为技能有害。',
'',
'“净兵力差收益”＝（开启时己方剩余兵力－敌方剩余兵力－关闭时同一差值）÷12,000，单位百分点；可识别同样获胜却更少损兵。实际施放、伤害、治疗、控制、状态结果及双方各技能施放时机保留在逐局结果。支援不因零直接伤害判无效。','',
'## 独立验证结果','',
'|武将／专属|平均施放|未施放局|开启／关专属胜场|专属净兵力差收益|全部战法净收益|开发专属收益|',
'|---|---:|---:|---:|---:|---:|---:|',
...summary.map(h=>{const s=h.validation;return `|${h.name}／${h.skill}|${s.casts.toFixed(2)}|${s.unused}/${s.n}|${s.on}/${s.n}／${s.off}/${s.n}|${signed(s.delta)}|${signed(s.allDelta)}|${signed(h.development.delta)}|`;}),
'','## 阵容依赖（独立验证）','','|武将|混编专属收益|近战队友专属收益|远程队友专属收益|收益为正／负的配对数|','|---|---:|---:|---:|---:|',
...summary.map(h=>`|${h.name}|${signed(h.formations.mixed.delta)}|${signed(h.formations.frontline.delta)}|${signed(h.formations.ranged.delta)}|${h.validation.positive}／${h.validation.negative}|`),
'','## 郭嘉的非伤害收益','',
`验证 ${guo.length} 组，十胜奇谋共记录 ${drains.length} 次夺气信号，实际夺气合计 ${drains.reduce((n,e)=>n+e.intentDrained,0)}，平均每次 ${avg(drains.map(e=>e.intentDrained)).toFixed(1)}，其中零夺气 ${drains.filter(e=>!e.intentDrained).length} 次。这些是实际效果而非面板宣称值。`,
`敌军整场战法施放总次数：开启专属相对关闭平均变化 ${stats(guo).enemyDelta.toFixed(2)} 次。这个值受战斗时长和存活人数影响，只作辅助指标；目标具体施法时间应与逐局记录一起解释。`,
'',
`另对 ${probe.length} 场验证战斗逐步记录目标状态：${hits.length} 次十胜奇谋中，${hits.filter(h=>h.before.tactics.every(s=>!s.left)).length} 次的目标在本回合开始前已经耗尽全部战法次数。tactics.mjs 的 undermine 选敌只按范围内战意从高到低排序，没有检查剩余施放次数。这些夺气不能直接阻止目标已耗尽的战法；仍需区分未来友方恢复次数等潜在交互，不能把所有夺气量等同于有效压制。详细目标前后状态见 guojia-targets.json。`,
'',
'例：第 46 回合胡遵战意 100，方阵已用 2 次、贯阵已用 1 次，全部剩余次数为零；郭嘉仍对其夺气 41。这个问题应先从目标资格与施放时机检查入手，再决定是否调整专属数值。',
'',
'## 解释与处理优先级','',
`开发、验证两阶段专属净收益均超过 2 个百分点：${summary.filter(h=>h.development.delta>.02&&h.validation.delta>.02).map(h=>h.name).join('、')}。这说明这些专属在当前阵容样本中确实改变了战局，而不仅是动画或纸面效果。`,
'',
'郭嘉的十胜奇谋有真实夺气与抑气效果，但当前选敌存在把高战意误当高施法威胁的问题。优先检查剩余次数、可施放门槛、冷却和目标免疫，再评价是否需要增强；本轮不直接修改倍率。',
'',
'曹操与黄忠需要把武将整体强度和专属边际收益分开：正常军团强不等于专属贡献大。曹操的加攻防及战意确实施加到队友，黄忠的狙射确实产生伤害，但本样本中开启专属相对关闭的净收益较小；短期增益是否覆盖队友有效攻击、狙射是否打到关键后排，值得针对性检查，不能只据一次胜负判弱。',
'',
'没有修改正式游戏战法、属性或 AI。本轮只添加诊断脚本与结果，固定源码副本保存在 source/；最终汇总必须通过 2,304 条记录、768 个三方配对、相同开局与预算及禁用效果校验。',
'',
'原始结果 results.jsonl 保留每局完整开局与末局、核心的所有效果信号（包括零伤害控制与支援）、所有人的施法次数与首次／末次时机。manifest.json 保留三类阵容、种子与源码哈希。复现：node scripts/audit-team-tactics.mjs，再运行 node scripts/report-team-tactics.mjs。',
];writeFileSync(new URL('report.md',dir),lines.join('\n')+'\n');console.log(JSON.stringify({count:rows.length,summary:summary.map(h=>({name:h.name,n:h.validation.n,casts:h.validation.casts,unused:h.validation.unused,on:h.validation.on,off:h.validation.off,delta:signed(h.validation.delta),all:signed(h.validation.allDelta),dev:signed(h.development.delta)}))},null,2));
