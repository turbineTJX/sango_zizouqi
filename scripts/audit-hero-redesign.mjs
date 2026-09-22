import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {HERO_CASES,HERO_COMPOSITIONS,heroDraft,heroCaseTeam} from './hero-redesign-cases.mjs';
const mode=process.argv[2]||'current',validation=process.argv[3]==='validation';
if(!['baseline','current','replacement'].includes(mode))throw Error('unknown audit mode');
const root=resolve(mode==='baseline'?'outputs/hero-v44/baseline':'.'),load=p=>import(pathToFileURL(resolve(root,p)));
const {createScenario}=await load('scenarios.mjs'),{lockDeployment,stepBattle,validateSave}=await load('engine.mjs');
const {TACTICS_BOOK,SPECIAL_TACTICS}=await load('tactics.mjs');
const cases=[...HERO_CASES.map(([id,name,type])=>({name,focus:id,team:heroCaseTeam(id,type)})),...(mode==='replacement'?[]:HERO_COMPOSITIONS)];
const rows=[];
for(const fixture of cases)for(let index=0;index<4;index++)for(const allocation of ['equal','core'])for(const side of [0,1]){
 const seed=440211+(index+(validation?4:0))*7919,level=index%2?8:5;
 const draft=heroDraft(fixture.team,seed,level,allocation,side);
 if(mode==='replacement')(side?draft.enemyTeam:draft.ownTeam)[0].id='person-610';
 const state=createScenario('custom-battle',seed,20,null,draft),b=state.battle;
 lockDeployment(b);assert.ok(b.sides.flatMap(s=>s.units).every(u=>u.intent===0));
 const learning=JSON.stringify(b.sides.map(s=>s.units.map(u=>[u.id,u.tacticLearning,u.tactics])));
 const counters=Object.fromEntries(b.sides[side].units.map(u=>[u.id,{name:u.name,type:u.type,learning:u.tacticLearning,tactics:u.tactics,casts:0,first:null,damage:0,healing:0,drain:0,setup:0,highIntent:0,counterDamage:0,ordinaryDamage:0,allHealing:0,intentRestored:0,shieldGranted:0,cleanseEvents:0,cooldownEvents:0,controlSuccess:0}]));
 const trace=[],last=new Map();let resumed=null;
 while(!b.result){
   const counts=new Map(b.sides.flatMap(s=>s.units).map(u=>[u.id,{...u.tacticCasts}]));
   stepBattle(b);if(resumed)stepBattle(resumed.battle);
   for(const u of b.sides.flatMap(s=>s.units)){
     assert.ok(u.intent>=0&&u.intent<=100);
     for(const [id,n] of Object.entries(u.tacticCasts))if(n>(counts.get(u.id)[id]||0)){
       assert.ok(!last.has(u.id)||b.tick-last.get(u.id)>=4);last.set(u.id,b.tick);
       if(u.side===side&&id===SPECIAL_TACTICS[u.id]){
         const row=counters[u.id];row.casts++;row.first??=b.tick;
         trace.push({tick:b.tick,id:u.id,skill:id,intentAfter:u.intent,targets:b.effects.filter(e=>e.from===u.id&&e.skill&&e.label===TACTICS_BOOK[id].name).map(e=>({id:e.to,damage:e.damage||0,healing:e.healing||0,text:e.text,opening:e.openingTrigger,drain:e.intentDrained||0}))});
       }
     }
     if(counters[u.id])counters[u.id].remaining=u.hp;
   }
   for(const e of b.effects){
     const row=counters[e.from];if(!row)continue;
     row.allHealing+=e.healing||0;
     if(!e.skill)row.ordinaryDamage+=e.damage||0;
     if(e.label==='反击')row.counterDamage+=e.damage||0;
     if(e.skill&&e.label===TACTICS_BOOK[SPECIAL_TACTICS[e.from]]?.name&&!e.ongoing){
       row.damage+=e.damage||0;row.healing+=e.healing||0;row.drain+=e.intentDrained||0;
       row.setup+=Number(e.openingTrigger==='setup');row.highIntent+=Number(e.openingTrigger==='highIntent');
       row.controlSuccess+=Number(!!e.resolution?.success);
       for(const target of e.outcome||[])if(counters[target.id])for(const change of target.changes||[]){
         const intent=change.match(/^战意 \+(\d+)/),shield=change.match(/^护盾 (\d+)/);
         if(intent)row.intentRestored+=Number(intent[1]);
         if(shield)row.shieldGranted+=Number(shield[1]);
         if(change.startsWith('解除'))row.cleanseEvents++;
         if(change.startsWith('冷却缩短'))row.cooldownEvents++;
       }
     }
   }
   if(b.tick===24)resumed=validateSave(structuredClone(state));
 }
 if(resumed)assert.deepEqual(resumed.battle,b);
 assert.equal(JSON.stringify(b.sides.map(s=>s.units.map(u=>[u.id,u.tacticLearning,u.tactics]))),learning);
 rows.push({case:fixture.name,focus:fixture.focus,seed,level,allocation,side,draft,win:b.result.winner===side,draw:b.result.winner===null,ticks:b.tick,margin:b.sides[side].units.reduce((n,u)=>n+u.hp,0)-b.sides[1-side].units.reduce((n,u)=>n+u.hp,0),units:counters,trace});
}
const summary=cases.map(c=>{const rs=rows.filter(r=>r.case===c.name),us=rs.map(r=>r.units[mode==='replacement'?'person-610':c.focus]).filter(Boolean);const mean=key=>us.reduce((n,u)=>n+u[key],0)/(us.length||1);return {case:c.name,games:rs.length,wins:rs.filter(r=>r.win).length,meanMargin:rs.reduce((n,r)=>n+r.margin,0)/rs.length,castGames:us.filter(u=>u.casts>0).length,meanCasts:mean('casts'),meanDamage:mean('damage'),meanHealing:mean('healing'),meanDrain:mean('drain'),setup:us.reduce((n,u)=>n+u.setup,0),highIntent:us.reduce((n,u)=>n+u.highIntent,0),counterDamage:mean('counterDamage'),intentRestored:mean('intentRestored'),shieldGranted:mean('shieldGranted'),cleanseEvents:mean('cleanseEvents'),cooldownEvents:mean('cooldownEvents'),controlSuccess:mean('controlSuccess')};});
const dir='docs/hero-redesign-v44';mkdirSync(dir,{recursive:true});
const files=['engine.mjs','tactics.mjs','famous-officers.mjs','tactic-tempo.mjs','tactic-learning.mjs','combat-rules.mjs'];
writeFileSync(`${dir}/${mode}-${validation?'validation':'explore'}.json`,JSON.stringify({mode,validation,summary,hashes:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')])),rows},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
