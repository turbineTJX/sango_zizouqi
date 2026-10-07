import {mkdirSync,writeFileSync} from 'node:fs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,battleStratagems,STRATAGEMS,issueCommand,validateSave} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {chooseStratagemPoint} from '../stratagem-area.mjs';
import {STRATAGEM_DESIGNS} from '../data/design/stratagems.mjs';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
import {BOND_ASSIGNMENTS} from '../data/design/bond-assignments.mjs';
import {OFFICER_ASSIGNMENTS} from '../data/design/assignments.mjs';
import {OFFICER_CATALOG,OFFICER_BY_ID} from '../officer-catalog.mjs';
import {TROOPS} from '../unit-stats.mjs';
import {sideBonds} from '../bonds.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
const dir=new URL('../outputs/custom-strength/',import.meta.url);mkdirSync(dir,{recursive:true});
const seeds={development:[810001,817920],validation:[910001,917920]};
const score=o=>o.leadership+o.force+o.intellect;
const sorted=[...OFFICER_CATALOG].sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));
const cases=[];
for(const [id,d] of Object.entries(BOND_DESIGNS)){
 const holders=sorted.filter(o=>BOND_ASSIGNMENTS[o.id]?.[id]).sort((a,b)=>BOND_ASSIGNMENTS[b.id][id]-BOND_ASSIGNMENTS[a.id][id]);
 const ids=holders.slice(0,6).map(o=>o.id);for(const o of sorted)if(ids.length<6&&!ids.includes(o.id))ids.push(o.id);
 cases.push({id,name:d.name,kind:'bond',ids,type:d.family==='siege'?'siege':d.family});
}
for(const [id,a] of Object.entries(OFFICER_ASSIGNMENTS))if(a.specialTactic)cases.push({id:'special-'+id,name:OFFICER_BY_ID[id].name,kind:'special',ids:[id,...sorted.filter(o=>o.id!==id).slice(0,5).map(o=>o.id)]});
for(const type of Object.keys(TROOPS))cases.push({id:'troop-'+type,name:TROOPS[type].name,kind:'troop',ids:sorted.slice(0,6).map(o=>o.id),type});
const reserveIds=[...cases.find(c=>c.id==='bondReserve').ids];for(const o of sorted)if(reserveIds.length<8&&!reserveIds.includes(o.id))reserveIds.push(o.id);
for(const retreat of [null,1200])cases.push({id:'reserves-'+(retreat?'rotate':'hold'),name:'蓄锐后备'+(retreat?'轮换':'坚守'),kind:'reserve',ids:reserveIds,retreat,troops:1500});
const commandIds=['cao',...sorted.filter(o=>o.id!=='cao').slice(0,7).map(o=>o.id)];
for(const leader of ['cao',commandIds[1]])cases.push({id:'leader-'+leader,name:'八队统军-'+OFFICER_BY_ID[leader].name,kind:'leader',ids:commandIds,leader,troops:1500});
for(const type of ['ram','siege','tower'])cases.push({id:'siege-'+type,name:'攻城-'+TROOPS[type].name,kind:'siege',ids:sorted.slice(0,6).map(o=>o.id),type});
const rows=[];
for(const c of cases)for(const level of [1,5,10])for(const [batch,batchSeeds] of Object.entries(seeds))for(const seed of batchSeeds)for(const swapped of [false,true]){
 const enemy=sorted.filter(o=>!c.ids.includes(o.id)).slice(0,c.ids.length).map(o=>o.id);
 const entry=(id,i,subject)=>({id,type:subject&&c.type&&TROOPS[c.type]?c.type:(OFFICER_BY_ID[id].type==='ship'?'spear':OFFICER_BY_ID[id].type),troops:c.troops||2000,level,...(c.kind==='reserve'?{first:i<6,retreatAt:i<6?c.retreat:null}:{})});
 const team=c.ids.map((id,i)=>entry(id,i,true)),foes=enemy.map((id,i)=>entry(id,i,false));
 const draft={battleKind:c.kind==='siege'?(swapped?'defense':'siege'):'field',terrain:c.type==='ship'?'river':'land',seed,limit:360,shieldPercent:0,waves:[],ownTeam:swapped?foes:team,enemyTeam:swapped?team:foes};
 if(c.kind==='reserve'||c.kind==='leader'){
 const key=swapped?'enemyTeamRoles':'ownTeamRoles';draft[key]={leader:c.leader||c.ids.find(id=>id!=='cao'),advisor:c.ids[0]};
 const other=swapped?'ownTeamRoles':'enemyTeamRoles';draft[other]={leader:enemy.find(id=>id!=='cao'),advisor:enemy[0]};
 }
 const state=generateBattle(draft),b=state.battle;lockDeployment(b);const opening=b.sides.map((_,i)=>sideBonds(b,i)),openingSlots=b.sides.map(s=>s.units.filter(u=>u.status==='active').length);
 const hits={},casts={};let replay;
 while(!b.result){
  const command=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);
  if(command){const point=chooseStratagemPoint(b,STRATAGEM_DESIGNS[command],0);issueCommand(b,command,point);if(replay)issueCommand(replay.battle,command,point);}
  stepBattle(b,{pauseForReinforcements:false});if(replay)stepBattle(replay.battle,{pauseForReinforcements:false});
  for(const e of b.effects){if(e.phase==='cast')casts[e.label]=(casts[e.label]||0)+1;if(e.damage>0&&e.skill)hits[e.label]=(hits[e.label]||0)+e.damage;}
  if(b.tick===12&&seed===810001&&level===5&&!swapped)replay=validateSave(structuredClone(state));
 }
 if(replay&&JSON.stringify(replay.battle)!==JSON.stringify(b))throw Error('Replay mismatch '+c.id);
 validateSave(state);
 rows.push({case:c.id,name:c.name,kind:c.kind,level,batch,seed,swapped,subjectWon:b.result.winner===(swapped?1:0),winner:b.result.winner,reason:b.result.reason,ticks:b.tick,opening,openingSlots,hits,casts,draft,units:b.sides.map(s=>s.units.map(u=>({id:u.id,name:u.name,type:u.type,initial:u.initial,remaining:u.hp,tactics:u.tactics,casts:u.tacticCasts,contribution:u.contribution,bondState:u.bondState,bondEntry:u.bondEntry,traitState:u.traitState,status:u.status,reserveEntry:u.reserveEntry})))});
}
writeFileSync(new URL('results.json',dir),JSON.stringify({rulesVersion:RULES_VERSION,seeds,cases,rows},null,2));
let report='# 当前自定义战役强度诊断\n\n双方总兵力12000，通常六队各2000；后备与统军专项八队各1500。攻城专项保持受测方进攻，交换界面阵营；其余为野战。等级1/5/10；两组各2个种子并交换双方。全部配置、败局、施放次数、直接伤害与贡献保存在 results.json。每种配置的5级首个开发样本验证确定性续战。\n\n这是合法阵容的整体强度筛查：武将属性、固定战法、军略和其他羁绊共同变化，不能把胜率归因于单项能力。对手为排除受测阵容后的固定强将队；各阵容对手可能不同，不能按胜率直接排单项强度榜。内政与行军特性不在战斗评估范围。\n\n|配置|等级|开发胜/局|验证胜/局|我方胜/局|敌方胜/局|平均剩余兵力差|\n|---|---|---|---|---|---|---|\n';
for(const c of cases)for(const level of [1,5,10]){
 const rs=rows.filter(r=>r.case===c.id&&r.level===level),rate=pred=>{const x=rs.filter(pred);return `${x.filter(r=>r.subjectWon).length}/${x.length}`;};
 const delta=rs.reduce((n,r)=>n+r.units[r.swapped?1:0].reduce((a,u)=>a+u.remaining,0)-r.units[r.swapped?0:1].reduce((a,u)=>a+u.remaining,0),0)/rs.length;
 report+=`|${c.name}|${level}|${rate(r=>r.batch==='development')}|${rate(r=>r.batch==='validation')}|${rate(r=>!r.swapped)}|${rate(r=>r.swapped)}|${delta.toFixed(0)}|\n`;
}
report+='\n## 羁绊实际开场覆盖（10级）\n\n';for(const c of cases.filter(c=>c.kind==='bond')){const r=rows.find(r=>r.case===c.id&&r.level===10&&!r.swapped);const x=r.opening[0][c.id];report+=`- ${c.name}：${x?.points||0}点，第${x?.tier||0}档。\n`;}
const actual=new Map();for(const r of rows)for(const us of r.units)for(const u of us)for(const [id,n] of Object.entries(u.casts))actual.set(id,(actual.get(id)||0)+n);
report+='\n## 战法实际施放覆盖\n\n'+[...actual].map(([id,n])=>`- ${id}：${n}次`).join('\n')+'\n';
writeFileSync(new URL('report.md',dir),report);console.log(`${rows.length} battles; ${cases.length} configurations; ${actual.size} tactics cast. outputs/custom-strength/report.md`);

