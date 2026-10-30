// Optional local gameplay experiment. No victory, duration or effect-rate gate.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync,appendFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {planBattleCouncilsAI,lockDeployment,stepBattle,validateSave,reserveDeploymentUnit,fillSlots} from '../engine.mjs';
import {deployBattleUnit} from '../battle-deployment.mjs';
import {configureReserveEntry} from '../reserve-entry.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const phase=args.phase||'development',out=resolve(args.out||'work/autochess-trial/'+phase);
assert.ok(['development','validation'].includes(phase));
const seeds=phase==='development'?[7312301]:[8422301,8429812,8437323];
const id=name=>{const u=OFFICER_CATALOG.find(o=>o.name===name);assert.ok(u,name);return u.id;};
const entry=([name,type,troops])=>({id:id(name),type,troops,level:10,retreatAt:null});
const foe=[['袁绍','spear',3000],['颜良','cavalry',3000],['文丑','halberd',3000],['张郃','cavalry',3000],['沮授','archer',3000],['田丰','archer',3000]].map(entry);
const cases=[
 {name:'shape',core:'黄忠',team:[['黄忠','longbow',5000],['法正','archer',2600],['庞统','halberd',2600],['魏延','spear',2600],['严颜','spear',2600],['吴懿','baier',2600]],profiles:['default','line','flank'],positions:{line:[[3,3],[2,3],[4,2],[4,3],[4,5],[3,4]],flank:[[4,0],[3,1],[4,2],[4,3],[4,5],[3,4]]}},
 {name:'support',core:'关羽',team:[['关羽','spear',5000],['张飞','halberd',3000],['刘备','baier',3000],['诸葛瑾','archer',2000],['邓芝','archer',2000],['陈群','archer',3000]],profiles:['default','feed-core','feed-other'],positions:{'feed-core':[[4,3],[4,1],[4,4],[3,3],[2,3],[3,4]],'feed-other':[[4,3],[4,1],[4,5],[3,1],[2,1],[3,5]]}},
 {name:'reserves',core:'赵云',reserve:true,team:[['周仓','halberd',1500],['廖化','spear',1500],['邓芝','archer',1500],['严颜','archer',1500],['吴懿','spear',1500],['陈到','baier',1500],['赵云','cavalry',5000],['黄忠','longbow',4000]],profiles:['default','entry','reverse']},
];
const files=['engine.mjs','tactics.mjs','tactic-positioning.mjs','tactic-aim.mjs','reserve-entry.mjs','combat-rules.mjs','battle-ai.mjs','bonds.mjs','bond-battlefield.mjs','data/design/tactics.mjs','data/design/bonds.mjs','data/design/bond-assignments.mjs','data/design/assignments.mjs','data/design/troops.mjs','unit-stats.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL('../'+f,import.meta.url))).digest('hex')]));
const sourceHashes=hashes(),rows=[];mkdirSync(join(out,'battles'),{recursive:true});writeFileSync(join(out,'runs.jsonl'),'');
for(const recipe of cases)for(const seed of seeds)for(const side of [0,1])for(const profile of recipe.profiles){
 const team=recipe.team.map(entry),state=generateBattle({...defaultCustomBattle(),seed,terrain:'land',mapId:'plain-open',battleKind:'field',limit:480,shieldPercent:0,events:[],ownTroopBudget:18000,ownTeam:side?foe:team,enemyTeam:side?team:foe});
 const b=state.battle,x=n=>side?13-n:n;planBattleCouncilsAI(b,[0,1]);
 if(recipe.reserve){
  for(const u of [...b.sides[side].units])assert.equal(reserveDeploymentUnit(b,u.id,null,side),null);
  const order=profile==='reverse'?[...team.slice(0,6),team[7],team[6]]:team;
  for(const u of order)assert.equal(reserveDeploymentUnit(b,u.id,null,side),null);
  fillSlots(b,side,{ai:false});
  const points=[[3,2],[3,4],[2,1],[2,5],[3,6],[3,3]];
  team.slice(0,6).forEach((e,i)=>{assert.equal(deployBattleUnit(b,e.id,x(points[i][0]),points[i][1],side),null);b.sides[side].units.find(u=>u.id===e.id).retreatAt=700;});
  for(const e of team.slice(6))assert.equal(configureReserveEntry(b,e.id,profile==='default'?null:{x:x(e.id===id('赵云')?4:3),y:e.id===id('赵云')?1:4},side),null);
 }else if(profile!=='default'){
  const placements=recipe.positions[profile];
  for(const u of [...b.sides[side].units])assert.equal(reserveDeploymentUnit(b,u.id,null,side),null);
  for(const e of team)assert.equal(reserveDeploymentUnit(b,e.id,null,side),null);
  fillSlots(b,side,{ai:false});
  // Temporarily clear the initial cells using shared reserve/deploy operations;
  // no active troop is moved after the battle begins.
  for(const u of [...b.sides[side].units])assert.equal(reserveDeploymentUnit(b,u.id,null,side),null);
  team.forEach((e,i)=>assert.equal(deployBattleUnit(b,e.id,x(placements[i][0]),placements[i][1],side),null));
 }
 assert.equal(lockDeployment(b),null);validateSave(structuredClone(state));
 const stem=[recipe.name,seed,side,profile].join('-'),start=structuredClone(state);
 writeFileSync(join(out,'battles',stem+'-start.json'),JSON.stringify(start));
 const metrics={launches:0,landedCasts:0,geometryHits:0,emptyMisses:0,interruptions:0,naturalDodges:0,mainRally:0,totalRally:0,mainDamage:0,mainFirstSpecial:null},pending=new Map();
 let copy=null;
 while(!b.result){
  stepBattle(b,{aiSides:recipe.reserve||profile!=='default'?[1-side]:[0,1],pauseForReinforcements:false});
  if(copy)stepBattle(copy.battle,{aiSides:recipe.reserve||profile!=='default'?[1-side]:[0,1],pauseForReinforcements:false});
  if(!copy&&b.tick>=20)copy=validateSave(structuredClone(state));
  for(const e of b.effects.filter(e=>e.side===side)){
   if(e.label==='振旅'&&e.intentRestored){metrics.totalRally+=e.intentRestored;if(e.to===id(recipe.core))metrics.mainRally+=e.intentRestored;}
   if(e.from===id(recipe.core)&&e.damage>0){metrics.mainDamage+=e.damage;if(e.skill&&e.label===({黄忠:'百步穿杨',关羽:'青龙偃月',赵云:'七进七出'}[recipe.core])&&metrics.mainFirstSpecial===null)metrics.mainFirstSpecial=b.tick;}
   if(e.phase==='cast'&&e.tacticGeometry){
    metrics.launches++;const keys=new Set(e.tacticGeometry.cells.map(p=>p.x+','+p.y));
    pending.set(e.from,{cells:e.tacticGeometry.cells,targets:b.sides[1-side].units.filter(u=>u.status==='active'&&keys.has(u.x+','+u.y)).map(u=>u.id)});
   }
  }
  for(const [actor,aim] of pending){
   const u=b.sides[side].units.find(u=>u.id===actor);if(u.tacticAim)continue;
   const effects=b.effects.filter(e=>e.from===actor&&e.phase==='impact'),miss=effects.find(e=>e.missed);
   if(miss){if(miss.text==='落空')metrics.emptyMisses++;else metrics.interruptions++;}
   else{metrics.landedCasts++;metrics.geometryHits+=new Set(effects.filter(e=>e.damage>0||e.shieldAbsorbed>0).map(e=>e.to)).size;}
   const keys=new Set(aim.cells.map(p=>p.x+','+p.y));
   if(!miss||miss.text==='落空')metrics.naturalDodges+=aim.targets.filter(id=>{const t=b.sides[1-side].units.find(u=>u.id===id);return t?.status==='active'&&t.hp>0&&!keys.has(t.x+','+t.y);}).length;
   pending.delete(actor);
  }
 }
 if(copy)assert.deepEqual(copy.battle,b);validateSave(structuredClone(state));
 const total=s=>b.sides[s].units.reduce((n,u)=>n+u.hp,0),reserves=b.sides[side].units.filter(u=>start.battle.sides[side].units.find(v=>v.id===u.id)?.status==='reserve').map(u=>({name:u.name,status:u.status,entry:u.bondFormation?{tick:u.bondFormation.tick,x:u.bondFormation.x,y:u.bondFormation.y}:null,preferred:u.reserveEntry}));
 const row={recipe:recipe.name,profile,phase,seed,side,result:b.result,ticks:b.tick,win:b.result.winner===side,remaining:total(side),opponentRemaining:total(1-side),gap:total(side)-total(1-side),deterministic:!!copy,...metrics,reserves};
 rows.push(row);appendFileSync(join(out,'runs.jsonl'),JSON.stringify(row)+'\n');writeFileSync(join(out,'battles',stem+'-end.json'),JSON.stringify(state));
 console.log(JSON.stringify({recipe:row.recipe,profile,side,seed,win:row.win,gap:row.gap,launches:row.launches,misses:row.emptyMisses,dodges:row.naturalDodges,coreRally:row.mainRally}));
}
assert.deepEqual(hashes(),sourceHashes,'Trial source changed; rerun this local comparison');
const groups=[];for(const recipe of cases)for(const profile of recipe.profiles){const rs=rows.filter(r=>r.recipe===recipe.name&&r.profile===profile),mean=k=>rs.reduce((n,r)=>n+r[k],0)/rs.length;groups.push({recipe:recipe.name,profile,battles:rs.length,wins:rs.filter(r=>r.win).length,draws:rs.filter(r=>r.result.winner===null).length,meanGap:mean('gap'),meanRemaining:mean('remaining'),meanLaunches:mean('launches'),meanGeometryHits:mean('geometryHits'),emptyMisses:rs.reduce((n,r)=>n+r.emptyMisses,0),interruptions:rs.reduce((n,r)=>n+r.interruptions,0),naturalDodges:rs.reduce((n,r)=>n+r.naturalDodges,0),meanMainRally:mean('mainRally'),meanMainDamage:mean('mainDamage')});}
const report={rulesVersion:RULES_VERSION,phase,sourceHashes,scope:'Local exploratory same-budget comparison. Development and independent validation seeds, both sides exchanged, legal fixed tactics and actual reserve entries. No injected intent, wounds, battle states, resources or forced outcomes. Layouts are examples, not an optimizer or a delivery criterion.',battles:rows.length,deterministicContinuations:rows.filter(r=>r.deterministic).length,groups};
writeFileSync(join(out,'summary.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
