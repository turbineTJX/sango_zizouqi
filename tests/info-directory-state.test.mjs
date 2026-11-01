import test from 'node:test';
import assert from 'node:assert/strict';
import {selectInfoDirectory,rememberInfoDirectory,campaignInfoMarkup} from '../campaign-info.mjs';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';

test('information categories and scopes retain independent filters without detail pollution',()=>{
 const ui={};selectInfoDirectory(ui,'officer','self');Object.assign(ui.infoView,{query:'曹',sort:'intellect',direction:'desc'});
 selectInfoDirectory(ui,'city','self');Object.assign(ui.infoView,{query:'许昌',sort:'grain',direction:'asc'});
 selectInfoDirectory(ui,'officer','all');ui.infoView.query='袁';
 assert.deepEqual(selectInfoDirectory(ui,'officer','self'),{type:'officer',scope:'self',query:'曹',sort:'intellect',direction:'desc'});
 rememberInfoDirectory(ui);ui.infoView={type:'officer',scope:'self',id:'cao',page:'能力'};
 assert.deepEqual(selectInfoDirectory(ui,'city','self'),{type:'city',scope:'self',query:'许昌',sort:'grain',direction:'asc'});
 assert.equal(selectInfoDirectory(ui,'officer','all').query,'袁');assert.equal(ui.infoView.id,undefined);
});

test('information search includes visible locations and remains scoped and read only',()=>{
 const s=newCampaign(203,'guandu-200'),before=serializeCampaign(s);
 const html=campaignInfoMarkup(s,{type:'officer',scope:'self',query:'许昌'});
 assert.equal(html.title,'武将情报');assert.match(html.body,/data-kind="officer" data-id="cao"/);
 assert.doesNotMatch(html.body,/data-kind="officer" data-id="shao"/);
 assert.match(campaignInfoMarkup(s,{type:'officer',scope:'self',query:'不存在的人员'}).body,/没有符合条件的记录/);
 assert.equal(serializeCampaign(s),before);
});
