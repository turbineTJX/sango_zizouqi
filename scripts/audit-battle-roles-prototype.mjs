// Local playability diagnosis, not a subjective fun score or release gate.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,appendFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const runtime=resolve(args.runtime),out=resolve(args.out),phase=args.phase||'development';
assert.ok(!existsSync(join(out,'summary.json')),'Preserve previous runs');
const load=p=>import(pathToFileURL(join(runtime,p))),sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(readFileSync(join(runtime,'..','manifest.json'))),harnessHash=sha(readFileSync(fileURLToPath(import.meta.url)));
function verify(){for(const [p,h]of Object.entries(manifest.hashes))assert.equal(sha(readFileSync(join(runtime,p))),h,p);}verify();
const E=await load('engine.mjs'),{generateBattle}=await load('battle-generator.mjs');
const {deployBattleUnit}=await load('battle-deployment.mjs'),{appointBattleRoles}=await load('battle-appointments.mjs');
const {formationCells,formationChoice}=await load('bond-battlefield.mjs');
const {OFFICER_DESIGNS:O}=await load('data/design/officers.mjs'),{OFFICER_ASSIGNMENTS:A}=await load('data/design/assignments.mjs');
const {unitTactics,shieldAmount,shieldLayers}=await load('tactics.mjs'),{tacticUsesLeft}=await load('tactic-tempo.mjs');
const {STRATAGEMS}=await load('stratagems.mjs'),{chooseEnemyCommand}=await load('battle-ai.mjs');
const {chooseStratagemPoint,stratagemAreaTargets,stratagemHasEffect}=await load('stratagem-area.mjs');
const {hexDistance}=await load('hex-grid.mjs'),{isTargetable}=await load('engagement.mjs');
const {trainingCost}=await load('troop-training.mjs');
const seeds=phase==='development'?[75431001]:[97531001,97547923,97562117];
const maps=phase==='transfer'?['plain-ridges']:['plain-open'];
const profiles=args.profiles?args.profiles.split(','):['fixed','pressure','late','wrong','none','default'];
const person=n=>{const u=Object.values(O).find(o=>o.name===n);assert.ok(u,n);return u;};
const entry=([name,type,troops=3000])=>({id:person(name).id,type,troops,level:10,retreatAt:null});
const bestType=u=>['spear','halberd','cavalry','archer'].sort((a,b)=>u.aptitudes[b]-u.aptitudes[a]||Number(b===u.type)-Number(a===u.type))[0];
const recipes=[
 {id:'guan',core:'关羽',slots:[0,5,3],team:[['关羽','spear',5000],['廖化','spear',1000],['周仓','halberd',1000],['乐进','spear',4000],['关平','spear',4000],['满宠','halberd',3000]]},
 {id:'zhou',core:'周瑜',slots:[0,2,1],team:[['周瑜','archer',5000],['黄盖','archer',3000],['曹洪','spear',4000],['陈群','spear',1000],['徐邈','archer',1000],['满宠','archer',4000]]},
];
const enemies=[{id:'stars',names:['曹操','赵云','张飞','诸葛亮','陆逊','孙策']},{id:'yuan',names:['袁绍','颜良','文丑','张郃','沮授','田丰']}];
const alive=u=>u.hp>0&&['active','reserve'].includes(u.status)&&!u.withdrawing;
const castCount=u=>Object.values(u.tacticCasts).reduce((a,b)=>a+b,0);
function snapshot(b,side,coreId){return {tick:b.tick,command:(side?b.enemyCommand:b).commandProgress,sides:[side,1-side].map(i=>({hp:b.sides[i].units.reduce((n,u)=>n+u.hp,0),fighting:b.sides[i].units.filter(alive).reduce((n,u)=>n+u.hp,0),shield:b.sides[i].units.filter(alive).reduce((n,u)=>n+shieldAmount(b,u),0),casts:b.sides[i].units.reduce((n,u)=>n+castCount(u),0)})),units:b.sides.flatMap(s=>s.units).map(u=>({id:u.id,name:u.name,side:u.side===side?0:1,hp:u.hp,maxHp:u.maxHp,status:u.status,x:u.x,y:u.y,intent:u.intent,shield:shieldAmount(b,u),casts:castCount(u),special:u.tacticCasts[A[u.id].specialTactic]||0,available:unitTactics(u).reduce((n,s)=>n+tacticUsesLeft(u,s),0),commandShield:shieldLayers(b,u).filter(l=>l.source==='command:fortify').map(l=>({amount:l.amount,until:l.until,castTick:l.castTick}))})),coreId};}
function protectivePoint(b,side,core,wrong=false){
 let best=null,value=-Infinity;
 for(let y=0;y<8;y++)for(let x=0;x<14;x++){
  const p={x,y},targets=stratagemAreaTargets(b,STRATAGEMS.fortify,p,side).filter(u=>stratagemHasEffect(b,STRATAGEMS.fortify,u));
  if(!targets.length)continue;
  // Wrong placement is still a legal cast: choose the least engaged group.
  const score=wrong?-(targets.some(t=>t.id===core.id)?20:0)-targets.length+targets.reduce((n,u)=>n+Math.min(...b.sides[1-side].units.filter(u=>u.status==='active'&&isTargetable(b,u)).map(t=>hexDistance(t,u)),14),0)/targets.length:targets.reduce((n,u)=>n+(u.id===core.id?6:1)+(1-u.hp/u.maxHp),0);
  if(score>value){best=p;value=score;}
 }
 return best;
}
function order(b,side,profile,coreId){
 if(b.result||profile==='none')return null;
 const resource=side?b.enemyCommand:b;if(resource.commandProgress<E.COMMAND_RESOURCE.capacity)return null;
 const available=E.battleStratagems(b,side),core=b.sides[side].units.find(u=>u.id===coreId);
 const fixed=()=>{const key=chooseEnemyCommand(b,available,STRATAGEMS,side);return key?{key,point:chooseStratagemPoint(b,STRATAGEMS[key],side)}:null;};
 if(['fixed','default','near','far'].includes(profile))return fixed();
 const fort=available.includes('fortify')&&(resource.commandReady.fortify||0)<=b.tick;
 if(!fort)return fixed();
 const active=b.sides[side].units.filter(u=>u.status==='active'&&u.hp>0&&!u.withdrawing),foes=b.sides[1-side].units.filter(u=>u.status==='active'&&isTargetable(b,u));
 const need=profile==='late'?active.some(u=>u.hp<=u.initial*.35):active.some(u=>shieldAmount(b,u)<=u.maxHp*.12&&foes.some(e=>hexDistance(u,e)<=3)&&(u.hp<=u.initial*.85||u.id===core.id&&u.intent>=unitTactics(core).find(s=>s.id===A[core.id].specialTactic).threshold-15));
 if(!need)return null;
 const point=protectivePoint(b,side,core,profile==='wrong');return point?{key:'fortify',point}:null;
}
function advance(s,side,profile,coreId){E.stepBattle(s.battle,{aiSides:[1-side],pauseForReinforcements:false});const c=order(s.battle,side,profile,coreId);if(c)assert.equal(E.issueCommand(s.battle,c.key,c.point,side,{ai:false}),null);return c;}
mkdirSync(join(out,'battles'),{recursive:true});writeFileSync(join(out,'runs.jsonl'),'');const rows=[];
for(const recipe of recipes)for(const enemy of enemies)for(const mapId of maps)for(const seed of seeds)for(const side of [0,1])for(const profile of profiles){
 const team=recipe.team.map(entry),foe=enemy.names.map(n=>entry([n,bestType(person(n))]));
 assert.equal(team.reduce((n,u)=>n+u.troops,0),18000);assert.equal(new Set([...team,...foe].map(u=>u.id)).size,12);
 const state=generateBattle({seed,terrain:'land',mapId,battleKind:'field',limit:480,shieldPercent:0,events:[],ownTroopBudget:18000,ownTeam:side?foe:team,enemyTeam:side?team:foe}),b=state.battle,coreId=person(recipe.core).id;
 E.planBattleCouncilsAI(b,[0,1]);assert.equal(appointBattleRoles(b,b.sides[side].units[0].armyId,{leader:coreId,advisor:person('满宠').id},side),null);
 const formation=formationChoice(b,side);
 if(profile!=='default'&&formation){const cells=formationCells(b,side,formation.id);for(const [i,index]of recipe.slots.entries())assert.equal(deployBattleUnit(b,team[index].id,cells[i].x,cells[i].y,side),null);}
 if(['near','far'].includes(profile)){
  const core=b.sides[side].units.find(u=>u.id===coreId),support=b.sides[side].units.find(u=>u.id===person('满宠').id),cells=formation?formationCells(b,side,formation.id):[];
  // Move only a non-formation unit, preserving all three occupied formation slots.
  if(!cells.some(p=>p.x===support.x&&p.y===support.y)){
   const options=[];for(let x=side?9:0;x<=(side?13:4);x++)for(let y=0;y<8;y++)if(!cells.some(p=>p.x===x&&p.y===y)&&!b.sides.flatMap(s=>s.units).some(u=>u.status==='active'&&u.x===x&&u.y===y))options.push({x,y});
   options.sort((a,c)=>(profile==='near'?1:-1)*(hexDistance(a,core)-hexDistance(c,core))||a.x-c.x||a.y-c.y);assert.ok(options.some(p=>deployBattleUnit(b,support.id,p.x,p.y,side)===null));
  }
 }
 const initial=b.sides.map(s=>s.units.map(u=>({id:u.id,type:u.type,hp:u.hp,x:u.x,y:u.y,status:u.status})));
 assert.equal(E.lockDeployment(b),null);E.validateSave(structuredClone(state));
 const id=[recipe.id,enemy.id,mapId,seed,side,profile].join('-');const start=JSON.stringify(state);writeFileSync(join(out,'battles',id+'-start.json'),start);
 const trajectory=[snapshot(b,side,coreId)],commands=[],traitEvents=[];let copy=null,firstSpecial=null,lastCast=0,traitIntent=0,firstLoss=null;
 while(!b.result){
  const prev=trajectory.at(-1),c=advance(state,side,profile,coreId);if(copy)assert.deepEqual(advance(copy,side,profile,coreId),c);
  const now=snapshot(b,side,coreId);trajectory.push(now);
  if(c)commands.push({tick:b.tick,...c,targets:now.units.filter(u=>u.side===0&&u.commandShield.some(l=>l.castTick===b.tick)).map(u=>u.id)});
  for(const e of b.effects.filter(e=>e.traitId==='shieldSpirit'&&e.side===side)){traitIntent+=e.intentRestored;traitEvents.push({tick:b.tick,from:e.from,to:e.to,intent:e.intentRestored});}
  if(now.sides.some((s,i)=>s.casts>prev.sides[i].casts))lastCast=b.tick;
  const core=now.units.find(u=>u.id===coreId);if(!firstSpecial&&core.special)firstSpecial={tick:b.tick,hpRatio:core.hp/core.maxHp,gap:now.sides[0].fighting-now.sides[1].fighting};
  if(!firstLoss){const losses=now.units.filter(u=>u.status==='defeated'&&prev.units.find(v=>v.id===u.id).status!=='defeated');if(losses.length)firstLoss={tick:b.tick,sides:[...new Set(losses.map(u=>u.side))]};}
  if(!copy&&b.tick>=20)copy=E.validateSave(structuredClone(state));
 }
 assert.ok(copy);assert.deepEqual(copy.battle,b);E.validateSave(structuredClone(state));
 const end=trajectory.at(-1),win=b.result.winner===side,minGap=Math.min(...trajectory.map(t=>t.sides[0].fighting-t.sides[1].fighting));
 const row={id,variant:manifest.variant,sourceHash:manifest.sourceHash,phase,recipe:recipe.id,enemy:enemy.id,mapId,seed,side,profile,win,ticks:b.tick,gap:end.sides[0].hp-end.sides[1].hp,remaining:end.sides[0].hp,minGap,comeback:win&&minGap<=-1800,firstSpecial,tail:b.tick-lastCast,firstLoss,traitIntent,traitEvents,commands,initial,startHash:sha(start),formation,trainingGold:[team,foe].map(t=>t.reduce((n,u)=>n+trainingCost(u.type,u.troops),0)),deterministic:true,trajectory};
 rows.push(row);appendFileSync(join(out,'runs.jsonl'),JSON.stringify(row)+'\n');writeFileSync(join(out,'battles',id+'-end.json'),JSON.stringify(state));
 console.log(JSON.stringify({variant:row.variant,recipe:row.recipe,enemy:row.enemy,seed,side,profile,win,gap:row.gap,special:firstSpecial?.tick,traitIntent}));
}
verify();assert.equal(sha(readFileSync(fileURLToPath(import.meta.url))),harnessHash);
const mean=(xs,fn)=>{const vs=xs.map(fn).filter(Number.isFinite);return vs.length?vs.reduce((a,b)=>a+b,0)/vs.length:null;};
const groups=[];for(const r of recipes)for(const e of enemies)for(const p of profiles){const xs=rows.filter(x=>x.recipe===r.id&&x.enemy===e.id&&x.profile===p);groups.push({recipe:r.id,enemy:e.id,profile:p,n:xs.length,wins:xs.filter(x=>x.win).length,specialGames:xs.filter(x=>x.firstSpecial).length,meanSpecialTick:mean(xs,x=>x.firstSpecial?.tick),meanSpecialHp:mean(xs,x=>x.firstSpecial?.hpRatio),meanGap:mean(xs,x=>x.gap),meanTicks:mean(xs,x=>x.ticks),meanTail:mean(xs,x=>x.tail),meanTraitIntent:mean(xs,x=>x.traitIntent),meanCommands:mean(xs,x=>x.commands.length),comebacks:xs.filter(x=>x.comeback).length});}
const summary={variant:manifest.variant,sourceHash:manifest.sourceHash,harnessHash,phase,seeds,maps,profiles,games:rows.length,deterministic:rows.length,groups,scope:'Exploratory current-engine simulation. Equal 18000 soldiers, level 10, identical loadouts and deployment within timing comparisons. Training costs differ across rosters and are recorded. No injected resources, outcomes or future-state access. Enemy uses existing fixed priorities. Five rule variants, real save continuation, failures retained. Does not establish human enjoyment, global balance or delivery readiness.'};
writeFileSync(join(out,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({finished:true,...summary,groups:undefined}));
