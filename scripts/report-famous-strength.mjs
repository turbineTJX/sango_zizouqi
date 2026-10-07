import {readFileSync,writeFileSync} from 'node:fs';
const dir=new URL('../outputs/famous-strength/',import.meta.url);
const snapshot=JSON.parse(readFileSync(new URL('snapshot.json',dir)));
const read=url=>readFileSync(url,'utf8').trim().split('\n').map(JSON.parse);
const old=read(new URL('../outputs/team-tactics/results.jsonl',import.meta.url));
const avg=a=>a.reduce((n,x)=>n+x,0)/a.length;
const key=r=>[r.formation,r.seed,r.level,r.swapped].join('/');
const rows=[];
for(const [id,name]of [['jia','郭嘉'],['cao','曹操'],['person-186','黄忠']]){
 const fresh=read(new URL(id+'.jsonl',dir)),done=JSON.parse(readFileSync(new URL(id+'-complete.json',dir)));
 if(fresh.length!==96||done.count!==96||done.rulesVersion!==87||done.hash!==snapshot.hash)throw Error('Incomplete or mixed-source audit');
 for(const phase of ['development','validation']){
  const s=rs=>{const on=rs.filter(r=>r.mode==='on'),off=new Map(rs.filter(r=>r.mode==='exclusive-off').map(r=>[key(r),r]));
   if(on.length!==24||off.size!==24)throw Error('Pair count');
   for(const r of on){const o=off.get(key(r));if(JSON.stringify(r.draft)!==JSON.stringify(o.draft)||JSON.stringify(r.initial)!==JSON.stringify(o.initial))throw Error('Opening mismatch');}
   return {on:on.filter(r=>r.win).length,off:[...off.values()].filter(r=>r.win).length,delta:avg(on.map(r=>r.margin-off.get(key(r)).margin))};};
  rows.push({id,name,phase,before:s(old.filter(r=>r.hero===id&&r.phase===phase)),after:s(fresh.filter(r=>r.phase===phase))});
 }
}
writeFileSync(new URL('summary.json',dir),JSON.stringify(rows,null,2));
const pct=x=>(x>=0?'+':'')+(x*100).toFixed(1);
const lines=['# 规则87：名将专属初始强度调整','',
'本轮修改郭嘉、曹操、黄忠三项原先收益偏低的专属；其余13项保持原参数。测试以同一武将启用／禁用专属成对比较，保持同阵容、等级、站位、种子，覆盖混编、近战队友、远程队友，双方各12,000兵，等级5与10，交换左右方。开发及独立验证各2个种子，总计新增288场。使用固定源码副本，未把并行工作区修改混入测试。',
'',
'净收益＝启用相对禁用时，双方剩余兵力差的改善，占初始12,000兵的百分点。不是伤害加成百分比，也不是人物横向排名。关闭专属是诊断条件；开启侧通过合法生成、存档及确定性续战校验。',
'','|武将|阶段|原专属净收益|新专属净收益|新版开启／禁用胜场（各24场）|','|---|---|---:|---:|---:|',
...rows.map(r=>`|${r.name}|${r.phase==='validation'?'独立验证':'开发'}|${pct(r.before.delta)}|${pct(r.after.delta)}|${r.after.on}／${r.after.off}|`),
'',
'郭嘉：优先仍有战法次数的有效目标，排除魔免，按施法威胁和局部覆盖选敌；由单体夺气改为4格内、目标周围1格最多3队夺气，附加10回合抑气与疲弱。夺气基础40，高战意额外20；门槛35、冷却22、每场2次。',
'',
'曹操：由3格2队、7回合、1次，改为4格3队、12回合、2次；基础补充战意12→20，门槛65→55，冷却32→24。',
'',
'黄忠：保留后排优先与残兵追击，基础伤害系数1.65→2.6，次数1→2，门槛70→55，冷却28→22。',
'',
'本轮是可用强度基线，不是最终平衡。总体胜率不要求相同，负局完整保留。原阵容样本有限，后续再扩展对手、不同兵力分配与军团搭配。测试及逐局数据位于当前目录；源码副本位于 source/。',
];writeFileSync(new URL('report.md',dir),lines.join('\n')+'\n');console.log(JSON.stringify(rows,null,2));
