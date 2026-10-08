import {learnedTacticIds} from './tactic-learning.mjs';
import {canOccupy,unitTerrain} from './battlefield.mjs';
import {hexDistance} from './hex-grid.mjs';
import {unitAttributes,isRear} from './unit-stats.mjs';
import {validLoadout,configureTactics,unitTactics,hasStatus,NEGATIVE_STATUSES,routeTo} from './tactics.mjs';
import {isMelee} from './engagement.mjs';
import {fireTerrainFactor} from './terrain-rules.mjs';
import {battleBuildings} from './building-rules.mjs';

const supportEffects=new Set(['screen','relay','bandage','regrowth','purify','cleanse','supply','rally','mirage','mist','boarding','nexus','protect','aura']);
const offensiveEffects=new Set(['cleave','curse','blight','bombard','ram','plague','tremor','navalRam','broadside','undertow','confuse','harass','ambush','suppress','pierce','strike','thrust','scatter','wildfire','seal','lure','undermine','rush','terror','retreatShot','repeat','fire','taunt']);
const lineTroop=u=>['spear','halberd'].includes(u.type);

// Rank only arrived reserves. Never reorder the persistent unit/action array,
// inspect future learning/RNG, replace active troops or alter their tactics.
// fillSlots re-evaluates after each successful entry to value missing roles.
export function rankEnemyReserves(b,candidates){
  const active=b.sides[1].units.filter(u=>u.status==='active'&&u.hp>0);
  const waiting=candidates.filter(u=>u.status==='reserve'&&u.hp>0&&(u.arrivalTick||0)<=b.tick);
  const pool=[...active,...waiting];
  const enemies=b.sides[0].units.filter(u=>u.status==='active'&&u.hp>0);
  const enemyHp=enemies.reduce((n,u)=>n+u.hp,0)||1;
  const cavalryShare=enemies.filter(u=>u.type==='cavalry').reduce((n,u)=>n+u.hp,0)/enemyHp;
  const lineShare=enemies.filter(lineTroop).reduce((n,u)=>n+u.hp,0)/enemyHp;
  const rearShare=enemies.filter(isRear).reduce((n,u)=>n+u.hp,0)/enemyHp;
  const gate=b.siege?.gate,attackingGate=gate?.hp>0&&gate.side===0;
  const friendlyBuilding=battleBuildings(b).some(a=>a.side===1&&a.hp>0);
  const profile=u=>{
    // Compare strength without giving an already deployed unit a cell bonus.
    const stats=unitAttributes({...u,status:'reserve'},b),skills=unitTactics(u);
    const offense=skills.filter(s=>offensiveEffects.has(s.effect)||s.effect==='famous'&&s.mode==='attack');
    const support=skills.some(s=>{
      if(s.effect==='repair')return friendlyBuilding;
      if(s.effect==='boarding')return pool.some(a=>a!==u&&a.type==='ship');
      if(s.effect==='aura')return pool.some(a=>a!==u&&isMelee(a));
      return supportEffects.has(s.effect)||s.effect==='famous'&&s.mode==='support';
    })&&pool.length>1;
    return {u,skills,stats,support,
      output:Math.max(stats.attack*3/stats.attackInterval,offense.some(s=>s.category==='force')?stats.martialPower*.9:0,offense.some(s=>s.category==='intellect')?stats.strategyPower*.9:0),
      bulk:u.hp*(1+stats.defense/100),
      aid:support?Math.max(stats.supportPower,stats.strategyPower):0};
  };
  const profiles=pool.map(profile),byUnit=new Map(profiles.map(p=>[p.u,p]));
  const maximum=key=>Math.max(1,...profiles.map(p=>p[key]));
  const maxOutput=maximum('output'),maxBulk=maximum('bulk'),maxAid=maximum('aid');
  const lines=active.filter(lineTroop).length,neededLines=pool.length>=4?2:1;
  const supports=active.filter(u=>byUnit.get(u).support).length;
  const hasFront=active.some(u=>isMelee(u)&&u.type!=='logistics');
  const injured=active.some(u=>u.hp<u.initial*.8);
  return waiting.map(u=>{
    const p=byUnit.get(u),damage=p.output/maxOutput,bulk=p.bulk/maxBulk;
    let score=55*damage+20*bulk+5*Math.min(1,u.intellect/100);
    if(lineTroop(u))score+=(lines<neededLines?28:4)*Math.sqrt(bulk)+16*cavalryShare*damage;
    if(isRear(u)&&hasFront)score+=10*damage;
    if(u.type==='cavalry')score+=(14*rearShare-14*lineShare-(['forest','marsh'].includes(b.terrain)?4:0))*damage;
    if(p.support)score+=(supports===0?(hasFront?34:12):injured?12:4)*p.aid/maxAid;
    if(attackingGate&&u.type==='siege')score+=(28+(p.skills.some(s=>s.effect==='ram')?12:0))*damage;
    return {unit:u,score};
  }).sort((a,c)=>c.score-a.score||a.unit.id.localeCompare(c.unit.id)).map(p=>p.unit);
}

// Enemy planning uses public combat information, stable ordering, and no RNG.
export function planEnemyArmy(b){
  if(b.tick!==0||b.deploymentLocked)return;
  const units=b.sides[1].units;
  const stats=new Map(units.map(u=>[u,unitAttributes(u,b)]));
  const strength=u=>Math.max(stats.get(u).attack,stats.get(u).martialPower,stats.get(u).strategyPower);
  const byStrength=(a,c)=>Number(c.status==='active')-Number(a.status==='active')||strength(c)-strength(a)||a.id.localeCompare(c.id);
  for(const u of units){
    // Learning, not the opponent or role template, determines the loadout.
    if(!validLoadout(u,u.tactics))configureTactics(u,learnedTacticIds(u));
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
