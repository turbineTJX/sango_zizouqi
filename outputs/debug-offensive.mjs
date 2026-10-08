import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,roadLength,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,validateCampaign,serializeCampaign,launchExpedition} from '../strategic-campaign.mjs';
import {initializeStrategicAI,manageStrategicEconomy,planStrategicAI,strategicPower,strategicCapabilities,strategicTravelDays,safeStrategicTransportRoute,validateStrategicAI,expeditionTiming,evaluateOffensive,factionStrategicProfile,estimateStrategicEnemy} from '../strategic-ai.mjs';
import {cityForce} from '../city-units.mjs';
import {makeOfficer} from '../engine.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {assignDomestic,beginDomesticTurn,assignmentFor,finishDomesticDay,cancelDomestic,ACTIONS} from '../domestic.mjs';
import {requestFactionOrder,resolveStrategicOrders,validateStrategicOrders} from '../strategic-orders.mjs';
import {plannedOfficer,plannedGrain} from '../strategic-intent.mjs';
import {pendingOrdersMarkup} from '../strategic-order-view.mjs';
import {strategicAIMarkup} from '../strategic-view.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
const city=(s,id)=>s.cities.find(c=>c.id===id);
// Small connected front built from current city units, never a legacy city army.
function scene(){
 const s=newCampaign(513,'heroes-251');s.armies=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];
 for(const c of s.cities){c.owner='neutral';c.domestic.owner='neutral';c.governor=null;c.units=[];c.grain=20000;c.project=null;c.gateHp=0;}
 const home=city(s,'ye'),target=city(s,'town-5'),rear=city(s,'town-8');
 Object.assign(home,{owner:'yuan',x:0,y:0});Object.assign(target,{owner:'cao',x:8,y:0,gateHp:6000});Object.assign(rear,{x:-8,y:0});
 home.domestic.owner='yuan';target.domestic.owner='cao';s.roads=[[home.id,target.id],[home.id,rear.id]];
 home.units=['shao','yan','wen','he','ju','tian'].map((id,i)=>({...makeOfficer(id,3000,i,3),homeCity:home.id}));
 target.units=['cao','dun','chu'].map((id,i)=>({...makeOfficer(id,1000,i,3),homeCity:target.id}));
 // A rear base is friendly; a high wall alone no longer blocks occupation.
 rear.owner='yuan';rear.domestic.owner='yuan';rear.gateHp=1000000;initializeStrategicAI(s);
 return {s,home,target,rear};
}

for(const kind of ['busy','assembly']){const {s,home,target,rear}=scene();if(kind==='busy'){home.units.forEach(u=>u.troops=u.id==='ju'?3000:500);home.gateHp=1000000;target.gateHp=0;assignDomestic(s,home.id,'technology','ju',{faction:'yuan'});beginDomesticTurn(s);}else{rear.gateHp=0;target.units.forEach(u=>u.troops=4000);const used=new Set(s.cities.flatMap(c=>c.units.map(u=>u.id)));rear.units=Object.keys(OFFICER_BY_ID).filter(id=>!used.has(id)).slice(0,5).map((id,i)=>({...makeOfficer(id,3000,i,3),homeCity:rear.id}));}planStrategicAI(s);console.log(kind,target.kind,target.commerce,s.campaign.ai.decisions,s.campaign.ai.plans);}
