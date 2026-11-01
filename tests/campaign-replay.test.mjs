import test from 'node:test';
import assert from 'node:assert/strict';
import {recordedCampaign as encounter,completedRecording} from './helpers/recorded-campaign.mjs';
import {advanceCampaignStep,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {replayFrame,replayFrames} from '../campaign-replay.mjs';
const visual=b=>b.sides.flatMap(s=>s.units).map(u=>[u.id,u.side,u.x,u.y,u.hp,u.maxHp,u.intent,u.status]);
test('recorded combat steps reproduce actual resolved positions, troops and intent without resimulation',()=>{
 const {s,r}=encounter(),trace=[visual(r.battle)];
 for(let i=0;i<12;i++){advanceCampaignStep(s);trace.push(visual(r.battle));}
 assert.equal(r.replay.frames.length,r.battle.tick+1);
 const before=serializeCampaign(s);
 for(let i=trace.length-1;i>=0;i--){const frame=replayFrame(r,i);assert.equal(frame.tick,i);assert.deepEqual(visual(frame.battle),trace[i]);}
 const frame=replayFrame(r,3);frame.battle.sides[0].units[0].hp=0;
 assert.deepEqual(visual(replayFrame(r,3).battle),trace[3]);assert.equal(serializeCampaign(s),before);
});
test('save continuation records identical compact replay and rejects tampered replay time and units',()=>{
 const {s,r}=encounter();for(let i=0;i<4;i++)advanceCampaignStep(s);
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));
 for(let i=0;i<5;i++){advanceCampaignStep(s);advanceCampaignStep(restored);}
 assert.equal(serializeCampaign(s),serializeCampaign(restored));
 for(const corrupt of [x=>x.frames[1].tick=99,x=>x.frames[0].units[0][4]=-1,x=>x.frames.pop()]){
  const copy=JSON.parse(serializeCampaign(s));corrupt(copy.campaign.battles.find(b=>b.id===r.id).replay);assert.throws(()=>validateCampaign(copy),/回放/);
 }
});
test('existing daily recordings remain readable and seeking never changes their source',()=>{
 const {r}=encounter();delete r.replay;const original=JSON.stringify(r);
 assert.equal(replayFrames(r).length,r.snapshots.length);assert.ok(replayFrame(r,0).battle);
 assert.equal(JSON.stringify(r),original);
});
test('completed real battle records its actual final result while keeping earlier times independent',()=>{
 const {s,r}=completedRecording();validateCampaign(JSON.parse(serializeCampaign(s)));
 const frames=replayFrames(r),before=serializeCampaign(s);
 assert.ok(frames.length>2);assert.ok(frames.at(-1).final);
 assert.deepEqual(replayFrame(r,frames.length-1).battle.result,r.battle.result);
 assert.equal(replayFrame(r,0).battle.result,null);assert.equal(serializeCampaign(s),before);
});
test('presentation recording does not change the common clock, RNG or combat results',()=>{
 const {s}=encounter(),without=validateCampaign(JSON.parse(serializeCampaign(s)));
 for(const r of without.campaign.battles)delete r.replay;
 const normalize=value=>{const copy=JSON.parse(serializeCampaign(value));for(const r of copy.campaign.battles)delete r.replay;return copy;};
 for(let i=0;i<30;i++){advanceCampaignStep(s);advanceCampaignStep(without);assert.deepEqual(normalize(s),normalize(without));}
});
