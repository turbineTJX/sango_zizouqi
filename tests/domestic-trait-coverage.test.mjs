import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAIT_DESIGNS} from '../data/design/traits.mjs';
import {OFFICER_ASSIGNMENTS} from '../data/design/assignments.mjs';
import {makeOfficer} from '../engine.mjs';
import {ACTIONS,DIRECTIONS} from '../domestic.mjs';
import {taskTraits,domesticDirectionTraits,domesticDirectionTraitCatalog} from '../officer-traits.mjs';
import {officerRecommendation} from '../officer-recommendation.mjs';
import {campaignRosterMarkup,campaignOfficers} from '../strategic-roster.mjs';
import {newCampaign,serializeCampaign} from './helpers/auto-domestic-campaign.mjs';

test('all six appointment directions expose exactly their executable effects and cooperation/discovery hooks',()=>{
 const s={cities:[]};
 for(const id of Object.keys(OFFICER_ASSIGNMENTS))for(const direction of Object.keys(DIRECTIONS)){
  const u=makeOfficer(id,0),defs=Object.values(ACTIONS).filter(d=>d.direction===direction);
  const expected=u.id&&OFFICER_ASSIGNMENTS[id].traits.filter(trait=>{
   const t=TRAIT_DESIGNS[trait];
   return defs.some(def=>taskTraits(u,def).includes(trait)||t.strategic?.effect==='treasureDiscovery'&&t.strategic.actions.includes(def.id))||t.strategic?.effect==='crossCooperate';
  });
  const traits=domesticDirectionTraits(u,defs);
  assert.deepEqual(traits,expected,id+':'+direction);
  assert.deepEqual(officerRecommendation(s,u,{task:'domestic',direction}).traits.map(t=>t.id),expected);
 }
});

test('economic appointments recognize fixed specialists across several factions without granting military effects',()=>{
 const cases=[['dun','agriculture','farmYield'],['person-255','commerce','taxOrder'],['person-520','commerce','merchantReach'],['person-212','agriculture','irrigationYield'],['person-634','commerce','grainSale'],['ju','agriculture','provision']];
 for(const [id,direction,trait] of cases){
  assert.ok(domesticDirectionTraits(makeOfficer(id,0),Object.values(ACTIONS).filter(d=>d.direction===direction)).includes(trait));
  assert.ok(!domesticDirectionTraits(makeOfficer(id,0),Object.values(ACTIONS).filter(d=>d.direction==='military')).includes(trait));
 }
 assert.deepEqual(domesticDirectionTraits(makeOfficer('cao',0),Object.values(ACTIONS)),[]);
 // Eye for treasure is a real result hook, and is separate from trade income.
 assert.ok(domesticDirectionTraits(makeOfficer('person-277',0),[ACTIONS.fair]).includes('treasureEye'));
 assert.ok(!domesticDirectionTraits(makeOfficer('person-277',0),[ACTIONS.tax]).includes('treasureEye'));
});

test('appointments display every direction trait across cities and searches, with empty cells for nonholders',()=>{
 const s=newCampaign(203,'guandu-200'),before=serializeCampaign(s);
 for(const [id,direction,trait] of [['dun','agriculture','farmYield'],['person-255','commerce','taxOrder']]){
  const row=campaignOfficers(s).find(r=>r.unit.id===id);assert.ok(row);
  const pick={task:'domestic',city:row.location,direction,selected:[]};
  const html=campaignRosterMarkup(s,{personnel:{city:row.location,query:row.unit.name}},pick);
  assert.match(html,new RegExp('<th>.*?data-id="'+trait+'"'));
  assert.ok(html.includes('aria-label="'+row.unit.name+'：'+TRAIT_DESIGNS[trait].name+'，查看效果"'));
  const searched=campaignRosterMarkup(s,{personnel:{city:row.location,query:'不存在的武将'}},pick);
  assert.ok(searched.includes('data-id="'+trait+'"'));assert.match(searched,/没有符合条件的武将/);
 }
 for(const direction of Object.keys(DIRECTIONS)){
  const defs=Object.values(ACTIONS).filter(d=>d.direction===direction),traits=domesticDirectionTraitCatalog(defs);
  const actualHolders=new Set(Object.keys(OFFICER_ASSIGNMENTS).flatMap(id=>domesticDirectionTraits(makeOfficer(id,0),defs)));
  assert.deepEqual(new Set(traits.map(t=>t.id)),actualHolders);
  for(const city of ['xuchang','town-11'])for(const query of ['', '不存在的武将']){
   const html=campaignRosterMarkup(s,{personnel:{city,query}},{task:'domestic',city,direction,selected:[]});
   const head=html.match(/<thead>(.*?)<\/thead>/s)[1];
   assert.deepEqual([...head.matchAll(/data-kind="trait" data-id="([^"]+)"/g)].map(m=>m[1]),traits.map(t=>t.id));
   assert.doesNotMatch(html,/无适用特性|<th>相关特性<\/th>/);
  }
 }
 const html=campaignRosterMarkup(s,{personnel:{city:'xuchang'}},{task:'domestic',city:'xuchang',direction:'commerce',selected:[]});
 const cells=[...html.matchAll(/<td class="task-trait-cell">(.*?)<\/td>/gs)];assert.ok(cells.length);
 assert.ok(cells.every(m=>m[1]===''));
 assert.equal(serializeCampaign(s),before);
});
