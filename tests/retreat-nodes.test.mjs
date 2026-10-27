import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPAIGN,newCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep,activeBattles,chooseEncounter,serializeCampaign,validateCampaign,canEditArmy,splitCampaignArmy,mergeCampaignArmies,recruitCampaign,changeCampaignTroop} from './helpers/auto-domestic-campaign.mjs';
import {fieldFromCity,approachFieldContact} from './helpers/field-campaign.mjs';
import {mapNode,isJunction} from '../road-network.mjs';
import {roadDistance,roadCost} from '../strategic-movement.mjs';
import {retreatDestinations,nearestRetreat,redirectRetreat,dispatchWithdrawn} from '../strategic-retreat.mjs';
import {advancePersonnel,transportProxy,TRANSPORT_SPEED} from '../personnel-movement.mjs';
import {canRallyAt} from '../army-rally.mjs';
import {lockDeployment,battleWounded,issueCommand} from '../engine.mjs';
import {militaryFlowMarkup,newMilitaryFlow,previewMilitaryFlow,encounterFlowMarkup} from '../military-flow.mjs';

const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function scene(kind){
 const s=newCampaign(117,'guandu-200'),n=s.junctions.find(n=>n.kind===kind),edge=s.roads.find(e=>e.includes(n.id)),other=edge.find(id=>id!==n.id);
 const a=fieldFromCity(s,'xuchang'),enemy=fieldFromCity(s,'ye'),length=roadDistance(s,other,n.id);
 for(const [army,from,to,fraction]of [[a,other,n.id,.72],[enemy,n.id,other,.2]]){
  army.location=from;army.route=[to];army.target=to;army.travel={from,to,road:'main',progress:length*fraction};
 }
 beginExecution(s);
 for(let i=0;i<10&&!activeBattles(s).length;i++){s.campaign.ai.lastPlanDay=s.campaign.day;advanceCampaignDay(s);}
 const r=activeBattles(s).find(r=>r.armyIds.includes(a.id));assert.ok(r);
 // Both armies met inside the actual edge; neither endpoint is a combat node.
 assert.ok(r.armies.every(a=>a.travel));
 chooseEncounter(s,r.id,true);const b=r.battle;
 assert.equal(b.sides[0].retreatDestination,n.id);
 return {s,n,a,enemy,r,b};
}
function withdraw(s,b,count=2){
 const selected=b.sides[0].units.slice(0,count);lockDeployment(b);
 for(const u of b.sides.flatMap(side=>side.units)){u.cooldown=999;u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,999]));u.statuses.root={until:999};}
 selected.forEach((u,i)=>{u.x=0;u.y=i;u.retreatAt=u.hp;});
 advanceCampaignStep(s);assert.ok(selected.every(u=>u.retreatDispatched));return selected;
}

for(const kind of ['junction','port','gate'])test(`${kind}: actual withdrawal rallies at the nearest node, preserves people and cargo, and allows reorganization`,()=>{
 const {s,n,a,r,b}=scene(kind),nodeBefore=structuredClone(n);
 const destinations=retreatDestinations(s,b);assert.equal(destinations[0].id,n.id);
 assert.ok(destinations.every(d=>canRallyAt(s,d.id,a.faction)));
 const before={grain:a.supply,capacity:a.supplyCapacity,troops:a.units.reduce((sum,u)=>sum+u.troops,0)},group=r.id+':'+a.id;
 const distance=nearestRetreat(s,a.faction,a.location,a.travel&&{from:a.travel.from,to:a.travel.to,fraction:a.travel.progress/roadDistance(s,a.travel.from,a.travel.to)}).path.cost;
 assert.ok(distance>0,'withdrawal starts on the road, before the rally point');
 const departed=withdraw(s,b),ids=departed.map(u=>u.id);
 const convoys=s.campaign.idle.filter(o=>ids.includes(o.unit.id)),arrived=s.armies.filter(a=>a.retreatGroup===group);
 const arrivedIds=arrived.flatMap(a=>a.units.map(u=>u.id));
 assert.deepEqual([...convoys.map(o=>o.unit.id),...arrivedIds].sort(),[...ids].sort(),'each withdrawn officer is either travelling or already rallied');
 if(distance<=TRANSPORT_SPEED/CAMPAIGN.stepsPerDay){assert.equal(convoys.length,0);assert.equal(arrived.length,1,'a short remaining road is completed in the departure step');}
 else {assert.equal(convoys.length,ids.length);assert.equal(arrived.length,0,'a longer remaining road must still be travelled');}
 const cargo=convoys.reduce((sum,o)=>sum+o.cargo.grain,0)+arrived.reduce((sum,a)=>sum+a.supply,0),capacity=convoys.reduce((sum,o)=>sum+o.retreatFormation.capacity,0)+arrived.reduce((sum,a)=>sum+a.supplyCapacity,0);
 const source=s.armies.find(x=>x.id===a.id);
 assert.equal((source?.supply||0)+cargo,before.grain);assert.equal((source?.supplyCapacity||0)+capacity,before.capacity);
 assert.equal((source?.units.reduce((sum,u)=>sum+u.troops,0)||0)+departed.reduce((sum,u)=>sum+u.hp,0),before.troops);
 const people=[...s.armies.flatMap(a=>a.units),...s.cities.flatMap(c=>c.units),...s.campaign.idle.map(o=>o.unit)];
 for(const id of ids)assert.equal(people.filter(u=>u.id===id).length,1,'withdrawal cannot duplicate personnel');
 const copy=restore(s);
 for(const state of [s,copy]){
  let steps=0;do{advanceCampaignStep(state);assert.ok(++steps<=40,'withdrawn units must actually reach the node');}while(state.campaign.idle.some(o=>ids.includes(o.unit.id)));
 }
 assert.equal(serializeCampaign(s),serializeCampaign(copy));
 const rallied=s.armies.find(a=>ids.every(id=>a.units.some(u=>u.id===id)));assert.ok(rallied);assert.equal(rallied.location,n.id);assert.equal(rallied.supply,cargo);assert.equal(rallied.supplyCapacity,capacity);
 assert.equal(rallied.units.length,ids.length);assert.equal(r.settled,false);
 for(const u of departed){const source=rallied.units.find(v=>v.id===u.id);assert.equal(source.troops,u.hp);assert.ok(source.wounded>=battleWounded(u));}
 assert.deepEqual(n,nodeBefore);dispatchWithdrawn(s,r);assert.equal(rallied.units.length,ids.length);
 s.campaign.phase='planning';assert.equal(canEditArmy(s,rallied),true);
 const draft=newMilitaryFlow(s,rallied.id,'adjust');draft.roles.leader=ids[1];assert.equal(previewMilitaryFlow(s,draft).army.leader,ids[1]);
 assert.ok(!militaryFlowMarkup(s,newMilitaryFlow(s,rallied.id)).body.includes('data-kind="recruit"'));
 assert.ok(!militaryFlowMarkup(s,draft).body.includes('data-military-type'));
 assert.ok(recruitCampaign(s,rallied.id));assert.ok(changeCampaignTroop(s,rallied.id,ids[0],rallied.units[0].type==='spear'?'cavalry':'spear'));
 assert.equal(splitCampaignArmy(s,rallied.id,[ids[1]]),null);const split=s.armies.at(-1);
 assert.equal(mergeCampaignArmies(s,rallied.id,split.id),null);assert.equal(rallied.supply,cargo);assert.equal(rallied.supplyCapacity,capacity);
 assert.deepEqual(n,nodeBefore);s.campaign.phase='executing';restore(s);
});

test('nearest node uses remaining distance on both sides of an edge and excludes hostile or fighting nodes',()=>{
 const {s,n,a,enemy,r}=scene('port'),edge=a.travel;
 const forward=nearestRetreat(s,a.faction,a.location,{from:edge.from,to:edge.to,fraction:.99});assert.equal(forward.id,edge.to);
 const before=transportProxy(s,{unit:a.units[0],faction:a.faction,location:edge.from,retreating:true,journey:{route:[edge.to],progress:roadCost(s,edge.from,edge.to)*.99}}).travel;
 const o={unit:a.units[0],faction:a.faction,location:edge.from,destination:n.id,journey:{route:[edge.to],progress:roadCost(s,edge.from,edge.to)*.99}};
 const other=mapNode(s,edge.from);if(!isJunction(s,other.id))other.owner=a.faction;
 enemy.travel=null;enemy.location=n.id;assert.equal(canRallyAt(s,n.id,a.faction),false);
 redirectRetreat(s,o);assert.notEqual(o.destination,n.id);const after=transportProxy(s,o).travel;
 assert.ok(Math.abs(before.progress/roadDistance(s,before.from,before.to)+after.progress/roadDistance(s,after.from,after.to)-1)<1e-9);
 assert.ok(!retreatDestinations(s,r.battle).some(d=>d.id===n.id));
});

test('full-army retreat forms a new army once and cannot duplicate the original battle participants',()=>{
 const {s,n,r,b}=scene('gate');lockDeployment(b);
 for(const u of b.sides.flatMap(side=>side.units)){u.cooldown=999;u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,999]));}
 b.sides[0].units.filter(u=>u.status==='active').forEach((u,i)=>{u.x=0;u.y=i;});
 assert.equal(issueCommand(b,'retreat'),null);advanceCampaignStep(s);assert.equal(r.settled,true);
 for(let i=0;i<40&&s.campaign.idle.some(o=>o.retreating&&o.faction==='cao');i++)for(const o of [...s.campaign.idle].filter(o=>o.retreating&&o.faction==='cao'))advancePersonnel(s,o,[],1/24);
 const a=s.armies.find(a=>a.faction==='cao'&&a.location===n.id);assert.ok(a);assert.ok(a.units.length<=10);
 const people=[...s.armies.flatMap(a=>a.units),...s.cities.flatMap(c=>c.units),...s.campaign.idle.map(o=>o.unit)];
 for(const u of b.sides[0].units)assert.equal(people.filter(v=>v.id===u.id).length,1);restore(s);
});
