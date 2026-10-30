import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,appendFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {RECIPES,ENEMIES,DEVELOPMENT_SEEDS,VALIDATION_SEEDS,CONFIRMATION_SEEDS} from './common-roster-recipes.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
const runtime=resolve(args.runtime),out=resolve(args.out),phase=args.phase||'development';
assert.ok(!existsSync(out),'Preserve all prior runs including failures');mkdirSync(join(out,'battles'),{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),load=p=>import(pathToFileURL(join(runtime,p)));
const manifest=JSON.parse(readFileSync(join(runtime,'../manifest.json'))),harnessHash=sha(readFileSync(fileURLToPath(import.meta.url)));
function verify(){for(const [p,h]of Object.entries(manifest.hashes))assert.equal(sha(readFileSync(join(runtime,p))),h,p);}verify();
const E=await load('engine.mjs'),{generateBattle}=await load('battle-generator.mjs');
const {OFFICER_DESIGNS:O}=await load('data/design/officers.mjs'),{OFFICER_ASSIGNMENTS:A}=await load('data/design/assignments.mjs');
const {appointBattleRoles}=await load('battle-appointments.mjs'),{unitTactics,shieldAmount}=await load('tactics.mjs');
const {STRATAGEMS}=await load('stratagems.mjs'),{chooseEnemyCommand}=await load('battle-ai.mjs');
const {chooseStratagemPoint,stratagemAreaTargets,stratagemHasEffect}=await load('stratagem-area.mjs');
const {hexDistance}=await load('hex-grid.mjs'),{trainingCost}=await load('troop-training.mjs');
const {nationalWorld,nationalRoster}=await load('national-scenarios.mjs');
const person=n=>{const p=Object.values(O).find(u=>u.name===n);assert.ok(p,n);return p;};
const recipes=RECIPES.filter(r=>!args.recipes||args.recipes.split(',').includes(r.id));
const enemies=ENEMIES.filter(r=>args.enemies?args.enemies.split(',').includes(r.id):!r.optional);
const level=Number(args.level||5),allocation=args.allocation||'equal',seeds=phase==='development'?DEVELOPMENT_SEEDS:phase==='confirmation'?CONFIRMATION_SEEDS:VALIDATION_SEEDS;
assert.ok(['equal','roles'].includes(allocation));
const maps=(args.maps||(phase==='development'?'plain-open':'plain-open,plain-ridges')).split(',');
const profiles=(args.profiles||(phase==='development'?'fixed,reactive,none':'fixed,reactive,wrong,none')).split(',');
const membership=[];
for(const r of [...recipes,...enemies]){
 const {cities}=nationalWorld(r.scenario),roster=nationalRoster(r.scenario,cities);
 const people=(r.team?.map(t=>t[0])||r.names).map(n=>{const u=person(n),p=roster.find(v=>v.id===u.id);assert.equal(p?.faction,r.faction,r.id+' '+n);return {...p,name:n,city:cities.find(c=>c.id===p.cityId)?.name,stratagems:A[u.id].stratagems,special:A[u.id].specialTactic};});
 membership.push({id:r.id,scenario:r.scenario,faction:r.faction,sameCity:new Set(people.map(p=>p.cityId)).size===1,people});
}
writeFileSync(join(out,'membership.json'),JSON.stringify(membership,null,2));
const bestType=u=>['spear','halberd','cavalry','archer'].sort((a,b)=>u.aptitudes[b]-u.aptitudes[a]||Number(b===u.type)-Number(a===u.type))[0];
const entry=([name,type,troops=3000])=>({id:person(name).id,type,troops,level,retreatAt:null});
const active=u=>u.hp>0&&u.status==='active'&&!u.withdrawing;
const hp=s=>s.units.reduce((n,u)=>n+u.hp,0),casts=s=>s.units.reduce((n,u)=>n+Object.values(u.tacticCasts).reduce((a,b)=>a+b,0),0);
const inside=(u,a)=>a?.cells.some(p=>p.x===u.x&&p.y===u.y);
function choose(b,side,profile){
 if(b.result||profile==='none')return null;
 const resource=side?b.enemyCommand:b;if(resource.commandProgress<E.COMMAND_RESOURCE.capacity)return null;
 const available=E.battleStratagems(b,side),key=chooseEnemyCommand(b,available,STRATAGEMS,side);
 if(profile==='fixed')return key?{key,point:chooseStratagemPoint(b,STRATAGEMS[key],side),reason:'fixed'}:null;
 const own=b.sides[side].units.filter(active),foes=b.sides[1-side].units.filter(active);
 for(const k of ['disrupt','fortify','invincible']){
  if(!available.includes(k)||(resource.commandReady[k]||0)>b.tick)continue;
  const s=STRATAGEMS[k],enemy=s.side===1;
  const threatens=u=>foes.some(f=>inside(u,f.tacticAim));
  const trigger=enemy?foes.some(f=>f.tacticAim):own.some(u=>threatens(u)||(u.tacticAim&&foes.some(f=>hexDistance(u,f)<=3))||(u.hp/u.initial<.65&&shieldAmount(b,u)<u.initial*.1&&foes.some(f=>hexDistance(u,f)<=2)));
  if(!trigger)continue;
  let point=null,best=profile==='wrong'?Infinity:-Infinity;
  for(let y=0;y<8;y++)for(let x=0;x<14;x++){
   const p={x,y},targets=stratagemAreaTargets(b,s,p,side).filter(u=>stratagemHasEffect(b,s,u));if(!targets.length)continue;
   // All cues are visible present state. No RNG, future turn or hidden army data.
   const score=targets.reduce((n,u)=>n+(u.tacticAim?12:0)+(enemy?0:threatens(u)?12:0)+(1-u.hp/u.initial)*3+((enemy?own:foes).some(t=>hexDistance(t,u)<=2)?2:0)+.1,0);
   if(profile==='wrong'?score<best:score>best){best=score;point=p;}
  }
  if(point)return {key:k,point,reason:own.some(u=>u.tacticAim)||foes.some(u=>u.tacticAim)?'visible-aim':'current-pressure'};
 }
 return null;
}
function advance(state,side,profile){E.stepBattle(state.battle,{aiSides:[1-side],pauseForReinforcements:false});const c=choose(state.battle,side,profile);if(c)assert.equal(E.issueCommand(state.battle,c.key,c.point,side,{ai:false}),null);return c;}
const rows=[];writeFileSync(join(out,'runs.jsonl'),'');
for(const r of recipes)for(const enemy of enemies)for(const mapId of maps)for(const seed of seeds)for(const side of [0,1])for(const profile of profiles){
 const team=r.team.map((t,i)=>entry([...t.slice(0,2),allocation==='roles'?[5000,5000,5000,1000,1000,1000][i]:3000])),foe=enemy.names.map(n=>entry([n,bestType(person(n))]));
 assert.equal(new Set([...team,...foe].map(u=>u.id)).size,12);
 const state=generateBattle({seed,mapId,terrain:'land',battleKind:'field',limit:480,shieldPercent:0,events:[],ownTroopBudget:18000,ownTeam:side?foe:team,enemyTeam:side?team:foe}),b=state.battle;
 E.planBattleCouncilsAI(b,[0,1]);assert.equal(appointBattleRoles(b,b.sides[side].units[0].armyId,{leader:person(r.leader).id,advisor:person(r.advisor).id},side),null);
 assert.equal(E.lockDeployment(b),null);E.validateSave(structuredClone(state));
 const id=[r.id,enemy.id,mapId,seed,side,profile,'l'+level].join('-'),start=JSON.stringify(state),initial=b.sides[side].units.map(u=>({id:u.id,name:u.name,x:u.x,y:u.y,type:u.type,hp:u.hp,tactics:unitTactics(u).map(t=>t.id)}));
 writeFileSync(join(out,'battles',id+'-start.json'),start);
 const trajectory=[],commands=[],events=[],contribution=Object.fromEntries(b.sides[side].units.map(u=>[u.id,{name:u.name,damage:0,skillDamage:0,healing:0,absorbed:0,casts:0,aims:0,misses:0}]));
 let copy=null,lastCast=0,lastImpact=0,savedAim=false,traitIntent=0;
 while(!b.result){
  const before=b.sides.reduce((n,s)=>n+casts(s),0),c=advance(state,side,profile);
  if(copy)assert.deepEqual(advance(copy,side,profile),c);
  if(c)commands.push({tick:b.tick,...c,targets:stratagemAreaTargets(b,STRATAGEMS[c.key],c.point,side).map(u=>({id:u.id,aim:!!u.tacticAim}))});
  if(b.sides.reduce((n,s)=>n+casts(s),0)>before)lastCast=b.tick;
  for(const e of b.effects){
   if(e.skill&&e.phase==='impact'&&!e.ongoing&&!e.missed)lastImpact=b.tick;
   const who=contribution[e.from],victim=contribution[e.to];
   if(e.phase==='impact'&&who){who.damage+=e.damage||0;if(e.skill)who.skillDamage+=e.damage||0;who.healing+=e.healing||0;}
   if(victim)victim.absorbed+=e.shieldAbsorbed||0;
   if(e.phase==='cast'&&e.tacticGeometry&&who)who.aims++;
   if(e.missed&&who)who.misses++;
   if(e.traitId==='shieldSpirit'&&e.side===side)traitIntent+=e.intentRestored;
   if(e.tacticGeometry||e.traitId==='shieldSpirit')events.push({tick:b.tick,from:e.from,to:e.to,side:e.side===side?0:1,label:e.label,phase:e.phase,missed:e.missed,damage:e.damage,absorbed:e.shieldAbsorbed,text:e.text});
  }
  trajectory.push({tick:b.tick,hp:[hp(b.sides[side]),hp(b.sides[1-side])],casts:[casts(b.sides[side]),casts(b.sides[1-side])],aims:b.sides.flatMap(s=>s.units).filter(u=>u.tacticAim).map(u=>({id:u.id,side:u.side===side?0:1,...u.tacticAim}))});
  if(!copy&&b.tick>=20)copy=E.validateSave(structuredClone(state));
  if(!savedAim&&b.sides.some(s=>s.units.some(u=>u.tacticAim))){const v=E.validateSave(structuredClone(state));assert.deepEqual(v.battle,b);savedAim=true;}
 }
 assert.ok(copy);assert.deepEqual(copy.battle,b);E.validateSave(structuredClone(state));
 for(const u of b.sides[side].units)contribution[u.id].casts=Object.values(u.tacticCasts).reduce((a,b)=>a+b,0);
 const row={id,variant:manifest.variant,recipe:r.id,enemy:enemy.id,mapId,seed,side,profile,level,allocation,win:b.result.winner===side,result:b.result,ticks:b.tick,tail:b.tick-lastCast,impactTail:b.tick-lastImpact,gap:hp(b.sides[side])-hp(b.sides[1-side]),commands,contribution,events,traitIntent,savedAim,deterministic:true,startHash:sha(start),initial,trainingGold:[team,foe].map(t=>t.reduce((n,u)=>n+trainingCost(u.type,u.troops),0)),trajectory};
 rows.push(row);appendFileSync(join(out,'runs.jsonl'),JSON.stringify(row)+'\n');writeFileSync(join(out,'battles',id+'-end.json'),JSON.stringify(state));
 if(rows.length%16===0)console.log(JSON.stringify({variant:manifest.variant,phase,games:rows.length,last:id}));
}
verify();assert.equal(sha(readFileSync(fileURLToPath(import.meta.url))),harnessHash);
const mean=(xs,key)=>xs.reduce((n,x)=>n+x[key],0)/xs.length,groups=[];
for(const r of recipes)for(const enemy of enemies)for(const profile of profiles){const xs=rows.filter(x=>x.recipe===r.id&&x.enemy===enemy.id&&x.profile===profile);groups.push({recipe:r.id,enemy:enemy.id,profile,n:xs.length,wins:xs.filter(x=>x.win).length,ticks:mean(xs,'ticks'),tail:mean(xs,'tail'),gap:mean(xs,'gap'),traitIntent:mean(xs,'traitIntent'),commands:xs.reduce((n,x)=>n+x.commands.length,0)/xs.length,aims:xs.reduce((n,x)=>n+Object.values(x.contribution).reduce((a,c)=>a+c.aims,0),0),misses:xs.reduce((n,x)=>n+Object.values(x.contribution).reduce((a,c)=>a+c.misses,0),0)});}
const summary={variant:manifest.variant,sourceHash:manifest.sourceHash,harnessHash,recipeHash:sha(readFileSync(new URL('./common-roster-recipes.mjs',import.meta.url))),phase,level,allocation,seeds,maps,profiles,games:rows.length,deterministic:rows.length,membership,groups,scope:'同势力真实开局名册；独立战役同18000兵、5级基础兵，合法学习与AI军议。来源同城不等于全国经济已经负担全部征兵。左右交换、固定与响应式策略、败局保留。响应式使用公开蓄势/当前承压，时机和落点均变；错位仅同首次触发，后续轨迹可分歧。没有真人可玩性评分。'};
writeFileSync(join(out,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({finished:true,variant:manifest.variant,games:rows.length}));
