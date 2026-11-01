import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {newCommand,commandMarkup} from '../strategic-command.mjs';

test('departure review separates real remaining guards from reserves and away commanders',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),[leaving,guard,away]=c.units;
 leaving.troops=3000;leaving.wounded=100;guard.troops=1200;guard.wounded=500;
 away.troops=2000;away.mission={type:'hire',location:'chenliu',route:[]};
 for(const u of c.units.slice(3))u.troops=0;
 c.grain=310;c.manpower=20000;
 const p=newCommand(s,'expedition',c.id);
 Object.assign(p,{step:'review',selected:[leaving.id],leader:leaving.id,advisor:leaving.id,destination:'chenliu'});
 const before=serializeCampaign(s),html=commandMarkup(s,{officerPick:p,personnel:{}},'').body;
 assert.match(html,/<dt>拟携粮<\/dt><dd>310<\/dd>/);
 assert.match(html,/<dt>每日耗粮<\/dt><dd>31<\/dd>/);
 assert.match(html,/<dt>无补给续航<\/dt><dd>10 天<\/dd>/);
 assert.match(html,/<dt>可用守军<\/dt><dd>1,200 人<\/dd>/);
 assert.match(html,/途中补给视粮道而定/);
 assert.equal(serializeCampaign(s),before);
});
