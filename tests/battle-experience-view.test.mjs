import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,confirmReinforcementCouncil,validateSave,settleBattle} from '../engine.mjs';
import {councilArrivals,reinforcementArrivalMarkup,appointmentResultMarkup,battleStrength,participationMarkup} from '../battle-experience-view.mjs';
import {battleCouncilMarkup} from '../battle-council.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';

test('arrival presentation uses the real newly arrived army and survives save/restore without future units',()=>{
 const entry=(id,troops=3000,level=10)=>({id,type:'spear',troops,level,retreatAt:null});
 const d=defaultCustomBattle();d.ownTeam=[entry('yu',1000,1)];d.enemyTeam=[entry('shao',5000)];
 d.reinforcements=[{side:0,name:'实际后援',arrivalCondition:{type:'unit-defeated',unitId:'yu'},team:[entry('cao'),entry('chu')]},
  {side:0,name:'尚未到达',arrivalCondition:{type:'unit-defeated',unitId:'shao'},team:[entry('dun')]}];
 const s=generateBattle(d),b=s.battle;
 assert.deepEqual(councilArrivals(b),[]);lockDeployment(b);
 for(let i=0;i<1000&&!b.reinforcementCouncil&&!b.result;i++)stepBattle(b);
 assert.equal(b.reinforcementCouncil,'pending');
 const before=JSON.stringify(s),restored=validateSave(JSON.parse(before));
 assert.deepEqual(councilArrivals(b).map(u=>u.id),['cao','chu']);
 const html=reinforcementArrivalMarkup(b,s.armies);
 assert.match(html,/2 队 · 6,000 人/);assert.doesNotMatch(html,/夏侯惇|尚未到达/);
 assert.equal(reinforcementArrivalMarkup(restored.battle,restored.armies),html);assert.equal(JSON.stringify(s),before);
 confirmReinforcementCouncil(b);assert.deepEqual(councilArrivals(b),[]);
});

test('first-team action is available only for prebattle reserves',()=>{
 const d=defaultCustomBattle();d.ownTeam=Object.keys(OFFICER_BY_ID).filter(id=>id!=='shao').slice(0,10).map(id=>({id,type:'spear',troops:3000,level:10}));
 const s=generateBattle(d),b=s.battle;
 assert.match(battleCouncilMarkup(b),/换上首发/);
 lockDeployment(b);b.reinforcementCouncil='open';
 assert.doesNotMatch(battleCouncilMarkup(b),/换上首发/);
});

test('required appointment summary shows recorded outcomes and both sides actual survivors',()=>{
 const report={id:'battle-a',winner:0,reason:'击溃',city:'官渡',tick:100,stats:[{remaining:12345,wounded:678,killed:90},{remaining:0,wounded:456,killed:789}]};
 const pending=[{battleId:report.id},{battleId:report.id}],s={report},before=JSON.stringify(s);
 const markup=appointmentResultMarkup(s,pending);
 assert.match(markup,/此战告捷/);assert.match(markup,/12,345/);assert.match(markup,/456/);assert.equal(markup.match(/本场战果/g).length,1);
 assert.equal(JSON.stringify(s),before);
 assert.equal(appointmentResultMarkup({campaign:{battles:[{id:report.id,report}]}},pending),markup);
 const independent=appointmentResultMarkup(s,pending,'合肥守城');
 assert.match(independent,/合肥守城/);assert.doesNotMatch(independent,/官渡/);assert.match(independent,/100 战斗回合/);
 assert.equal(appointmentResultMarkup({campaign:{battles:[{id:report.id,report}]}},pending,'合肥守城'),markup);
});

test('battle strength separates pending reinforcements and saved results distinguish troops that never entered',()=>{
 const d=defaultCustomBattle();d.limit=24;
 d.reinforcements=[{side:0,name:'远路援军',arrivalCondition:{type:'unit-defeated',unitId:d.ownTeam[0].id},team:[{id:'person-246',type:'archer',troops:3000,level:10,retreatAt:null}]}];
 const s=generateBattle(d),b=s.battle,before=JSON.stringify(b),strength=battleStrength(b,0);
 assert.equal(strength.pending,3000);assert.equal(strength.hp,strength.active+strength.reserve+strength.pending+strength.withdrawn);assert.equal(JSON.stringify(b),before);
 lockDeployment(b);for(let i=0;i<1000&&!b.result;i++)stepBattle(b);
 assert.ok(b.result);settleBattle(s);
 const unit=s.report.participation[0].find(u=>u.id==='person-246');assert.deepEqual(unit,{id:'person-246',name:OFFICER_BY_ID['person-246'].name,entered:false,arrived:false});
 assert.match(participationMarkup(s.report),/未抵达/);assert.deepEqual(validateSave(structuredClone(s)).report,s.report);
 const broken=structuredClone(s);broken.report.participation[0].find(u=>u.id===unit.id).entered=true;assert.throws(()=>validateSave(broken));
});
