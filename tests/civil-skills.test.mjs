import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,appointGovernor,cityIncome,commissionProject,projectCost,relieveCity,reliefAmount,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {makeOfficer,unitAttributes,lockDeployment,stepBattle,issueCommand,COMMAND_RESOURCE,validateSave} from '../engine.mjs';
import {CIVIC_ROUTES,skillRoute,passiveList,passiveDamageMultiplier,domesticEffects} from '../passives.mjs';
import {createScenario} from '../scenarios.mjs';
import {TACTICS_BOOK,hasStatus} from '../tactics.mjs';
import {strategicView} from '../strategic-view.mjs';

function govern(id,level=10){
 const s=newCampaign(),c=s.cities.find(c=>c.id==='xuchang');
 let o=s.campaign.idle.find(o=>o.unit.id===id);
 if(!o){o={unit:{...makeOfficer(id,0),homeCity:c.id},faction:'cao',location:c.id,destination:null,remainingDays:0};s.campaign.idle.push(o);}
 o.location=c.id;o.unit.level=level;o.unit.experience=0;
 assert.equal(appointGovernor(s,c.id,id),null);return {s,c,o};
}
test('civic routes remain five identity skills after changing troops; diplomatic reserves do not claim effects',()=>{
 for(const id of Object.keys(CIVIC_ROUTES)){
  const u={...makeOfficer(id),level:10};assert.equal(new Set(skillRoute(u)).size,5);
  assert.deepEqual(skillRoute({...u,type:'cavalry'}),skillRoute(u));
  for(const p of passiveList(u).filter(p=>p.domain==='diplomacy'))assert.equal(p.state,'外交预留 · 未开放');
 }
 const u={...makeOfficer('person-533'),level:1};assert.deepEqual(domesticEffects(u),{});
 const hi={...u,level:10};assert.equal(domesticEffects(hi).gold,.25);
 assert.deepEqual(unitAttributes(hi),unitAttributes(u),'Mi Zhu has no hidden combat increase from civil or diplomacy skills');
 assert.ok(passiveList(hi,{}).filter(p=>p.domain==='domestic').every(p=>p.state==='内政技能 · 战场不生效'));
});
test('wealth and rice change only the appointed city, apply after politics, and stop when the governor leaves',()=>{
 for(const [id,field,bonus]of [['person-533','gold',.25],['person-443','grain',.25]]){
  const {s,c,o}=govern(id,1),before=cityIncome(s,c);o.unit.level=2;
  const factor=(1+o.unit.politics/500),base=field==='gold'?160+c.commerce*160:600+c.farm*600;
  assert.equal(cityIncome(s,c)[field],Math.floor(base*factor*(1+bonus)));
  for(const key of ['gold','grain','manpower'].filter(k=>k!==field))assert.equal(cityIncome(s,c)[key],before[key]);
  const other=s.cities.find(x=>x.id==='chenliu'),otherIncome=cityIncome(s,other);c.governor=null;assert.deepEqual(cityIncome(s,other),otherIncome);
  c.governor=id;o.destination=other.id;assert.equal(cityIncome(s,c)[field],Math.floor(base));
  o.destination=null;o.faction='yuan';assert.equal(cityIncome(s,c)[field],Math.floor(base));
 }
});
test('administration charges the shown cost once; relief respects caps and once-per-turn restriction',()=>{
 const {s,c}=govern('person-255');assert.equal(projectCost(s,c,'farm'),400);
 s.gold=400;assert.equal(commissionProject(s,c.id,'farm'),null);assert.equal(s.gold,0);assert.ok(commissionProject(s,c.id,'commerce'));
 c.governor=null;assert.equal(s.gold,0,'unappointing does not refund prior construction');
 c.governor='person-255';s.gold=500;c.grain=1000;c.order=85;
 assert.match(relieveCity(s,c.id),/民心已停用/);assert.equal(s.gold,500);assert.equal(c.grain,1000);
});
test('fame adds city manpower rather than free troops',()=>{
 const {s,c,o}=govern('person-449',1),before=cityIncome(s,c),troops=s.armies[0].units.map(u=>u.troops);
 o.unit.level=2;assert.ok(cityIncome(s,c).manpower>before.manpower);assert.equal(cityIncome(s,c).gold,before.gold);assert.deepEqual(s.armies[0].units.map(u=>u.troops),troops);
});
test('governors gain experience at actual turn settlement and loaded campaigns remain deterministic',()=>{
 const {s,c,o}=govern('person-255',1);c.grain=19999;s.grain=s.cities.filter(c=>c.owner==='cao').reduce((sum,c)=>sum+c.grain,0);
 const copy=validateCampaign(JSON.parse(serializeCampaign(s)));
 const run=x=>{beginExecution(x);for(let i=0;i<30&&x.campaign.day<11;i++){advanceCampaignDay(x);for(const r of activeBattles(x).filter(r=>r.awaiting))chooseEncounter(x,r.id,false);}};
 run(s);run(copy);assert.equal(s.campaign.day,11);assert.equal(o.unit.level,2);assert.equal(o.unit.experience,0);assert.ok(c.grain<=20000);
 assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.equal(projectCost(s,c,'farm'),400);
 const stable=serializeCampaign(s);advanceCampaignDay(s);assert.equal(serializeCampaign(s),stable,'planning does not award repeated experience');
});
test('governor interface shows actual discounts, skill categories and diplomacy reserve labels',()=>{
 const {s}=govern('person-255');const ui={city:'xuchang',strategyTab:'city'};
 assert.match(strategicView(s,ui),/400 金/);assert.match(strategicView(s,ui),/能吏/);assert.doesNotMatch(strategicView(s,ui),/民心/);assert.match(strategicView(s,ui),/人才/);
 const other=govern('person-123');assert.match(strategicView(other.s,{city:'xuchang',strategyTab:'officers'}),/论客（外交预留）/);
});
test('weapon general damage requires correct troop, unlocked level, superior force and a physical tactic',()=>{
 for(const [type,id,level]of [['spear','gao',5],['halberd','general-probe',8],['cavalry','general-probe',8],['archer','person-390',5]]){
  const u={...makeOfficer('gao'),id,type,skillRouteType:type,level,force:90},d={type:'spear',force:80};
  assert.equal(passiveDamageMultiplier(null,u,d,'force',false),1.2,type);
  assert.equal(passiveDamageMultiplier(null,{...u,level:level-1},d,'force',false),1);
  assert.equal(passiveDamageMultiplier(null,u,{...d,force:90},'force',false),1);
  assert.equal(passiveDamageMultiplier(null,u,{...d,type:'gate'},'force',false),1);
  assert.equal(passiveDamageMultiplier(null,u,d,'basic',true),1);
  assert.equal(passiveDamageMultiplier(null,u,d,'intellect',false),1);
 }
});
test('reworked unique tactics use real automatic casts and persist their lower-strength buff snapshots',()=>{
 for(const [id,expected]of [['cao','camp'],['dun','weaken'],['person-636','camp'],['person-246','armorBreak'],['person-661','shaken']]){
  const s=createScenario('officer-lab',['person-246','person-661'].includes(id)?1:0,20,[id]),b=s.battle;lockDeployment(b);
  const key='unique-'+id;let found=false;
  while(!b.result&&!found){stepBattle(b);found=b.sides.flatMap(x=>x.units).some(u=>u.statuses[expected]?.sourceId===id);}
  assert.ok(found,TACTICS_BOOK[key].name+' applies its designed status');
  const loaded=validateSave(structuredClone(s));for(let i=0;i<12&&!b.result;i++){stepBattle(b);stepBattle(loaded.battle);}assert.deepEqual(loaded.battle,b);
 }
});
test('global defense and disruption modify discipline; chain strategy obeys intent and cooldown caps',()=>{
 const {battle:b}=createScenario('field',311);lockDeployment(b);b.sides[0].commanders=[{id:'person-290',role:'advisor'},{id:'person-226',role:'leader'}];
 const a=b.sides[0].units[0],d=b.sides[1].units[0],before=unitAttributes(a,b),enemy=unitAttributes(d,b);
 b.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(b,'fortify'),null);
 assert.ok(unitAttributes(a,b).discipline>before.discipline);assert.ok(unitAttributes(a,b).defense>before.defense);
 b.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(b,'disrupt'),null);assert.ok(unitAttributes(d,b).discipline<enemy.discipline);
 a.intent=98;a.skillReady[a.tactics[0]]=b.tick+3;b.commandProgress=COMMAND_RESOURCE.capacity;
 assert.equal(issueCommand(b,'cycle'),null);assert.equal(a.intent,100);assert.equal(a.skillReady[a.tactics[0]],b.tick);assert.equal(b.commandProgress,0);
});
