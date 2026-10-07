import test from 'node:test';import assert from 'node:assert/strict';
import {battleDay,battleDays,battleTimeText,battleSteps} from '../player-time.mjs';
import {newCampaign} from '../strategic-campaign.mjs';
import {campaignBattleBar} from '../strategic-view.mjs';
test('player dates distinguish current day and completed duration without exposing steps',()=>{
 assert.equal(battleDay(48),3);assert.equal(battleDays(48),2);assert.equal(battleSteps(15),360);
 assert.equal(battleTimeText({tick:48,maxTicks:720,deploymentLocked:true}),'交战第 3 天 · 最多 30 天');
 assert.equal(battleTimeText({tick:720,maxTicks:720,deploymentLocked:true}),'交战第 30 天 · 最多 30 天');
 const s=newCampaign();s.campaign.day=10;s.campaign.stepInDay=0;s.campaign.focusId='test';s.campaign.battles.push({id:'test',startedDay:8});const html=campaignBattleBar(s);assert.match(html,/交战第 3 天/);assert.doesNotMatch(html,/日内|0\/24|720/);
});
