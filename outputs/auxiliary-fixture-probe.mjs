import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep,chooseEncounter,activeBattles,calendar,orderCampaignArmy,takeOverBattle,viewCampaignMap,readDailySnapshot,serializeCampaign,validateCampaign,commissionProject,relieveCity,appointGovernor,createCampaignArmy,transferOfficer,recruitCampaign,splitCampaignArmy,mergeCampaignArmies,supplyConnection,armyPosition,CAMPAIGN,canEditArmy} from '../strategic-campaign.mjs';
import {lockDeployment,configureUnitTactics,deployUnit,activeUnits,armyTroops,battleWounded} from '../engine.mjs';
import {recoverableWounded,configureTactics} from '../tactics.mjs';
import {visibleStatuses} from '../status-display.mjs';
const resume=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function runTo(s,day,{auto=true,planning=true}={}){
  for(let guard=0;s.campaign.day<day&&guard<2000;guard++){
    if(s.campaign.phase==='planning'){if(!planning)break;beginExecution(s);}
    const result=advanceCampaignDay(s);
    if(result.encounter){if(!auto)break;for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);}
    if(result.deployment||s.finished)break;
  }return s;
}
function encounter(){const s=newCampaign();beginExecution(s);runTo(s,10,{auto:false});assert.ok(activeBattles(s).some(r=>r.awaiting));return s;}
function prolongedEncounter(mode,seed){
  const s=newCampaign(seed),a=s.armies[0],d=s.armies.find(a=>a.faction==='yuan');s.armies=s.armies.filter(a=>!a.stationary);for(const a of s.armies)a.units=a.units.filter(u=>!u.cityGuard);
  a.units=s.armies.filter(x=>x.faction==='cao').flatMap(x=>x.units);d.units=s.armies.filter(x=>x.faction==='yuan').flatMap(x=>x.units);s.armies=[a,d];
  for(const army of s.armies){army.tactic='defensive';army.units.forEach((u,i)=>{u.type=mode===0?'logistics':mode===1?'halberd':i%2?'logistics':'spear';u.first=i<6;assert.equal(configureTactics(u,u.type==='logistics'?['bandage','supply','regrowth']:u.type==='halberd'?['bulwark','mirage','curse']:['phalanx','ward','cleanse']),null);});}
  orderCampaignArmy(s,a.id,'guandu');d.route=['xuchang'];d.target='xuchang';beginExecution(s);runTo(s,10,{auto:false});return s;
}


for(const mode of [0])for(const seed of [2,3,4,5,6,7,8,9,10,11,12,13,14,15]){const s=prolongedEncounter(mode,seed),r=activeBattles(s)[0];chooseEncounter(s,r.id,true);lockDeployment(r.battle);runTo(s,32);console.log(mode,seed,r.battle.tick,r.report?.reason);}

