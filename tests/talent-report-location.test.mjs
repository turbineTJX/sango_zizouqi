import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay} from './helpers/auto-domestic-campaign.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {readyTalent} from './helpers/talent.mjs';
import {fundCities} from './resource-fixtures.mjs';
import {assignDomestic,ACTIONS,assignmentFor} from '../domestic.mjs';

for(const target of ['xuchang','chenliu'])test(`talent result names the actual contact location: ${target}`,()=>{
 const s=newCampaign(15);peacefulCities(s);fundCities(s,100000);
 const c=s.cities.find(c=>c.id==='xuchang');readyTalent(s,target);
 const o=s.campaign.idle.find(o=>o.location===c.id&&o.faction==='cao'&&o.unit.id!==c.governor);
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='talent'&&key!=='hire')c.domestic.cooldowns[key]=100000;
 assert.equal(assignDomestic(s,c.id,'talent',o.unit.id),null);beginExecution(s);
 const actionId=assignmentFor(s,o.unit.id).action.id;
 if(target!==c.id)assert.equal(o.unit.mission.targetCity,target);
 let event;
 for(let guard=0;guard<40&&!event;guard++){
  if(s.campaign.phase==='planning')beginExecution(s);
  advanceCampaignDay(s);
  event=s.campaign.domestic.events.find(e=>e.actionId===actionId&&['complete','failure'].includes(e.phase));
 }
 assert.ok(event,'normal daily execution settles the paid task');
 const location=s.cities.find(c=>c.id===target).name;
 assert.ok(event.text.startsWith(`${o.unit.name}在${location}与`),event.text);
 assert.equal(event.cityId,c.id,'the paying city keeps its administrative record');
});
