import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign,activeBattles,chooseEncounter,advanceCampaignStep} from '../strategic-campaign.mjs';
import {assignDomestic,assignmentFor,cancelDomestic,ACTIONS,completeBattleBuildingWork} from '../domestic.mjs';
import {buildingDurability,gateDurability,campaignBattleBuildings,writeBattleBuildingDamage,completeTechnologyBuilding} from '../building-durability.mjs';
import {citySceneState,cityBuildingInfo} from '../city-scene.mjs';
import {productiveBuildingLevel} from '../metropolitan-areas.mjs';
import {cityVisionRadius} from '../city-technology.mjs';
import {cityIntelligence} from '../strategic-vision.mjs';
import {canOccupy} from '../battlefield.mjs';
import {lockDeployment,stepBattle,issueCommand} from '../engine.mjs';
import {peacefulCities,invadeFromGuandu} from './helpers/field-campaign.mjs';
import {setBuildingLevel} from './building-fixtures.mjs';
import {fundCities} from './resource-fixtures.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function fixture({level=0,hp=null,key='workshop',seed=81}={}){
 const s=peacefulCities(newCampaign(seed));fundCities(s,100000);const c=s.cities.find(c=>c.id==='xuchang'),u=s.campaign.idle.find(o=>o.location===c.id).unit;
 setBuildingLevel(c,key,level,c.id,{hp});const direction=ACTIONS['build_'+key].direction;
 for(const [id,def]of Object.entries(ACTIONS))if(def.direction===direction&&id!=='build_'+key)c.domestic.cooldowns[id]=1000;
 assert.equal(assignDomestic(s,c.id,direction,u.id),null);return {s,c,u};
}
function days(s,n){for(let i=0;i<n;i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}}

test('all current facilities and gates save actual current and maximum durability',()=>{
 for(const scenario of [null,'guandu-200']){const s=newCampaign(81,scenario);for(const c of s.cities){assert.equal(Object.keys(c.buildings).length,10);assert.equal(gateDurability(c).maxHp,12000+c.walls*3000);assert.equal(buildingDurability(c,'commerce').hp,1000);assert.equal(Object.hasOwn(c,'gateHp'),false);}restore(s);}
});
test('new construction advances actual durability daily and inspection cannot advance it',()=>{
 const {s,c}=fixture();beginExecution(s);assert.deepEqual(buildingDurability(c,'workshop'),{hp:0,maxHp:1000});days(s,8);
 assert.deepEqual(buildingDurability(c,'workshop'),{hp:400,maxHp:1000});assert.equal(c.workshop,0);
 const before=serializeCampaign(s),info=cityBuildingInfo(citySceneState(s,c),'workshop');assert.equal(info.rows.find(r=>r[0]==='耐久')[1],'400 / 1,000');assert.equal(serializeCampaign(s),before);restore(s);
});
test('damaged facilities use the same construction progress, pay less and retain their level',()=>{
 const {s,c}=fixture({level:1,hp:400});const money=c.gold;beginExecution(s);assert.equal(c.project.mode,'repair');assert.equal(money-c.gold,210);days(s,4);assert.equal(buildingDurability(c,'workshop').hp,600);
 const copy=restore(s);for(let i=0;i<60&&c.project;i++){days(s,1);days(copy,1);assert.equal(serializeCampaign(s),serializeCampaign(copy));}
 assert.equal(c.workshop,1);assert.deepEqual(buildingDurability(c,'workshop'),{hp:1000,maxHp:1000});restore(s);
});
test('interruption preserves paid work, durability and the saved construction site',()=>{
 const {s,c,u}=fixture();beginExecution(s);days(s,4);const a=structuredClone(buildingDurability(c,'workshop'));cancelDomestic(s,u.id);const money=c.gold;assert.deepEqual(buildingDurability(c,'workshop'),a);restore(s);
 s.campaign.phase='planning';assert.equal(assignDomestic(s,c.id,'technology',u.id),null);beginExecution(s);assert.equal(c.gold,money);assert.deepEqual(buildingDurability(c,'workshop'),a);assert.equal(c.project.siteId,c.id);days(s,1);assert.ok(buildingDurability(c,'workshop').hp>a.hp);
});
test('expansion raises maximum durability without instantly supplying the new durability',()=>{
 const {s,c}=fixture({level:1});beginExecution(s);assert.deepEqual(buildingDurability(c,'workshop'),{hp:1000,maxHp:2000});days(s,2);assert.equal(buildingDurability(c,'workshop').hp,1100);assert.equal(c.workshop,1);restore(s);
});
test('damage to a half-built facility extends remaining work without resetting or charging again',()=>{
 const {s,c,u}=fixture();beginExecution(s);days(s,8);const money=c.gold,buildings=campaignBattleBuildings(s,c.id,0);buildings.find(a=>a.kind==='workshop').hp=100;writeBattleBuildingDamage(s,{buildings});
 days(s,1);assert.equal(buildingDurability(c,'workshop').hp,150);assert.equal(assignmentFor(s,u.id).action.remaining,17);assert.equal(c.gold,money);restore(s);
});
test('battle repairs that finish construction activate the facility and settle its original job once',()=>{
 const {s,c,u}=fixture();beginExecution(s);days(s,8);const money=c.gold,buildings=campaignBattleBuildings(s,c.id,0);buildings.find(a=>a.kind==='workshop').hp=1000;writeBattleBuildingDamage(s,{buildings});completeBattleBuildingWork(s,[c.id]);
 assert.equal(c.workshop,1);assert.equal(c.project,null);assert.equal(assignmentFor(s,u.id).action,null);assert.equal(c.gold,money);assert.deepEqual(buildingDurability(c,'workshop'),{hp:1000,maxHp:1000});
 const before=serializeCampaign(s);completeBattleBuildingWork(s,[c.id]);assert.equal(serializeCampaign(s),before);restore(s);
});
test('a destroyed watchtower stops its sight until genuine military repairs restore durability',()=>{
 const {s,c,u}=fixture({key:'walls',level:1});c.domestic.techs=['watchtower'];completeTechnologyBuilding(c,'watchtower');assert.equal(cityVisionRadius(c,22),32);buildingDurability(c,'watchtower').hp=0;assert.equal(cityVisionRadius(c,22),22);
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='military')c.domestic.cooldowns[key]=key==='repair'?0:1000;
 beginExecution(s);assert.equal(c.project.key,'watchtower');assert.equal(assignmentFor(s,u.id).action.key,'repair');for(let i=0;i<30&&!buildingDurability(c,'watchtower').hp;i++)days(s,1);assert.ok(buildingDurability(c,'watchtower').hp>0);assert.equal(cityVisionRadius(c,22),32);restore(s);
});
test('destroyed facilities cease production and become operational after actual repair',()=>{
 const {s,c}=fixture({key:'commerce',level:1,hp:0});assert.equal(productiveBuildingLevel(s,c,'commerce'),0);beginExecution(s);days(s,1);assert.equal(buildingDurability(c,'commerce').hp,100);assert.equal(productiveBuildingLevel(s,c,'commerce'),1);restore(s);
});
test('construction and gate durability cannot be forged in saves',()=>{
 const {s,c}=fixture();beginExecution(s);days(s,2);
 for(const mutate of [v=>v.cities.find(n=>n.id===c.id).buildings.workshop[c.id].hp=1001,v=>v.cities.find(n=>n.id===c.id).buildings.walls[c.id].maxHp=16000,v=>v.cities.find(n=>n.id===c.id).project.hpPerDay=0,v=>v.campaign.version=42]){const bad=JSON.parse(serializeCampaign(s));mutate(bad);assert.throws(()=>validateCampaign(bad));}
});
test('battle buildings preserve real damage and map repairs back to the same physical facilities',()=>{
 const s=newCampaign(81),c=s.cities.find(c=>c.id==='xuchang');setBuildingLevel(c,'commerce',1,c.id,{hp:400});
 const buildings=campaignBattleBuildings(s,c.id,0),a=buildings.find(a=>a.kind==='commerce');assert.equal(a.hp,400);assert.equal(a.maxHp,1000);a.hp=250;
 const changes=writeBattleBuildingDamage(s,{buildings});assert.equal(changes[0].hp,250);assert.equal(buildingDurability(c,'commerce').hp,250);assert.equal(campaignBattleBuildings(s,c.id,0).find(a=>a.kind==='commerce').hp,250);
 const next=campaignBattleBuildings(s,c.id,0);next.find(a=>a.kind==='commerce').hp=300;writeBattleBuildingDamage(s,{buildings:next});assert.equal(buildingDurability(c,'commerce').hp,300);restore(s);
});
test('actual siege loads damaged gate and facilities and returns gate damage after retreat',()=>{
 const s=newCampaign(81),c=s.cities.find(c=>c.id==='xuchang');setBuildingLevel(c,'commerce',1,c.id,{hp:400});gateDurability(c).hp=8000;invadeFromGuandu(s);beginExecution(s);let r;
 for(let i=0;i<8&&!r;i++){advanceCampaignDay(s);r=activeBattles(s).find(r=>r.cityId===c.id&&r.kind==='siege');}
 assert.ok(r);assert.equal(r.battle.siege.gate.hp,8000);assert.equal(r.battle.buildings.find(a=>a.kind==='commerce').hp,400);chooseEncounter(s,r.id,true);lockDeployment(r.battle);restore(s);
 const b=r.battle,units=b.sides.flatMap(side=>side.units),attacker=b.sides[r.attackSide].units.find(u=>u.status==='active'&&u.type==='archer')||b.sides[r.attackSide].units.find(u=>u.status==='active'),occupied=new Set(units.filter(u=>u.status==='active'&&u.side===r.attackSide&&u!==attacker).map(u=>u.x+':'+u.y));
 for(const u of b.sides[1-r.attackSide].units.filter(u=>u.status==='active')){const cell=Array.from({length:112},(_,i)=>({x:i%14,y:Math.floor(i/14)})).find(p=>p.x>=5&&p.x<=8&&!occupied.has(p.x+':'+p.y)&&canOccupy(b,u,p.x,p.y));assert.ok(cell);Object.assign(u,cell);occupied.add(cell.x+':'+cell.y);u.cooldown=100;u.intent=0;}
 assert.ok(canOccupy(b,attacker,1,0));Object.assign(attacker,{x:1,y:0,cooldown:0,intent:0});advanceCampaignStep(s);restore(s);assert.ok(b.buildings.some(a=>a.hp<a.initialHp));
 if(!r.battle.result)issueCommand(r.battle,'retreat',null,r.attackSide);chooseEncounter(s,r.id,false);
 for(let i=0;i<400&&!r.settled;i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignStep(s);}
 assert.ok(r.settled);assert.equal(gateDurability(c).hp,r.battle.siege.gate.hp);assert.ok(r.report.buildings.length>0);restore(s);
});
