import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,issueCommand,validateSave,COMMAND_RESOURCE,battleWounded} from '../engine.mjs';
import {STRATAGEMS,stratagemProfile,stratagemEffectText,selectStratagemSource,availableBattleCommanders} from '../stratagems.mjs';
import {chooseStratagemPoint} from '../stratagem-area.mjs';
import {areaPreview} from '../stratagem-area-view.mjs';
import {setStatus,unitTactics,shieldAmount} from '../tactics.mjs';
import {commandProtectionDuration} from '../command-protection.mjs';
import {DESIGN_TABLES,validateDesignTables} from '../design-catalog.mjs';

function charged(pair,caster,side=0,advisor=caster){
 const entry=id=>({id,type:'spear',troops:4000,level:10}),own=['dun',...pair,'jin','liao','he'].map(entry),foe=['shao','wen','yan','gao','person-17','person-70','person-186'].map(entry);
 const state=createScenario('custom-battle',11001,20,null,{seed:11001,terrain:'land',ownTeam:side?foe:own,enemyTeam:side?own:foe,ownTeamRoles:{leader:side?'shao':caster,advisor:side?'shao':advisor},enemyTeamRoles:{leader:side?caster:'shao',advisor:side?advisor:'shao'}}),b=state.battle;
 for(const u of b.sides.flatMap(s=>s.units)){u.retreatAt=null;u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));setStatus(b,u,'phalanx',999);}
 lockDeployment(b);const resource=side?b.enemyCommand:b;
 while(resource.commandProgress<COMMAND_RESOURCE.capacity&&!b.result)stepBattle(b,{aiSides:[]});
 assert.equal(b.result,null);return state;
}
const pairs={fortify:['person-637','person-368'],heal:['person-443','person-668'],cleanse:['person-462','person-290'],invincible:['person-636','person-578'],ambush:['person-447','person-61'],disrupt:['person-642','person-558'],ward:['person-520','person-226'],swift:['person-366','person-137'],blockade:['person-264','person-662']};
for(const [key,pair]of Object.entries(pairs))for(const side of [0,1])test(key+' uses real different holders in the identical army, side '+side,()=>{
 const observed=[];
 for(const caster of pair){
  const state=charged(pair,caster,side),b=state.battle,s=STRATAGEMS[key],recipient=b.sides[side].units.find(u=>u.id==='dun'),foe=b.sides[1-side].units[0];
  if(s.effect==='heal'){recipient.hp=600;recipient.battleDamage=3400;assert.equal(battleWounded(recipient),1190);}
  if(s.effect==='cleanse')setStatus(b,recipient,'burn',30,{amount:10,sourceId:foe.id});
  const point=s.effect==='stun'||s.effect==='firestorm'?{x:foe.x,y:foe.y}:s.scope.shape==='circle'?{x:recipient.x,y:recipient.y}:chooseStratagemPoint(b,s,side);
  if(point){const preview=areaPreview(b,s,{point,side});assert.ok(preview.controls.includes(stratagemEffectText(selectStratagemSource(b.sides[side].commanders,key))));}
  const hp=recipient.hp;assert.equal(issueCommand(b,key,point,side),null);const record=(side?b.enemyCommand:b).lastCommand;
  assert.equal(record.source.id,caster);assert.equal(record.source.leadership,b.sides[side].commanders[0].leadership);assert.equal((side?b.enemyCommand:b).commandReady[key],record.tick+s.cooldown);
  let actual;
  if(s.effect==='shield')actual=shieldAmount(b,recipient);
  else if(s.effect==='heal')actual=recipient.hp-hp;
  else if(s.effect==='firestorm')actual=foe.statuses.burn.amount;
  else if(s.effect==='blockade')actual=b.sides[1-side].blockadeUntil-record.tick-1;
  else {const status={cleanse:'resolve',invincible:'commandInvincible',ambush:'stealth',stun:'stun',magicImmunity:'magicImmune',rapidAdvance:'rapidAdvance'}[s.effect],u=s.effect==='stun'?foe:recipient;actual=u.statuses[status].until-record.tick-1;}
  observed.push(actual);const saved=validateSave(structuredClone(state));
  for(let n=0;n<record.source.duration+4;n++){stepBattle(b,{aiSides:[]});stepBattle(saved.battle,{aiSides:[]});assert.deepEqual(saved.battle,b);}
  if(['magicImmunity','invincible','stun','rapidAdvance','ambush'].includes(s.effect)){
   const bad=structuredClone(state),u=bad.battle.sides[s.effect==='stun'?1-side:side].units.find(u=>u.id===(s.effect==='stun'?foe.id:recipient.id));
   // Source profile is also persisted after the status expires; forged attributes must fail.
   (side?bad.battle.enemyCommand:bad.battle).lastCommand.source.power=2.1;assert.throws(()=>validateSave(bad));
  }
 }
 assert.ok(observed[1]>observed[0],key+': '+observed);
 if(key!=='blockade')assert.ok(observed[1]/observed[0]>=1.2,'at least 20% real difference for distinct current holders: '+key);
});
test('all 15 primary effects respond to caster attributes; 20 points double the main effect, unrelated attributes do nothing',()=>{
 for(const [key,s]of Object.entries(STRATAGEMS)){
  const id=s.roster[0],profiles=[60,80,100].map(n=>stratagemProfile(key,{id,leadership:n,intellect:n}));
  const primary=p=>s.scaling==='strength'?p.strength:s.scaling==='count'?p.count:s.scaling==='resolve'?p.resolve:s.scaling==='disciplineDuration'?commandProtectionDuration(100,p.power):p.duration;
  assert.deepEqual(profiles.map(primary),[primary(profiles[1])/2,primary(profiles[1]),primary(profiles[1])*2],key);
  assert.equal(stratagemProfile(key,{id,leadership:120,intellect:120}).power,2);
  assert.equal(stratagemProfile(key,{id,leadership:0,intellect:0}).power,.5);
  assert.deepEqual(stratagemProfile(key,{id,force:1,politics:1,charm:1}),stratagemProfile(key,{id,force:100,politics:100,charm:100}));
 }
});
test('same command selects the stronger actual advisor, while already cast effects retain their source and duration',()=>{
 const state=charged(pairs.ward,'person-520',0,'person-226'),b=state.battle,own=b.sides[0];
 const strong=own.units.find(u=>u.id==='person-226');
 const target=own.units.find(u=>u.id==='dun');assert.equal(issueCommand(b,'ward',{x:target.x,y:target.y}),null);
 assert.equal(b.lastCommand.source.id,'person-226');assert.equal(target.statuses.magicImmune.duration,15);
 const until=target.statuses.magicImmune.until;strong.status='withdrawn';assert.equal(target.statuses.magicImmune.until,until);
 assert.equal(selectStratagemSource(availableBattleCommanders(own,b.tick),'ward').duration,4);validateSave(structuredClone(state));
});
test('exclusive magic immunity snapshots target discipline and caster strength, and rejects forged duration',()=>{
 const state=charged(['cao','person-246'],'cao'),b=state.battle;
 assert.equal(issueCommand(b,'cao-wuchao'),null);const u=b.sides[0].units[0],status=u.statuses.magicImmune;
 assert.equal(status.duration,commandProtectionDuration(status.protectionDiscipline,b.lastCommand.source.power));
 const until=status.until;setStatus(b,u,'bulwark',20);assert.equal(status.until,until);validateSave(structuredClone(state));
 const bad=structuredClone(state),v=bad.battle.sides[0].units[0].statuses.magicImmune;v.duration++;v.until++;assert.throws(()=>validateSave(bad),/军略状态/);
});
test('design validation rejects missing caster scaling, unrelated weights, an inert primary effect, and cooldown shorter than the strongest effect',()=>{
 for(const edit of [d=>{delete d.stratagems.ward.scaling;},d=>{d.stratagems.swift.weights={force:.7,intellect:.3};},d=>{d.stratagems.invincible.scaling='strength';},d=>{d.stratagemAttributes.doublingPoints=0;},d=>{d.stratagems['zhuge-eight'].cooldown=40;}]){
  const data=structuredClone(DESIGN_TABLES);edit(data);assert.ok(validateDesignTables(data).length);
 }
});
