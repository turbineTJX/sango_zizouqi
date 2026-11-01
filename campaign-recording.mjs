import {equippedTreasureIds,validTreasureLoadout} from './treasure-equipment.mjs';
// Record resolved presentation facts. Playback never simulates an alternative battle.
const states=new WeakMap();
const row=u=>[u.id,u.side,u.x,u.y,u.hp,u.maxHp,u.intent,u.status,equippedTreasureIds(u).join(',')];
const equal=(a,b)=>a?.length===b?.length&&a.every((v,i)=>v===b[i]);
function stateAt(recording,index){
 const rows=new Map();let gateHp=null,buildings=[];
 for(const frame of recording.frames.slice(0,index+1)){
  for(const value of frame.units)rows.set(value[0],value);
  if(frame.gateHp!==undefined)gateHp=frame.gateHp;
  if(frame.buildings)buildings=frame.buildings;
 }
 return {rows,gateHp,buildings};
}
export function recordCampaignFrame(r){
 if(!r.replay)return;const recording=r.replay,b=r.battle,last=recording.frames.at(-1);
 let cached=states.get(recording);
 if(!cached||cached.last!==last){cached={last,current:stateAt(recording,recording.frames.length-1),before:stateAt(recording,recording.frames.length-2)};}
 const same=last?.tick===b.tick,base=same?cached.before:cached.current;
 const current={rows:new Map(),gateHp:b.siege?.gate?.hp??null,buildings:(b.buildings||[]).map(x=>[x.id,x.hp])};
 const units=[];
 for(const side of b.sides)for(const u of side.units){
  r.templates[u.id]??=structuredClone(u);
  const value=row(u);current.rows.set(u.id,value);if(!equal(base.rows.get(u.id),value))units.push(value);
 }
 const frame={tick:b.tick,units};
 if(current.gateHp!==base.gateHp)frame.gateHp=current.gateHp;
 if(JSON.stringify(current.buildings)!==JSON.stringify(base.buildings))frame.buildings=current.buildings;
 if(same)recording.frames[recording.frames.length-1]=frame;else recording.frames.push(frame);
 states.set(recording,{last:frame,current,before:base});
}
export function readRecordedBattle(r,index,base){
 const frame=r.replay?.frames[index];if(!frame||!base)return null;
 const current=stateAt(r.replay,index),b=structuredClone(base);
 b.tick=frame.tick;b.effects=[];b.logs=[];b.result=null;
 b.sides.forEach((side,i)=>{side.units=[...current.rows.values()].filter(v=>v[1]===i).map(v=>({...structuredClone(r.templates[v[0]]),id:v[0],side:v[1],x:v[2],y:v[3],hp:v[4],maxHp:v[5],intent:v[6],status:v[7],treasureIds:v[8]?v[8].split(','):[],treasureId:undefined}));});
 if(b.siege?.gate&&current.gateHp!==null)b.siege.gate.hp=current.gateHp;
 for(const [id,hp]of current.buildings){const building=b.buildings?.find(x=>x.id===id);if(building)building.hp=hp;}
 return b;
}
export function validateCampaignRecording(r,fail){
 if(r.replay===undefined)return;
 const recording=r.replay,integer=(v,max)=>Number.isFinite(v)&&v>=0&&v<=max;
 fail(recording?.version===2&&Array.isArray(recording.frames)&&recording.frames.length>0&&recording.frames.length<=r.battle.maxTicks+1,'战场回放记录无效');
 for(const [index,frame]of recording.frames.entries()){
  fail(frame.tick===index&&frame.tick<=r.battle.tick&&Array.isArray(frame.units)&&frame.units.length<=Object.keys(r.templates).length,'战场回放时间无效');
  const ids=new Set();
  for(const v of frame.units){
   fail(Array.isArray(v)&&v.length===9&&r.templates[v[0]]&&!ids.has(v[0])&&v[1]===r.templates[v[0]].side&&Number.isInteger(v[2])&&v[2]>=-1&&v[2]<14&&Number.isInteger(v[3])&&v[3]>=-1&&v[3]<8&&integer(v[4],v[5])&&integer(v[5],1e9)&&v[5]>0&&integer(v[6],100)&&['active','reserve','defeated','withdrawn'].includes(v[7])&&typeof v[8]==='string'&&validTreasureLoadout({treasureIds:v[8]?v[8].split(','):[]}),'战场回放部队无效');
   ids.add(v[0]);
  }
  fail(frame.gateHp===undefined||frame.gateHp===null||integer(frame.gateHp,1e9),'战场回放城防无效');
  fail(frame.buildings===undefined||Array.isArray(frame.buildings)&&frame.buildings.length<100&&frame.buildings.every(v=>Array.isArray(v)&&v.length===2&&r.battle.buildings?.some(b=>b.id===v[0])&&integer(v[1],1e9)),'战场回放设施无效');
 }
 fail(recording.frames.at(-1).tick===r.battle.tick,'战场回放记录不完整');
}
