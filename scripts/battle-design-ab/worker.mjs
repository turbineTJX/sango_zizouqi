import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {PROTOCOL,FAMILIES,CONTEXTS,POSITIONS} from './protocol.mjs';
const task=JSON.parse(readFileSync(process.argv[2],'utf8'));
globalThis.__SANGO_BATTLE_DESIGN_AB={family:task.family,version:task.version};
const mod=p=>import(pathToFileURL(join(task.source,p)));
const [E,G,T,D,O,M,TR]=await Promise.all(['engine.mjs','battle-generator.mjs','tactics.mjs','battle-deployment.mjs','officer-catalog.mjs','data/design/battle-maps.mjs','troop-training.mjs'].map(mod));
const {generateBattle}=G,{planBattleCouncilsAI,lockDeployment,stepBattle,validateSave,reserveDeploymentUnit}=E;
const byName=name=>{const matches=O.OFFICER_CATALOG.filter(o=>o.name===name);assert.equal(matches.length,1,name);return matches[0].id;};
const entries=team=>team.map(([name,type,troops])=>({id:byName(name),type,troops,level:PROTOCOL.level,retreatAt:null}));
const family=FAMILIES[task.family],coreId=byName(family.core),skillId=Object.keys(family.patch)[0];
function deploy(b,side,team,layout){
  for(const u of b.sides[side].units)assert.equal(reserveDeploymentUnit(b,u.id,null,side),null);
  team.forEach((u,i)=>{const [x,y]=POSITIONS[layout][i];assert.equal(D.deployBattleUnit(b,u.id,side?13-x:x,y,side),null);});
}
function unitFrame(b){return b.sides.flatMap(s=>s.units).map(u=>[u.x,u.y,u.hp,u.intent,u.status==='active'?1:0,T.hasStatus(b,u,'stun')?1:T.hasStatus(b,u,'confuse')?2:0,T.hasStatus(b,u,'magicImmune')?1:0]);}
function run({context,seed,side,layout,enemyLayout,phase,record=false}){
  const ctx=CONTEXTS[context],own=entries(family.team),foe=entries(ctx.team);
  assert.equal(own.reduce((n,u)=>n+u.troops,0),18000);assert.equal(foe.reduce((n,u)=>n+u.troops,0),18000);
  assert.equal(new Set([...own,...foe].map(u=>u.id)).size,12,'Whole-battle identity uniqueness');
  const roles=team=>({leader:team[0].id,advisor:team[1].id});
  const input={seed,terrain:ctx.terrain,mapId:ctx.mapId,battleKind:'field',limit:PROTOCOL.limit,shieldPercent:0,events:[],ownTroopBudget:18000,ownTeam:side?foe:own,enemyTeam:side?own:foe,ownTeamRoles:roles(side?foe:own),enemyTeamRoles:roles(side?own:foe)};
  const state=generateBattle(input),b=state.battle;planBattleCouncilsAI(b,[0,1]);deploy(b,side,own,layout);deploy(b,1-side,foe,enemyLayout);assert.equal(lockDeployment(b),null);validateSave(structuredClone(state));
  const subject=b.sides[side].units,opponents=b.sides[1-side].units,all=b.sides.flatMap(s=>s.units),core=subject.find(u=>u.id===coreId);
  const key=[task.family,context,seed,side,layout,enemyLayout].join('-');
  const metrics={hardControlTicks:0,maxConsecutiveLock:0,magicTicks:0,magicAttacks:0,comboOpenings:0,coreDamage:0,firstCoreSpecial:null,firstRout:null,experimentDamage:0,experimentImpactCount:0,interruptions:0,emptyHits:0,newStuns:0,stunsProtected:0,newMagicValidated:0},chains=new Map(),frames=[],events=[];
  const description=all.map(u=>({id:u.id,name:u.name,side:u.side,type:u.type,initial:u.initial}));
  if(record){writeFileSync(join(task.dest,key+'-start.json'),JSON.stringify(state));frames.push({tick:0,units:unitFrame(b)});}
  let deterministic=false,checkpoint=null,checkUntil=0;
  while(!b.result){
    const previous=new Map(all.map(u=>[u.id,{hp:u.hp,status:u.status,stun:T.hasStatus(b,u,'stun'),casts:{...u.tacticCasts}}]));
    stepBattle(b,{aiSides:[0,1],pauseForReinforcements:false});
    if(checkpoint){stepBattle(checkpoint.battle,{aiSides:[0,1],pauseForReinforcements:false});if(b.tick>=checkUntil||b.result){assert.deepEqual(checkpoint.battle,b);deterministic=true;checkpoint=null;}}
    if(!deterministic&&!checkpoint&&b.tick>=20&&!b.result){checkpoint=validateSave(structuredClone(state));checkUntil=b.tick+8;}
    if(metrics.firstRout===null&&all.some(u=>previous.get(u.id).status==='active'&&u.status!=='active'&&u.hp<=0))metrics.firstRout=b.tick;
    for(const u of all){
      const active=u.status==='active'&&u.hp>0,stun=active&&T.hasStatus(b,u,'stun'),hard=active&&(stun||T.hasStatus(b,u,'confuse'));
      if(u.side!==side){if(hard)metrics.hardControlTicks++;const n=hard?(chains.get(u.id)||0)+1:0;chains.set(u.id,n);metrics.maxConsecutiveLock=Math.max(metrics.maxConsecutiveLock,n);}
      if(stun&&!previous.get(u.id).stun&&u.statuses.stun.sourceSkillName===T.TACTICS_BOOK[skillId].name){metrics.newStuns++;if(T.hasStatus(b,u,'resolve'))metrics.stunsProtected++;}
      if(active&&u.side===side&&T.hasStatus(b,u,'magicImmune')){metrics.magicTicks++;metrics.magicAttacks+=b.effects.filter(e=>e.from===u.id&&!e.skill&&e.phase==='impact'&&e.damage>0).length;}
    }
    if(phase==='mechanisms'&&!metrics.newMagicValidated&&all.some(u=>u.statuses.magicImmune?.sourceTactic)){
      validateSave(structuredClone(state));
      for(const field of ['duration','sourceTactic']){const forged=structuredClone(state),u=forged.battle.sides.flatMap(s=>s.units).find(u=>u.statuses.magicImmune?.sourceTactic);u.statuses.magicImmune[field]=field==='duration'?999:'missing-source';assert.throws(()=>validateSave(forged),/普通魔免/);}
      metrics.newMagicValidated++;
    }
    for(const e of b.effects){
      if(e.side===side){if(e.openingTrigger)metrics.comboOpenings++;if(e.from===coreId&&e.damage>0)metrics.coreDamage+=e.damage;if(e.label===T.TACTICS_BOOK[skillId].name&&e.phase==='impact'){metrics.experimentDamage+=e.damage||0;metrics.experimentImpactCount++;if(e.missed){if(e.text==='落空')metrics.emptyHits++;else metrics.interruptions++;}}}
      if(record&&e.phase==='impact'&&(e.skill||e.damage>300||e.openingTrigger)&&events.length<160)events.push({tick:b.tick,from:e.from,to:e.to,label:e.label,text:e.text||'',damage:e.damage||0,healing:e.healing||0});
    }
    if(metrics.firstCoreSpecial===null&&T.unitTactics(core).some(t=>t.special&&(core.tacticCasts[t.id]||0)>(previous.get(coreId).casts[t.id]||0)))metrics.firstCoreSpecial=b.tick;
    if(record&&(b.tick%2===0||b.result))frames.push({tick:b.tick,units:unitFrame(b)});
    assert.ok(b.tick<=PROTOCOL.limit+2,'Unexpected simulation overrun');
  }
  validateSave(structuredClone(state));
  const sum=xs=>xs.reduce((n,u)=>n+u.hp,0),casts=subject.reduce((n,u)=>n+Object.values(u.tacticCasts).reduce((a,c)=>a+c,0),0);
  const row={key,family:task.family,version:task.version,phase,context,seed,side,layout,enemyLayout,winner:b.result.winner,win:b.result.winner===side,ticks:b.tick,remaining:sum(subject),opponentRemaining:sum(opponents),margin:(sum(subject)-sum(opponents))/18000,skillCasts:casts,experimentCasts:subject.reduce((n,u)=>n+(u.tacticCasts[skillId]||0),0),trainingGold:[own,foe].map(team=>team.reduce((n,u)=>n+TR.trainingCost(u.type,u.troops),0)),deterministic,...metrics};
  if(record){writeFileSync(join(task.dest,key+'-end.json'),JSON.stringify(state));writeFileSync(join(task.dest,key+'-replay.json'),JSON.stringify({row,input,units:description,tiles:M.BATTLE_MAPS[ctx.mapId].tiles,frames,events}));}
  return row;
}
const rows=[],phase=task.stage,seeds=phase==='validation'?PROTOCOL.validationSeeds:PROTOCOL.developmentSeeds;
if(phase==='mechanisms'){
  // Natural execution probes, not forced casts or synthetic success. No balance verdict.
  for(const context of family.contexts)for(const side of [0,1])rows.push(run({context,seed:PROTOCOL.developmentSeeds[0],side,layout:'compact',enemyLayout:'compact',phase}));
  if(task.version==='B'&&['control','burst'].includes(task.family)){assert.ok(rows.some(r=>r.newStuns>0),'No actual stun opportunity in mechanism probe');assert.ok(rows.every(r=>r.newStuns===r.stunsProtected),'Stun bypassed common control protection');}
  if(task.version==='B'&&task.family==='protection'){assert.ok(rows.some(r=>r.magicTicks>0),'No actual magic-immunity opportunity');assert.ok(rows.some(r=>r.newMagicValidated>0),'Missing provenance forgery checks');}
}else{
  for(const context of family.contexts)for(const seed of seeds)for(const side of PROTOCOL.sides)for(const layout of PROTOCOL.layouts)for(const enemyLayout of PROTOCOL.layouts){
    const record=phase==='validation'&&seed===PROTOCOL.validationSeeds[0]&&side===0&&layout==='compact'&&enemyLayout==='compact';
    const row=run({context,seed,side,layout,enemyLayout,phase,record});rows.push(row);appendFileSync(join(task.dest,'runs.jsonl'),JSON.stringify(row)+'\n');
    if(rows.length%16===0)console.log(JSON.stringify({phase,family:task.family,version:task.version,completed:rows.length}));
  }
}
writeFileSync(join(task.dest,'results.json'),JSON.stringify(rows,null,2));
console.log(JSON.stringify({finished:task.family+'-'+task.version,phase,battles:rows.length,seconds:process.uptime().toFixed(1),wins:rows.filter(r=>r.win).length,stuns:rows.reduce((n,r)=>n+r.newStuns,0),magicTicks:rows.reduce((n,r)=>n+r.magicTicks,0)}));
