import test from 'node:test';
import assert from 'node:assert/strict';
import {TREASURE_DESIGNS,TREASURE_RULES} from '../data/design/treasures.mjs';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter} from '../strategic-campaign.mjs';
import {treasureRecord,treasureOfficerRows,treasureResident,grantTreasure,equipTreasure,storeTreasure,recordTreasureWork,finishTreasureTurn,settleBattleTreasures,treasureCaptureCandidates,validateTreasures} from '../treasures.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {advancePersonnel,isTransport,personnelSpeed,TRANSPORT_SPEED} from '../personnel-movement.mjs';
import {hasStrategicTrait} from '../strategic-traits.mjs';
import {defaultCustomBattle,validateCustomBattle} from '../custom-battle.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {makeOfficer,lockDeployment,stepBattle,validateSave,fillSlots} from '../engine.mjs';
import {bondLevels,sideBonds} from '../bonds.mjs';
import {bondSummary} from '../bond-display.mjs';
import {treasureBondBonus,recordTreasureDamage} from '../treasure-battle.mjs';
import {setStatus,hasStatus,refreshShield} from '../tactics.mjs';
import {refreshTreasureStatuses} from '../treasure-statuses.mjs';
import {treasuresMarkup} from '../treasure-view.mjs';
import {NATIONAL_SCENARIO_DESIGNS} from '../data/design/national-scenarios.mjs';
import {fateRoll,resolveOfficerLoss,releaseCaptive} from '../officer-fates.mjs';
import {roadDistance} from '../strategic-movement.mjs';
import {campaignInfoDetail,campaignInfoMarkup} from '../campaign-info.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
const fail=(ok,message)=>assert.ok(ok,message);
function storage(s,id,cityId){const t=treasureRecord(s,id);for(const o of treasureOfficerRows(s))if(o.unit.treasureId===id)delete o.unit.treasureId;Object.assign(t,{state:'city',cityId,holderId:null,delivery:null});return t;}
function battle(id='skyHalberd',holder=null){const d=defaultCustomBattle();if(holder)d.ownTeam[0].id=holder;d.ownTeam[0].treasureId=id;const s=generateBattle(d);lockDeployment(s.battle);return s;}
test('catalogue is bounded and seven new worlds have one physical record per treasure',()=>{
 assert.equal(Object.keys(TREASURE_DESIGNS).length,24);assert.equal(Object.values(TREASURE_DESIGNS).filter(d=>d.kind==='bond').length,8);
 for(const spec of NATIONAL_SCENARIO_DESIGNS){const s=newCampaign(23,spec.id,'cao');assert.equal(s.campaign.treasures.items.length,24);assert.equal(new Set(s.campaign.treasures.items.map(t=>t.id)).size,24);restore(s);}
});
test('fixed ordinary traits preserve assignments and have separate eligibility',()=>{
 for(const id of ['person-277','person-51','person-402','person-152']){assert.ok(hasStrategicTrait({id},'treasureDiscovery'));assert.ok(!hasStrategicTrait({id},'treasureCapture'));}
 for(const id of ['person-204','person-525','person-117','person-242'])assert.ok(hasStrategicTrait({id},'treasureCapture'));
});
test('grant, single equipment slot and collection recall obey resident vs deployed officers',()=>{
 const s=newCampaign(7),c=s.cities.find(c=>c.id==='xuchang'),u=c.units.find(u=>u.id!==c.governor);storage(s,'brightArmor',c.id);storage(s,'artOfWar',c.id);
 assert.equal(grantTreasure(s,'brightArmor',u.id,{equip:true}),null);assert.equal(grantTreasure(s,'artOfWar',u.id),null);assert.equal(u.treasureId,'brightArmor');assert.equal(equipTreasure(s,u.id,'artOfWar'),null);assert.equal(treasureRecord(s,'brightArmor').holderId,u.id);restore(s);
 fieldFromCity(s,c.id,{ids:[u.id]});assert.match(storeTreasure(s,'brightArmor'),/锁定/);assert.match(grantTreasure(s,'artOfWar','cao'),/锁定/);assert.ok(equipTreasure(s,u.id,null));assert.match(treasuresMarkup(s),/随军.*锁定/);restore(s);
});
test('officer and troop dossiers expose the common treasure manager without revealing hidden items',()=>{
 const s=newCampaign(7),id=s.cities.find(c=>c.id==='xuchang').units[0].id;
 for(const type of ['unit','officer']){const detail=campaignInfoDetail(s,type,id);assert.ok(detail.sections.some(x=>x.id==='treasure'&&x.html.includes('treasure-open')));assert.match(campaignInfoMarkup(s,{type,id,objectOnly:true}).body,/treasure-open/);}
 assert.doesNotMatch(treasuresMarkup(s),/青龙偃月刀/);
});
test('cross-city treasure uses a visible real courier, deterministic transit and arrival storage fallback',()=>{
 const s=newCampaign(7),courier=s.campaign.idle.find(o=>o.faction==='cao'&&o.location==='xuchang'&&o.unit.id!=='cao'),to=treasureOfficerRows(s).find(o=>o.faction==='cao'&&o.location==='chenliu'&&treasureResident(s,o.unit.id));
 storage(s,'brightArmor','xuchang');assert.equal(grantTreasure(s,'brightArmor',to.unit.id,{courierId:courier.unit.id,equip:true}),null);assert.equal(treasureRecord(s,'brightArmor').state,'transit');assert.ok(isTransport(courier));assert.equal(personnelSpeed(courier),TRANSPORT_SPEED);assert.match(storeTreasure(s,'brightArmor'),/运输/);restore(s);
 const next=restore(s),other=next.campaign.idle.find(o=>o.unit.id===courier.unit.id);let days=0;while(courier.destination&&days++<100){advancePersonnel(s,courier);advancePersonnel(next,other);}assert.ok(days<100);assert.deepEqual(treasureRecord(s,'brightArmor'),treasureRecord(next,'brightArmor'));assert.equal(treasureRecord(s,'brightArmor').holderId,to.unit.id);assert.equal(to.unit.treasureId,'brightArmor');restore(s);
 const s2=newCampaign(7),q=s2.campaign.idle.find(o=>o.unit.id===courier.unit.id),target=treasureOfficerRows(s2).find(o=>o.unit.id===to.unit.id);storage(s2,'medicineBook','xuchang');assert.equal(grantTreasure(s2,'medicineBook',target.unit.id,{courierId:q.unit.id}),null);fieldFromCity(s2,'chenliu',{ids:[target.unit.id]});for(let i=0;q.destination&&i<100;i++)advancePersonnel(s2,q);assert.equal(treasureRecord(s2,'medicineBook').state,'city');assert.equal(treasureRecord(s2,'medicineBook').cityId,'chenliu');restore(s2);
});
test('treasure bond never grants an unlearned level or bypasses the individual and holder caps',()=>{
 const u=makeOfficer('cao',3000,0,10,2),levels={bondScholar:1,bondGuard:2};u.treasureId='artOfWar';assert.deepEqual(treasureBondBonus(u,levels),{id:'bondScholar',points:1});assert.equal(treasureBondBonus(u,{bondGuard:2}),null);assert.equal(treasureBondBonus(u,{bondScholar:3}),null);assert.equal(treasureBondBonus(u,{bondScholar:2,bondGuard:2,bondPower:2}),null);
 const units=Array.from({length:5},(_,i)=>({...makeOfficer('cao',3000,0,10,2),id:'fixture'+i,status:'active',hp:3000,bondGrowth:{...u.bondGrowth,levels:{bondScholar:3}}})),b={sides:[{units}]};
 assert.equal(sideBonds(b,0).bondScholar.tier,2);assert.equal(bondSummary(units)[0].tier,2);units.splice(2);assert.equal(sideBonds(b,0).bondScholar.tier,1);units.push({...units[0],id:'third'});assert.equal(sideBonds(b,0).bondScholar.tier,2);
});
test('first real entry grants each status once; preview, reserves and save reload cannot refresh it',()=>{
 for(const [id,d] of Object.entries(TREASURE_DESIGNS).filter(([,d])=>d.kind==='entry')){
  const draft=defaultCustomBattle();draft.ownTeam[0].treasureId=id;const s=generateBattle(draft),u=s.battle.sides[0].units.find(u=>u.id===draft.ownTeam[0].id);assert.equal(u.treasureEntry,undefined);lockDeployment(s.battle);assert.equal(u.treasureEntry.id,id);assert.ok(hasStatus(s.battle,u,d.status));validateSave(structuredClone(s));
  const entry=structuredClone(u.treasureEntry),copy=validateSave(structuredClone(s));for(let i=0;i<d.steps+2;i++){stepBattle(s.battle,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});}assert.deepEqual(s.battle,copy.battle);assert.equal(u.treasureEntry.tick,entry.tick);assert.ok(!hasStatus(s.battle,u,d.status)||u.statuses[d.status]?.sourceTreasure!==id);
 }
});
test('stronger ordinary status expires independently and withdrawal preserves other sources',()=>{
 const s=battle(),b=s.battle,u=b.sides[0].units[0];setStatus(b,u,'valor',2,{potency:2,sourceId:u.id,sourceSkillName:'奋战测试'});assert.equal(u.statuses.valor.potency,2);b.tick=3;refreshTreasureStatuses(b,u);assert.equal(u.statuses.valor.sourceTreasure,'skyHalberd');assert.equal(u.statuses.valor.until,7);
 setStatus(b,u,'valor',10,{potency:2,sourceId:u.id,sourceSkillName:'常规奋战'});u.withdrawing=true;refreshTreasureStatuses(b,u);assert.equal(u.statuses.valor.sourceSkillName,'常规奋战');assert.equal(u.statuses.valor.sources,undefined);assert.equal(u.treasureEntry.removed,true);
});
test('regrowth uses only real wounds and a saved total budget; treasure shield is independent',()=>{
 const s=battle('medicineBook'),b=s.battle,u=b.sides[0].units[0];for(let i=0;i<3;i++)stepBattle(b,{aiSides:[]});assert.equal(u.treasureEntry.healed,0);
 u.hp-=300;u.battleDamage+=300;for(let i=0;i<8;i++){stepBattle(b,{aiSides:[]});validateSave(structuredClone(s));}assert.ok(u.treasureEntry.healed<=u.treasureEntry.total);assert.ok(u.treasureEntry.healed>0);
 const armor=battle('brightArmor'),a=armor.battle.sides[0].units[0];assert.equal(a.statuses.shield.layers[0].amount,Math.min(400,Math.floor(a.initial*.04)));setStatus(armor.battle,a,'shield',20,{amount:10,source:'normal',label:'普通护盾'});a.withdrawing=true;refreshTreasureStatuses(armor.battle,a);refreshShield(armor.battle,a);assert.equal(a.statuses.shield.layers.length,1);assert.equal(a.statuses.shield.layers[0].source,'normal');
});
test('custom uniqueness spans both sides and reinforcements; malformed entry sources are rejected',()=>{
 const d=defaultCustomBattle();d.ownTeam[0].treasureId='skyHalberd';d.enemyTeam[0].treasureId='skyHalberd';assert.throws(()=>validateCustomBattle(d),/宝物/);
 const s=battle(),u=s.battle.sides[0].units[0];u.statuses.valor.until++;assert.throws(()=>validateSave(s),/宝物/);
 const c=newCampaign(7);c.campaign.treasures.items.push({...c.campaign.treasures.items[0]});assert.throws(()=>restore(c),/宝物/);
});
test('domestic discovery commits the one turn roll and shared 30 day interval without rerolls',()=>{
 const s=newCampaign(7),u=s.cities.find(c=>c.id==='xuchang').units[0],t=storage(s,'artOfWar','xuchang');t.state='hidden';s.campaign.day=10;
 recordTreasureWork(s,{id:'work:one',key:'fair',officerId:u.id,faction:'cao',cityId:'xuchang',factor:1,productive:true,finished:true});finishTreasureTurn(s);const e=s.campaign.treasures.events.find(e=>e.kind==='discovery');assert.equal(e.probability,.02);const before=JSON.stringify(s.campaign.treasures);finishTreasureTurn(s);assert.equal(JSON.stringify(s.campaign.treasures),before);
 s.campaign.treasures.lastDiscovery.cao=10;s.campaign.day=20;recordTreasureWork(s,{id:'work:two',key:'fair',officerId:u.id,faction:'cao',cityId:'xuchang',factor:1,productive:true,finished:true});finishTreasureTurn(s);assert.equal(s.campaign.treasures.events.filter(e=>e.kind==='discovery').length,1);
});
test('plunder requires real damage to the selected original holder and never creates an item',()=>{
 const world=newCampaign(7),d=defaultCustomBattle();d.ownTeam[0].id='person-204';d.enemyTeam[0].treasureId='skyHalberd';const s=generateBattle(d);lockDeployment(s.battle);const b=s.battle,actor=b.sides[0].units[0],target=b.sides[1].units[0];
 // The battle units still follow the real entry processor; strategic rows represent its actors.
 world.campaign.idle.push({unit:makeOfficer(actor.id,3000),faction:'cao',location:'xuchang',destination:null,remainingDays:0});const enemy=treasureOfficerRows(world).find(o=>o.unit.id===target.id);assert.ok(enemy);const t=treasureRecord(world,'skyHalberd');Object.assign(t,{state:'person',holderId:target.id,cityId:null,delivery:null});target.hp=0;target.status='defeated';b.result={winner:0,reason:'测试真实战后入口'};
 recordTreasureDamage(b,actor,{...target,type:'gate'},1000);assert.equal(actor.treasureDamage,undefined);recordTreasureDamage(b,actor,target,target.initial*.1);const candidates=treasureCaptureCandidates(world,b),r={id:'loot-fixture',cityId:'guandu',battle:b};settleBattleTreasures(world,r,candidates);assert.equal(world.campaign.treasures.events.find(e=>e.kind==='capture').probability,.10);const count=world.campaign.treasures.events.length;settleBattleTreasures(world,r,candidates);assert.equal(world.campaign.treasures.events.length,count);assert.equal(world.campaign.treasures.items.length,24);
});
test('captivity seals original collections, release returns them, and death hides the same IDs',()=>{
 for(const fate of ['CAPTIVE','DEAD']){
  const s=newCampaign(7),c=s.cities.find(c=>c.id==='xuchang'),u=c.units.find(u=>u.id!==c.governor);for(const id of ['brightArmor','artOfWar']){storage(s,id,c.id);grantTreasure(s,id,u.id,{equip:id==='brightArmor'});}
  const eventId=Array.from({length:1000},(_,i)=>'treasure-fate:'+i).find(id=>fate==='DEAD'?fateRoll(s,id)<.02:fateRoll(s,id)>=.02&&fateRoll(s,id)<.35);
  assert.equal(resolveOfficerLoss(s,{unit:u,faction:'cao',location:c.id,enemy:'yuan',eventId}),fate);
  for(const id of ['brightArmor','artOfWar'])assert.equal(treasureRecord(s,id).state,fate==='DEAD'?'hidden':'captive');assert.equal(u.treasureId,null);restore(s);
  if(fate==='CAPTIVE'){assert.equal(releaseCaptive(s,u.id,{automatic:true}),null);for(const id of ['brightArmor','artOfWar']){assert.equal(treasureRecord(s,id).state,'person');assert.equal(treasureRecord(s,id).holderId,u.id);}restore(s);}
 }
});
test('interception loses the original treasure at the route instead of creating a battle drop',()=>{
 const s=newCampaign(7),courier=s.campaign.idle.find(o=>o.location==='xuchang'&&o.unit.id!=='cao'),target=treasureOfficerRows(s).find(o=>o.faction==='cao'&&o.location==='chenliu'&&treasureResident(s,o.unit.id));storage(s,'brightArmor','xuchang');grantTreasure(s,'brightArmor',target.unit.id,{courierId:courier.unit.id});
 const to=courier.journey.route[0],a=fieldFromCity(s,'guandu');a.location='xuchang';a.travel={from:'xuchang',to,road:'main',progress:roadDistance(s,'xuchang',to)*.01};a.route=[to];a.target=to;
 const battles=s.campaign.battles.length;advancePersonnel(s,courier);assert.equal(treasureRecord(s,'brightArmor').state,'hidden');assert.equal(treasureRecord(s,'brightArmor').cityId,'xuchang');assert.equal(s.campaign.battles.length,battles);assert.equal(s.campaign.treasures.items.length,24);restore(s);
});
test('Eye applies only to the actual completed eligible primary actor and records its source',()=>{
 const s=newCampaign(7),actor='person-277';s.campaign.day=10;const t=storage(s,'artOfWar','xuchang');t.state='hidden';
 recordTreasureWork(s,{id:'work:fail',key:'fair',officerId:actor,faction:'cao',cityId:'xuchang',factor:0,productive:false,finished:true});assert.equal(s.campaign.treasures.sources.length,0);
 // Add the actual actor as a city resident, rather than substituting an Eye assistant.
 s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==actor);s.campaign.idle.push({unit:makeOfficer(actor,0),faction:'cao',location:'xuchang',destination:null,remainingDays:0});
 recordTreasureWork(s,{id:'work:eye',key:'fair',officerId:actor,faction:'cao',cityId:'xuchang',factor:1,productive:true,finished:true});finishTreasureTurn(s);const e=s.campaign.treasures.events.find(e=>e.kind==='discovery');assert.equal(e.probability,.04);assert.equal(e.workSource.officerId,actor);assert.equal(e.workSource.key,'fair');validateTreasures(s,fail);
});
test('real normal-mode encounter settles physical treasures once and resumes from the same snapshot',()=>{
 const s=newCampaign(11);for(const c of s.cities)for(const u of c.units)u.retreatAt=null;const own=fieldFromCity(s,'xuchang',{target:'guandu'});fieldFromCity(s,'guandu',{target:'xuchang'});storage(s,'brightArmor','xuchang');const item=treasureRecord(s,'brightArmor');Object.assign(item,{state:'person',holderId:own.units[0].id,cityId:null});own.units[0].treasureId='brightArmor';beginExecution(s);
 let r;for(let i=0;i<25&&!r;i++){advanceCampaignDay(s);r=activeBattles(s)[0];}assert.ok(r);chooseEncounter(s,r.id,false);const copy=restore(s);
 for(let i=0;i<120&&!r.settled;i++){for(const state of [s,copy]){if(state.campaign.phase==='planning')beginExecution(state);for(const fight of activeBattles(state).filter(r=>r.awaiting))chooseEncounter(state,fight.id,false);advanceCampaignDay(state);}}
 assert.ok(r.settled);assert.ok(Array.isArray(r.report.treasures));assert.ok(r.report.treasures.length<=1);assert.equal(serializeCampaign(s),serializeCampaign(copy));restore(s);
});
