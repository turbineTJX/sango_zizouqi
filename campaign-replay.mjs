import {readDailySnapshot} from './strategic-campaign.mjs';
import {readRecordedBattle} from './campaign-recording.mjs';
import {CAMPAIGN_TIME} from './combat-rules.mjs';
export function replayFrames(r){
 if(r.replay?.frames.length)return r.replay.frames.map((x,index)=>({day:r.startedDay+Math.floor(x.tick/CAMPAIGN_TIME.stepsPerDay),tick:x.tick,index,final:r.settled&&index===r.replay.frames.length-1}));
 const frames=r.snapshots.map(x=>({day:x.day,final:false}));
 if(r.settled)frames.push({day:r.endedDay,final:true});
 return frames;
}
export function replayFrame(r,index){
 const frames=replayFrames(r),frame=frames[Math.max(0,Math.min(frames.length-1,index))];
 if(!frame)return null;
 const battle=frame.index===undefined?(frame.final?structuredClone(r.battle):readDailySnapshot(r,frame.day)):readRecordedBattle(r,frame.index,readDailySnapshot(r,r.snapshots[0].day));
 if(frame.final&&battle)battle.result=structuredClone(r.battle.result);
 return {...frame,battle};
}
