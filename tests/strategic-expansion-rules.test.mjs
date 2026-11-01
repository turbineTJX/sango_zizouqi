import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
import {actionCandidates} from '../domestic.mjs';
import {cityBaseIncome,cityWorkLimit,reserveWorkScale} from '../economy.mjs';
import {initializeVision} from '../strategic-vision.mjs';
import {initializeStrategicAI,manageStrategicEconomy,strategicDepartureError} from '../strategic-ai.mjs';
import {personnelCityProfile} from '../strategic-personnel.mjs';

test('military leadership improves real reserve candidates within the enlarged shared allowance',()=>{
 const s=newCampaign(417),c=s.cities.find(c=>c.id==='xuchang');
 const o=s.campaign.idle.find(o=>o.location===c.id&&o.faction===c.owner);
 c.manpower=0;c.grain=0;c.barracks=6;c.domestic.production={turn:1,gold:0,grain:0,manpower:0};
 const job={cityId:c.id,officerId:o.unit.id,direction:'military',lastKey:null,failures:0};
 o.unit.leadership=20;const weak=actionCandidates(s,job).find(x=>x.key==='recruit');
 o.unit.leadership=100;const strong=actionCandidates(s,job).find(x=>x.key==='recruit');
 assert.ok(weak&&strong);assert.ok(strong.amount>weak.amount);
 assert.ok(strong.amount<=cityWorkLimit(s,c,'manpower',5));
 assert.ok(reserveWorkScale(100)>2);assert.equal(c.manpower,0,'preview never credits reserves');
 c.governor=null;c.domestic.techs=[];
 assert.ok(cityBaseIncome(s,c).manpower>=150+6*450);
});

test('safe rear towns avoid mass expansion and allow their last field unit to depart',()=>{
 const s=newCampaign(417,'heroes-251');
 for(const c of s.cities){c.owner='cao';c.domestic.owner='cao';c.gold=50000;c.grain=50000;c.manpower=30000;}
 s.armies=[];s.campaign.domestic.assignments=[];s.campaign.domestic.orders=[];
 for(const o of s.campaign.idle)o.faction='cao';
 const c=s.cities.find(c=>c.id==='xuchang');c.governor=null;
 c.units=c.units.slice(0,1);assert.ok(c.units.length);
 c.units[0].troops=1000;c.units[0].wounded=0;
 initializeVision(s);initializeStrategicAI(s);
 assert.equal(personnelCityProfile(s,c).role,'rear');
 const target=s.cities.find(x=>x.id!==c.id).id;
 assert.equal(strategicDepartureError(s,{faction:'cao',kind:'transfer',cityId:c.id,officerIds:[c.units[0].id],target}),null);
 manageStrategicEconomy(s);
 assert.equal(c.units.length,1);assert.equal(c.units[0].troops,1000);
});
