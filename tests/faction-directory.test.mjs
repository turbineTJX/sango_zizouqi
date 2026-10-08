
import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
import {factionDirectoryRows,factionDirectoryMarkup,FACTION_DIRECTORIES} from '../faction-directory.mjs';
import {campaignOfficers} from '../strategic-roster.mjs';
import {strategicView} from '../strategic-view.mjs';
test('owned directories restrict scope, search without mutations and expose all fixed entrances',()=>{
 const s=newCampaign(203,'guandu-200'),before=JSON.stringify(s);
 assert.deepEqual(factionDirectoryRows(s,'city').map(r=>r.id),s.cities.filter(c=>c.owner==='cao').map(c=>c.id));
 assert.deepEqual(factionDirectoryRows(s,'officer').map(r=>r.id),campaignOfficers(s).map(r=>r.unit.id));
 assert.deepEqual(factionDirectoryRows(s,'army'),[]);
 assert.ok(factionDirectoryMarkup(s,'city',{query:'许昌'}).includes('1 / '));
 const html=strategicView(s,{city:'xuchang'});for(const kind of Object.keys(FACTION_DIRECTORIES))assert.ok(html.includes('data-kind="'+kind+'"'));
 assert.equal(JSON.stringify(s),before);
});
test('battle directory excludes finished and foreign-only battles',()=>{
 const s=newCampaign(203,'guandu-200');s.campaign.battles=[{id:1,name:'己方战场',startedDay:1,battle:{sides:[{faction:'cao'},{faction:'yuan'}]}},{id:2,name:'敌方战场',battle:{sides:[{faction:'liu'},{faction:'yuan'}]}},{id:3,name:'结束',settled:true,battle:{sides:[{faction:'cao'}]}}];
 assert.deepEqual(factionDirectoryRows(s,'battle').map(r=>r.id),[1]);
});
