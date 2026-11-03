import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {intelligenceWorld,updateVision} from '../strategic-vision.mjs';
import {campaignInfoIndex} from '../campaign-info.mjs';
import {campaignCurrentStatus} from '../campaign-info-status.mjs';
const status=(s,type,entry)=>Object.fromEntries(campaignCurrentStatus(s,type,entry,campaignInfoIndex(s)));
function visibleForeignCivilian(){
 const s=newCampaign(203),officer=s.campaign.idle.find(o=>o.faction==='yuan'&&!s.cities.some(c=>c.governor===o.unit.id));assert.ok(officer);
 const c=s.cities.find(c=>c.id===officer.location),sights=s.campaign.vision.factions.cao;
 sights.scouted.push({id:sights.nextSightId++,officerId:'cao',x:c.x,y:c.y,location:c.id,seenDay:s.campaign.day,expiresDay:s.campaign.day+30});updateVision(s);
 return {s,c,officer};
}
test('foreign administration hidden by intelligence is unknown rather than empty',()=>{
 const s=newCampaign(203,'guandu-200'),enemy=s.cities.find(c=>c.owner&&c.owner!=='cao'&&c.units.length);
 for(const busy of [false,true]){
  if(busy)s.campaign.domestic.assignments.push({cityId:enemy.id,officerId:enemy.units[0].id,direction:'military',action:{key:'secret-work',remaining:7}});
  const before=serializeCampaign(s),view=intelligenceWorld(s),c=view.cities.find(c=>c.id===enemy.id),values=status(view,'city',c);
  assert.equal(values['正在办理'],'未知');assert.equal(values['待执行命令'],'未知');
  assert.equal(status(view,'faction',{id:enemy.owner})['内政事务'],'未知');
  assert.equal(serializeCampaign(s),before);
 }
});
test('own empty administration still reports a confirmed zero',()=>{
 const s=newCampaign(203,'guandu-200'),view=intelligenceWorld(s),c=view.cities.find(c=>c.owner==='cao');
 assert.equal(status(view,'city',c)['正在办理'],'暂无正在办理的内政事务');assert.equal(status(view,'city',c)['待执行命令'],'0 项');
 assert.equal(status(view,'faction',{id:'cao'})['内政事务'],'0 项办理中');
});

test('visible foreign city work page does not turn hidden assignments into an empty work roster',async()=>{
 const {campaignInfoDetail}=await import('../campaign-info.mjs');
 const s=newCampaign(203,'guandu-200'),before=serializeCampaign(s),detail=campaignInfoDetail(s,'city','atlas-jingkou'),work=detail.sections.find(x=>x.id==='work').html;
 assert.match(work,/未知/);assert.doesNotMatch(work,/<table/);assert.equal(serializeCampaign(s),before);
});
test('visible foreign civilian is present in town but not asserted to be idle',()=>{
 const {s,c}=visibleForeignCivilian(),view=intelligenceWorld(s);
 const entry=campaignInfoIndex(view).officer.find(r=>r.city===c.id&&!r.prepared&&r.unit.id!==c.governor);assert.ok(entry);
 const values=status(view,'officer',entry);assert.equal(values['动向'],'在城');
 assert.equal(status(view,'faction',{id:c.owner})['调任途中'],'未知');
});

test('foreign officer detail consistently marks hidden orders and omits diplomatic deliberation',async()=>{
 const {campaignInfoDetail}=await import('../campaign-info.mjs');
 const {s,officer}=visibleForeignCivilian(),r=campaignInfoIndex(s).officer.find(r=>r.unit.id===officer.unit.id);
 assert.ok(r);s.campaign.diplomacy.assignments.push({officerId:r.unit.id,direction:'commerce',waiting:'SECRET_DIPLOMATIC_WAIT'});
 const before=serializeCampaign(s),detail=campaignInfoDetail(s,'officer',r.unit.id),work=detail.sections.find(x=>x.id==='work').html;
 assert.match(work,/内政任职<\/dt><dd>未知/);assert.match(work,/当前事务<\/dt><dd>未知/);assert.match(work,/等待命令<\/dt><dd>未知/);
 assert.doesNotMatch(detail.sections.map(x=>x.html).join(''),/SECRET_DIPLOMATIC_WAIT/);assert.equal(serializeCampaign(s),before);
});
