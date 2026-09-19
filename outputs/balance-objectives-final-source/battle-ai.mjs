import {canOccupy,unitTerrain} from './battlefield.mjs';
import {hexDistance} from './hex-grid.mjs';
import {unitAttributes,isRear} from './unit-stats.mjs';
import {roleTacticIds,configureTactics,SPECIAL_TACTICS,unitTactics,hasStatus,NEGATIVE_STATUSES,availableTactics,TACTICS_BOOK,routeTo} from './tactics.mjs';
import {isMelee} from './engagement.mjs';
import {fireTerrainFactor} from './terrain-rules.mjs';
import {battleBuildings} from './building-rules.mjs';

function usableArmyLoadout(b,u,ids){
  // Only reject structurally impossible recipients. Distance, full health and
  // unopened cooldowns change during combat; living reserves count as allies.
  const others=b.sides[u.side].units.filter(a=>a!==u&&a.hp>0&&['active','reserve'].includes(a.status));
  const useful=id=>{
    const s=TACTICS_BOOK[id];
    if(s.effect==='repair')return battleBuildings(b).some(a=>a.side===u.side&&a.hp>0);
    if(id==='passage')return others.some(isMelee);
    if(s.effect==='boarding')return others.some(a=>a.type==='ship');
    if(s.effect==='navalRam')return b.sides[1-u.side].units.some(a=>a.type==='ship'&&a.hp>0&&['active','reserve'].includes(a.status));
    if(['rally','relay','supply','nexus','protect'].includes(s.effect))return others.length>0;
    return true;
  };
  const kept=new Set(ids.filter(useful));
  const replacements=[...roleTacticIds(u,'control'),...roleTacticIds(u,'assault'),...roleTacticIds(u,'guard'),...availableTactics(u).map(s=>s.id)];
  return ids.map(id=>{
    if(useful(id))return id;
    const replacement=replacements.find(key=>!kept.has(key)&&useful(key));
    if(!replacement)return id;
    kept.add(replacement);return replacement;
  });
}

// Enemy planning uses public combat information, stable ordering, and no RNG.
export function planEnemyArmy(b){
  if(b.tick!==0||b.deploymentLocked)return;
  const units=b.sides[1].units;
  const stats=new Map(units.map(u=>[u,unitAttributes(u,b)]));
  const strength=u=>Math.max(stats.get(u).attack,stats.get(u).martialPower,stats.get(u).strategyPower);
  const byStrength=(a,c)=>Number(c.status==='active')-Number(a.status==='active')||strength(c)-strength(a)||a.id.localeCompare(c.id);
  const core=units.filter(u=>u.type!=='logistics'&&u.hp>0).sort(byStrength)[0];
  const tanks=units.filter(u=>['spear','halberd'].includes(u.type)&&u.hp>0).sort((a,c)=>Number(c.status==='active')-Number(a.status==='active')||c.hp*stats.get(c).defense-a.hp*stats.get(a).defense||a.id.localeCompare(c.id));
  const healer=units.filter(u=>u.hp>0&&['logistics','crossbow','cavalry'].includes(u.type)&&!(u===core&&u.type==='cavalry'&&u.force>=u.intellect)).sort((a,c)=>Number(c.status==='active')-Number(a.status==='active')||Number(c.type==='logistics')-Number(a.type==='logistics')||(c.type==='logistics'?c.politics*1.4+c.intellect*.6:c.intellect)-(a.type==='logistics'?a.politics*1.4+a.intellect*.6:a.intellect)||a.id.localeCompare(c.id))[0];
  for(const u of units){
    const clever=u.intellect>u.force+10;
    const role=u===healer&&units.length>=3?'guard':u===tanks[0]&&units.some(isRear)?'guard':clever?'control':'assault';
    let ids=roleTacticIds(u,role);
    // Repair has no target in a field battle. Replace only that dead slot;
    // preserve the planner's healing, cleansing and other support choices.
    if(u.type==='logistics'&&!battleBuildings(b).some(a=>a.side===1&&a.hp>0))ids=ids.map(id=>id==='camp'?'passage':id);
    if(u.type==='archer'&&b.terrain==='forest')ids=clever?['wildfire','smoke','rally']:['fire','scatter','suppress'];
    const special=SPECIAL_TACTICS[u.id];
    if(special)ids=[special,...ids].slice(0,3);
    configureTactics(u,usableArmyLoadout(b,u,ids));
    u.formation=u.type==='cavalry'?'left':isRear(u)?'back':'front';
  }
  const active=units.filter(u=>u.status==='active'&&u.hp>0);
  const occupied=new Set(b.sides[0].units.filter(u=>u.status==='active').map(u=>`${u.x},${u.y}`));
  const frontRows=[3,4,2,5,1,6],wingRows=[1,6,0,7];
  // Visible enemy lanes inform flanking. Avoid spear/halberd concentrations
  // first, then approach exposed ranged troops; never inspect future RNG.
  const enemies=b.sides[0].units.filter(u=>u.status==='active'&&u.hp>0);
  const lane=(y,predicate)=>enemies.filter(predicate).reduce((n,u)=>n+u.hp/(1+Math.abs(y-u.y)),0);
  const counters=u=>['spear','halberd'].includes(u.type);
  wingRows.sort((a,c)=>lane(a,counters)-lane(c,counters)||lane(c,isRear)-lane(a,isRear));
  const supportCore=active.filter(u=>['spear','halberd','cavalry'].includes(u.type)).sort(byStrength)[0];
  let front=0,wing=0,rear=0;
  // Place the line and damage dealers before auxiliaries, so the latter can
  // cover an actual friendly position instead of an unrelated preferred cell.
  for(const u of [...active].sort((a,c)=>Number(a.type==='logistics')-Number(c.type==='logistics')||Number(isRear(a))-Number(isRear(c))||a.id.localeCompare(c.id))){
    const preferredY=u.type==='ship'?[3,4][front++%2]:u.type==='cavalry'?wingRows[wing++%4]:isRear(u)?frontRows[rear++%6]:frontRows[front++%6];
    const preferredX=u.type==='ship'?10:u.type==='cavalry'?10:u.type==='siege'?12:isRear(u)?11:9;
    const candidates=[];
    for(let x=9;x<14;x++)for(let y=0;y<8;y++){
      if(!canOccupy(b,u,x,y)||occupied.has(`${x},${y}`))continue;
      const ground=unitTerrain(b,{...u,x,y});
      let score=Math.abs(x-preferredX)*4+Math.abs(y-preferredY)*2;
      if(u.type==='logistics'&&supportCore){
        score+=Math.max(0,hexDistance({x,y},supportCore)-1)*20;
        if(x<supportCore.x)score+=20;
      }
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

export function chooseEnemyCommand(b,available,definitions,side=1){
  const own=b.sides[side],foe=b.sides[1-side],resource=side===0?b:b.enemyCommand,active=s=>s.units.filter(u=>u.status==='active'&&u.hp>0);
  const allies=active(own),enemies=active(foe);
  const gate=b.siege?.gate,targets=[...enemies,...(gate?.hp>0&&gate.side!==side?[gate]:[])];
  if(own.retreat||!allies.length||!targets.length)return null;
  const wounded=u=>Math.max(0,Math.floor((u.battleDamage-(u.battleDeserted||0))*.35)-u.healed);
  const engaged=allies.filter(u=>enemies.some(e=>hexDistance(u,e)<=unitAttributes(u,b).range+1));
  const attacking=allies.filter(u=>targets.some(e=>hexDistance(u,e)<=unitAttributes(u,b).range+1));
  const injured=allies.filter(u=>wounded(u)>0);
  const recovering=injured.filter(u=>Math.floor(u.initial*.01)>0);
  const negatives=allies.reduce((n,u)=>n+NEGATIVE_STATUSES.filter(k=>hasStatus(b,u,k)).reduce((v,k)=>v+(['stun','confuse','burn','scorch','plague'].includes(k)?3:1),0),0);
  const scores={
    cleanse:negatives?80+negatives*5:0,
    heal:injured.length?50+injured.reduce((n,u)=>n+Math.min(wounded(u),u.initial*.08)/u.initial*150,0):0,
    // A lone wounded unit still benefits. Use the immediate-heal value scale
    // so equal recovery favors heal, while a larger recoverable pool can favor
    // regeneration. Existing multi-unit priorities remain intact.
    regenerate:recovering.length>=2?65+recovering.length*4:recovering.length?50+Math.min(wounded(recovering[0]),Math.floor(recovering[0].initial*.01)*definitions.regenerate.duration)/recovering[0].initial*150:0,
    inspire:allies.reduce((n,u)=>n+Math.min(35,100-u.intent),0)/3,
    demoralize:enemies.reduce((n,u)=>n+Math.min(45,u.intent),0)/4,
    cycle:allies.reduce((n,u)=>n+Math.min(15,100-u.intent)/3+Object.values(u.skillReady).reduce((sum,t)=>sum+Math.min(4,Math.max(0,t-b.tick)),0)*1.5,0),
    firestorm:engaged.length?enemies.reduce((n,u)=>n+(hasStatus(b,u,'scorch')?0:12*fireTerrainFactor(b,u)),0):0,
    assault:attacking.length?35+attacking.length*5:0,
    fortify:engaged.length?32+engaged.filter(u=>u.hp/u.initial<.8).length*8:0,
    disrupt:engaged.length?40+enemies.length*4:0,
    range:allies.filter(u=>['archer','crossbow'].includes(u.type)&&targets.some(e=>hexDistance(u,e)>unitAttributes(u,b).range&&hexDistance(u,e)<=unitAttributes(u,b).range+2)).length*25,
    haste:allies.filter(u=>!isRear(u)&&unitAttributes(u,b).move>0&&targets.every(e=>hexDistance(u,e)>unitAttributes(u,b).range)&&targets.some(e=>routeTo(b,u,e,112,{range:unitAttributes(u,b).range,charging:false})?.length)).length*12,
    blockade:foe.units.some(u=>u.status==='reserve'&&u.hp>0&&(u.arrivalTick||0)<=b.tick+10)&&(enemies.length<6||enemies.some(u=>u.hp/u.initial<.4))?65:0,
    relief:own.units.some(u=>u.status==='reserve'&&u.hp>0&&(u.arrivalTick||0)<=b.tick+16)&&allies.some(u=>u.hp/u.initial<.5)?55:0,
  };
  // A full single-unit inspire (30+ useful intent), single-target demoralize
  // and land firestorm can be useful below the general multi-unit threshold.
  const minimumScore={inspire:10,demoralize:10,firestorm:10,haste:12};
  const options=available.filter(key=>{
    if((resource.commandReady[key]||0)>b.tick)return false;
    const s=definitions[key],target=s.side===0?own:foe;
    return !s.field||(target[s.field]||0)<=b.tick;
  }).map(key=>({key,score:scores[key]||0})).filter(o=>o.score>=(minimumScore[o.key]??20));
  options.sort((a,c)=>c.score-a.score||a.key.localeCompare(c.key));
  return options[0]?.key||null;
}
