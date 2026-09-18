import {readFileSync,writeFileSync} from 'node:fs';
import {TACTICS_BOOK} from '../tactics.mjs';
const root='docs/role-validation-v10/';
const read=name=>JSON.parse(readFileSync(root+name+'.json','utf8'));
const manifest=read('manifest'),selection=read('selection'),validation=read('validation'),guan=read('guan');
const names={dense:'密集枪阵',flank:'双翼骑兵',ranged:'分散弩阵',control:'混合控制阵'};
const roleNames={assault:'骑兵输出',guard:'骑兵护卫',control:'骑兵策应',spearGuard:'枪兵护卫'};
const formationNames={compact:'贴身掩护',separated:'前后脱节',flank:'前锋侧置'};
const label=ids=>ids.map(id=>TACTICS_BOOK[id].name).join('→');
const mean=xs=>xs.reduce((n,x)=>n+x,0)/xs.length;
const round=n=>Math.round(n*100)/100;
const canonical=ids=>[...ids].sort().join('|');
function delta(a,b,k){
  const values=[];for(let i=0;i<a.length;i+=2)values.push((a[i][k]-b[i][k]+a[i+1][k]-b[i+1][k])/2);
  const m=mean(values),sd=Math.sqrt(values.reduce((n,x)=>n+(x-m)**2,0)/(values.length-1)),h=2.201*sd/Math.sqrt(values.length);
  return {mean:round(m),low:round(m-h),high:round(m+h)};
}
const diversity=[];
for(const general of [...new Set(selection.map(r=>r.general))]){
  const contexts=selection.filter(r=>r.general===general),slots={};
  for(const c of contexts){
    const seen=new Set();for(const r of c.ranked){if(seen.has(canonical(r.ids)))continue;seen.add(canonical(r.ids));for(const id of r.ids)slots[id]=(slots[id]||0)+1;if(seen.size===5)break;}
  }
  const rows=validation.filter(r=>r.general===general);
  diversity.push({general,distinctSelections:new Set(rows.map(r=>canonical(r.selected))).size,materialGains:rows.filter(r=>r.delta.mean>270&&r.delta.low>0).length,topFiveAppearances:slots});
}
const troopChanges=guan.map(r=>{
  const spear=r.rows.find(a=>a.role==='spearGuard'),guard=r.rows.find(a=>a.role==='guard'),attack=r.rows.find(a=>a.role==='assault');
  return {level:r.level,team:r.team,context:r.context,formation:r.formation,spearVsGuard:delta(spear.runs,guard.runs,'margin'),spearVsAttack:delta(spear.runs,attack.runs,'margin'),rearVsAttack:delta(spear.runs,attack.runs,'backline'),survivalVsAttack:delta(spear.runs,attack.runs,'alive60')};
});
const lines=['# 当前设计是否实现预期：判读','',`本轮 ${manifest.runs} 场；规则保持不变；194 项机制回归测试通过。机制通过仅代表技能能运行，定位价值仍以对照数据判断。`,'',
'## 换装多样性','',
'| 武将 | 四类敌阵选出不同三件组合数 | 独立复核中有明确换装收益的敌阵数 | 筛选前五组合中的高频战法 |','|---|---:|---:|---|',
...diversity.map(r=>`| ${r.general} | ${r.distinctSelections} | ${r.materialGains}/4 | ${Object.entries(r.topFiveAppearances).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,n])=>`${TACTICS_BOOK[id].name} ${n}/20`).join('；')} |`),'',
'“明确收益”指相对筛选阶段选出的平均最佳固定配装，独立种子平均兵力差收益超过270且近似95%区间下界大于0。前五频次来自筛选集，只是必带风险信号。','',
'## 换兵种：关羽10级＋黄忠＋诸葛亮','',
'枪兵护卫为解围→枪阵→镇军；骑兵护卫为挫锐→疾驰→策应。切换兵种保留关羽的属性与人物被动，骑术等兵种限定被动按真实规则失效；因此结果包含兵种属性与适配性的完整代价。','',
'| 对手 | 布阵 | 枪兵护卫相对骑兵输出兵力差收益 | 95%区间 | 后排余兵变化 | 前60步关羽存活变化 |','|---|---|---:|---|---:|---:|',
...troopChanges.filter(r=>r.level===10&&r.team==='ranged').map(r=>`| ${names[r.context]} | ${formationNames[r.formation]} | ${r.spearVsAttack.mean} | [${r.spearVsAttack.low}, ${r.spearVsAttack.high}] | ${r.rearVsAttack.mean} | ${r.survivalVsAttack.mean} |`),'',
'## 贴身掩护下的实际动作','',
'| 对手 | 配置 | 关羽伤害 | 60步内存活 | 关羽被直接指向的效果次数 | 后排被直接指向的效果次数 | 策应受益队次 | 实际施放均值 |','|---|---|---:|---:|---:|---:|---:|---|',
...guan.filter(r=>r.level===10&&r.team==='ranged'&&r.formation==='compact').flatMap(r=>r.rows.map(a=>`| ${names[r.context]} | ${roleNames[a.role]} | ${a.damage} | ${a.alive60} | ${a.incomingHits} | ${a.rearHits} | ${a.relayRecipients} | ${Object.entries(a.casts).map(([id,n])=>`${TACTICS_BOOK[id].name} ${n}`).join('；')} |`)),'',
'效果次数包括直接攻击、受控或支援信号等事件，不等于伤害或独立施法次数；必须结合后排实际余兵、损失和全队兵力差判断保护是否有效。','',
'## 能解释结果的当前规则','',
'- 骑兵护卫没有守位、嘲讽或替友军承伤机制，仍按通用AI自动追敌；疾驰还会提高接敌速度。策应依赖实际距离，选择辅助战法不会自动让部队停在后排旁。',
'- 枪阵减伤30%并停止移动，镇军保护1格内友军；二者叠加时按乘法叠减伤，不是直接相加。关羽改枪兵后，骑术不再提高移速。',
'- 防御抵抗普攻与武技，军纪抵抗谋略伤害并缩短控制；额外减伤又是一层机制。防御提高不能替代谋略抗性，更不能决定敌人攻击谁。',
'- 若要在同一兵种内稳定扮演坦克，需要分别解决接敌/目标控制与承伤持续性。嘲讽是可测试的方向，不能从当前无嘲讽规则的结果直接断言其收益。',''];
writeFileSync(root+'结果判读.md',lines.join('\n'));
writeFileSync(root+'interpretation.json',JSON.stringify({diversity,troopChanges},null,2));
console.log(JSON.stringify({runs:manifest.runs,diversity,troopChanges:troopChanges.filter(r=>r.level===10&&r.team==='ranged'&&r.formation==='compact')},null,2));
