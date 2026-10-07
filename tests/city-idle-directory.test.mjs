import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,transferOfficer} from '../strategic-campaign.mjs';
import {assignDomestic,cancelDomestic} from '../domestic.mjs';
import {cityStaffStatus} from '../domestic-feedback.mjs';
import {factionDirectoryRows,factionDirectoryMarkup,mapQuickDirectory} from '../faction-directory.mjs';
import {strategicHUD} from '../strategic-hud.mjs';
import {recordOfficerActivities} from '../officer-activity.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';

test('own city list highlights real idle residents, dims zero-idle cities, sorts actionable cities first and stays read-only',()=>{
 const s=newCampaign(203,'guandu-200'),gray=s.cities.find(c=>c.owner==='cao'&&c.id!=='xuchang');
 for(const o of cityStaffStatus(s,gray).idle)assert.equal(assignDomestic(s,gray.id,'commerce',o.unit.id),null);
 const before=serializeCampaign(s),rows=factionDirectoryRows(s,'city'),html=mapQuickDirectory(s,{city:gray.id});
 assert.equal(rows.find(r=>r.id===gray.id).idle,0);assert.ok(rows.some(r=>r.idle>0));assert.ok(rows.every(r=>s.cities.find(c=>c.id===r.id).owner==='cao'));
 assert.match(html,/自辖城市/);assert.match(html,new RegExp('class="city-directory-item city-fully-assigned selected"[^>]+data-id="'+gray.id+'"[^>]+data-idle-count="0"'));
 const rendered=[...html.matchAll(/class="city-directory-item (city-needs-work|city-fully-assigned)[^"]*"/g)].map(m=>m[1]);assert.equal(rendered.length,rows.length);assert.ok(rendered.indexOf('city-fully-assigned')>rendered.lastIndexOf('city-needs-work'));
 assert.match(factionDirectoryMarkup(s,'city'),/city-fully-assigned.*data-idle-count="0"/);assert.match(strategicHUD(s,{}),/self-city-navigation has-idle/);
 assert.equal(serializeCampaign(s),before);
});
test('idle-only filter and searching an unassigned officer lead to their actual own city',()=>{
 const s=newCampaign(203,'guandu-200'),rows=factionDirectoryRows(s,'city'),chosen=rows.find(r=>r.idle>0),html=mapQuickDirectory(s,{mapCityFilter:'idle'});
 assert.doesNotMatch(html,/class="city-directory-item city-fully-assigned/);assert.match(html,/data-filter="idle" aria-pressed="true"/);
 const search=mapQuickDirectory(s,{mapQuickQueries:{city:chosen.idleNames[0]}}),ids=[...search.matchAll(/data-action="map-quick-select" data-kind="city" data-id="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(ids,[chosen.id]);
 const wild=s.campaign.domestic.people.find(p=>p.status==='FREE'&&!rows.some(r=>r.idleNames.includes(OFFICER_BY_ID[p.id].name)));assert.ok(wild);
 assert.doesNotMatch(mapQuickDirectory(s,{mapQuickQueries:{city:OFFICER_BY_ID[wild.id].name}}),/data-action="map-quick-select"/);
});
test('real appointment, dismissal and transfer update availability without waiting for a new day, including after reload',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),idle=cityStaffStatus(s,c).idle;assert.ok(idle.length>1);
 for(const o of idle.slice(1))assert.equal(assignDomestic(s,c.id,'commerce',o.unit.id),null);
 const id=idle[0].unit.id;assert.equal(factionDirectoryRows(s,'city').find(r=>r.id===c.id).idle,1);
 assert.equal(assignDomestic(s,c.id,'agriculture',id),null);assert.equal(factionDirectoryRows(s,'city').find(r=>r.id===c.id).idle,0);
 cancelDomestic(s,id);assert.equal(factionDirectoryRows(s,'city').find(r=>r.id===c.id).idle,1);
 assert.equal(transferOfficer(s,id,'chenliu'),null);assert.equal(factionDirectoryRows(s,'city').find(r=>r.id===c.id).idle,0);
 recordOfficerActivities(s);const loaded=validateCampaign(JSON.parse(serializeCampaign(s)));assert.deepEqual(factionDirectoryRows(loaded,'city'),factionDirectoryRows(s,'city'));assert.equal(loaded.campaign.day,1);
});
