import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,validateSave,reserveDeploymentUnit} from '../engine.mjs';
import {deployBattleUnit} from '../battle-deployment.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {formationCells,formationChoice,chooseFormation,openingFormationModifiers,formationMarkers,validFormationChoice} from '../bond-battlefield.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {grantBondEntries} from '../bonds.mjs';
import {bondsMarkup} from '../bond-display.mjs';
import {shieldAmount,absorbShield} from '../tactics.mjs';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
const id=name=>OFFICER_CATALOG.find(u=>u.name===name).id;
const entry=name=>({id:id(name),type:'archer',troops:3000,level:10,retreatAt:null});
const names=['周瑜','黄盖','陈群','程武','秦宓','吾粲'];
function scene(side=0){
 const own=names.map(entry),enemy=['袁绍','颜良','文丑','张郃','沮授','田丰'].map(entry);
 return generateBattle({seed:84100101,mapId:'plain-open',terrain:'land',battleKind:'field',limit:480,ownTeam:side?enemy:own,enemyTeam:side?own:enemy});
}
test('formation choice uses raw active points, deterministic ties, and never counts reserves',()=>{
 const unit=(key,points,status='active')=>({id:key,hp:3000,status,bondGrowth:{levels:points}});
 const b={sides:[{units:[unit('a',{bondGuard:3,bondTigerFormation:3}),unit('b',{bondDragonFormation:2}),unit('bench',{bondDragonFormation:3},'reserve')]}]};
 assert.deepEqual(chooseFormation(b,0),{id:'bondGuard',points:3,holders:1,tier:1});
 b.sides[0].units[1].bondGrowth.levels.bondDragonFormation=4;assert.equal(chooseFormation(b,0).id,'bondDragonFormation');
 const before=structuredClone(b);assert.deepEqual(chooseFormation(b,0),chooseFormation(b,0));assert.deepEqual(b,before);
 b.sides[0].units[0].hp=0;assert.equal(chooseFormation(b,0).id,'bondDragonFormation');
});
test('formation selection includes the actual treasure point without letting it replace a required holder',()=>{
 const a={id:'a',hp:3000,status:'active',treasureId:'sixTeachings',bondGrowth:{levels:{bondGuard:2,bondTigerFormation:3}}};
 const b={sides:[{units:[a]}]};assert.equal(chooseFormation(b,0).id,'bondGuard');
 delete a.treasureId;assert.equal(chooseFormation(b,0).id,'bondTigerFormation');a.treasureId='sixTeachings';
 b.sides[0].units.push({id:'b',hp:3000,status:'active',bondGrowth:{levels:{bondGuard:3}}});
 const choice=chooseFormation(b,0);assert.equal(choice.points,6);assert.equal(choice.holders,2);assert.equal(choice.tier,1);
 b.deploymentLocked=true;b.sides[0].bondFormationChoice=choice;assert.equal(validFormationChoice(b,0),true);
});
test('real marked starters receive only the selected formation, without requiring the recipient to hold it',()=>{
 for(const side of [0,1]){
  const s=scene(side),b=s.battle,army=b.sides[side],core=army.units.find(u=>u.id===id('周瑜'));
  assert.equal(formationChoice(b,side).id,'bondDragonFormation');
  for(const [i,u] of army.units.entries())assert.equal(deployBattleUnit(b,u.id,side?13:0,i,side),null);
  const marks=formationCells(b,side,'bondDragonFormation');
  for(let i=0;i<3;i++)assert.equal(deployBattleUnit(b,army.units[i].id,marks[i].x,marks[i].y,side),null);
  assert.equal(lockDeployment(b),null);assert.equal(core.bondGrowth.levels.bondDragonFormation,undefined);
  assert.equal(core.bondOpeningFormations.length,1);assert.equal(core.bondOpeningFormations[0].slot,0);
  assert.ok(army.units.every(u=>u.bondFormation.tier===0),'the losing Tianfu formation must not grant old tile buffs');
  const actual=unitAttributes(core,b),without=structuredClone(core);without.bondOpeningFormations=[];
  assert.ok(actual.strategyPower>unitAttributes(without,b).strategyPower);
  assert.equal(actual.attack,unitAttributes(without,b).attack);
  const receipt=structuredClone(core.bondOpeningFormations);core.x=side?9:4;core.y=7;
  grantBondEntries(b);assert.deepEqual(core.bondOpeningFormations,receipt);assert.ok(openingFormationModifiers(b,core).length);
  assert.ok(formationMarkers(b,side).every(m=>m.id==='bondDragonFormation'));
  const copy=validateSave(structuredClone(s));for(let i=0;i<12;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
 }
});
test('opening formation choice stays locked after casualties; no second formation or later entry is awarded',()=>{
 const s=scene(),b=s.battle;assert.equal(lockDeployment(b),null);const choice=structuredClone(formationChoice(b,0));
 const u=b.sides[0].units.find(u=>u.id===id('黄盖'));u.status='withdrawn';
 assert.deepEqual(formationChoice(b,0),choice);grantBondEntries(b);assert.deepEqual(formationChoice(b,0),choice);
 const main=b.sides[0].units[0];main.bondOpeningFormations=[];Object.assign(main,formationCells(b,0,'bondDragonFormation')[0]);
 grantBondEntries(b);assert.deepEqual(main.bondOpeningFormations,[],'walking onto a mark cannot grant a new receipt');
 const missing=structuredClone(s);delete missing.battle.sides[0].bondFormationChoice;assert.throws(()=>validateSave(missing));
 const bad=structuredClone(s);bad.battle.sides[0].units[0].bondOpeningFormations=[{id:'bondTigerFormation',tier:1,slot:0,x:4,y:1}];assert.throws(()=>validateSave(bad));
});
test('only the winning formation highlights in the common bond panel',()=>{
 const b=scene().battle,html=bondsMarkup([],{battle:b,side:0});
 const rows=html.match(/<button class="bond-row[^]*?<\/button>/g)||[];
 assert.ok(rows.find(x=>x.includes('data-bond="bondDragonFormation"')).includes('bond-lit'));
 for(const key of ['bondGuard','bondTigerFormation']){const row=rows.find(x=>x.includes('data-bond="'+key+'"'));if(row)assert.equal(row.includes('bond-lit'),false);}
});

test('complete opening roles protect every real starter once, including non-holders off the marked cells',()=>{
 for(const side of [0,1]){
  const state=scene(side),b=state.battle,army=b.sides[side];
  for(const [i,u]of army.units.entries())assert.equal(deployBattleUnit(b,u.id,side?13:0,i,side),null);
  const marks=formationCells(b,side,'bondDragonFormation');
  for(let i=0;i<3;i++)assert.equal(deployBattleUnit(b,army.units[i].id,marks[i].x,marks[i].y,side),null);
  const intent=army.units.map(u=>u.intent),counts=army.units.map(u=>structuredClone(u.tacticCasts));
  assert.equal(lockDeployment(b),null);
  const d=BOND_DESIGNS.bondDragonFormation,tier=formationChoice(b,side).tier;
  for(const u of army.units)assert.equal(shieldAmount(b,u),Math.floor(u.maxHp*d.completeShield[tier-1]));
  assert.equal(army.units[3].bondOpeningFormations.length,0,'an unmarked starter still receives the complete formation shield');
  assert.deepEqual(army.units.map(u=>u.intent),intent);assert.deepEqual(army.units.map(u=>u.tacticCasts),counts);
  const main=army.units[0],before=shieldAmount(b,main);assert.equal(absorbShield(b,main,100),0);
  grantBondEntries(b);assert.equal(shieldAmount(b,main),before-100,'repeated entry processing never refills a consumed shield');
  const copy=validateSave(structuredClone(state));for(let n=0;n<12;n++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
  const excessive=structuredClone(state),target=excessive.battle.sides[side].units.find(u=>u.statuses?.shield?.layers.some(l=>l.source.startsWith('formation:')));
  if(target){const layer=target.statuses.shield.layers.find(l=>l.source.startsWith('formation:'));layer.until++;target.statuses.shield.until=Math.max(...target.statuses.shield.layers.map(l=>l.until));assert.throws(()=>validateSave(excessive));}
 }
});

test('an incomplete formation keeps only its opening share and old Tianfu never gains the new reward',()=>{
 const state=scene(),b=state.battle,army=b.sides[0];
 for(const [i,u]of army.units.entries())assert.equal(deployBattleUnit(b,u.id,0,i,0),null);
 const marks=formationCells(b,0,'bondDragonFormation');for(let i=0;i<2;i++)assert.equal(deployBattleUnit(b,army.units[i].id,marks[i].x,marks[i].y,0),null);
 assert.equal(lockDeployment(b),null);assert.ok(army.units.every(u=>shieldAmount(b,u)===900));
 Object.assign(army.units[2],marks[2]);grantBondEntries(b);assert.ok(army.units.every(u=>shieldAmount(b,u)===900));
 const old=scene().battle;old.sides[0].units.forEach(u=>u.bondGrowth.levels={bondGuard:2});
 for(const [i,p]of formationCells(old,0,'bondGuard').entries())assert.equal(deployBattleUnit(old,old.sides[0].units[i].id,p.x,p.y,0),null);
 assert.equal(lockDeployment(old),null);assert.equal(formationChoice(old,0).id,'bondGuard');assert.ok(old.sides[0].units.every(u=>shieldAmount(old,u)===0));
});

test('both opening formations scale all tiers by zero to three real occupied roles and validate the saved share',()=>{
 const rosters={
  bondTigerFormation:[['关羽','廖化','周仓','邓芝','郭淮','貂蝉'],['关羽','乐进','关平','廖化','周仓','满宠'],['关羽','乐进','夏侯渊','夏侯惇','关兴','关平']],
  bondDragonFormation:[['黄盖','周瑜','廖化','周仓','满宠','郭淮'],names,['杨仪','黄盖','陆凯','陈群','程武','吾粲']],
 };
 const amounts=[[0,200,400,600],[0,450,900,1350],[0,700,1400,2100]];
 for(const [key,tiers]of Object.entries(rosters))for(const [i,list]of tiers.entries())for(const side of [0,1])for(const occupied of [0,1,2,3]){
  const own=list.map(n=>({...entry(n),troops:3001})),enemy=['袁绍','颜良','文丑','张郃','沮授','田丰'].map(entry);
  const state=generateBattle({seed:84100101,mapId:'plain-open',terrain:'land',battleKind:'field',limit:480,ownTeam:side?enemy:own,enemyTeam:side?own:enemy}),b=state.battle,army=b.sides[side];
  assert.equal(formationChoice(b,side).id,key);assert.equal(formationChoice(b,side).tier,i+1);
  for(const [j,u]of army.units.entries())assert.equal(deployBattleUnit(b,u.id,side?13:0,j,side),null);
  const marks=formationCells(b,side,key);for(let j=0;j<occupied;j++)assert.equal(deployBattleUnit(b,army.units[j].id,marks[j].x,marks[j].y,side),null);
  assert.equal(lockDeployment(b),null);assert.deepEqual(army.units.map(u=>shieldAmount(b,u)),Array(6).fill(amounts[i][occupied]));
  assert.equal(army.units.flatMap(u=>u.bondOpeningFormations).length,occupied);
  validateSave(structuredClone(state));
  if(occupied){
   const bad=structuredClone(state),u=bad.battle.sides[side].units[0];u.statuses.shield.layers.find(l=>l.source==='formation:'+key).amount++;
   assert.throws(()=>validateSave(bad),'a partial formation cannot load more than its opening share');
   const before=shieldAmount(b,army.units[0]);absorbShield(b,army.units[0],50);grantBondEntries(b);assert.equal(shieldAmount(b,army.units[0]),before-50);
  }
  const saved=validateSave(structuredClone(state));for(let n=0;n<4;n++){stepBattle(b,{aiSides:[0,1]});stepBattle(saved.battle,{aiSides:[0,1]});}assert.deepEqual(saved.battle,b);
 }
});

test('a real reserve never receives the opening shield on later entry and expired shields never refill',()=>{
 const state=scene(),b=state.battle,army=b.sides[0],reserve=army.units.find(u=>u.id===id('吾粲'));
 assert.equal(reserveDeploymentUnit(b,reserve.id),null);
 const starters=army.units.filter(u=>u.status==='active');for(const [i,u]of starters.entries())assert.equal(deployBattleUnit(b,u.id,0,i),null);
 for(const [i,p]of formationCells(b,0,'bondDragonFormation').entries())assert.equal(deployBattleUnit(b,starters[i].id,p.x,p.y),null);
 assert.equal(lockDeployment(b),null);assert.ok(starters.every(u=>shieldAmount(b,u)>0));assert.equal(shieldAmount(b,reserve),0);
 for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.skillReady=Object.fromEntries(u.tactics.map(k=>[k,999]));u.retreatAt=null;}
 starters[4].retreatAt=starters[4].hp;
 for(let n=0;n<90&&!reserve.bondEntry&&!b.result;n++)stepBattle(b,{aiSides:[0,1]});
 assert.ok(reserve.bondEntry?.tick>0);assert.equal(shieldAmount(b,reserve),0);assert.deepEqual(reserve.bondOpeningFormations,[]);
 while(b.tick<=BOND_DESIGNS.bondDragonFormation.completeSteps+1&&!b.result)stepBattle(b,{aiSides:[0,1]});
 assert.ok(army.units.every(u=>!u.statuses?.shield?.layers.some(l=>l.source.startsWith('formation:'))));grantBondEntries(b);assert.equal(shieldAmount(b,reserve),0);
 validateSave(structuredClone(state));
});

test('actual late reinforcements on either side receive no opening share and cannot change the saved occupied slots',()=>{
 for(const side of [0,1]){
  const own=names.slice(0,5).map(entry),enemy=['袁绍','颜良','文丑','张郃','沮授','田丰'].map(entry);
  const state=generateBattle({seed:84100101,mapId:'plain-open',terrain:'land',battleKind:'field',limit:480,ownTeam:side?enemy:own,enemyTeam:side?own:enemy,reinforcements:[{side,name:'援军',tick:4,team:[entry('高柔')]}]}),b=state.battle,army=b.sides[side],reinforcement=army.units.find(u=>u.id===id('高柔'));
  const starters=army.units.filter(u=>u.status==='active');for(const [i,u]of starters.entries())assert.equal(deployBattleUnit(b,u.id,side?13:0,i,side),null);
  for(const [i,p]of formationCells(b,side,'bondDragonFormation').entries())if(i<2)assert.equal(deployBattleUnit(b,starters[i].id,p.x,p.y,side),null);
  assert.equal(lockDeployment(b),null);assert.ok(starters.every(u=>shieldAmount(b,u)===900));
  const roster=structuredClone(army.bondReserve.starters),receipts=starters.map(u=>structuredClone(u.bondOpeningFormations));
  for(const u of b.sides.flatMap(a=>a.units)){u.cooldown=999;u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,999]));}
  const copy=validateSave(structuredClone(state));for(let n=0;n<8;n++){stepBattle(b,{aiSides:[0,1],pauseForReinforcements:false});stepBattle(copy.battle,{aiSides:[0,1],pauseForReinforcements:false});}
  assert.deepEqual(copy.battle,b);assert.ok(reinforcement.bondEntry?.tick>=4);assert.equal(shieldAmount(b,reinforcement),0);assert.deepEqual(reinforcement.bondOpeningFormations,[]);
  assert.deepEqual(army.bondReserve.starters,roster);assert.deepEqual(starters.map(u=>u.bondOpeningFormations),receipts);validateSave(structuredClone(state));
 }
});
