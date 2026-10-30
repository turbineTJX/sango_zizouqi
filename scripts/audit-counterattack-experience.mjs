// Exploratory gameplay experiment; never a global balance or delivery gate.
// Policies see current public battlefield observations and own resources only.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,appendFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),runtime=resolve(args.runtime||root);
const mod=p=>import(pathToFileURL(join(runtime,p)));
const E=await mod('engine.mjs');
const {generateBattle}=await mod('battle-generator.mjs');
const {deployBattleUnit}=await mod('battle-deployment.mjs');
const {configureCouncilRetreat}=await mod('battle-council.mjs');
const {configureReserveEntry}=await mod('reserve-entry.mjs');
const {appointBattleRoles}=await mod('battle-appointments.mjs');
const {formationCells,formationChoice}=await mod('bond-battlefield.mjs');
const {OFFICER_DESIGNS:O}=await mod('data/design/officers.mjs');
const {OFFICER_ASSIGNMENTS:A}=await mod('data/design/assignments.mjs');
const {unitTactics,shieldAmount,shieldLayers,refreshShield}=await mod('tactics.mjs');
const {tacticUsesLeft,tacticSlotTotal}=await mod('tactic-tempo.mjs');
const {STRATAGEMS}=await mod('stratagems.mjs');
const {chooseEnemyCommand}=await mod('battle-ai.mjs');
const {chooseStratagemPoint,stratagemAreaTargets,stratagemHasEffect,isAreaStratagem}=await mod('stratagem-area.mjs');
const {hexDistance}=await mod('hex-grid.mjs');
const {isTargetable}=await mod('engagement.mjs');
const {RULES_VERSION,CAMPAIGN_TIME}=await mod('combat-rules.mjs');
const {trainingCost}=await mod('troop-training.mjs');
const phase=args.phase||'development',out=resolve(args.out||'work/counterattack-experience/'+phase);
assert.ok(['development','validation','transfer','ablation'].includes(phase));
assert.ok(!existsSync(join(out,'summary.json')),'Use a new output directory to retain earlier experiments');
const hash=x=>createHash('sha256').update(x).digest('hex');
const harnessHash=hash(readFileSync(fileURLToPath(import.meta.url)));
const manifestPath=join(runtime,'..','manifest.json');
const manifest=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath)):null;
assert.ok(manifest,'Run on a frozen runtime produced by freeze-validation-runtime.mjs');
function verifyRuntime(){for(const [p,h] of Object.entries(manifest.hashes))assert.equal(hash(readFileSync(join(runtime,p))),h,p);}
verifyRuntime();
const seeds=phase==='development'?[75431001]:[86431001,86447923,86462117];
const maps=phase==='transfer'?['plain-ridges']:['plain-open'];
const person=name=>{const u=Object.values(O).find(u=>u.name===name);assert.ok(u,name);return u;};
const entry=([name,type,troops=3000])=>({id:person(name).id,type,troops,level:10,retreatAt:null});
const bestType=u=>['spear','halberd','cavalry','archer'].sort((a,b)=>u.aptitudes[b]-u.aptitudes[a]||Number(b===u.type)-Number(a===u.type))[0];
const enemies=[
 {id:'stars',name:'六名将',names:['曹操','赵云','张飞','诸葛亮','陆逊','孙策']},
 {id:'yuan',name:'袁绍混合队',names:['袁绍','颜良','文丑','张郃','沮授','田丰']},
];
const recipes=[
 {id:'guan',name:'关羽与普通辅助',core:'关羽',advisor:'满宠',slots:[0,5,3],team:[['关羽','spear',5000],['廖化','spear',1000],['周仓','halberd',1000],['乐进','spear',4000],['关平','spear',4000],['满宠','halberd',3000]]},
 {id:'zhou',name:'周瑜与普通辅助',core:'周瑜',advisor:'满宠',slots:[0,2,1],team:[['周瑜','archer',5000],['黄盖','archer',3000],['曹洪','spear',4000],['陈群','spear',1000],['徐邈','archer',1000],['满宠','archer',4000]]},
 {id:'reserve',name:'黄忠、关羽后备',core:'关羽',advisor:'满宠',reserve:true,team:[['周仓','halberd',2000],['廖化','spear',2000],['邓芝','archer',2000],['严颜','archer',2000],['吴懿','spear',2000],['满宠','halberd',1000],['关羽','spear',4000],['黄忠','longbow',3000]]},
];
const profiles=r=>r.reserve?['core-first','wait','rotate','reverse']:phase==='transfer'?['default','formation','timed']:phase==='ablation'?['formation','timed']:['default','formation','timed','late','incomplete','no-command'];
const selected=recipes.filter(r=>!args.recipes||args.recipes.split(',').includes(r.id));
const rows=[];mkdirSync(join(out,'battles'),{recursive:true});writeFileSync(join(out,'runs.jsonl'),'');
const alive=u=>u.hp>0&&['active','reserve'].includes(u.status)&&!u.withdrawing;
const casts=u=>Object.values(u.tacticCasts).reduce((n,v)=>n+v,0);
const remaining=u=>unitTactics(u).reduce((n,s)=>n+tacticUsesLeft(u,s),0);
function pointForCore(b,side,key,core){
 const s=STRATAGEMS[key],own=b.sides[side].units;
 if(!isAreaStratagem(s))return null;
 if(s.side!==0)return chooseStratagemPoint(b,s,side);
 let best=null,score=-1;
 for(let y=0;y<8;y++)for(let x=0;x<14;x++){
  const p={x,y},targets=stratagemAreaTargets(b,s,p,side).filter(u=>stratagemHasEffect(b,s,u));
  const value=targets.reduce((n,u)=>n+(u.id===core.id?5:1)+(u.initial-u.hp)/Math.max(1,u.initial),0);
  if(targets.length&&value>score){best=p;score=value;}
 }
 return best;
}
function manualOrder(b,side,profile,coreId){
 if(b.result||profile==='no-command')return null;
 const resource=side?b.enemyCommand:b;if(resource.commandProgress<E.COMMAND_RESOURCE.capacity)return null;
 const available=E.battleStratagems(b,side),core=b.sides[side].units.find(u=>u.id===coreId);
 const fixed=()=>{const key=chooseEnemyCommand(b,available,STRATAGEMS,side);return key?{key,point:chooseStratagemPoint(b,STRATAGEMS[key],side),reason:'固定条件'}:null;};
 if(!['timed','late'].includes(profile))return fixed();
 const fort=available.find(k=>STRATAGEMS[k].effect==='shield'&&(resource.commandReady[k]||0)<=b.tick);
 const active=b.sides[side].units.filter(u=>u.status==='active'&&u.hp>0&&!u.withdrawing);
 const exposed=b.sides[1-side].units.filter(u=>u.status==='active'&&u.hp>0&&isTargetable(b,u));
 const need=profile==='late'?active.some(u=>u.hp<=u.initial*.35):active.some(u=>u.hp<=u.initial*.85&&shieldAmount(b,u)<=u.maxHp*.12&&exposed.some(e=>hexDistance(u,e)<=3));
 if(fort&&need){const point=pointForCore(b,side,fort,core);if(point)return {key:fort,point,reason:profile==='late'?'等到低兵力才保护':'实际承压且现有护盾不足'};}
 // Hold the first protective opportunity instead of silently spending it on fire.
 if(fort)return null;
 return fixed();
}
function advance(state,side,profile,coreId){
 const b=state.battle;E.stepBattle(b,{aiSides:[1-side],pauseForReinforcements:false});
 const command=manualOrder(b,side,profile,coreId);
 if(command){assert.equal(E.issueCommand(b,command.key,command.point,side,{ai:false}),null);return command;}
 return null;
}
function snapshot(b,side,coreId){
 const core=b.sides[side].units.find(u=>u.id===coreId);
 return {tick:b.tick,sides:[side,1-side].map(i=>{const us=b.sides[i].units;return {hp:us.reduce((n,u)=>n+u.hp,0),fighting:us.filter(alive).reduce((n,u)=>n+u.hp,0),active:us.filter(u=>u.status==='active'&&u.hp>0&&!u.withdrawing).length,defeated:us.filter(u=>u.status==='defeated').length,withdrawn:us.filter(u=>u.status==='withdrawn').reduce((n,u)=>n+u.hp,0),shield:us.filter(alive).reduce((n,u)=>n+shieldAmount(b,u),0),casts:us.reduce((n,u)=>n+casts(u),0),availableCasts:us.filter(alive).reduce((n,u)=>n+remaining(u),0)};}),core:{hp:core.hp,status:core.status,intent:core.intent,shield:shieldAmount(b,core),casts:casts(core),specialCasts:core.tacticCasts[A[core.id].specialTactic]||0,available:remaining(core)},units:b.sides.flatMap(s=>s.units).map(u=>({id:u.id,name:u.name,side:u.side===side?0:1,hp:u.hp,status:u.status,withdrawing:u.withdrawing,x:u.x,y:u.y,intent:u.intent,shield:shieldAmount(b,u),casts:casts(u),specialCasts:u.tacticCasts[A[u.id].specialTactic]||0,available:remaining(u)})),command:(side?b.enemyCommand:b).commandProgress};
}
for(const recipe of selected)for(const enemy of enemies)for(const mapId of maps)for(const seed of seeds)for(const side of [0,1])for(const profile of profiles(recipe)){
 const team=recipe.team.map(entry),foe=enemy.names.map(n=>entry([n,bestType(person(n))]));
 assert.equal(team.reduce((n,u)=>n+u.troops,0),18000);assert.equal(new Set([...team,...foe].map(u=>u.id)).size,team.length+foe.length);
 const state=generateBattle({seed,terrain:'land',mapId,battleKind:'field',limit:480,shieldPercent:0,events:[],ownTroopBudget:18000,ownTeam:side?foe:team,enemyTeam:side?team:foe}),b=state.battle;
 E.planBattleCouncilsAI(b,[0,1]);
 const coreId=person(recipe.core).id,armyId=b.sides[side].units[0].armyId;
 assert.equal(appointBattleRoles(b,armyId,{leader:coreId,advisor:person(recipe.advisor).id},side),null);
 const chosen=formationChoice(b,side);
 if(recipe.reserve){
  for(const u of [...b.sides[side].units])assert.equal(E.reserveDeploymentUnit(b,u.id,null,side),null);
  const order=profile==='core-first'?[team[6],team[1],team[2],team[7],team[4],team[5],team[0],team[3]]:profile==='reverse'?[...team.slice(0,6),team[7],team[6]]:team;
  for(const u of order)assert.equal(E.reserveDeploymentUnit(b,u.id,null,side),null);
  const points=[[3,2],[3,4],[2,1],[2,5],[3,6],[3,3]];
  order.slice(0,6).forEach((u,i)=>assert.equal(deployBattleUnit(b,u.id,side?13-points[i][0]:points[i][0],points[i][1],side),null));
  if(['rotate','reverse'].includes(profile))assert.equal(configureCouncilRetreat(b,team.slice(0,2).map(u=>u.id),1000,side),null);
  for(const u of order.slice(6))assert.equal(configureReserveEntry(b,u.id,{x:side?9:4,y:['spear','halberd'].includes(u.type)?3:1},side),null);
 }else if(profile!=='default'&&chosen){
  const cells=formationCells(b,side,chosen.id);
  for(const [i,index]of recipe.slots.entries())assert.equal(deployBattleUnit(b,team[index].id,cells[i].x,cells[i].y,side),null);
  if(profile==='incomplete'){
   const u=b.sides[side].units.find(u=>u.id===team[recipe.slots[2]].id),free=[];
   for(let x=side?9:0;x<=(side?13:4);x++)for(let y=0;y<8;y++)if(!cells.some(c=>c.x===x&&c.y===y)&&!b.sides.flatMap(s=>s.units).some(v=>v.status==='active'&&v.x===x&&v.y===y))free.push({x,y});
   free.sort((a,c)=>hexDistance(a,u)-hexDistance(c,u)||a.x-c.x||a.y-c.y);
   assert.ok(free.some(p=>deployBattleUnit(b,u.id,p.x,p.y,side)===null));
  }
 }
 const initial=b.sides.map(s=>s.units.map(u=>({id:u.id,name:u.name,type:u.type,troops:u.initial,x:u.x,y:u.y,status:u.status,retreatAt:u.retreatAt,entry:u.reserveEntry})));
 assert.equal(E.lockDeployment(b),null);
 if(phase==='ablation')for(const u of b.sides[side].units)refreshShield(b,u,shieldLayers(b,u).filter(l=>!l.source.startsWith('formation:')));
 E.validateSave(structuredClone(state));
 const stem=[recipe.id,enemy.id,mapId,seed,side,profile].join('-'),start=structuredClone(state);
 writeFileSync(join(out,'battles',stem+'-start.json'),JSON.stringify(start));
 const trajectory=[snapshot(b,side,coreId)],events=[],commands=[];let copy=null,copyChecked=false,firstCoreSpecial=null,firstDefeat=null,lastCast=0;
 let previousStatuses=new Map(b.sides.flatMap(s=>s.units).map(u=>[u.id,u.status]));
 while(!b.result){
  const prev=trajectory.at(-1),command=advance(state,side,profile,coreId);
  if(copy){const copied=advance(copy,side,profile,coreId);assert.deepEqual(copied,command);}
  const now=snapshot(b,side,coreId);trajectory.push(now);
  if(command)commands.push({tick:b.tick,...command,coreHp:now.core.hp,coreIntent:now.core.intent,coreSpecialUsed:now.core.specialCasts});
  for(const i of [0,1])if(now.sides[i].casts>prev.sides[i].casts){events.push({tick:b.tick,kind:'tactic',side:i,count:now.sides[i].casts-prev.sides[i].casts});lastCast=b.tick;}
  if(firstCoreSpecial===null&&now.core.specialCasts>0){firstCoreSpecial={tick:b.tick,hp:now.core.hp,hpRatio:now.core.hp/start.battle.sides[side].units.find(u=>u.id===coreId).initial,gap:now.sides[0].fighting-now.sides[1].fighting};events.push({tick:b.tick,kind:'coreSpecial',...firstCoreSpecial});}
  for(const u of b.sides.flatMap(s=>s.units))if(u.status!==previousStatuses.get(u.id)){
   const event={tick:b.tick,kind:'status',side:u.side===side?0:1,name:u.name,from:previousStatuses.get(u.id),to:u.status,hp:u.hp};events.push(event);
   if(u.status==='defeated'){
    if(!firstDefeat)firstDefeat={tick:b.tick,side:event.side,names:[u.name]};
    else if(firstDefeat.tick===b.tick){firstDefeat.names.push(u.name);if(firstDefeat.side!==event.side)firstDefeat.side=null;}
   }
  }
  previousStatuses=new Map(b.sides.flatMap(s=>s.units).map(u=>[u.id,u.status]));
  if(!copy&&b.tick>=20)copy=E.validateSave(structuredClone(state));
 }
 if(copy){assert.deepEqual(copy.battle,b);copyChecked=true;}E.validateSave(structuredClone(state));
 const end=trajectory.at(-1),win=b.result.winner===side,minGap=Math.min(...trajectory.map(t=>t.sides[0].fighting-t.sides[1].fighting));
 const ownCommandFirst=commands[0]?.tick??null,readyTimes=[trajectory.find(t=>t.command>=E.COMMAND_RESOURCE.capacity)?.tick,ownCommandFirst].filter(Number.isFinite),readiness=readyTimes.length?Math.min(...readyTimes):null;
 const row={id:stem,recipe:recipe.id,recipeName:recipe.name,enemy:enemy.id,mapId,phase,profile,seed,side,win,draw:b.result.winner===null,result:b.result,ticks:b.tick,remaining:end.sides[0].hp,fightingRemaining:end.sides[0].fighting,enemyRemaining:end.sides[1].hp,gap:end.sides[0].hp-end.sides[1].hp,minGap,comeback:win&&minGap<=-1800,firstDefeat,wonAfterFirstLoss:win&&firstDefeat?.side===0,firstCoreSpecial,coreDamage:b.sides[side].units.find(u=>u.id===coreId).contribution.damage,coreSurvived:b.sides[side].units.find(u=>u.id===coreId).hp>0,lastCast,tail:b.tick-lastCast,commands,ownCommandFirst,readiness,formation:chosen,openingShield:trajectory[0].sides[0].shield,trainingGold:[team,foe].map(t=>t.reduce((n,u)=>n+trainingCost(u.type,u.troops),0)),initial,deterministic:copyChecked,trajectory,events};
 rows.push(row);appendFileSync(join(out,'runs.jsonl'),JSON.stringify(row)+'\n');writeFileSync(join(out,'battles',stem+'-end.json'),JSON.stringify(state));
 console.log(JSON.stringify({recipe:recipe.id,enemy:enemy.id,profile,side,seed,win,gap:row.gap,comeback:row.comeback,special:firstCoreSpecial?.tick,coreHp:firstCoreSpecial?.hpRatio,command:ownCommandFirst,tail:row.tail}));
}
const mean=(xs,k)=>{const v=xs.map(x=>typeof k==='function'?k(x):x[k]).filter(Number.isFinite);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
const groups=[];for(const r of selected)for(const e of enemies)for(const mapId of maps)for(const profile of profiles(r)){
 const xs=rows.filter(x=>x.recipe===r.id&&x.enemy===e.id&&x.mapId===mapId&&x.profile===profile);if(!xs.length)continue;
 groups.push({recipe:r.id,enemy:e.id,mapId,profile,n:xs.length,wins:xs.filter(x=>x.win).length,draws:xs.filter(x=>x.draw).length,comebacks:xs.filter(x=>x.comeback).length,wonAfterFirstLoss:xs.filter(x=>x.wonAfterFirstLoss).length,meanRemaining:mean(xs,'remaining'),meanGap:mean(xs,'gap'),meanMinGap:mean(xs,'minGap'),specialGames:xs.filter(x=>x.firstCoreSpecial).length,meanSpecialTick:mean(xs,x=>x.firstCoreSpecial?.tick),meanSpecialHp:mean(xs,x=>x.firstCoreSpecial?.hpRatio),meanCoreDamage:mean(xs,'coreDamage'),meanTail:mean(xs,'tail'),meanTicks:mean(xs,'ticks'),meanCommands:mean(xs,x=>x.commands.length),meanFirstCommand:mean(xs,'ownCommandFirst'),meanOpeningShield:mean(xs,'openingShield')});
}
verifyRuntime();assert.equal(hash(readFileSync(fileURLToPath(import.meta.url))),harnessHash);
const summary={rulesVersion:RULES_VERSION,phase,runtime,sourceHash:manifest.sourceHash,harnessHash,seeds,maps,stepsPerDay:CAMPAIGN_TIME.stepsPerDay,scope:'Local diagnostic, not subjective fun validation or delivery gate. 18000 real soldiers each, level 10. Exact same roster, troop types, appointments and budget within comparisons. Cross-roster training costs recorded, not equalized. Public generator, legal deployment/retreat/appointments/commands, fixed skills and enemy AI. Own command policies run between steps, using current visible state and own resources only; no future RNG. Both birth sides; independent seeds. Formation shield removal only in explicit ablation, not a legal player option. All outcomes retained. Comeback = win after own remaining fighting+reserve soldiers trail by at least 1800; this is a descriptive local metric, not power or inevitability.',games:rows.length,deterministic:rows.filter(x=>x.deterministic).length,groups};
writeFileSync(join(out,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
