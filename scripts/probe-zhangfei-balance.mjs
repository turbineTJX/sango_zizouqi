import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {configureUnitTactics,deployUnit} from '../engine.mjs';
import {TACTICS_BOOK,SPECIAL_TACTICS} from '../tactics.mjs';
import {TRAIN_SEEDS,runCase,summarize} from './balance-objectives-lib.mjs';
const id='person-433',special=SPECIAL_TACTICS[id],original=structuredClone(TACTICS_BOOK[special]),rows=[],runs=[];
const variants={baseline:{},coverage:{targets:3},duration:{steps:5},guard:{selfWard:18},reach:{range:2}};
for(const [variant,patch] of Object.entries(variants)){
 Object.assign(TACTICS_BOOK[special],original,patch);
 for(const level of [5,10]){
  const unit=(id,type)=>({id,type,troops:3000,level});
  const c={draft:{terrain:'land',ownTeam:[unit(id,'spear'),unit('person-515','archer'),unit('person-610','crossbow')],enemyTeam:[unit('yan','cavalry'),unit('wen','cavalry'),unit('liao','cavalry')]},options:{controller:'rule',hero:id,setup(s){
   assert.equal(configureUnitTactics(s,id,[special,'phalanx','ward']),null);
   s.battle.sides[0].units.forEach((u,i)=>assert.equal(deployUnit(s.battle,u.id,...[[4,3],[3,4],[3,2]][i]),null));
  }}};
  const group=TRAIN_SEEDS.map(seed=>runCase(c,seed));
  runs.push(...group.map(r=>({variant,level,...r})));rows.push({variant,level,patch,...summarize(group),control:group.reduce((n,r)=>n+r.units.find(u=>u.id===id).controlSteps,0)/group.length});
 }
 delete TACTICS_BOOK[special].selfWard;
}
Object.assign(TACTICS_BOOK[special],original);
const out=new URL('../docs/balance-objectives/',import.meta.url);mkdirSync(out,{recursive:true});
writeFileSync(new URL('zhangfei-training.json',out),JSON.stringify({note:'In-memory, training seeds only. No runtime file changed.',seeds:TRAIN_SEEDS,rows,runs},null,2));console.table(rows);
