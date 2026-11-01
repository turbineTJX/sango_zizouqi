import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {cityInformation} from '../information-display.mjs';
import {cityVisible} from '../strategic-vision.mjs';
import {mapObjectMenu} from '../map-object-menu.mjs';
import {campaignInfoDetail,campaignInfoMarkup,campaignInfoIndex} from '../campaign-info.mjs';
import {newCommand,commandMarkup,changeCommandUnit} from '../strategic-command.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {armyInfoCounts} from '../army-details.mjs';
const fields=html=>Object.fromEntries([...html.matchAll(/<dt>([^<]+)<\/dt><dd>([^<]+)<\/dd>/g)].map(m=>[m[1],m[2]]));
const sections=detail=>detail.sections.map(x=>x.html).join('');

test('unobserved ownership is unknown on the card, detail and city directory',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.owner!=='cao'&&!cityVisible(s,c.id));
 delete s.campaign.vision.factions.cao.cities[c.id];
 const before=serializeCampaign(s),card=mapObjectMenu(s,{kind:'city',id:c.id}),detail=sections(campaignInfoDetail(s,'city',c.id));
 assert.equal(cityInformation(s,c.id).state,'unknown');assert.match(card,/未知/);assert.doesNotMatch(card,/map-object-stats/);
 assert.match(detail,/<dt>势力<\/dt><dd>未知<\/dd>/);assert.doesNotMatch(detail,/data-kind="faction"/);
 const list=campaignInfoMarkup(s,{type:'city',query:c.name,scope:'all'}).body;
 assert.match(list,/<td>未知<\/td>/);assert.equal(serializeCampaign(s),before);
});

test('lost sight retains the same dated values across card, detail, directory and save round trip',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.owner!=='cao'&&!cityVisible(s,c.id));
 const saved=s.campaign.vision.factions.cao.cities[c.id];
 saved.day=s.campaign.day;saved.data=structuredClone(c);saved.data.gold=4321;
 c.gold=9123;
 const before=serializeCampaign(s);
 for(const value of [s,validateCampaign(JSON.parse(before))]){
  const info=cityInformation(value,c.id);assert.equal(info.state,'stale');
  const card=mapObjectMenu(value,{kind:'city',id:c.id}),detail=campaignInfoDetail(value,'city',c.id),list=campaignInfoMarkup(value,{type:'city',query:c.name,scope:'all'}).body;
  assert.ok(card.includes(info.label));assert.ok(sections(detail).includes(info.label));assert.ok(list.includes(info.label));
  assert.equal(fields(card)['金'],'4,321');assert.equal(fields(sections(detail))['本城金'],'4,321');
  assert.match(list,/>4,321</);assert.doesNotMatch(card+sections(detail)+list,/9,123/);
 }
 assert.equal(serializeCampaign(s),before);
});

test('foreign faction totals explicitly describe partial knowledge and own confirmed totals stay unqualified',()=>{
 const s=newCampaign(203,'guandu-200'),foreign=campaignInfoIndex(s).faction.find(f=>f.id!=='cao'&&f.id!=='neutral');
 const before=serializeCampaign(s),enemy=sections(campaignInfoDetail(s,'faction',foreign.id)),own=sections(campaignInfoDetail(s,'faction','cao'));
 assert.match(enemy,/<dt>已知据点<\/dt>/);assert.match(enemy,/<dt>可见现役兵<\/dt>/);assert.doesNotMatch(enemy,/不代表全势力实时总量|仅统计/);
 assert.doesNotMatch(enemy,/暂无出征军团|暂无进行中的战役/);assert.match(own,/<dt>现役兵力<\/dt>/);assert.doesNotMatch(own,/可见现役兵/);
 assert.equal(serializeCampaign(s),before);
});

test('unobserved geography never becomes a known neutral territory or a faction count',()=>{
 const s=newCampaign(203,'guandu-200');
 const knownNeutral=s.cities.filter(c=>c.owner==='neutral'&&cityInformation(s,c.id).state!=='unknown');
 const before=serializeCampaign(s),detail=campaignInfoDetail(s,'faction','neutral');
 if(!knownNeutral.length)assert.equal(detail.sections.length,0);
 else{
  const values=fields(sections(detail));assert.equal(values['已知据点'],String(knownNeutral.length));
  const names=detail.sections.find(x=>x.id==='cities').html;
  for(const c of s.cities.filter(c=>cityInformation(s,c.id).state==='unknown'))assert.ok(!names.includes(`data-id="${c.id}"`));
 }
 assert.equal(serializeCampaign(s),before);
});

test('muster roster and editor keep actual strength while the draft survives switching pages',()=>{
 const s=newCampaign(203,'guandu-200'),p=newCommand(s,'draft','xuchang'),c=s.cities.find(c=>c.id===p.city),u=c.units[0];
 const before=serializeCampaign(s);assert.equal(changeCommandUnit(s,p,u.id,'troops',2200),null);
 p.step='unit-review';const list=commandMarkup(s,{officerPick:p,personnel:{}},'').body;
 assert.match(list,/拟编/);assert.match(list,new RegExp(`data-command-troops="${u.id}"`));assert.match(list,/value="2200"/);
 p.step='formation';p.unitOfficer=u.id;const editor=commandMarkup(s,{officerPick:p,personnel:{}},'').body;
 assert.ok(editor.includes(`现役 ${u.troops} ·`));assert.match(editor,/→ 拟编 2200 人/);
 p.step='unit-review';assert.match(commandMarkup(s,{officerPick:p,personnel:{}},'').body,/value="2200"/);
 assert.equal(serializeCampaign(s),before);assert.equal(validateCampaign(JSON.parse(before)).cities.find(row=>row.id===c.id)?.units.find(v=>v.id===u.id)?.troops,u.troops);
});

test('departure guards include a stationed army and exclude it once traveling',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang');
 const guard=fieldFromCity(s,c.id,{ids:[c.units[1].id]}),leaving=c.units[0];
 const p=newCommand(s,'expedition',c.id);Object.assign(p,{step:'review',selected:[leaving.id],leader:leaving.id,advisor:leaving.id,destination:'chenliu'});
 for(const traveling of [false,true]){
  guard.travel=traveling?{from:c.id,to:'chenliu',road:'main',progress:0}:null;
  const before=serializeCampaign(s),html=commandMarkup(s,{officerPick:p,personnel:{}},'').body;
  const expected=c.units.filter(u=>u.id!==leaving.id&&!u.mission).reduce((n,u)=>n+u.troops,0)+(traveling?0:armyInfoCounts(s,guard).soldiers);
  assert.equal(fields(html)['可用守军'],expected.toLocaleString()+' 人');assert.equal(serializeCampaign(s),before);
 }
});

test('disabled city and army orders show a concise execution status',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),a=fieldFromCity(s,c.id,{ids:[c.units[1].id]});s.campaign.phase='executing';
 const before=serializeCampaign(s);
 for(const menu of [{kind:'city',id:c.id,group:'military'},{kind:'city',id:c.id,group:'personnel'},{kind:'army',id:a.id}]){
  const html=mapObjectMenu(s,menu);assert.match(html,/disabled/);assert.match(html,/执行中/);
 }
 assert.equal(serializeCampaign(s),before);
});
