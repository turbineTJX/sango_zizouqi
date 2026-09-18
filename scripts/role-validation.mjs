// Assess role diversity without tuning rules. Real combat, zero starting intent,
// no scripted casts, both initiatives, separate selection and validation seeds.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment} from '../engine.mjs';
import {availableTactics,roleTacticIds,configureTactics,hasStatus,TACTICS_BOOK} from '../tactics.mjs';
import {hexDistance} from '../hex-grid.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

const out=`docs/role-validation-v${RULES_VERSION}`;
const sourceFiles=['engine.mjs','engagement.mjs','tactics.mjs','famous-officers.mjs','passives.mjs','unit-stats.mjs','combat-rules.mjs','relationships.mjs'];
const hashes=()=>Object.fromEntries(sourceFiles.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const sourceHashes=hashes();
const selectionSeeds=[101,211,307,419],validationSeeds=[1009,1103,1201,1301,1409,1511,1601,1709,1801,1907,2003,2111];
const generals=[{id:'person-433',name:'张飞',type:'spear',index:0},{id:'person-99',name:'关羽',type:'cavalry',index:0},{id:'person-186',name:'黄忠',type:'archer',index:1},{id:'person-290',name:'诸葛亮',type:'crossbow',index:2}];
const contexts={
  dense:{name:'密集枪阵',types:['spear','spear','spear'],ids:[['strike','thrust','phalanx'],['thrust','ward','phalanx'],['doubt','ward','cleanse']],positions:[[9,3],[10,3],[10,4]]},
  flank:{name:'双翼骑兵',types:['cavalry','cavalry','cavalry'],ids:[['valor','rush','gallop'],['rush','harass','gallop'],['lure','rush','gallop']],positions:[[9,1],[9,5],[10,3]]},
  ranged:{name:'分散弩阵',types:['crossbow','crossbow','crossbow'],ids:[['pierce','repeat','seal'],['repeat','pierce','retreatShot'],['screen','seal','repeat']],positions:[[11,0],[11,3],[11,6]]},
  control:{name:'混合控制阵',types:['spear','archer','crossbow'],ids:[['doubt','ward','thrust'],['smoke','wildfire','rally'],['seal','screen','ambush']],positions:[[9,3],[11,2],[11,4]]},
};
const formations={compact:{name:'贴身掩护',positions:[[4,3],[3,2],[3,4]]},separated:{name:'前后脱节',positions:[[4,3],[0,1],[0,6]]},flank:{name:'前锋侧置',positions:[[4,0],[3,3],[3,5]]}};
const key=ids=>ids.join('|'),combo=ids=>[...ids].sort().join('|');
const labels=ids=>ids.map(id=>TACTICS_BOOK[id].name).join('→');
const mean=xs=>xs.reduce((n,x)=>n+x,0)/xs.length;
const round=n=>Math.round(n*100)/100;
function orderedLoadouts(g){
  const ids=availableTactics(g).map(s=>s.id),rows=[];
  for(let i=0;i<ids.length;i++)for(let j=0;j<ids.length;j++)for(let k=0;k<ids.length;k++)if(i!==j&&i!==k&&j!==k)rows.push([ids[i],ids[j],ids[k]]);
  assert.equal(rows.length,210);return rows;
}
function fixture(g,context,formation='compact',level=10,team='ranged'){
  const ids=team==='melee'?['person-99','person-433','person-396']:[g.index===0?g.id:'person-433','person-186','person-290'];
  const b=createScenario('officer-lab',1,0,ids).battle;
  b.sides[1].units=b.sides[1].units.slice(0,3);
  for(const [side,s] of b.sides.entries()){
    s.tactic='steady';
    for(const [i,u] of s.units.entries()){
      Object.assign(u,{hp:3000,maxHp:3000,initial:3000,troops:3000,level,experience:0,status:'active',intent:0,cooldown:0,skillReady:{},statuses:{},tacticCasts:{},skillCasts:0,commandBonus:0,deputyBonus:0,advisorBonus:0});
      [u.x,u.y]=(side?contexts[context].positions:formations[formation].positions)[i];
      if(side){
        Object.assign(u,{leadership:85,force:85,intellect:85,politics:70,type:contexts[context].types[i],skillRouteType:contexts[context].types[i]});
        assert.equal(configureTactics(u,contexts[context].ids[i]),null);
      }
    }
  }
  assert.equal(b.sides[0].units[g.index].id,g.id);
  assert.equal(new Set(b.sides.flatMap(s=>s.units.map(u=>`${u.x},${u.y}`))).size,6);
  return b;
}
let runs=0;
const metricKeys=['margin','win','damage','remaining','backline','alive60','focalLoss','rearLoss','incomingHits','rearHits','relayRecipients','wardTicks','supportRangeTicks','ticks'];
function run(base,g,ids,seed,mirror=false,type=null){
  const b=structuredClone(base);b.seed=seed;
  const u=b.sides[0].units[g.index];if(type)u.type=type;
  assert.equal(configureTactics(u,ids),null);
  let side=0;
  if(mirror){
    b.sides.reverse();side=1;
    for(const [i,s] of b.sides.entries())for(const a of s.units){a.side=i;a.x=13-a.x;a.y=7-a.y;}
  }
  lockDeployment(b);
  const own=b.sides[side].units,ownIds=new Set(own.map(a=>a.id)),rearIds=new Set(own.filter(a=>a!==u).map(a=>a.id));
  let damage=0,incomingHits=0,rearHits=0,relayRecipients=0,alive60=0,wardTicks=0,supportRangeTicks=0;
  while(!b.result){
    if(u.status==='active'){
      if(b.tick<60)alive60++;
      if(hasStatus(b,u,'ward'))wardTicks++;
      if(own.some(a=>a!==u&&a.status==='active'&&hexDistance(a,u)<=2))supportRangeTicks++;
    }
    const burns=new Set(b.sides[1-side].units.filter(a=>a.statuses.burn?.sourceId===u.id).map(a=>a.id));
    stepBattle(b);
    for(const e of b.effects){
      if((e.from===u.id&&!ownIds.has(e.to))||(e.text==='灼烧'&&burns.has(e.to)))damage+=e.damage;
      if(!ownIds.has(e.from)&&e.from!==e.to&&e.phase==='impact'){
        if(e.to===u.id)incomingHits++;
        if(rearIds.has(e.to))rearHits++;
      }
      if(e.from===u.id&&e.text==='策应 · 冷却缩短')relayRecipients++;
    }
    assert.ok(b.tick<=b.maxTicks);
  }
  // A survivor of an early victory is alive for the whole restricted horizon.
  if(u.hp>0)alive60=60;
  const ownHp=own.reduce((n,a)=>n+a.hp,0),enemyHp=b.sides[1-side].units.reduce((n,a)=>n+a.hp,0);
  runs++;
  return {seed,mirror,margin:ownHp-enemyHp,win:b.result.winner===side?1:0,damage,remaining:u.hp,backline:ownHp-u.hp,alive60,focalLoss:u.battleDamage,rearLoss:own.filter(a=>a!==u).reduce((n,a)=>n+a.battleDamage,0),incomingHits,rearHits,relayRecipients,wardTicks,supportRangeTicks,ticks:b.tick,casts:u.tacticCasts};
}
function summarize(rows){
  return {...Object.fromEntries(metricKeys.map(k=>[k,round(mean(rows.map(r=>r[k])))])),casts:Object.fromEntries([...new Set(rows.flatMap(r=>Object.keys(r.casts)))].map(id=>[id,round(mean(rows.map(r=>r.casts[id]||0)))]))};
}
function sample(base,g,ids,seeds,type=null){return seeds.flatMap(seed=>[false,true].map(m=>run(base,g,ids,seed,m,type)));}
function paired(a,b,metric='margin'){
  assert.equal(a.length,b.length);
  const clusters=[];
  for(let i=0;i<a.length;i+=2){assert.equal(a[i].seed,b[i].seed);clusters.push(mean([a[i][metric]-b[i][metric],a[i+1][metric]-b[i+1][metric]]));}
  const avg=mean(clusters),sd=Math.sqrt(clusters.reduce((n,x)=>n+(x-avg)**2,0)/(clusters.length-1));
  // Approximate 95% Student interval for 12 seed clusters (11 df).
  const half=2.201*sd/Math.sqrt(clusters.length);
  return {mean:round(avg),low:round(avg-half),high:round(avg+half),positiveSeeds:clusters.filter(x=>x>0).length};
}
export {fixture,run,sample,paired,generals,contexts,formations};
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
mkdirSync(out,{recursive:true});
const discovery=[],validation=[];
for(const g of generals){
  const loadouts=orderedLoadouts(g),byContext={};
  for(const c of Object.keys(contexts)){
    const base=fixture(g,c),ranked=loadouts.map(ids=>({ids,...summarize(sample(base,g,ids,selectionSeeds))})).sort((a,b)=>b.margin-a.margin);
    byContext[c]=ranked;discovery.push({general:g.name,context:c,ranked});
    console.log(`Selection ${g.name} ${c}: ${labels(ranked[0].ids)}; runs=${runs}`);
  }
  const universal=loadouts.map(ids=>({ids,margin:mean(Object.values(byContext).map(rows=>rows.find(r=>key(r.ids)===key(ids)).margin))})).sort((a,b)=>b.margin-a.margin)[0];
  const candidates=new Map([[key(universal.ids),universal.ids]]);
  for(const ranked of Object.values(byContext)){
    const seen=new Set();
    for(const r of ranked)if(!seen.has(combo(r.ids))){seen.add(combo(r.ids));candidates.set(key(r.ids),r.ids);if(seen.size===3)break;}
    const baseWinner=ranked.find(r=>r.ids.every(id=>!TACTICS_BOOK[id].special));candidates.set(key(baseWinner.ids),baseWinner.ids);
  }
  for(const c of Object.keys(contexts)){
    const base=fixture(g,c),rows=[...candidates.values()].map(ids=>({ids,runs:sample(base,g,ids,validationSeeds)}));
    const fixed=rows.find(r=>key(r.ids)===key(universal.ids));
    const winner=rows.find(r=>key(r.ids)===key(byContext[c][0].ids));
    validation.push({general:g.name,type:g.type,context:c,universal:universal.ids,selected:winner.ids,delta:paired(winner.runs,fixed.runs),rows:rows.map(r=>({ids:r.ids,...summarize(r.runs),runs:r.runs})).sort((a,b)=>b.margin-a.margin)});
  }
  console.log(`Validated ${g.name}; runs=${runs}`);
  writeFileSync(out+'/selection.json',JSON.stringify(discovery,null,2));
  writeFileSync(out+'/validation.json',JSON.stringify(validation,null,2));
}
const guan=[],g=generals[1];
const roles=[{id:'assault',ids:roleTacticIds(g,'assault')},{id:'guard',ids:roleTacticIds(g,'guard')},{id:'control',ids:roleTacticIds(g,'control')},{id:'spearGuard',type:'spear',ids:roleTacticIds({type:'spear'},'guard')}];
for(const level of [1,10])for(const team of ['ranged','melee'])for(const c of Object.keys(contexts))for(const f of Object.keys(formations)){
  const base=fixture(g,c,f,level,team);
  const rows=roles.map(r=>({...r,runs:sample(base,g,r.ids,validationSeeds,r.type)}));
  const attack=rows[0],guard=rows[1];
  guan.push({level,team,context:c,formation:f,delta:Object.fromEntries(['margin','damage','backline','alive60','rearLoss'].map(k=>[k,paired(guard.runs,attack.runs,k)])),rows:rows.map(r=>({role:r.id,ids:r.ids,...summarize(r.runs),runs:r.runs}))});
}
writeFileSync(out+'/guan.json',JSON.stringify(guan,null,2));
assert.deepEqual(hashes(),sourceHashes,'Combat rules changed during the audit');
const manifest={rulesVersion:RULES_VERSION,runs,selectionSeeds,validationSeeds,sourceHashes,contexts,formations,definitions:{margin:'自身全队余兵减敌军全队余兵；双方各9000初始兵力',damage:'焦点武将直接伤害及归属他的普通灼烧',alive60:'前60步存活时间，提早获胜仍存活者记60',rear:'焦点以外两队；近战队友组不是字面后排',incomingHits:'敌军针对焦点的直接攻击或战法效果事件，含被盾吸收及控制，不代表独立施放次数',interval:'12种子各自合并双方先后手后，配对差值的近似95% t区间；探索性，多重比较未校正'}};
writeFileSync(out+'/manifest.json',JSON.stringify(manifest,null,2));
const compactRows=guan.filter(r=>r.level===10&&r.team==='ranged'&&r.formation==='compact');
const report=['# 战法定位是否成立：固定规则对照测试','',`规则 ${RULES_VERSION}；共 ${runs} 场完整战斗。测试期间未修改运行规则，源码校验值见 manifest.json。`,'',
'## 方法与判据','',
'- 张飞、关羽、黄忠、诸葛亮四名代表武将，保持真实属性与10级被动；其他两名队友固定，三对三，每队3000兵。零初始战意、空冷却、没有人工施法或军略。双方同等级；敌军普通将属性统一85/85/85/70。消除双方任命攻防加成，保留真实关系和被动。',
'- 每名武将遍历六个基础战法加一个本人专属：35组三选组合（其中20组纯基础），每组六种顺序。四种敌阵、四个筛选种子、交换先后手。',
'- 筛选阶段决定各敌阵配装与平均表现最好的固定配装，再用12个未参与筛选的种子双向复核。不能仅凭不同场景出现不同第一名，就断言换装有实用收益。',
'- 配对差值按种子合并双方先后手，给出近似95% t区间。暂以收益超过270兵（双方各9000初始兵力的3%）且区间下界大于0，作为值得关注的换装收益；这不是游戏内平衡标准。',
'- 关羽另外测试1/10级、远程/近战队友、三种布阵、四类对手、三个骑兵定位；加测改用枪兵护卫作为对照。所有结论仅覆盖这套场景。','',
'## 同一武将是否值得随敌阵换装','',
'| 武将 | 敌阵 | 筛选出的场景配装 | 固定配装 | 复核兵力差收益 | 近似95%区间 |','|---|---|---|---|---:|---|',
...validation.map(r=>`| ${r.general} | ${contexts[r.context].name} | ${labels(r.selected)} | ${labels(r.universal)} | ${r.delta.mean} | [${r.delta.low}, ${r.delta.high}] |`),'',
'## 关羽＋黄忠＋诸葛亮：10级、贴身掩护布阵','',
'三种骑兵配装均不带专属。护卫：挫锐→疾驰→策应；输出：奋战→冲阵→疾驰。此处比较单纯换装，不替换属性与队友。','',
'| 对手 | 定位 | 胜率 | 关羽伤害 | 前60步存活 | 两队后排余兵 | 全队兵力差 | 策应受益队次 |','|---|---|---:|---:|---:|---:|---:|---:|',
...compactRows.flatMap(r=>r.rows.filter(a=>['assault','guard','spearGuard'].includes(a.role)).map(a=>`| ${contexts[r.context].name} | ${{assault:'骑兵输出',guard:'骑兵护卫',spearGuard:'枪兵护卫'}[a.role]} | ${round(a.win*100)}% | ${a.damage} | ${a.alive60} | ${a.backline} | ${a.margin} | ${a.relayRecipients} |`)),'',
'## 护卫相对输出：不同布阵','',
'| 等级 | 队友 | 对手 | 布阵 | 兵力差变化 | 95%区间 | 后排余兵变化 | 伤害变化 |','|---|---|---|---|---:|---|---:|---:|',
...guan.filter(r=>r.level===10&&r.team==='ranged').map(r=>`| ${r.level} | 黄忠＋诸葛亮 | ${contexts[r.context].name} | ${formations[r.formation].name} | ${r.delta.margin.mean} | [${r.delta.margin.low}, ${r.delta.margin.high}] | ${r.delta.backline.mean} | ${r.delta.damage.mean} |`),'',
'## 数据与局限','',
'selection.json 保存所有组合与顺序的筛选结果；validation.json 保存独立种子复核；guan.json 保存完整配对明细。没有修改战法或为了通过而调参。尚未覆盖所有41名将、六对六、攻守城、军略操作及全部队友配装。护卫没有嘲讽、伤害转移或守位命令，能否保护队友必须从结果确认。',''];
writeFileSync(out+'/测试报告.md',report.join('\n'));
console.log(JSON.stringify({runs,validation:validation.map(({general,context,selected,universal,delta})=>({general,context,selected,universal,delta})),guan:compactRows.map(r=>({context:r.context,delta:r.delta,rows:r.rows.map(({runs,...a})=>a)}))},null,2));

}
