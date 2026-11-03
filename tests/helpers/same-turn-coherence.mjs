import assert from 'node:assert/strict';
import {planningFront} from './strategic-planning.mjs';
import {makeOfficer} from '../../engine.mjs';
import {assignDomestic,assignmentFor,actionCandidates} from '../../domestic.mjs';
import {prepareEnemyDomestic} from '../../talent-lifecycle.mjs';
import {planStrategicAI} from '../../strategic-ai.mjs';
import {initializeVision} from '../../strategic-vision.mjs';

// Controlled current-resource situations, separate from original natural saves.
export function staffingScene({grain=20000}={}){
 const {s,home,rear}=planningFront(),u=home.units.find(u=>u.id==='ju');
 home.units=home.units.filter(v=>v!==u);u.homeCity=rear.id;rear.units=[u];rear.governor=u.id;rear.farm=0;rear.grain=grain;
 assert.equal(assignDomestic(s,rear.id,'military',u.id,{faction:'yuan',scheduled:true}),null);
 s.campaign.ai.staffing.push({faction:'yuan',officerId:u.id,cityId:rear.id,direction:'military',createdDay:1,arrivedDay:1,phase:'work'});
 return {s,home,rear,id:u.id};
}
export function foodScene({grain=0}={}){
 const {s,home,rear,target}=planningFront(),u={...makeOfficer('person-72',3000,0,3),homeCity:rear.id};
 rear.units=[u];rear.governor=u.id;rear.grain=grain;
 s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==u.id);s.campaign.idle=s.campaign.idle.filter(o=>o.unit.id!==u.id);
 initializeVision(s);return {s,home,rear,target};
}
export const realMen=s=>s.cities.reduce((n,c)=>n+c.manpower+c.units.reduce((m,u)=>m+u.troops+u.wounded,0),0)+s.armies.reduce((n,a)=>n+a.units.reduce((m,u)=>m+u.troops+u.wounded,0),0)+s.campaign.idle.reduce((n,o)=>n+o.unit.troops+o.unit.wounded+(o.cargo?.manpower||0),0);
export const realGrain=s=>s.cities.reduce((n,c)=>n+c.grain,0)+s.armies.reduce((n,a)=>n+a.supply,0)+s.campaign.idle.reduce((n,o)=>n+(o.cargo?.grain||0),0);
export function exerciseSameTurnCoherence(){
 const checks={};
 {
  const {s,rear,id}=staffingScene();assert.ok(actionCandidates(s,assignmentFor(s,id)).some(a=>a.key==='recruit'));
  prepareEnemyDomestic(s);checks.staffingPromisePreserved=assignmentFor(s,id)?.direction==='military'&&s.campaign.ai.staffing.some(p=>p.officerId===id&&p.direction==='military');
  checks.noEmergencyFoodCreated=rear.grain===20000;
 }
 {
  const {s,id}=staffingScene({grain:0});prepareEnemyDomestic(s);
  checks.realEmergencyAssignsAgriculture=assignmentFor(s,id)?.direction==='agriculture';
  checks.emergencyReleaseRecorded=!s.campaign.ai.staffing.some(p=>p.officerId===id)&&s.campaign.activity.nodes.some(n=>n.officerId===id&&n.result?.reason==='staffing-food-emergency');
 }
 {
  const {s,home,rear,target}=foodScene(),men=realMen(s),grain=realGrain(s);planStrategicAI(s);const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.ok(p);
  assert.ok(p.origins.every(g=>g.cityId!==rear.id));checks.unrelatedOffensivePreserved=p.phase==='attack'&&s.armies.some(a=>a.faction==='yuan'&&a.target===target.id&&a.homeCity===home.id);
  checks.localReliefReallyActs=rear.units.every(u=>u.troops===0);
  checks.noFreeMen=realMen(s)===men;checks.noFreeGrain=realGrain(s)===grain;
 }
 return checks;
}
