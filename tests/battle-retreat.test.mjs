import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {defaultCustomBattle,validateCustomBattle} from '../custom-battle.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {configureCouncilRetreat,battleCouncilMarkup} from '../battle-council.mjs';
import {beginUnitRetreat} from '../battle-retreat.mjs';
import {lockDeployment,stepBattle,validateSave,battleCommanders,commandIntellect,fillSlots} from '../engine.mjs';
import {holdsLine,isTargetable} from '../engagement.mjs';
import {readyTactic} from '../tactics.mjs';
import {newCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {deployUnit,combatUnit,makeOfficer,issueCommand} from '../engine.mjs';
import {retreatDestinations,configureRetreatDestination,dispatchWithdrawn} from '../strategic-retreat.mjs';
import {advancePersonnel,transportProxy,validatePersonnelJourney} from '../personnel-movement.mjs';
import {roadCost} from '../strategic-movement.mjs';
function scene(kind='field'){
 const d=defaultCustomBattle();d.ownTeam=Object.keys(OFFICER_BY_ID).filter(id=>id!=='shao').slice(0,10).map(id=>({id,type:'spear',troops:3000,level:5,retreatAt:900}));d.battleKind=kind;
 const s=createScenario('custom-battle',3,20,null,d),b=s.battle;
 return {s,b,units:b.sides[0].units};
}
function quiet(b){for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,999]));}}
function wound(u,fraction){u.hp=Math.floor(u.initial*fraction);u.battleDamage=u.initial-u.hp;}

test('council accepts exact counts and null atomically; custom configs and saves retain them',()=>{
 const {s,b,units}=scene();assert.ok(units.every(u=>u.retreatAt===900));
 assert.equal(configureCouncilRetreat(b,[units[0].id],1234),null);assert.equal(units[1].retreatAt,900);
 assert.equal(configureCouncilRetreat(b,units.slice(1,3).map(u=>u.id),null),null);
 const before=JSON.stringify(b);assert.match(configureCouncilRetreat(b,[units[0].id,'unknown'],400),/本方/);assert.equal(JSON.stringify(b),before);
 for(const value of [-1,1.5,Infinity,'500'])assert.match(configureCouncilRetreat(b,[units[0].id],value),/无效/);
 assert.equal(configureCouncilRetreat(b,units.map(u=>u.id),1200),null);
 assert.deepEqual(validateSave(JSON.parse(JSON.stringify(s))).battle,b);
 const d=defaultCustomBattle();d.ownTeam[0].retreatAt=777;assert.equal(validateCustomBattle(d).ownTeam[0].retreatAt,777);assert.equal(createScenario('custom-battle',3,20,null,d).battle.sides[0].units[0].retreatAt,777);
 assert.match(battleCouncilMarkup(b),/data-retreat-all/);assert.equal((battleCouncilMarkup(b).match(/data-unit-retreat=/g)||[]).length,10);
 lockDeployment(b);assert.match(configureCouncilRetreat(b,[units[0].id],null),/战前/);
});
test('exact current soldiers trigger either side, wounds are excluded, healing never cancels withdrawal',()=>{
 for(const value of [null,0,1234])for(const side of [0,1]){
  const {b}=scene(),u=b.sides[side].units[0];u.retreatAt=value;u.hp=1235;assert.equal(beginUnitRetreat(b,u),false);
  u.hp=1234;assert.equal(beginUnitRetreat(b,u),value===1234);
  if(value===1234){u.hp=u.initial;assert.equal(beginUnitRetreat(b,u),false);assert.equal(u.withdrawing,true);}
 }
});

test('actual damage triggers withdrawal; unit remains targetable but stops attacks, commands and ZOC',()=>{
 const {b}=scene(),u=b.sides[0].units[0],e=b.sides[1].units[0];b.sides[0].units=[u];b.sides[1].units=[e];
 u.retreatAt=1500;u.x=4;u.y=3;e.x=5;e.y=3;wound(u,.51);quiet(b);e.cooldown=0;
 u.statuses.riposte={until:999};
 lockDeployment(b);stepBattle(b);assert.ok(u.hp<u.initial*.5);assert.equal(u.withdrawing,true);assert.equal(isTargetable(b,u),true);assert.equal(holdsLine(b,u),false);
 assert.equal(readyTactic(b,u,1),null);assert.equal(commandIntellect(b,0),0);assert.ok(!battleCommanders(b).some(c=>c.id===u.id));
 const damage=u.contribution.damage;for(let i=0;i<3&&!b.result;i++)stepBattle(b);assert.equal(u.contribution.damage,damage);
});

test('retreat walks to the exit before a reserve enters and never heals, resets uses or reenters',()=>{
 const {s,b,units}=scene(),u=units[0],reserve=units[6];lockDeployment(b);quiet(b);
 Object.assign(u,{x:4,y:7,retreatAt:1500});wound(u,.5);u.tacticCasts[u.tactics[0]]=1;
 for(const [i,v] of units.filter(v=>v!==u&&v.status==='active').entries()){v.x=3;v.y=i;v.statuses.root={until:999};}
 const hp=u.hp;stepBattle(b);assert.equal(u.withdrawing,true);assert.equal(u.status,'active');assert.equal(reserve.status,'reserve');assert.equal(units.filter(v=>v.status==='active').length,6);
 const restored=validateSave(JSON.parse(JSON.stringify(s)));
 for(let i=0;i<12&&!b.result;i++){stepBattle(b);stepBattle(restored.battle);}
 assert.deepEqual(b,restored.battle);assert.equal(u.status,'withdrawn');assert.equal(u.hp,hp);assert.equal(u.tacticCasts[u.tactics[0]],1);assert.equal(reserve.status,'active');
 fillSlots(b,0);assert.equal(u.status,'withdrawn');
});

test('occupied escape route blocks withdrawal; no instantaneous removal or early replacement',()=>{
 const {b,units}=scene(),u=units[0];lockDeployment(b);quiet(b);u.x=0;u.y=0; // An exit cell permits departure even when surrounded.
 wound(u,.3);stepBattle(b);assert.equal(u.status,'withdrawn');
 const next=units[1];Object.assign(next,{x:1,y:0,retreatAt:1500});wound(next,.5);
 const blockers=b.sides[0].units.filter(v=>v!==next&&v.status==='active');
 const cells=[[0,0],[1,1],[2,0],[2,1],[0,1]];blockers.forEach((v,i)=>{[v.x,v.y]=cells[i];v.statuses.root={until:999};});
 stepBattle(b);assert.equal(next.status,'active');assert.equal(next.withdrawing,true);assert.equal(next.x,1);assert.equal(next.y,0);assert.equal(units.filter(v=>v.status==='active').length,6);
});

test('defenders leaving the battlefield lose even while the gate remains intact',()=>{
 const {b,units}=scene('defense'),u=units[0];b.sides[0].units=[u];lockDeployment(b);quiet(b);u.x=0;u.y=0;wound(u,.3);
 const gate=b.siege.gate.hp;stepBattle(b);assert.equal(u.status,'withdrawn');assert.equal(b.siege.gate.hp,gate);assert.equal(b.result.winner,1);assert.equal(b.result.reason,'撤退');
});

test('a freed slot waits for actual reserve arrival and a withdrawing force cannot supply commands',()=>{
 const {b,units}=scene(),u=units[0];for(const v of units.filter(v=>v.status==='reserve'))v.arrivalTick=20;
 lockDeployment(b);quiet(b);u.x=0;u.y=0;wound(u,.3);stepBattle(b);
 assert.equal(units.filter(v=>v.status==='active').length,5);assert.equal(units[6].status,'reserve');
 while(b.tick<20&&!b.result)stepBattle(b);
 assert.equal(units[6].status,'active');assert.equal(units.filter(v=>v.status==='active').length,6);assert.equal(u.status,'withdrawn');
});

test('ordinary campaign retains withdrawn soldiers and wounded without drawing a destroyed-officer fate',()=>{
 const s=newCampaign(1),a=fieldFromCity(s,'xuchang',{target:'guandu'}),enemy=fieldFromCity(s,'guandu',{target:'xuchang'});
 for(const u of [...a.units,...enemy.units])u.retreatAt=null;a.units.find(u=>u.id==='cao').troops=1000;a.units.find(u=>u.id==='cao').retreatAt=500;
 beginExecution(s);for(let i=0;i<30&&!activeBattles(s).length;i++)advanceCampaignDay(s);
 const r=activeBattles(s)[0];assert.ok(r);chooseEncounter(s,r.id,true);
 for(const [i,u]of r.battle.sides[0].units.filter(u=>u.status==='active'&&u.id!=='cao').entries())assert.equal(deployUnit(r.battle,u.id,0,i),null);
 assert.equal(deployUnit(r.battle,'cao',4,3),null);lockDeployment(r.battle);
 const u=r.battle.sides[0].units.find(u=>u.id==='cao');
 for(let i=0;i<2000&&!u.retreatDispatched;i++){if(s.campaign.phase==='planning')beginExecution(s);for(const pending of activeBattles(s).filter(x=>x.awaiting))chooseEncounter(s,pending.id,false);advanceCampaignStep(s);}
 assert.ok(u.retreatDispatched);assert.equal(r.settled,false);assert.equal(u.status,'withdrawn');assert.ok(u.hp>0&&u.hp<u.initial);
 assert.ok(!s.campaign.personnelEvents.some(e=>e.id===r.id+':cao'));
 const source=[...s.armies.flatMap(a=>a.units),...s.cities.flatMap(c=>c.units),...s.campaign.idle.map(o=>o.unit)].find(v=>v.id==='cao');assert.ok(source);assert.equal(source.troops,u.hp);assert.ok(source.wounded>0);
 validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('malformed and old saves are rejected rather than repaired',()=>{
 const {s}=scene();for(const change of [s=>delete s.battle.sides[0].units[0].retreatAt,s=>s.battle.sides[0].units[0].withdrawing='yes',s=>s.rulesVersion=64]){const bad=structuredClone(s);change(bad);assert.throws(()=>validateSave(bad));}
});

test('melee withdrawal spends an action disengaging, does not cast, and moves without passing through enemies',()=>{
 const {s,b,units}=scene(),u=units[0],e=b.sides[1].units[0];lockDeployment(b);quiet(b);
 Object.assign(u,{x:4,y:3,retreatAt:1500});wound(u,.5);Object.assign(e,{x:5,y:3});
 for(const v of b.sides.flatMap(x=>x.units).filter(v=>v!==u))v.statuses.root={until:999};
 stepBattle(b);assert.equal(u.x,4);assert.equal(u.y,3);assert.ok(u.disengage);assert.equal(u.action,'脱战准备');
 assert.equal(holdsLine(b,u),false);assert.equal(readyTactic(b,u,1),null);
 const copy=validateSave(JSON.parse(JSON.stringify(s)));stepBattle(b);stepBattle(copy.battle);assert.deepEqual(b,copy.battle);
 assert.ok(u.x!==4||u.y!==3);assert.notDeepEqual([u.x,u.y],[e.x,e.y]);assert.equal(u.skillCasts,0);
});

test('focus beyond an engaged front line requires disengagement, never an illegal ranged hit',()=>{
 const {b,units}=scene(),u=units[0],e=b.sides[1].units[0],target=combatUnit(makeOfficer('wen',3000,0,5,3),'enemy',1,80);b.sides[1].units.push(target);target.status='active';lockDeployment(b);quiet(b);
 Object.assign(u,{x:4,y:3});Object.assign(e,{x:5,y:3});Object.assign(target,{x:9,y:3});
 b.sides[0].focus=target.id;b.sides[0].focusUntil=100;
 for(const v of b.sides.flatMap(x=>x.units).filter(v=>v!==u))v.statuses.root={until:999};
 stepBattle(b);assert.equal(u.disengage?.targetId,target.id);assert.equal(u.x,4);assert.equal(u.contribution.damage,0);
 stepBattle(b);assert.ok(u.x!==4||u.y!==3);assert.equal(u.contribution.damage,0);
});

function campaignEncounter(){
 const s=newCampaign(1);fieldFromCity(s,'xuchang',{target:'guandu'});fieldFromCity(s,'guandu',{target:'xuchang'});
 beginExecution(s);for(let i=0;i<30&&!activeBattles(s).length;i++)advanceCampaignDay(s);
 const r=activeBattles(s)[0];chooseEncounter(s,r.id,true);return {s,r,b:r.battle};
}
test('unified retreat destination accepts only a reachable friendly formation site and locks at battle start',()=>{
 const {s,b}=campaignEncounter(),options=retreatDestinations(s,b);assert.ok(options.length);
 assert.ok(options.every(c=>s.cities.some(x=>x.id===c.id&&x.owner===b.sides[0].faction)));
 const before=b.sides[0].retreatDestination;
 for(const id of ['unknown','guandu']){assert.match(configureRetreatDestination(s,b,id),/安全的撤离节点/);assert.equal(b.sides[0].retreatDestination,before);}
 assert.equal(configureRetreatDestination(s,b,options.at(-1).id),null);lockDeployment(b);
 assert.match(configureRetreatDestination(s,b,options[0].id),/战前/);
});
test('departure dispatches once, moves on its first world step, and resumes deterministically before battle ends',()=>{
 const {s,r,b}=campaignEncounter(),u=b.sides[0].units[0];lockDeployment(b);quiet(b);
 Object.assign(u,{x:0,y:0,retreatAt:2000});wound(u,.5);
 advanceCampaignStep(s);assert.equal(u.status,'withdrawn');assert.equal(r.settled,false);
 const o=s.campaign.idle.find(o=>o.unit.id===u.id);assert.ok(o?.retreating);assert.equal(o.unit.troops,u.hp);assert.ok(o.journey.progress>0);
 assert.match(transportProxy(s,o).name,/撤离队/);assert.ok(!s.armies.some(a=>a.units.some(v=>v.id===u.id)));
 const before=JSON.stringify(o);dispatchWithdrawn(s,r);assert.equal(JSON.stringify(o),before);
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));
 for(let i=0;i<6;i++){advanceCampaignStep(s);advanceCampaignStep(restored);}
 assert.equal(serializeCampaign(s),serializeCampaign(restored));
});
test('retreat uses transport interception and cannot shelter in an enemy destination',()=>{
 const {s,r,b}=campaignEncounter(),u=b.sides[0].units[0];lockDeployment(b);quiet(b);u.x=0;u.y=0;u.retreatAt=u.hp;
 advanceCampaignStep(s);const o=s.campaign.idle.find(o=>o.unit.id===u.id);assert.ok(o);
 const next=o.journey.route[0],p=o.journey.progress/roadCost(s,o.location,next);
 const traffic=[{id:'fresh-enemy',faction:b.sides[1].faction,location:o.location,edge:{from:o.location,to:next,p0:p,p1:p,road:'main',until:1}}];
 advancePersonnel(s,o,traffic,1/24);
 assert.ok(!s.campaign.idle.includes(o));assert.ok(s.campaign.personnelEvents.some(e=>e.type==='TRANSPORT_LOST'&&e.officerId===u.id));
});

test('all units leaving removes the empty army and settlement never duplicates a returning officer',()=>{
 const {s,r,b}=campaignEncounter();lockDeployment(b);quiet(b);
 const ids=b.sides[0].units.map(u=>u.id);
 b.sides[0].units.filter(u=>u.status==='active').forEach((u,i)=>Object.assign(u,{x:0,y:i}));
 assert.equal(issueCommand(b,'retreat'),null);advanceCampaignStep(s);
 assert.equal(r.settled,true);assert.ok(s.armies.every(a=>a.units.length));
 const people=[...s.armies.flatMap(a=>a.units),...s.cities.flatMap(c=>c.units),...s.campaign.idle.map(o=>o.unit),...s.campaign.domestic.people.map(p=>p.unit)];
 for(const id of ids)assert.equal(people.filter(u=>u?.id===id).length,1);
 validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('destination loss reroutes at the actual position; no legal city leaves a visible stationary retreat',()=>{
 const {s,b}=campaignEncounter(),u=b.sides[0].units[0];lockDeployment(b);quiet(b);Object.assign(u,{x:0,y:0,retreatAt:u.hp});advanceCampaignStep(s);
 const o=s.campaign.idle.find(o=>o.unit.id===u.id),old=o.destination,traffic=[{faction:o.faction,location:o.location}];
 s.cities.find(c=>c.id===old).owner=b.sides[1].faction;
 s.cities.find(c=>c.id===o.location).owner=o.faction;
 advancePersonnel(s,o,traffic,1/24);
 assert.notEqual(o.destination,old);assert.equal(s.cities.find(c=>c.id===o.destination).owner,o.faction);validatePersonnelJourney(s,o);
 for(const c of s.cities)c.owner=b.sides[1].faction;
 const position=transportProxy(s,o).travel;advancePersonnel(s,o,traffic,1/24);
 assert.deepEqual(transportProxy(s,o).travel,position);assert.equal(o.journey.blocked,'无合法撤离据点');validatePersonnelJourney(s,o);
});

test('returning to a city and marching again cannot reenter the original ongoing battle',()=>{
 const {s,r,b}=campaignEncounter(),u=b.sides[0].units[0];lockDeployment(b);quiet(b);Object.assign(u,{x:0,y:0,retreatAt:u.hp});advanceCampaignStep(s);
 for(const v of b.sides.flatMap(x=>x.units))v.statuses.root={until:999};
 for(let i=0;i<240&&s.campaign.idle.some(o=>o.unit.id===u.id);i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignStep(s);}
 const home=s.cities.find(c=>c.units.some(v=>v.id===u.id));assert.ok(home);assert.equal(r.settled,false);
 const returning=fieldFromCity(s,home.id,{ids:[u.id],target:'guandu'});
 for(let i=0;i<240&&!returning.task.includes('已撤离');i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignStep(s);}
 assert.match(returning.task,/已撤离/);assert.equal(b.sides[0].units.filter(v=>v.id===u.id).length,1);assert.ok(!r.armyIds.includes(returning.id));
 validateCampaign(JSON.parse(serializeCampaign(s)));
});
