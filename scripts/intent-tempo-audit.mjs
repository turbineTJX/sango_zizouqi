import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {world,officers,builds,focalTeam,enemyTeam,fixture} from './balance-v14-lib.mjs';

// Pass an immutable pre-change runtime directory to compare real zero-intent battles.
const baseline=process.argv[2];
assert.ok(baseline,'Usage: node scripts/intent-tempo-audit.mjs <baseline-runtime> [output-dir] [candidate-runtime]');
const out=process.argv[3]||'docs/intent-v18';mkdirSync(out,{recursive:true});
const scenarios=['field','breach','eight-arms','river','terrain','rotation'];
const seeds=[101,211,307,419,521,631,743,857];
const contexts=['doubleFront','fireline','breach'];
const results=[];
function track(w,b,units){
  w.lockDeployment(b);
  const rows=units.map(u=>({id:u.id,type:u.type,first:null,firstPaid:null,firstHighCast:null,high:null,cap:null,casts30:0,casts:0}));
  const previous=new Map(units.map(u=>[u.id,{}]));
  while(!b.result){
    w.stepBattle(b);
    for(let i=0;i<units.length;i++){
      const u=units[i],r=rows[i],last=previous.get(u.id);
      if(u.skillCasts)r.first??=b.tick;
      for(const [id,count]of Object.entries(u.tacticCasts))if(count>(last[id]||0)){
        if(w.TACTICS_BOOK[id].threshold>0)r.firstPaid??=b.tick;
        if(w.TACTICS_BOOK[id].threshold>=60)r.firstHighCast??=b.tick;
        last[id]=count;
      }
      if(u.intent>=80)r.high??=b.tick;if(u.intent>=100)r.cap??=b.tick;
      if(b.tick<=42)r.casts30=u.skillCasts;r.casts=u.skillCasts;
    }
    assert.ok(b.tick<=b.maxTicks);
  }
  return rows;
}
const median=xs=>{xs=xs.filter(x=>x!==null).sort((a,b)=>a-b);return xs.length?+((xs[Math.floor((xs.length-1)/2)]+xs[Math.ceil((xs.length-1)/2)])/2*.7).toFixed(1):null;};
const mean=xs=>+(xs.reduce((n,v)=>n+v,0)/xs.length).toFixed(3);
const summary=rows=>({n:rows.length,firstPaid:median(rows.map(r=>r.firstPaid)),high:median(rows.map(r=>r.high)),cap:median(rows.map(r=>r.cap)),highCast:median(rows.map(r=>r.firstHighCast)),casts30:mean(rows.map(r=>r.casts30)),capRate:mean(rows.map(r=>Number(r.cap!==null))),castRate:mean(rows.map(r=>Number(r.casts>0)))});
for(const [tag,source] of [['before',baseline],['after',process.argv[4]||'.']]){
  const w=await world(source),scenarioRows=[],officerRows=[],catalog=officers(w);let battles=0;
  for(const scenario of scenarios)for(const seed of seeds){
    const b=w.createScenario(scenario,seed).battle;
    const units=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');
    scenarioRows.push(...track(w,b,units).map(r=>({...r,scenario,seed})));battles++;
  }
  for(const g of catalog){
    const all=builds(w,g),selected=[all.find(x=>x.key==='assaultSpecial')||all.find(x=>x.key==='assault'),all.find(x=>x.key==='guard')];
    for(const build of selected)for(const enemy of contexts)for(const mirror of [false,true]){
      const b=fixture(w,focalTeam(w,g,build.ids),enemyTeam(w,enemy),'compact',10,211,mirror),side=mirror?1:0;
      const u=b.sides[side].units.find(u=>u.id===g.id),[row]=track(w,b,[u]);
      officerRows.push({...row,name:g.name,famous:g.famous,build:build.key,enemy,mirror,win:b.result.winner===side?1:b.result.winner===null?.5:0});battles++;
    }
  }
  const groups=Object.fromEntries(['all','spear','halberd','cavalry','archer','crossbow','logistics','siege','ship'].map(type=>[type,summary(scenarioRows.filter(r=>type==='all'||r.type===type))]));
  const officerGroups=Object.fromEntries([true,false].map(famous=>{const rs=officerRows.filter(r=>r.famous===famous);return[famous?'famous':'ordinary',{...summary(rs),win:mean(rs.map(r=>r.win))}];}));
  const rulesVersion=Number(readFileSync(`${w.dir}/combat-rules.mjs`,'utf8').match(/RULES_VERSION = (\d+)/)[1]);
  results.push({tag,battles,rulesVersion,hashes:w.hashes,scenarioRows,officerRows,groups,officerGroups});
  console.log(tag,battles,JSON.stringify(groups.all),JSON.stringify(officerGroups));
}
writeFileSync(`${out}/results.json.gz`,gzipSync(JSON.stringify({seeds,scenarios,contexts,results})));
const [before,after]=results;
const names={all:'全部',spear:'枪',halberd:'戟',cavalry:'骑',archer:'弓',crossbow:'弩',logistics:'后勤',siege:'兵器',ship:'舰船'};
const lines=['# 战意节奏调整验证','',
'本报告统计两个指定运行快照的战意蓄积与武将表现；具体调整内容应结合运行规则与同目录设计说明阅读。战法按门槛与冷却施放，不消耗战意。','',
`正式对照 ${before.battles+after.battles} 场：两个版本各 48 场演武、780 场武将配装战斗。双方从零战意及实际配装开始，使用真实目标、ZOC、地形、冷却和伤兵规则，不注入待施放状态。演武保留正常敌方军略；武将对照去除军团加成与军略。`, '',
`运行快照规则号：${before.rulesVersion} → ${after.rulesVersion}。具体代码范围以原始结果中的模块哈希为准；快照之后其他任务的 AI 改动不纳入此次对照。`, '',
'下表为 6 个演武、8 个种子的首发部队样本中位数。单位是模拟秒（每步 0.7 秒），不含技能演出暂停，不能直接当成玩家观看时长。骑兵零门槛驰行不计入“首个有门槛战法”。','',
'| 兵种 | 首个有门槛战法：前→后 | 达到 80 战意：前→后 | 满战意：前→后 | 前 29.4 秒平均施放：前→后 |',
'|---|---:|---:|---:|---:|'];
for(const type of Object.keys(names)){const a=before.groups[type],b=after.groups[type];lines.push(`| ${names[type]} | ${a.firstPaid} → ${b.firstPaid} | ${a.high} → ${b.high} | ${a.cap} → ${b.cap} | ${a.casts30} → ${b.casts30} |`);}
lines.push('','## 武将检查','','覆盖 41 名名将和 24 名普通武将；每人进攻配装（有专属则携带专属）与基础防守配装各一套，面对三类对手，交换左右侧。数值是本次固定队友／对手样本，不能用作全部武将或配装的强度排名。','',
'| 类别 | 完成至少一次战法的对局比例：前→后 | 队伍胜率：前→后 | 前 29.4 秒平均施放：前→后 |','|---|---:|---:|---:|');
for(const key of ['famous','ordinary']){const a=before.officerGroups[key],b=after.officerGroups[key];lines.push(`| ${key==='famous'?'名将':'普通武将'} | ${(a.castRate*100).toFixed(1)}% → ${(b.castRate*100).toFixed(1)}% | ${(a.win*100).toFixed(1)}% → ${(b.win*100).toFixed(1)}% | ${a.casts30} → ${b.casts30} |`);}
lines.push('','达到门槛后的施放还受独立冷却、合法目标和减战意影响。没有穷举每位武将的所有兵种、20 种三战法组合和敌方阵容；结论只适用于上列样本。原始逐场结果、运行模块哈希保存在 results.json.gz。','');
writeFileSync(`${out}/验证报告.md`,lines.join('\n'));
