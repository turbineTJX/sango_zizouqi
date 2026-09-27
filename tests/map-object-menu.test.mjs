import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {mapObjectMenu} from '../map-object-menu.mjs';
import {newCommand,commandMarkup} from '../strategic-command.mjs';
test('map menu restricts orders to owned objects and renders without state changes',()=>{
 const s=newCampaign(203,'guandu-200'),before=serializeCampaign(s);
 const own=mapObjectMenu(s,{kind:'city',id:'xuchang',x:20,y:30});
 assert.match(own,/city-domestic/);assert.match(own,/军团出征/);
 const enemy=mapObjectMenu(s,{kind:'city',id:'ye'});
 assert.match(enemy,/城市情报/);assert.doesNotMatch(enemy,/campaign-pick|city-domestic/);
 assert.equal(mapObjectMenu(s,{kind:'city',id:'missing'}),'');
 assert.equal(serializeCampaign(s),before);
});
test('workbench previews officer data and editing cost without committing the draft',()=>{
 const s=newCampaign(203,'guandu-200'),p=newCommand(s,'draft','xuchang'),unit=s.cities.find(c=>c.id==='xuchang').units[0],before=serializeCampaign(s);
 p.workbench={id:unit.id,tab:'officer'};
 assert.match(commandMarkup(s,{officerPick:p,personnel:{}},'').body,/武将详情/);
 p.step='formation';p.unitOfficer=unit.id;
 const html=commandMarkup(s,{officerPick:p,personnel:{}},'').body;
 assert.match(html,/unit-workbench/);assert.doesNotMatch(html,/请选择武将/);
 assert.deepEqual(p.selected,[]);assert.equal(serializeCampaign(s),before);
});
