import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {mapObjectMenu} from '../map-object-menu.mjs';
import {newCommand,commandMarkup,changeCommandUnit,prepareCommandFormation} from '../strategic-command.mjs';
import {cityVisible} from '../strategic-vision.mjs';
test('map menu restricts orders to owned objects and renders without state changes',()=>{
 const s=newCampaign(203,'guandu-200'),before=serializeCampaign(s);
 const own=mapObjectMenu(s,{kind:'city',id:'xuchang',x:20,y:30});
 assert.match(own,/city-domestic/);assert.match(own,/军团出征/);
 const enemy=mapObjectMenu(s,{kind:'city',id:'ye'});
 assert.match(enemy,/城市情报/);assert.doesNotMatch(enemy,/campaign-pick|city-domestic/);
 assert.equal(mapObjectMenu(s,{kind:'city',id:'missing'}),'');
 assert.equal(serializeCampaign(s),before);
});
test('army muster previews equipment and cost without committing the draft',()=>{
 const s=newCampaign(203,'guandu-200'),p=newCommand(s,'draft','xuchang'),home=s.cities.find(c=>c.id==='xuchang');home.gold=5000;
 const unit=home.units[0],before=serializeCampaign(s);
 assert.match(commandMarkup(s,{officerPick:p,personnel:{}},'').body,/campaign-unit-detail/);
 assert.deepEqual(p.selected,[]);
 assert.equal(changeCommandUnit(s,p,unit.id,'siege','ram'),null);
 const html=commandMarkup(s,{officerPick:p,personnel:{}},'').body;
 assert.match(html,/unit-muster/);assert.match(html,/value="ram" selected/);
 const preview=prepareCommandFormation(s,p);assert.equal(preview.error,undefined);assert.ok(preview.gold>0);
 assert.equal(preview.state.cities.find(c=>c.id==='xuchang').units.find(u=>u.id===unit.id).equipment.siege,'ram');
 assert.equal(serializeCampaign(s),before);
});
test('expedition destination details use city intelligence instead of hidden resources',()=>{
 const s=newCampaign(203,'guandu-200'),target=s.cities.find(c=>c.owner!=='cao'&&!cityVisible(s,c.id)),p=newCommand(s,'expedition','xuchang');
 target.grain=987654;target.manpower=765432;p.step='target';p.destination=target.id;
 const before=serializeCampaign(s),html=commandMarkup(s,{officerPick:p,personnel:{}},'').body;
 assert.match(html,/尚未侦察/);assert.doesNotMatch(html,/987654|765432/);assert.equal(serializeCampaign(s),before);
});
