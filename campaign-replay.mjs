import {readDailySnapshot} from './strategic-campaign.mjs';
export function replayFrames(r){
 const frames=r.snapshots.map(x=>({day:x.day,final:false}));
 if(r.settled)frames.push({day:r.endedDay,final:true});
 return frames;
}
export function replayFrame(r,index){
 const frames=replayFrames(r),frame=frames[Math.max(0,Math.min(frames.length-1,index))];
 return frame?{...frame,battle:frame.final?structuredClone(r.battle):readDailySnapshot(r,frame.day)}:null;
}
