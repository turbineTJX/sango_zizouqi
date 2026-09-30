import {readFileSync,writeFileSync,mkdirSync,readdirSync,copyFileSync,cpSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve('.'),phase=process.argv[2]||'develop',pointer=join(root,'outputs/eight-strength-latest.json');
let out,meta;
if(phase==='develop'){
 out=join(root,'outputs','eight-strength-'+Date.now());mkdirSync(join(out,'snapshot'),{recursive:true});
 const files=readdirSync(root).filter(f=>f.endsWith('.mjs'));const hashes={};
 for(const f of files){copyFileSync(join(root,f),join(out,'snapshot',f));hashes[f]=createHash('sha256').update(readFileSync(join(root,f))).digest('hex');}
 cpSync(join(root,'data'),join(out,'snapshot/data'),{recursive:true});
 const hashData=dir=>{for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())hashData(p);else hashes[p.slice(root.length+1).replaceAll('\\','/')]=createHash('sha256').update(readFileSync(p)).digest('hex');}};hashData(join(root,'data'));
 meta={out,created:new Date().toISOString(),version:Number(readFileSync(join(root,'combat-rules.mjs'),'utf8').match(/RULES_VERSION = (\d+)/)[1]),hashes,criteria:{overpower:'Across at least 3 cases and both sides: win +20 percentage points or remaining-force-margin +15 percentage points in independent validation',weak:'At least 80% cast rate but <=1 actual status application per cast, without positive remaining-force gain',mechanism:'No illegal target, no status duration above 2 rounds, no continuous formation-confusion over 2 rounds; current-version saves resume exactly'},seeds:{develop:[710101,710117,710131,710149],validation:Array.from({length:12},(_,i)=>810001+i*104729)}};
 writeFileSync(pointer,JSON.stringify({out}));writeFileSync(join(out,'manifest.json'),JSON.stringify(meta,null,2));
 let p=join(out,'snapshot/battle-ai.mjs'),s=readFileSync(p,'utf8');s=s.replace('export function chooseEnemyCommand(b,available,definitions,side=1){',"export function chooseEnemyCommand(b,available,definitions,side=1){\n  // Audit-only availability ablation; production source is unchanged.\n  if(b.auditEightMode==='withheld')available=available.filter(key=>key!=='zhuge-eight');");writeFileSync(p,s);
 p=join(out,'snapshot/stratagem-zones.mjs');s=readFileSync(p,'utf8');s=s.replace('  for(const u of stratagemAreaTargets(b,s,zone.point,zone.side)){',`  const occupants=stratagemAreaTargets(b,s,zone.point,zone.side);
  (b.auditZoneRounds??=[]).push({tick:b.tick,side:zone.side,count:occupants.length,ids:occupants.map(u=>u.id)});
  for(const u of occupants){`);
 s=s.replace('   if(!choices.length)continue;',`   const observation={tick:b.tick,id:u.id,side:u.side,discipline:unitAttributes(u,b).discipline,choices:[...choices],applied:false};
   (b.auditEight??=[]).push(observation);
   if(!choices.length)continue;`);
 s=s.replace('   if(random(b)>=chance)continue;', '   const roll=random(b);Object.assign(observation,{chance,roll});\n   if(roll>=chance)continue;');
 s=s.replace("   const source={", "   observation.selected=key;\n   if(b.auditEightMode==='suppressed')continue;\n   const source={");
 s=s.replace('if(applyStatus(u,key,s.zone.statusSteps,source))onApplied(zone,u,key,chance);','if(applyStatus(u,key,s.zone.statusSteps,source)){observation.applied=true;onApplied(zone,u,key,chance);}');writeFileSync(p,s);
}else{out=JSON.parse(readFileSync(pointer,'utf8')).out;meta=JSON.parse(readFileSync(join(out,'manifest.json'),'utf8'));}
const load=name=>import(pathToFileURL(join(out,'snapshot',name)).href);
const E=await load('engine.mjs'),{createScenario}=await load('scenarios.mjs'),{chooseEnemyCommand}=await load('battle-ai.mjs'),{chooseStratagemPoint,stratagemAreaContains}=await load('stratagem-area.mjs'),{OFFICER_BY_ID}=await load('officer-catalog.mjs');
const key='zhuge-eight',definition=E.STRATAGEMS[key];
const entry=(id,type,troops=3000)=>({id,type,troops,level:5});
const subject=[entry('person-290','crossbow'),entry('person-396','cavalry'),entry('person-433','spear'),entry('person-368','halberd'),entry('person-255','crossbow'),entry('jin','spear')];
const low=[entry('person-661','cavalry'),entry('wen','cavalry'),entry('yan','spear'),entry('liao','cavalry'),entry('chu','halberd'),entry('gao','spear')];
const high=[entry('cao','spear'),entry('person-226','halberd'),entry('person-246','archer'),entry('jia','crossbow'),entry('tian','spear'),entry('yu','crossbow')];
const cases=[
 {id:'low-discipline',name:'六队低军纪武斗阵容',team:subject,enemy:low,roles:{leader:'person-661',advisor:'liao'}},
 {id:'high-discipline',name:'六队高军纪统帅谋士',team:subject,enemy:high,roles:{leader:'cao',advisor:'person-226'}},
 {id:'unequal',name:'六队非均分主辅',team:subject.map((u,i)=>({...u,troops:[1000,6000,4000,2000,2000,3000][i]})),enemy:low,roles:{leader:'person-661',advisor:'liao'}},
 {id:'small',name:'三队小规模交战',team:subject.slice(0,3),enemy:low.slice(0,3),roles:{leader:'person-661',advisor:'person-661'}},
 {id:'siege',name:'六队攻守城',team:subject,enemy:high,roles:{leader:'cao',advisor:'person-226'},siege:true},
 {id:'reserves',name:'八队含两队后备',team:[...subject,entry('person-99','cavalry'),entry('yuanxia','archer')],enemy:[...high,entry('wen','cavalry'),entry('yan','spear')],roles:{leader:'cao',advisor:'person-226'}}
];
const {validFrontline}=await import(pathToFileURL(join(out,'snapshot/army-trait-rules.mjs')));
const modes=['normal','suppressed','withheld'];
function run(c,seed,side,mode,resume=false){
 const draft={seed,terrain:'land',battleKind:c.siege?(side===0?'siege':'defense'):'field',gateHp:12000,shieldPercent:20,ownTeam:structuredClone(side===0?c.team:c.enemy),enemyTeam:structuredClone(side===0?c.enemy:c.team),ownTeamRoles:side===0?{leader:'person-290',advisor:'person-290'}:c.roles,enemyTeamRoles:side===0?c.roles:{leader:'person-290',advisor:'person-290'}};
 const totals=[draft.ownTeam,draft.enemyTeam].map(a=>a.reduce((n,u)=>n+u.troops,0));assert.equal(totals[0],totals[1]);
 const state=createScenario('custom-battle',seed,20,null,draft),b=state.battle;b.auditEightMode=mode;E.lockDeployment(b);E.validateSave(structuredClone(state));
 const opening=b.sides.map(s=>s.units.map(u=>({id:u.id,name:u.name,type:u.type,initial:u.initial,first:u.status==='active',discipline:E.unitAttributes(u,b).discipline,tactics:[...u.tactics],retreatAt:u.retreatAt,x:u.x,y:u.y})));
 const commands=[],statusTicks={},serial=[0,0],streak={},maxStreak={};let replay=null,maxActive=0,unitStatusTicks=0;
 const player=which=>{if(which.result||which.commandProgress<E.COMMAND_RESOURCE.capacity)return;const k=chooseEnemyCommand(which,E.battleStratagems(which,0),E.STRATAGEMS,0);if(k)assert.equal(E.issueCommand(which,k,chooseStratagemPoint(which,E.STRATAGEMS[k],0)),null);};
 const recordCommands=()=>{for(const si of [0,1]){const r=si===0?b:b.enemyCommand;if(r.commandSerial!==serial[si]){serial[si]=r.commandSerial;commands.push({side:si,...structuredClone(r.lastCommand)});}}};
 while(!b.result){
  player(b);if(replay)player(replay.battle);recordCommands();
  E.stepBattle(b);if(replay)E.stepBattle(replay.battle);recordCommands();
  for(const s of b.sides){const active=s.units.filter(u=>u.status==='active');assert.ok(validFrontline(b,b.sides.indexOf(s)));maxActive=Math.max(maxActive,active.length);}
  for(const u of b.sides[1-side].units){let affected=false;for(const k of definition.zone.statuses){const st=u.statuses[k];if(st&&st.sourceSkillName===definition.name&&st.until>b.tick&&u.status==='active'){
    assert.ok(st.until<=b.tick+2);statusTicks[k]=(statusTicks[k]||0)+1;affected=true;
   }}if(affected)unitStatusTicks++;
   const st=u.statuses.confuse;if(st&&st.sourceSkillName===definition.name&&st.until>b.tick&&u.status==='active'){streak[u.id]=(streak[u.id]||0)+1;maxStreak[u.id]=Math.max(maxStreak[u.id]||0,streak[u.id]);}else streak[u.id]=0;
  }
  if(resume&&!replay&&b.tick===20)replay=E.validateSave(structuredClone(state));
  assert.ok(b.tick<=480);
 }
 if(replay)assert.deepEqual(b,replay.battle);E.validateSave(structuredClone(state));
 const remaining=b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0)),zoneCommands=commands.filter(c=>c.key===key),trace=b.auditEight||[],applied=trace.filter(e=>e.applied);
 assert.ok(Object.values(maxStreak).every(n=>n<=2));
 return {case:c.id,name:c.name,phase,seed,subjectSide:side,mode,draft,opening,maxActive,winner:b.result.winner,win:b.result.winner===side,draw:b.result.winner===null,ticks:b.tick,reason:b.result.reason,remaining,margin:(remaining[side]-remaining[1-side])/totals[side],commands,zoneCast:zoneCommands[0]||null,zoneRounds:b.auditZoneRounds||[],trace,applications:applied.length,distinctVictims:new Set(applied.map(x=>x.id)).size,statusTicks,unitStatusTicks,maxConfuseStreak:Math.max(0,...Object.values(maxStreak)),resumed:!!replay,units:b.sides.map(s=>s.units.map(u=>({id:u.id,hp:u.hp,initial:u.initial,status:u.status,casts:u.tacticCasts,contribution:u.contribution}))),finalSeed:b.seed};
}
const rows=[];const seeds=meta.seeds[phase];assert.ok(seeds,'phase must be develop or validation');
for(const c of cases){
 for(const side of [0,1])for(const seed of seeds)for(const mode of modes)rows.push(run(c,seed,side,mode,seed===seeds[0]&&mode==='normal'));
 writeFileSync(join(out,phase+'-results.json'),JSON.stringify(rows,null,2));
 const normal=rows.filter(r=>r.case===c.id&&r.mode==='normal'),ab=rows.filter(r=>r.case===c.id&&r.mode==='suppressed');
 console.log(JSON.stringify({case:c.id,phase,battles:rows.length,normalWins:normal.filter(r=>r.win).length,suppressedWins:ab.filter(r=>r.win).length,n:normal.length,casts:normal.filter(r=>r.zoneCast).length,applications:normal.reduce((a,r)=>a+r.applications,0)/normal.length}));
}
const all=['develop','validation'].flatMap(p=>existsSync(join(out,p+'-results.json'))?JSON.parse(readFileSync(join(out,p+'-results.json'),'utf8')):[]);
const mean=(a,f)=>a.length?a.reduce((n,r)=>n+f(r),0)/a.length:0;
const summary=[];for(const p of ['develop','validation'])for(const c of cases)for(const side of [0,1]){
 const cell=all.filter(r=>r.phase===p&&r.case===c.id&&r.subjectSide===side);if(!cell.length)continue;
 const normal=cell.filter(r=>r.mode==='normal'),suppressed=cell.filter(r=>r.mode==='suppressed'),withheld=cell.filter(r=>r.mode==='withheld');
 summary.push({phase:p,case:c.id,name:c.name,side,n:normal.length,win:normal.filter(r=>r.win).length,suppressedWin:suppressed.filter(r=>r.win).length,withheldWin:withheld.filter(r=>r.win).length,draw:normal.filter(r=>r.draw).length,margin:mean(normal,r=>r.margin),gainVsSuppressed:mean(normal,r=>r.margin)-mean(suppressed,r=>r.margin),gainVsWithheld:mean(normal,r=>r.margin)-mean(withheld,r=>r.margin),castRate:mean(normal,r=>Number(!!r.zoneCast)),castTick:mean(normal.filter(r=>r.zoneCast),r=>r.zoneCast.tick),applications:mean(normal,r=>r.applications),distinctVictims:mean(normal,r=>r.distinctVictims),confuseTicks:mean(normal,r=>r.statusTicks.confuse||0),unitStatusTicks:mean(normal,r=>r.unitStatusTicks),occupancy:mean(normal,r=>r.zoneRounds.reduce((n,q)=>n+q.count,0)),emptyRoundRate:mean(normal,r=>r.zoneRounds.length?r.zoneRounds.filter(q=>!q.count).length/r.zoneRounds.length:0),maxConfuseStreak:Math.max(...normal.map(r=>r.maxConfuseStreak)),ticks:mean(normal,r=>r.ticks),targetDiscipline:mean(normal,r=>mean(r.opening[1-side],u=>u.discipline))});
}
writeFileSync(join(out,'summary.json'),JSON.stringify({version:meta.version,total:all.length,criteria:meta.criteria,summary},null,2));
let report=`# 八阵困敌强度诊断\n\n冻结规则${meta.version}，全部使用合法自定义战役，固定战法与真实充能。每组同阵容、等级和总兵力，交换双方。normal为当前规则；suppressed仅屏蔽八阵异常效果但照常施放和消费进度，属于机制消融；withheld禁止本轮施放八阵、按固定顺序使用其他军略，属于机会成本对照，不代表实际敌军的新策略。无兵力、战意或军略进度注入。测试脚本只修改快照内的观测与消融钩子，正式规则未改。\n\n预设诊断界限：${meta.criteria.overpower}。${meta.criteria.weak}。${meta.criteria.mechanism}。这些是初筛标准，非完整平衡保证。\n\n共${all.length}局。胜负之外记录所有失败局、部署、实际军纪、状态触发、持续覆盖、部队贡献、军略与兵力。每场景每个出生侧的首个种子验证确定性续战。\n\n| 种子组 | 场景 | 诸葛亮方 | 正常胜/局 | 屏蔽效果胜 | 不施放胜 | 剩余兵力差改善/预算 | 每局异常 | 混乱队回合 | 阵内队回合 | 施放率 |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
for(const r of summary)report+=`| ${r.phase} | ${r.name} | ${r.side===0?'玩家侧':'敌军侧'} | ${r.win}/${r.n} | ${r.suppressedWin}/${r.n} | ${r.withheldWin}/${r.n} | ${(100*r.gainVsSuppressed).toFixed(1)}百分点 | ${r.applications.toFixed(1)} | ${r.confuseTicks.toFixed(1)} | ${r.occupancy.toFixed(1)} | ${(100*r.castRate).toFixed(0)}% |\n`;
report+='\n结果文件：develop-results.json、validation-results.json（各局完整数据，包含失败局），summary.json（汇总），manifest.json（原始源码校验和、种子和事前标准），snapshot/（冻结引擎与明确标注的诊断钩子）。\n';
writeFileSync(join(out,'report.md'),report);console.log('REPORT '+join(out,'report.md'));
