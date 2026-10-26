import test from 'node:test';
import assert from 'node:assert/strict';
import {activitySinceDay,activityByFaction} from '../activity-query-index.mjs';
import {newCampaign} from '../strategic-campaign.mjs';
import {intelligenceWorld} from '../strategic-vision.mjs';
import {appendActivityNode} from '../activity-nodes.mjs';

test('recent factual windows include every boundary event and stay detached after append, reload and truncation',()=>{
 const nodes=[{day:1,read:false},{day:10,read:false},{day:10,read:false},{day:11,read:false}];
 assert.deepEqual(activitySinceDay([],1),[]);
 assert.deepEqual(activitySinceDay(nodes,0),nodes);
 assert.deepEqual(activitySinceDay(nodes,10),nodes.slice(1));
 assert.deepEqual(activitySinceDay(nodes,12),[]);
 const recent=activitySinceDay(nodes,10);recent.pop();
 nodes[1].read=true;assert.equal(recent[0].read,true);
 nodes.push({day:11,read:false},{day:20,read:false});
 assert.equal(activitySinceDay(nodes,11).length,3);
 assert.deepEqual(activitySinceDay(JSON.parse(JSON.stringify(nodes)),10),nodes.slice(1));
 nodes.length=1;assert.deepEqual(activitySinceDay(nodes,10),[]);
});

test('a deferred fog ledger keeps its original sequence boundary and only exposes its own faction',()=>{
 const s=newCampaign(317,'guandu-200','cao',{allAI:true});
 const add=faction=>appendActivityNode(s,{sourceId:'range:'+s.campaign.activity.nextSequence,category:'personnel',phase:'test',faction,text:'事实'});
 const first=add('cao');add('yuan');const view=intelligenceWorld(s,'cao');add('cao');
 const nodes=view.campaign.activity.nodes;assert.ok(nodes.includes(first));
 assert.ok(nodes.every(n=>n.faction==='cao'&&n.sequence<=first.sequence));
 nodes.pop();assert.ok(activityByFaction(s.campaign.activity.nodes,'cao').includes(first));
 assert.ok(intelligenceWorld(s,'cao').campaign.activity.nodes.length>nodes.length);
});
