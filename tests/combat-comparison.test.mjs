import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {combatComparison,commanderComparison,relationshipMatrix} from '../combat-comparison.mjs';
import {armyCommanders,armyStratagems} from '../engine.mjs';
import {selectStratagemSource,stratagemEffectText} from '../stratagems.mjs';
import {relationshipKey} from '../relationships.mjs';
import {campaignOfficers} from '../strategic-roster.mjs';
test('formation comparison uses actual strongest stratagem holder and current relationship scores without mutation',()=>{
 const s=newCampaign(42,'heroes-251'),units=campaignOfficers(s).filter(r=>r.location==='xuchang').slice(0,3).map(r=>r.unit),roles={leader:units[0].id,advisor:units[1].id};
 const key=relationshipKey(units[0].id,units[1].id);s.relationshipTypes[key]='liked';s.relationshipScores[key]=79;
 const before=serializeCampaign(s),html=combatComparison(s,units,roles),army={units,...roles};
 for(const id of armyStratagems(army)){const effect=stratagemEffectText(selectStratagemSource(armyCommanders(army),id));assert.ok(html.includes(effect),effect);}
 assert.ok(html.includes('>79</td>'));assert.ok(!html.includes('79%'));assert.equal((html.match(/class="relationship-score"/g)||[]).length,6);assert.equal((html.match(/class="relationship-self"/g)||[]).length,3);assert.ok(html.includes('固定战法'));assert.ok(html.includes('连携'));
 const chooser=commanderComparison(s,units,roles,'data-expedition-role','xuchang');assert.ok(chooser.includes('type="radio"'));assert.ok(!chooser.includes('<select'));assert.equal(serializeCampaign(s),before);
});

test('matrix keeps candidate rows while selections add and remove columns',()=>{
 const s=newCampaign(42,'heroes-251'),pool=campaignOfficers(s).filter(r=>r.location==='xuchang').slice(0,3).map(r=>r.unit);
 const before=serializeCampaign(s);
 for(const selected of [[],[pool[2]],[pool[2],pool[0]],[pool[0]]]){
  const html=relationshipMatrix(s,selected,pool,{attribute:'data-command-army-unit'});
  assert.equal((html.match(/scope="row"/g)||[]).length,pool.length);
  assert.equal((html.match(/scope="col"/g)||[]).length,selected.length+1);
  assert.equal((html.match(/type="checkbox"/g)||[]).length,pool.length);
  assert.equal((html.match(/checked /g)||[]).length,selected.length);
  assert.equal((html.match(/class="relationship-self"/g)||[]).length,selected.length);
  assert.equal((html.match(/class="relationship-score"/g)||[]).length,(pool.length-1)*selected.length);
  for(const u of pool)for(const v of selected)if(u.id!==v.id)assert.ok(html.includes(u.name+'与'+v.name+'的友好度'));
 }
 assert.equal(serializeCampaign(s),before);
});
