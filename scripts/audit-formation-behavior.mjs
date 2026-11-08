import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('='))),source=resolve(args.source||'.'),out=resolve(args.out||'.local/formation-audit');
const load=p=>import(pathToFileURL(join(source,p)));
const {generateBattle}=await load('battle-generator.mjs'),{defaultCustomBattle}=await load('custom-battle.mjs');
const {planBattleCouncilsAI,lockDeployment,stepBattle,validateSave}=await load('engine.mjs');
const {deployBattleUnit}=await load('battle-deployment.mjs'),{sideCell,hexDistance}=await load('hex-grid.mjs');
const {unitTactics}=await load('tactics.mjs'),{interceptorsAt}=await load('engagement.mjs');
const {combatFamily,combatType}=await load('troop-equipment.mjs'),{TROOP_DESIGNS}=await load('data/design/troops.mjs');
const {OFFICER_CATALOG:officers}=await load('officer-catalog.mjs'),{RULES_VERSION}=await load('combat-rules.mjs'),{trainingCost}=await load('troop-training.mjs');
const phase=args.phase||'development',seeds=phase==='development'?[126101]:[237101,245021,252941],variants=phase==='development'?[0]:[0,1];
assert.ok(['development','validation'].includes(phase));
const id=name=>{const u=officers.find(o=>o.name===name);assert.ok(u,name);return u.id;};
const entry=([name,type,troops],variant=0)=>({id:id(variant&&name==='王粲'?'王朗':variant&&name==='李典'?'霍峻':name),type,troops,level:10,retreatAt:null});
const protectedOwn=[['周瑜','archer',5000],['王粲','archer',2000],['文聘','halberd',3000],['陈武','halberd',3000],['李典','spear',2500],['曹性','archer',2500]];
const recipes=[
 {key:'cavalry-heavy',own:protectedOwn,foe:[['张绣','cavalry',4000],['臧霸','cavalry',3000],['张济','cavalry',3000],['张任','spear',3000],['韩当','archer',2500],['陈登','halberd',2500]],layouts:{guard:[[3,3],[2,3],[4,2],[4,4],[3,4],[2,5]],frontGuard:[[3,3],[2,3],[4,2],[4,4],[4,6],[2,5]]}},
 {key:'archer-heavy',own:[['周瑜','archer',5000],['王粲','archer',2000],['文聘','halberd',3000],['李典','spear',2000],['张绣','cavalry',3000],['臧霸','cavalry',3000]],foe:[['丁奉','spear',3000],['张任','halberd',3000],['韩当','archer',3500],['严颜','archer',3500],['陈登','archer',3000],['郭汜','cavalry',2000]],layouts:{flank:[[2,3],[1,3],[4,3],[4,4],[4,2],[4,5]],center:[[2,3],[1,3],[4,3],[4,4],[3,3],[3,4]]}},
 {key:'front-heavy',own:[['周瑜','archer',5000],['王粲','archer',2000],['文聘','halberd',3000],['陈武','halberd',3000],['曹性','archer',2500],['刘辟','archer',2500]],foe:[['丁奉','spear',3500],['张任','halberd',3500],['陈登','spear',3000],['宋谦','halberd',3000],['韩当','archer',2500],['蒋济','archer',2500]],layouts:{behind:[[3,3],[2,3],[4,2],[4,4],[3,1],[3,5]],forward:[[4,3],[2,3],[3,2],[3,4],[4,1],[4,5]]}},
];
mkdirSync(join(out,'failures'),{recursive:true});writeFileSync(join(out,'runs.jsonl'),'');
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
const files=[...readdirSync(source).filter(p=>p.endsWith('.mjs')).map(p=>join(source,p)),...walk(join(source,'data')).filter(p=>p.endsWith('.mjs'))];
const hashes=()=>Object.fromEntries(files.map(p=>[p.slice(source.length+1),createHash('sha256').update(readFileSync(p)).digest('hex')]));
const fingerprint=hashes();writeFileSync(join(out,'source-hashes.json'),JSON.stringify(fingerprint));
const rows=[],mainId=id('周瑜');
for(const recipe of recipes)for(const variant of variants)for(const seed of seeds)for(const side of [0,1])for(const profile of ['default',...Object.keys(recipe.layouts)]){
 const own=recipe.own.map(e=>entry(e,variant)),foe=recipe.foe.map(e=>entry(e));
 assert.equal(own.reduce((n,u)=>n+u.troops,0),18000);assert.equal(foe.reduce((n,u)=>n+u.troops,0),18000);
 const input={...defaultCustomBattle(),seed,limit:480,mapId:'plain-open',terrain:'land',shieldPercent:0,events:[],ownTroopBudget:18000,ownTeam:side?foe:own,enemyTeam:side?own:foe};
 const state=generateBattle(input),b=state.battle;planBattleCouncilsAI(b,[0,1]);
 if(profile!=='default')own.forEach((u,i)=>{const p=sideCell({x:recipe.layouts[profile][i][0],y:recipe.layouts[profile][i][1]},side);assert.equal(deployBattleUnit(b,u.id,p.x,p.y,side),null);});
 assert.equal(lockDeployment(b),null);validateSave(structuredClone(state));
 const main=b.sides[side].units.find(u=>u.id===mainId),aidId=own[1].id,guardId=own.find(u=>u.type==='spear')?.id,initial=b.sides[side].units.map(u=>({id:u.id,name:u.name,type:u.type,troops:u.initial,x:u.x,y:u.y,tactics:u.tactics,behavior:u.deploymentBehavior}));
 const skill=unitTactics(main).find(s=>s.effect==='famous'&&s.mode==='attack');assert.ok(skill);
 const m={firstMainCast:null,firstMainImpact:null,firstEffectiveMain:null,firstMainHit:null,rallyBeforeMain:0,rallyToMain:0,mainDamage:0,mainTaken:0,ownRearDamage:0,firstOwnRearHit:null,enemyMainCavalryHits:0,ownRearHits:0,enemyRearHits:0,guardTicks:0,interceptionTicks:0,mainSurvived:false},trace=[];
 let copy=null;
 while(!b.result){
  stepBattle(b,{aiSides:[0,1],pauseForReinforcements:false});if(copy)stepBattle(copy.battle,{aiSides:[0,1],pauseForReinforcements:false});
  const guard=b.sides[side].units.find(u=>u.id===guardId);if(guard?.action.startsWith('留守'))m.guardTicks++;
  if(b.sides[1-side].units.some(u=>u.status==='active'&&u.hp>0&&combatFamily(u)==='cavalry'&&interceptorsAt(b,u).some(v=>v.id===guardId)))m.interceptionTicks++;
  for(const e of b.effects){
   if(e.from===mainId&&e.skill===true&&!e.ongoing&&e.label===skill.name){if(e.phase==='cast')m.firstMainCast??=b.tick;if(e.phase==='impact'&&!e.missed){m.firstMainImpact??=b.tick;if(e.damage>0||e.shieldAbsorbed>0)m.firstEffectiveMain??=b.tick;}trace.push({tick:b.tick,...e});}
   if(e.from===aidId&&e.to===mainId&&e.intentRestored>0){m.rallyToMain+=e.intentRestored;if(m.firstMainCast===null)m.rallyBeforeMain+=e.intentRestored;trace.push({tick:b.tick,...e});}
   if(e.to===mainId&&e.damage>0){m.firstMainHit??=b.tick;m.mainTaken+=e.damage;const actor=b.sides[1-side].units.find(u=>u.id===e.from);if(actor&&combatFamily(actor)==='cavalry')m.enemyMainCavalryHits++;}
   if(e.from===mainId&&e.damage>0)m.mainDamage+=e.damage;
   if(e.damage>0&&!e.ongoing){const actor=b.sides.flatMap(s=>s.units).find(u=>u.id===e.from),target=b.sides.flatMap(s=>s.units).find(u=>u.id===e.to);if(actor&&target&&combatFamily(actor)==='cavalry'&&TROOP_DESIGNS[combatType(target)].range>1){if(actor.side===side){m.ownRearHits++;m.ownRearDamage+=e.damage;m.firstOwnRearHit??=b.tick;}else m.enemyRearHits++;}}
  }
  if(b.tick===25)copy=validateSave(structuredClone(state));
  assert.ok(b.tick<=480);
 }
 if(copy)assert.deepEqual(copy.battle,b);validateSave(state);m.mainSurvived=main.hp>0;
 const total=s=>b.sides[s].units.reduce((n,u)=>n+u.hp,0),row={case:recipe.key,variant,seed,side,profile,input,initial,metrics:m,ticks:b.tick,result:b.result,gap:total(side)-total(1-side),ownRemaining:total(side),trainingGold:own.reduce((n,u)=>n+trainingCost(u.type,u.troops),0),deterministic:!!copy,trace};
 rows.push(row);appendFileSync(join(out,'runs.jsonl'),JSON.stringify(row)+'\n');
 if(b.result.winner!==side)writeFileSync(join(out,'failures',[recipe.key,variant,seed,side,profile].join('-')+'.json'),JSON.stringify(state));
 console.log(JSON.stringify({case:recipe.key,variant,seed,side,profile,cast:m.firstMainCast,effective:m.firstEffectiveMain,rally:m.rallyBeforeMain,ownRear:m.ownRearHits,enemyRear:m.enemyRearHits,gap:row.gap}));
}
assert.deepEqual(hashes(),fingerprint);
const groups=[];
for(const recipe of recipes)for(const profile of ['default',...Object.keys(recipe.layouts)]){
 const rs=rows.filter(r=>r.case===recipe.key&&r.profile===profile),mean=k=>rs.reduce((n,r)=>n+(r.metrics[k]||0),0)/rs.length;
 groups.push({case:recipe.key,profile,battles:rs.length,mainCastBattles:rs.filter(r=>r.metrics.firstMainCast!==null).length,effectiveMainBattles:rs.filter(r=>r.metrics.firstEffectiveMain!==null).length,rallyBeforeMain:mean('rallyBeforeMain'),ownRearHits:mean('ownRearHits'),ownRearDamage:mean('ownRearDamage'),firstOwnRearHit:rs.filter(r=>r.metrics.firstOwnRearHit!==null).reduce((n,r)=>n+r.metrics.firstOwnRearHit,0)/Math.max(1,rs.filter(r=>r.metrics.firstOwnRearHit!==null).length),enemyRearHits:mean('enemyRearHits'),enemyMainCavalryHits:mean('enemyMainCavalryHits'),mainTaken:mean('mainTaken'),guardTicks:mean('guardTicks'),interceptionTicks:mean('interceptionTicks'),mainDamage:mean('mainDamage'),meanGap:rs.reduce((n,r)=>n+r.gap,0)/rs.length});
}
const summary={rulesVersion:RULES_VERSION,phase,battles:rows.length,seeds,variants,groups,scope:'Three six-unit mixed enemy rosters, same paired roster, troop types, training budget, 18000 troops, fixed commands and source snapshot; only legal precombat positions vary. Two starts exchanged through sideCell. No injected intent, statuses or forced outcomes. Guard and aid replacements included in validation. Local evidence, not a universal win-rate conclusion.'};
writeFileSync(join(out,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({complete:true,...summary}));
