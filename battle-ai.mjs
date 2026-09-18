import {canOccupy,unitTerrain} from './battlefield.mjs';
import {hexDistance} from './hex-grid.mjs';
import {unitAttributes,isRear} from './unit-stats.mjs';
import {roleTacticIds,configureTactics,SPECIAL_TACTICS,unitTactics,hasStatus,NEGATIVE_STATUSES} from './tactics.mjs';
import {fireTerrainFactor} from './terrain-rules.mjs';

// Enemy planning uses public combat information, stable ordering, and no RNG.
export function planEnemyArmy(b){
  if(b.tick!==0||b.deploymentLocked)return;
  const units=b.sides[1].units;
  const tanks=units.filter(u=>['spear','halberd'].includes(u.type)).sort((a,c)=>Number(c.status==='active')-Number(a.status==='active')||c.leadership-a.leadership||a.id.localeCompare(c.id));
  const healer=units.filter(u=>['logistics','crossbow','cavalry'].includes(u.type)).sort((a,c)=>Number(c.status==='active')-Number(a.status==='active')||Number(c.type==='logistics')-Number(a.type==='logistics')||c.intellect-a.intellect||a.id.localeCompare(c.id))[0];
  for(const u of units){
    const clever=u.intellect>u.force+10;
    const role=u===healer&&units.length>=3?'guard':u===tanks[0]&&units.some(isRear)?'guard':clever?'control':'assault';
    let ids=roleTacticIds(u,role);
    if(u.type==='archer'&&b.terrain==='forest')ids=clever?['wildfire','smoke','rally']:['fire','scatter','suppress'];
    const special=SPECIAL_TACTICS[u.id];
    if(special)ids=[special,...ids].slice(0,3);
    configureTactics(u,ids);
    u.formation=u.type==='cavalry'?'left':isRear(u)?'back':'front';
  }
  const active=units.filter(u=>u.status==='active'&&u.hp>0);
  const occupied=new Set(b.sides[0].units.filter(u=>u.status==='active').map(u=>`${u.x},${u.y}`));
  const frontRows=[3,4,2,5,1,6],wingRows=[1,6,0,7];
  let front=0,wing=0,rear=0;
  for(const u of [...active].sort((a,c)=>Number(isRear(a))-Number(isRear(c))||a.id.localeCompare(c.id))){
    const preferredY=u.type==='ship'?[3,4][front++%2]:u.type==='cavalry'?wingRows[wing++%4]:isRear(u)?frontRows[rear++%6]:frontRows[front++%6];
    const preferredX=u.type==='ship'?10:u.type==='cavalry'?10:u.type==='siege'?12:isRear(u)?11:9;
    const candidates=[];
    for(let x=9;x<14;x++)for(let y=0;y<8;y++){
      if(!canOccupy(b,u,x,y)||occupied.has(`${x},${y}`))continue;
      const ground=unitTerrain(b,{...u,x,y});
      let score=Math.abs(x-preferredX)*4+Math.abs(y-preferredY)*2;
      if(u.type==='cavalry')score+=({forest:7,marsh:10,hill:3,bridge:4}[ground]||0);
      if(['archer','crossbow','siege'].includes(u.type)&&ground==='hill')score-=6;
      if(unitTactics(u).some(s=>s.id==='ambush')&&ground==='forest')score-=3;
      if(ground==='marsh')score+=3;
      candidates.push({x,y,score});
    }
    candidates.sort((a,c)=>a.score-c.score||a.x-c.x||a.y-c.y);
    const cell=candidates[0];if(cell){u.x=cell.x;u.y=cell.y;occupied.add(`${u.x},${u.y}`);}
  }
}

export function chooseEnemyCommand(b,available,definitions){
  const own=b.sides[1],foe=b.sides[0],active=s=>s.units.filter(u=>u.status==='active'&&u.hp>0);
  const allies=active(own),enemies=active(foe);
  if(own.retreat||!allies.length||!enemies.length)return null;
  const wounded=u=>Math.max(0,Math.floor((u.battleDamage-(u.battleDeserted||0))*.35)-u.healed);
  const engaged=allies.filter(u=>enemies.some(e=>hexDistance(u,e)<=unitAttributes(u,b).range+1));
  const injured=allies.filter(u=>wounded(u)>0);
  const negatives=allies.reduce((n,u)=>n+NEGATIVE_STATUSES.filter(k=>hasStatus(b,u,k)).reduce((v,k)=>v+(['stun','confuse','burn','scorch','plague'].includes(k)?3:1),0),0);
  const scores={
    cleanse:negatives?80+negatives*5:0,
    heal:injured.length?50+injured.reduce((n,u)=>n+Math.min(wounded(u),u.initial*.08)/u.initial*150,0):0,
    regenerate:injured.length>=2?65+injured.length*4:0,
    inspire:allies.reduce((n,u)=>n+Math.min(35,100-u.intent),0)/3,
    demoralize:enemies.reduce((n,u)=>n+Math.min(45,u.intent),0)/4,
    cycle:allies.reduce((n,u)=>n+Object.values(u.skillReady).reduce((sum,t)=>sum+Math.min(6,Math.max(0,t-b.tick)),0),0)*1.5,
    firestorm:engaged.length?enemies.reduce((n,u)=>n+(hasStatus(b,u,'scorch')?0:12*fireTerrainFactor(b,u)),0):0,
    assault:engaged.length?35+engaged.length*5:0,
    fortify:engaged.length?32+engaged.filter(u=>u.hp/u.initial<.8).length*8:0,
    disrupt:engaged.length?40+enemies.length*4:0,
    range:allies.filter(u=>['archer','crossbow'].includes(u.type)&&enemies.some(e=>hexDistance(u,e)>unitAttributes(u,b).range&&hexDistance(u,e)<=unitAttributes(u,b).range+2)).length*25,
    haste:allies.filter(u=>!isRear(u)&&enemies.every(e=>hexDistance(u,e)>unitAttributes(u,b).range)).length*12,
    blockade:foe.units.some(u=>u.status==='reserve'&&u.hp>0&&(u.arrivalTick||0)<=b.tick+10)&&(enemies.length<6||enemies.some(u=>u.hp/u.initial<.4))?65:0,
    relief:own.units.some(u=>u.status==='reserve'&&u.hp>0&&(u.arrivalTick||0)<=b.tick+16)&&allies.some(u=>u.hp/u.initial<.5)?55:0,
  };
  const options=available.filter(key=>{
    if((b.enemyCommand.commandReady[key]||0)>b.tick)return false;
    const s=definitions[key],target=s.side===0?own:foe;
    return !s.field||(target[s.field]||0)<=b.tick;
  }).map(key=>({key,score:scores[key]||0})).filter(o=>o.score>=20);
  options.sort((a,c)=>c.score-a.score||a.key.localeCompare(c.key));
  return options[0]?.key||null;
}
