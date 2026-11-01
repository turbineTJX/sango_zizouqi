import {equippedTreasureIds,treasureSlot,setTreasureEquipment,removeTreasureEquipment} from '../treasure-equipment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {TREASURE_DESIGNS,TREASURE_RULES} from '../data/design/treasures.mjs';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,transferOfficer,appointGovernor} from '../strategic-campaign.mjs';
import {treasureRecord,treasureOfficerRows,treasureResident,manageTreasuresAI,grantTreasure,equipTreasure,storeTreasure,recordTreasureWork,finishTreasureTurn,settleBattleTreasures,treasureCaptureCandidates,validateTreasures,conquerTreasures} from '../treasures.mjs';
import {fieldFromCity,approachFieldContact} from './helpers/field-campaign.mjs';
import {advancePersonnel,isTransport,personnelSpeed,TRANSPORT_SPEED} from '../personnel-movement.mjs';
import {hasStrategicTrait} from '../strategic-traits.mjs';
import {defaultCustomBattle,validateCustomBattle} from '../custom-battle.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {makeOfficer,lockDeployment,stepBattle,validateSave,fillSlots} from '../engine.mjs';
import {bondLevels,sideBonds} from '../bonds.mjs';
import {bondSummary} from '../bond-display.mjs';
import {treasureBondBonus,treasureBondBonuses,recordTreasureDamage} from '../treasure-battle.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {setStatus,hasStatus,refreshShield} from '../tactics.mjs';
import {refreshTreasureStatuses} from '../treasure-statuses.mjs';
import {treasuresMarkup} from '../treasure-view.mjs';
import {NATIONAL_SCENARIO_DESIGNS} from '../data/design/national-scenarios.mjs';
import {fateRoll,officerLossResult,resolveOfficerLoss,releaseCaptive} from '../officer-fates.mjs';
import {roadDistance} from '../strategic-movement.mjs';
import {campaignInfoDetail,campaignInfoMarkup} from '../campaign-info.mjs';
const firstEntry=u=>Object.values(u.treasureEntries||{})[0];
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
const fail=(ok,message)=>assert.ok(ok,message);
function storage(s,id,cityId){const t=treasureRecord(s,id);for(const o of treasureOfficerRows(s))if(equippedTreasureIds(o.unit).includes(id))removeTreasureEquipment(o.unit,id);Object.assign(t,{state:'treasury',cityId:null,factionId:s.cities.find(c=>c.id===cityId).owner,holderId:null});return t;}
function battle(id='skyHalberd',holder=null){const d=defaultCustomBattle();if(holder)d.ownTeam[0].id=holder;d.ownTeam[0].treasureId=id;const s=generateBattle(d);lockDeployment(s.battle);return s;}
test('catalogue is bounded and seven new worlds have one physical record per treasure',()=>{
 assert.equal(Object.keys(TREASURE_DESIGNS).length,70);assert.equal(Object.values(TREASURE_DESIGNS).filter(d=>d.kind==='bond').length,19);
 assert.equal(new Set(Object.values(TREASURE_DESIGNS).map(d=>d.name)).size,70);
 for(const [slot,n] of Object.entries({weapon:30,mount:10,other:30}))assert.equal(Object.keys(TREASURE_DESIGNS).filter(id=>treasureSlot(id)===slot).length,n);
 for(const spec of NATIONAL_SCENARIO_DESIGNS){const s=newCampaign(23,spec.id,'cao');assert.equal(s.campaign.treasures.items.length,70);assert.equal(new Set(s.campaign.treasures.items.map(t=>t.id)).size,70);restore(s);}
});
test('every catalogue item uses the shared grant path and replaces only its own category',()=>{
 const s=newCampaign(7),u=s.cities.find(c=>c.id==='chenliu').units[0];
 for(const id of Object.keys(TREASURE_DESIGNS)){
  storage(s,id,'xuchang');const before=equippedTreasureIds(u),slot=treasureSlot(id),old=before.find(t=>treasureSlot(t)===slot);
  assert.equal(grantTreasure(s,id,u.id,{replace:true}),null);assert.ok(equippedTreasureIds(u).includes(id));
  assert.deepEqual(equippedTreasureIds(u).filter(t=>treasureSlot(t)!==slot),before.filter(t=>treasureSlot(t)!==slot));
  if(old)assert.equal(treasureRecord(s,old).state,'treasury');restore(s);
 }
});
test('all 19 bond items require their actual learned bond and share the six-point cap',()=>{
 for(const [id,d] of Object.entries(TREASURE_DESIGNS).filter(([,d])=>d.kind==='bond')){
  const u={treasureIds:[id]};assert.deepEqual(treasureBondBonuses(u,{}),[]);
  assert.deepEqual(treasureBondBonuses(u,{[d.bondId]:1}),[{id:d.bondId,points:1}]);
  assert.deepEqual(treasureBondBonuses(u,{[d.bondId]:3}),[]);
  assert.deepEqual(treasureBondBonuses(u,{[d.bondId]:2,fixtureOther:4}),[]);
 }
});
test('new defensive treasures affect real attributes, keep the move penalty and expire independently',()=>{
 const d=defaultCustomBattle();d.ownTeam[0].treasureIds=['whiteFeatherFan','liangzhou','dragonScaleArmor'];const s=generateBattle(d),b=s.battle,u=b.sides[0].units[0];lockDeployment(b);
 const base=unitAttributes({...u,statuses:Object.fromEntries(Object.entries(u.statuses).filter(([k])=>!['camp','bulwark'].includes(k)))},b),near=(a,c)=>assert.ok(Math.abs(a-c)<1e-8,`${a} != ${c}`);
 near(unitAttributes(u,b).defense,base.defense*1.25*1.3);near(unitAttributes(u,b).discipline,base.discipline*1.2);near(unitAttributes(u,b).move,base.move*.5);
 setStatus(b,u,'camp',2,{potency:2,sourceId:u.id,sourceSkillName:'短时营垒'});near(unitAttributes(u,b).defense,base.defense*1.5*1.3);
 b.tick=3;refreshTreasureStatuses(b,u);assert.equal(u.statuses.camp.sourceTreasure,'liangzhou');assert.equal(u.statuses.camp.until,7);near(unitAttributes(u,b).defense,base.defense*1.25*1.3);
 b.tick=7;refreshTreasureStatuses(b,u);assert.ok(!hasStatus(b,u,'camp'));assert.ok(hasStatus(b,u,'bulwark'));near(unitAttributes(u,b).defense,base.defense*1.3);
 b.tick=9;refreshTreasureStatuses(b,u);assert.ok(!hasStatus(b,u,'bulwark'));near(unitAttributes(u,b).move,base.move);
});
test('fixed ordinary traits preserve assignments and have separate eligibility',()=>{
 for(const id of ['person-277','person-51','person-402','person-152']){assert.ok(hasStrategicTrait({id},'treasureDiscovery'));assert.ok(!hasStrategicTrait({id},'treasureCapture'));}
 for(const id of ['person-204','person-525','person-117','person-242'])assert.ok(hasStrategicTrait({id},'treasureCapture'));
});
test('grant always equips one item, replacement requires confirmation and returns the old item to the treasury',()=>{
 const s=newCampaign(7),c=s.cities.find(c=>c.id==='xuchang'),u=c.units.find(u=>u.id!==c.governor);storage(s,'brightArmor',c.id);storage(s,'artOfWar',c.id);
 assert.equal(grantTreasure(s,'brightArmor',u.id),null);assert.equal(equippedTreasureIds(u)[0],'brightArmor');const before=serializeCampaign(s);
 assert.match(grantTreasure(s,'artOfWar',u.id),/确认替换/);assert.equal(serializeCampaign(s),before);
 assert.equal(grantTreasure(s,'artOfWar',u.id,{replace:true}),null);assert.equal(equippedTreasureIds(u).at(-1),'artOfWar');assert.equal(treasureRecord(s,'brightArmor').state,'treasury');assert.equal(treasureRecord(s,'brightArmor').factionId,'cao');restore(s);
 fieldFromCity(s,c.id,{ids:[u.id]});assert.match(storeTreasure(s,'artOfWar'),/锁定/);assert.match(grantTreasure(s,'artOfWar','cao'),/锁定/);assert.ok(equipTreasure(s,u.id,null));assert.match(treasuresMarkup(s),/随军.*锁定/);restore(s);
});
test('officer and troop dossiers expose the common treasure manager without revealing hidden items',()=>{
 const s=newCampaign(7),id=s.cities.find(c=>c.id==='xuchang').units[0].id;
 for(const type of ['unit','officer']){const detail=campaignInfoDetail(s,type,id);assert.ok(detail.sections.some(x=>x.id==='treasure'&&x.html.includes('treasure-open')));assert.match(campaignInfoMarkup(s,{type,id,objectOnly:true}).body,/treasure-open/);}
 assert.doesNotMatch(treasuresMarkup(s),/青龙偃月刀/);
});
test('cross-city grants take effect immediately without moving people or resources',()=>{
 const s=newCampaign(7),to=treasureOfficerRows(s).find(o=>o.faction==='cao'&&o.location==='chenliu'&&treasureResident(s,o.unit.id));storage(s,'brightArmor','xuchang');
 const before=serializeCampaign(s),people=JSON.stringify(s.campaign.idle),resources=s.cities.map(c=>[c.gold,c.grain,c.manpower]);
 assert.equal(grantTreasure(s,'brightArmor',to.unit.id,{equip:true,checkOnly:true}),null);assert.equal(serializeCampaign(s),before);
 assert.equal(grantTreasure(s,'brightArmor',to.unit.id,{equip:true}),null);assert.equal(treasureRecord(s,'brightArmor').holderId,to.unit.id);assert.equal(equippedTreasureIds(to.unit).at(-1),'brightArmor');assert.equal(JSON.stringify(s.campaign.idle),people);assert.deepEqual(s.cities.map(c=>[c.gold,c.grain,c.manpower]),resources);assert.doesNotMatch(treasuresMarkup(s,{id:'brightArmor',recipientId:to.unit.id}),/跨城运送武将|data-treasure-courier/);restore(s);
 storage(s,'medicineBook','xuchang');fieldFromCity(s,'chenliu',{ids:[to.unit.id]});const locked=serializeCampaign(s);assert.match(grantTreasure(s,'medicineBook',to.unit.id),/未出征/);assert.match(grantTreasure(s,'brightArmor','cao'),/锁定/);assert.equal(serializeCampaign(s),locked);
});

test('civil travel allows allocation while deployed troops and foreign recipients remain locked',()=>{
 const s=newCampaign(7),o=s.campaign.idle.find(o=>o.faction==='cao'&&o.location==='xuchang'&&o.unit.id!=='cao');storage(s,'brightArmor','xuchang');assert.equal(transferOfficer(s,o.unit.id,'chenliu'),null);
 assert.equal(grantTreasure(s,'brightArmor',o.unit.id,{equip:true}),null);assert.equal(grantTreasure(s,'brightArmor','cao',{replace:true}),null);assert.equal(treasureRecord(s,'brightArmor').holderId,'cao');assert.ok(grantTreasure(s,'brightArmor','shao'));restore(s);
});

test('AI allocates a city treasure to an eligible officer in another city without a courier',()=>{
 const s=newCampaign(7),from=s.cities.find(c=>c.id==='guandu'),to=s.cities.find(c=>c.id==='baima');to.units.push(...from.units);from.units=[];from.governor=null;for(const o of s.campaign.idle.filter(o=>o.faction==='yuan'&&o.location===from.id))o.location=to.id;
 storage(s,'brightArmor',from.id);const people=s.campaign.idle.length;manageTreasuresAI(s);const t=treasureRecord(s,'brightArmor'),holder=treasureOfficerRows(s).find(o=>o.unit.id===t.holderId);assert.equal(t.state,'person');assert.equal(holder.location,to.id);assert.equal(equippedTreasureIds(holder.unit).includes(t.id),true);assert.equal(s.campaign.idle.length,people);restore(s);
});

test('treasure bond never grants an unlearned level or bypasses the individual and holder caps',()=>{
 const u=makeOfficer('cao',3000,0,10,2),levels={bondScholar:1,bondGuard:2};u.treasureId='artOfWar';assert.deepEqual(treasureBondBonus(u,levels),{id:'bondScholar',points:1});assert.equal(treasureBondBonus(u,{bondGuard:2}),null);assert.equal(treasureBondBonus(u,{bondScholar:3}),null);assert.equal(treasureBondBonus(u,{bondScholar:2,bondGuard:2,bondPower:2}),null);
 const units=Array.from({length:5},(_,i)=>({...makeOfficer('cao',3000,0,10,2),id:'fixture'+i,status:'active',hp:3000,bondGrowth:{...u.bondGrowth,levels:{bondScholar:3}}})),b={sides:[{units}]};
 assert.equal(sideBonds(b,0).bondScholar.tier,2);assert.equal(bondSummary(units)[0].tier,2);units.splice(2);assert.equal(sideBonds(b,0).bondScholar.tier,1);units.push({...units[0],id:'third'});assert.equal(sideBonds(b,0).bondScholar.tier,2);
});
test('first real entry grants each status once; preview, reserves and save reload cannot refresh it',()=>{
 for(const [id,d] of Object.entries(TREASURE_DESIGNS).filter(([,d])=>d.kind==='entry')){
  const draft=defaultCustomBattle();draft.ownTeam[0].treasureId=id;const s=generateBattle(draft),u=s.battle.sides[0].units.find(u=>u.id===draft.ownTeam[0].id);assert.equal(firstEntry(u),undefined);lockDeployment(s.battle);assert.equal(firstEntry(u).id,id);assert.ok(hasStatus(s.battle,u,d.status));validateSave(structuredClone(s));
  const entry=structuredClone(firstEntry(u)),copy=validateSave(structuredClone(s));for(let i=0;i<d.steps+2;i++){stepBattle(s.battle,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});}assert.deepEqual(s.battle,copy.battle);assert.equal(firstEntry(u).tick,entry.tick);assert.ok(!hasStatus(s.battle,u,d.status)||u.statuses[d.status]?.sourceTreasure!==id);
 }
});
test('stronger ordinary status expires independently and withdrawal preserves other sources',()=>{
 const s=battle(),b=s.battle,u=b.sides[0].units[0];setStatus(b,u,'valor',2,{potency:2,sourceId:u.id,sourceSkillName:'奋战测试'});assert.equal(u.statuses.valor.potency,2);b.tick=3;refreshTreasureStatuses(b,u);assert.equal(u.statuses.valor.sourceTreasure,'skyHalberd');assert.equal(u.statuses.valor.until,7);
 setStatus(b,u,'valor',10,{potency:2,sourceId:u.id,sourceSkillName:'常规奋战'});u.withdrawing=true;refreshTreasureStatuses(b,u);assert.equal(u.statuses.valor.sourceSkillName,'常规奋战');assert.equal(u.statuses.valor.sources,undefined);assert.equal(firstEntry(u).removed,true);
});
test('regrowth uses only real wounds and a saved total budget; treasure shield is independent',()=>{
 const s=battle('medicineBook'),b=s.battle,u=b.sides[0].units[0];for(let i=0;i<3;i++)stepBattle(b,{aiSides:[]});assert.equal(firstEntry(u).healed,0);
 u.hp-=300;u.battleDamage+=300;for(let i=0;i<8;i++){stepBattle(b,{aiSides:[]});validateSave(structuredClone(s));}assert.ok(firstEntry(u).healed<=firstEntry(u).total);assert.ok(firstEntry(u).healed>0);
 const armor=battle('brightArmor'),a=armor.battle.sides[0].units[0];assert.equal(a.statuses.shield.layers[0].amount,Math.min(400,Math.floor(a.initial*.04)));setStatus(armor.battle,a,'shield',20,{amount:10,source:'normal',label:'普通护盾'});a.withdrawing=true;refreshTreasureStatuses(armor.battle,a);refreshShield(armor.battle,a);assert.equal(a.statuses.shield.layers.length,1);assert.equal(a.statuses.shield.layers[0].source,'normal');
});
test('custom uniqueness spans both sides and reinforcements; malformed entry sources are rejected',()=>{
 const d=defaultCustomBattle();d.ownTeam[0].treasureId='skyHalberd';d.enemyTeam[0].treasureId='skyHalberd';assert.throws(()=>validateCustomBattle(d),/宝物/);
 const s=battle(),u=s.battle.sides[0].units[0];u.statuses.valor.until++;assert.throws(()=>validateSave(s),/宝物/);
 const c=newCampaign(7);c.campaign.treasures.items.push({...c.campaign.treasures.items[0]});assert.throws(()=>restore(c),/宝物/);
});
test('domestic discovery commits the one turn roll and shared 30 day interval without rerolls',()=>{
 const s=newCampaign(7),u=s.cities.find(c=>c.id==='xuchang').units[0],t=storage(s,'artOfWar','xuchang');Object.assign(t,{state:'hidden',cityId:'xuchang',factionId:null});s.campaign.day=10;
 recordTreasureWork(s,{id:'work:one',key:'fair',officerId:u.id,faction:'cao',cityId:'xuchang',factor:1,productive:true,finished:true});finishTreasureTurn(s);const e=s.campaign.treasures.events.find(e=>e.kind==='discovery');assert.equal(e.probability,.02);const before=JSON.stringify(s.campaign.treasures);finishTreasureTurn(s);assert.equal(JSON.stringify(s.campaign.treasures),before);
 s.campaign.treasures.lastDiscovery.cao=10;s.campaign.day=20;recordTreasureWork(s,{id:'work:two',key:'fair',officerId:u.id,faction:'cao',cityId:'xuchang',factor:1,productive:true,finished:true});finishTreasureTurn(s);assert.equal(s.campaign.treasures.events.filter(e=>e.kind==='discovery').length,1);
});
test('plunder requires real damage to the selected original holder and never creates an item',()=>{
 const world=newCampaign(7),d=defaultCustomBattle();d.ownTeam[0].id='person-204';d.enemyTeam[0].treasureId='skyHalberd';const s=generateBattle(d);lockDeployment(s.battle);const b=s.battle,actor=b.sides[0].units[0],target=b.sides[1].units[0];
 // The battle units still follow the real entry processor; strategic rows represent its actors.
 world.campaign.idle.push({unit:makeOfficer(actor.id,3000),faction:'cao',location:'xuchang',destination:null,remainingDays:0});const enemy=treasureOfficerRows(world).find(o=>o.unit.id===target.id);assert.ok(enemy);const t=treasureRecord(world,'skyHalberd');Object.assign(t,{state:'person',holderId:target.id,cityId:null});target.hp=0;target.status='defeated';b.result={winner:0,reason:'测试真实战后入口'};
 recordTreasureDamage(b,actor,{...target,type:'gate'},1000);assert.equal(actor.treasureDamage,undefined);recordTreasureDamage(b,actor,target,target.initial*.1);const candidates=treasureCaptureCandidates(world,b),r={id:'loot-fixture',cityId:'guandu',battle:b};settleBattleTreasures(world,r,candidates);assert.equal(world.campaign.treasures.events.find(e=>e.kind==='capture').probability,.10);const count=world.campaign.treasures.events.length;settleBattleTreasures(world,r,candidates);assert.equal(world.campaign.treasures.events.length,count);assert.equal(world.campaign.treasures.items.length,70);
});
test('captivity seals the single equipped treasure, release equips it again, and death hides that same original',()=>{
 for(const fate of ['CAPTIVE','DEAD']){
  const s=newCampaign(7),c=s.cities.find(c=>c.id==='xuchang'),u=c.units.find(u=>u.id!==c.governor);storage(s,'brightArmor',c.id);assert.equal(grantTreasure(s,'brightArmor',u.id),null);
  const eventId=Array.from({length:1000},(_,i)=>'treasure-fate:'+i).find(id=>officerLossResult(fateRoll(s,id),'yuan')===fate);
  assert.equal(resolveOfficerLoss(s,{unit:u,faction:'cao',location:c.id,enemy:'yuan',eventId}),fate);
  assert.equal(treasureRecord(s,'brightArmor').state,fate==='DEAD'?'hidden':'captive');assert.deepEqual(equippedTreasureIds(u),[]);restore(s);
  if(fate==='CAPTIVE'){assert.equal(releaseCaptive(s,u.id,{automatic:true}),null);assert.equal(treasureRecord(s,'brightArmor').state,'person');assert.equal(equippedTreasureIds(u)[0],'brightArmor');restore(s);}
 }
});
test('ordinary transport interception still loses the travelling officer original treasure',()=>{
 const s=newCampaign(7),courier=s.campaign.idle.find(o=>o.location==='xuchang'&&o.unit.id!=='cao');storage(s,'brightArmor','xuchang');assert.equal(grantTreasure(s,'brightArmor',courier.unit.id),null);assert.equal(transferOfficer(s,courier.unit.id,'chenliu',{cargo:{gold:0,grain:100,manpower:0}}),null);
 assert.equal(appointGovernor(s,'guandu',null,{faction:'yuan',scheduled:true}),null);
 const to=courier.journey.route[0],a=fieldFromCity(s,'guandu');a.location='xuchang';a.travel={from:'xuchang',to,road:'main',progress:roadDistance(s,'xuchang',to)*.01};a.route=[to];a.target=to;
 const battles=s.campaign.battles.length;advancePersonnel(s,courier);assert.equal(treasureRecord(s,'brightArmor').state,'hidden');assert.equal(treasureRecord(s,'brightArmor').cityId,'xuchang');assert.equal(s.campaign.battles.length,battles);assert.equal(s.campaign.treasures.items.length,70);restore(s);
});

test('Eye applies only to the actual completed eligible primary actor and records its source',()=>{
 const s=newCampaign(7),actor='person-277';s.campaign.day=10;const t=storage(s,'artOfWar','xuchang');Object.assign(t,{state:'hidden',cityId:'xuchang',factionId:null});
 recordTreasureWork(s,{id:'work:fail',key:'fair',officerId:actor,faction:'cao',cityId:'xuchang',factor:0,productive:false,finished:true});assert.equal(s.campaign.treasures.sources.length,0);
 // Add the actual actor as a city resident, rather than substituting an Eye assistant.
 s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==actor);s.campaign.idle.push({unit:makeOfficer(actor,0),faction:'cao',location:'xuchang',destination:null,remainingDays:0});
 recordTreasureWork(s,{id:'work:eye',key:'fair',officerId:actor,faction:'cao',cityId:'xuchang',factor:1,productive:true,finished:true});finishTreasureTurn(s);const e=s.campaign.treasures.events.find(e=>e.kind==='discovery');assert.equal(e.probability,.04);assert.equal(e.workSource.officerId,actor);assert.equal(e.workSource.key,'fair');validateTreasures(s,fail);
});
test('real normal-mode encounter settles physical treasures once and resumes from the same snapshot',()=>{
 const s=newCampaign(11);for(const c of s.cities)for(const u of c.units)u.retreatAt=null;storage(s,'brightArmor','xuchang');const holder=s.cities.find(c=>c.id==='xuchang').units[0];assert.equal(grantTreasure(s,'brightArmor',holder.id,{replace:true}),null);const own=fieldFromCity(s,'xuchang',{target:'guandu'}),enemy=fieldFromCity(s,'guandu',{target:'xuchang'});approachFieldContact(s,own,enemy);beginExecution(s);
 let r;for(let i=0;i<25&&!r;i++){advanceCampaignDay(s);r=activeBattles(s)[0];}assert.ok(r);chooseEncounter(s,r.id,false);const copy=restore(s);
 for(let i=0;i<120&&!r.settled;i++){for(const state of [s,copy]){if(state.campaign.phase==='planning')beginExecution(state);for(const fight of activeBattles(state).filter(r=>r.awaiting))chooseEncounter(state,fight.id,false);advanceCampaignDay(state);}}
 assert.ok(r.settled);assert.ok(Array.isArray(r.report.treasures));assert.ok(r.report.treasures.length<=1);assert.equal(serializeCampaign(s),serializeCampaign(copy));restore(s);
});
