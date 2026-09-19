import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,configureUnitTactics,issueCommand,battleStratagems,STRATAGEMS,COMMAND_RESOURCE,validateSave,commandIntellect,deployUnit} from '../engine.mjs';
import {roleTacticIds,configureTactics,SPECIAL_TACTICS,TACTICS_BOOK,TROOP_TACTICS,INTELLECT_TACTICS,validLoadout} from '../tactics.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {archetypes,opponents,setupRulePlayer,setupPlayer,unit,playerOrder} from './custom-playability-lib.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {troopCapacity} from '../troop-capacity.mjs';
import {canOccupy} from '../battlefield.mjs';
import {FAMOUS_OFFICERS} from '../famous-officers.mjs';
import {skillRoute,SKILL_LEVELS} from '../passives.mjs';

const count=Number(process.argv[2]||8),label=process.argv[3]||'baseline';
assert.ok(Number.isInteger(count)&&count>0&&count<=64);assert.match(label,/^[a-z0-9-]+$/);
const out=new URL(`../docs/balance-diagnosis/${label}/`,import.meta.url),root=new URL('../',import.meta.url);mkdirSync(out,{recursive:true});
const files=[...readdirSync(root).filter(f=>f.endsWith('.mjs')),...readdirSync(new URL('data/',root)).filter(f=>/\.(json|mjs)$/.test(f)).map(f=>'data/'+f),'scripts/audit-balance-diagnosis.mjs','scripts/custom-playability-lib.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL(f,root))).digest('hex')]));
const initialHashes=hashes(),rows=[],raw=[];
const seeds=Array.from({length:count},(_,i)=>12100000+i*104729);
const mean=xs=>+(xs.reduce((a,b)=>a+b,0)/Math.max(1,xs.length)).toFixed(3);
const summarize=runs=>({n:runs.length,wins:runs.filter(r=>r.winner===0).length,draws:runs.filter(r=>r.winner===null).length,timeout:runs.filter(r=>r.reason==='久战收兵').length,ticks:mean(runs.map(r=>r.ticks)),remaining:mean(runs.map(r=>r.remaining[0])),enemyRemaining:mean(runs.map(r=>r.remaining[1])),orders:mean(runs.map(r=>r.commands.length)),damage:mean(runs.map(r=>r.metrics[0].damage)),healing:mean(runs.map(r=>r.metrics[0].healing)),splitAttacks:mean(runs.map(r=>r.metrics[0].splitAttacks))});

function run(draft,{plan='rule',posture='neutral',basic=false,loadout=null,command='rule',resume=false}={}){
 const state=createScenario('custom-battle',draft.seed,20,null,draft),b=state.battle;
 if(posture==='neutral')b.sides.forEach(s=>s.tactic='balanced');
 if(posture==='player-aggressive')b.sides[0].tactic='aggressive';
 if(plan==='rule')setupRulePlayer(state);
 else if(plan!=='default'){
  setupPlayer(state,plan==='scatter'?'compact':plan);
  if(plan==='scatter')b.sides[0].units.forEach((u,i)=>assert.equal(deployUnit(b,u.id,i%2?0:4,i),null));
 }
 if(basic)for(const s of b.sides)for(const u of s.units)assert.equal(configureTactics(u,roleTacticIds(u,'assault')),null);
 if(loadout)loadout(state);
 const opening={teams:b.sides.map(s=>s.units.map(u=>({id:u.id,type:u.type,troops:u.initial,level:u.level,x:u.x,y:u.y,tactics:u.tactics}))),postures:b.sides.map(s=>s.tactic),commanders:b.sides.map(s=>s.commanders),known:b.sides.map((s,i)=>battleStratagems(b,i)),intellect:b.sides.map((s,i)=>commandIntellect(b,i))};
 const metrics=b.sides.map(()=>({damage:0,healing:0,shield:0,splitAttacks:0,casts:{},first:{}})),commands=[];
 lockDeployment(b);let saved;
 const order=b=>{
  if(command==='off'||b.commandProgress<COMMAND_RESOURCE.capacity)return null;
  if(command==='player')return playerOrder(b);
  const keys=command==='rule'?battleStratagems(b):battleStratagems(b).filter(k=>k===command);
  return chooseEnemyCommand(b,keys,STRATAGEMS,0);
 };
 while(!b.result){
  const key=order(b);if(key){assert.equal(issueCommand(b,key),null);commands.push({tick:b.tick,key});}
  if(saved){assert.equal(order(saved.battle),key);if(key)assert.equal(issueCommand(saved.battle,key),null);}
  stepBattle(b);if(saved)stepBattle(saved.battle);
  const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');assert.ok(b.tick<=480);assert.equal(new Set(active.map(u=>`${u.x},${u.y}`)).size,active.length);
  for(const u of active){assert.ok(canOccupy(b,u,u.x,u.y));assert.ok(Number.isFinite(u.hp)&&u.hp>0);assert.ok(validLoadout(u,u.tactics));}
  const split=new Set();
  for(const e of b.effects){
   const m=metrics[e.side];if(!m)continue;
   // Count actual impact damage only, excluding cast previews and summaries.
   if(e.phase==='impact'&&!e.combo){m.damage+=e.damage||0;m.healing+=e.healing||0;m.shield+=e.shieldAbsorbed||0;if(e.sharedTargets>1)split.add(e.from);}
  }
  for(const id of split){const u=active.find(u=>u.id===id)||b.sides.flatMap(s=>s.units).find(u=>u.id===id);metrics[u.side].splitAttacks++;}
  for(const s of b.sides)for(const u of s.units)for(const [id,n] of Object.entries(u.tacticCasts))if(n)metrics[u.side].first[u.id+':'+id]??=b.tick;
  if(resume&&b.tick===20)saved=validateSave(structuredClone(state));
 }
 if(saved)assert.deepEqual(b,saved.battle);validateSave(structuredClone(state));
 for(const [side,s] of b.sides.entries())for(const u of s.units)for(const [id,n] of Object.entries(u.tacticCasts))metrics[side].casts[id]=(metrics[side].casts[id]||0)+n;
 return {seed:draft.seed,winner:b.result.winner,reason:b.result.reason,ticks:b.tick,remaining:b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0)/s.units.reduce((n,u)=>n+u.initial,0)),opening,commands,enemyOrders:b.enemyCommand.commandSerial,metrics,units:b.sides.flatMap(s=>s.units).map(u=>({id:u.id,side:u.side,hp:u.hp,healed:u.healed,casts:u.tacticCasts}))};
}
function sample(axis,id,draft,options={},sampleSeeds=seeds){
 const runs=sampleSeeds.map((seed,i)=>run({...draft,seed},{...options,resume:i===0}));
 const row={axis,id,...summarize(runs)};rows.push(row);raw.push(...runs.map(r=>({axis,id,...r})));return row;
}
function flush(axis){writeFileSync(new URL('progress.json',out),JSON.stringify(rows,null,2));console.log('DONE',axis,rows.filter(r=>r.axis===axis).length,'groups',raw.length,'battles');}
const rosterA=['person-46','person-439','person-408'],rosterZ=['person-467','person-117','person-470'];
const homogeneous=(ids,type,level=1)=>ids.map(id=>unit(id,type,3000,level));

// Roster/type crossover and side swap isolate unit roles from famous identities.
const types=['spear','halberd','cavalry','archer','crossbow','logistics','siege'];
for(let i=0;i<types.length;i++)for(let j=i+1;j<types.length;j++){
 const runs=[];
 for(const exchanged of [false,true])for(const swapped of [false,true])for(const seed of seeds.slice(0,4)){
  const a=homogeneous(exchanged?rosterZ:rosterA,types[i]),z=homogeneous(exchanged?rosterA:rosterZ,types[j]);
  const r=run({seed,terrain:'land',ownTeam:swapped?z:a,enemyTeam:swapped?a:z},{basic:true,resume:seed===seeds[0]});
  raw.push({axis:'troops',id:`${types[i]}/${types[j]}`,exchanged,swapped,...r});
  runs.push(swapped?{...r,winner:r.winner===null?null:1-r.winner,remaining:[...r.remaining].reverse(),metrics:[...r.metrics].reverse()}:r);
 }
 rows.push({axis:'troops',id:`${types[i]}/${types[j]}`,...summarize(runs)});
}
for(const role of ['assault','guard','control'])sample('ships',role,{terrain:'river',ownTeam:homogeneous(rosterA,'ship'),enemyTeam:homogeneous(rosterZ,'ship')},{basic:true,loadout:s=>s.battle.sides[0].units.forEach(u=>assert.equal(configureUnitTactics(s,u.id,roleTacticIds(u,role)),null))});
flush('troops');

// Same team, soldiers, enemy and seed; separate inherited posture from planner.
for(const a of archetypes)for(const o of opponents){
 const draft={terrain:o.terrain,ownTeam:a.team,enemyTeam:o.team};
 for(const posture of ['native','neutral','player-aggressive'])sample('posture',`${a.id}/${o.id}/${posture}`,draft,{plan:'rule',posture});
 for(const plan of ['default','rule','compact','control','scatter'])sample('planner',`${a.id}/${o.id}/${plan}`,draft,{plan,command:'player'});
}
flush('planner');

function allocate(team,total,weights){
 const result=team.map(u=>({...u,troops:1}));let left=total-team.length;
 while(left){
  const eligible=result.map((u,i)=>({u,i,room:troopCapacity({...OFFICER_BY_ID[u.id],level:u.level})-u.troops})).filter(v=>v.room>0);assert.ok(eligible.length);
  const sum=eligible.reduce((n,v)=>n+weights[v.i],0),budget=left;
  for(const v of eligible){const give=Math.min(left,v.room,Math.max(1,Math.floor(budget*weights[v.i]/sum)));v.u.troops+=give;left-=give;}
 }
 return result;
}
const weights={equal:[1,1,1,1,1,1],carry:[12,2,2,1,1,1],dual:[8,8,1,1,1,1],thin:[70,50,30,1,1,1]};
for(const a of archetypes)for(const total of [9000,18000])for(const [allocation,w] of Object.entries(weights)){
 const o=opponents[0],draft={terrain:'land',ownTeam:allocate(a.team,total,w),enemyTeam:o.team.map(u=>({...u,troops:total/6}))};
 sample('allocation',`${a.id}/${total}/${allocation}`,draft,{plan:'compact',command:'player'});
}
flush('allocation');

const heroes=['person-661','person-396','person-99','person-433','person-290','person-246'];
for(const id of heroes)for(const level of [1,5,10])for(const mode of ['full','basic','ordinary','adapted']){
 const hero=FAMOUS_OFFICERS[id],ordinary=['person-290','person-246'].includes(id)?'person-512':'person-457';
 const draft={terrain:'land',ownTeam:[unit(mode==='ordinary'?ordinary:id,hero.type,6000,level),unit('person-646','spear',1500,5),unit('person-123','logistics',1500,5)],enemyTeam:[unit('jin','spear',3000,5),unit('yuanxia','archer',3000,5),unit('person-610','crossbow',3000,5)]};
 sample('heroes',`${id}/${level}/${mode}`,draft,{plan:'rule',loadout:s=>{
  const u=s.battle.sides[0].units[0],ids=roleTacticIds(u,'assault');
  let kit=mode==='full'?[SPECIAL_TACTICS[id],...ids].slice(0,3):ids;
  if(mode==='adapted')kit=[SPECIAL_TACTICS[id],...({archer:['wildfire','rally'],crossbow:['ambush','screen'],spear:['phalanx','strike'],cavalry:['gallop','relay']}[u.type])];
  assert.equal(configureUnitTactics(s,u.id,kit),null);
 }});
}
flush('heroes');

for(const id of ['person-661','person-396','person-99'])for(const n of [1,2,3])for(let rotation=0;rotation<3;rotation++){
 const names=['person-457','person-46','person-439'];
 const draft={terrain:'land',ownTeam:[unit(id,'cavalry',6000,10)],enemyTeam:Array.from({length:n},(_,i)=>unit(names[(i+rotation)%3],'cavalry',6000/n,10))};
 sample('outnumbered',`${id}/${n}/${rotation}`,draft,{},seeds.slice(0,4));
}
flush('outnumbered');

// Every basic six-choose-three kit; train on three independent seeds, then
// validate the best and AI-selected kits against a second seed set.
for(const type of [...types,'ship']){
 const terrain=type==='ship'?'river':'land',ownTeam=homogeneous(rosterA,type,5),enemyTeam=homogeneous(rosterZ,type==='logistics'?'spear':type,5);
 const draft={terrain,ownTeam,enemyTeam},pool=[...TROOP_TACTICS[type],...INTELLECT_TACTICS[type]],candidates=[];
 for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++)for(let k=j+1;k<pool.length;k++){
  const ids=[pool[i],pool[j],pool[k]];
  const r=sample('tactic-training',`${type}/${ids.join('+')}`,draft,{loadout:s=>s.battle.sides[0].units.forEach(u=>assert.equal(configureUnitTactics(s,u.id,ids),null))},[421001,525730,630459]);candidates.push({ids,...r});
 }
 candidates.sort((a,b)=>b.wins-a.wins||(b.remaining-b.enemyRemaining)-(a.remaining-a.enemyRemaining));
 for(const mode of ['rule','selected','reversed'])sample('tactics',`${type}/${mode}`,draft,{loadout:mode==='rule'?null:s=>s.battle.sides[0].units.forEach(u=>assert.equal(configureUnitTactics(s,u.id,mode==='reversed'?[...candidates[0].ids].reverse():candidates[0].ids),null))});
}
flush('tactics');

for(const leader of ['cao','yu','jia','jin','liao','wen']){
 const draft={terrain:'land',ownTeam:[unit(leader,OFFICER_BY_ID[leader].type),...archetypes[0].team.slice(0,5)],enemyTeam:opponents[2].team};
 const test=createScenario('custom-battle',1,20,null,{...draft,seed:1}),known=battleStratagems(test.battle);
 for(const command of ['off','rule',...known])sample('commands',`${leader}/${command}`,draft,{command});
}
flush('commands');

// Explicit mechanism probes use normal legal drafts, not injected resources.
const probes=[];
for(const troops of [1,100,500,3000]){
 const state=createScenario('custom-battle',123,20,null,{terrain:'land',seed:123,ownTeam:[unit('cao','spear',6000),unit('jia','crossbow',troops)],enemyTeam:[unit('shao','spear',6000),unit('tian','crossbow',troops)]}),b=state.battle;
 probes.push({troops,commandIntellect:commandIntellect(b),firstNominalCommand:Math.ceil(12000/commandIntellect(b))});
}
const unlocks=heroes.map(id=>({id,name:OFFICER_BY_ID[id].name,sourceType:FAMOUS_OFFICERS[id].type,route:skillRoute({id}).map((id,i)=>({id,level:SKILL_LEVELS[i]})),special:SPECIAL_TACTICS[id],threshold:TACTICS_BOOK[SPECIAL_TACTICS[id]].threshold}));
assert.deepEqual(hashes(),initialHashes,'Runtime changed during audit');
writeFileSync(new URL('runs.json.gz',out),gzipSync(JSON.stringify(raw)));
writeFileSync(new URL('results.json',out),JSON.stringify({count,seeds,total:raw.length,hashes:initialHashes,rows,probes,unlocks},null,2));
console.log('COMPLETE',raw.length,'battles',new URL('results.json',out).pathname);
