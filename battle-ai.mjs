import {formationCells,formationTier} from './bond-battlefield.mjs';
import {isAreaStratagem,chooseStratagemPoint} from './stratagem-area.mjs';
import {isTargetable} from './engagement.mjs';
import {needsRemedy} from './battle-status-rules.mjs';
import {hasTrait} from './officer-traits.mjs';
import {tacticUsesLeft} from './tactic-tempo.mjs';
import {learnedTacticIds} from './tactic-learning.mjs';
import {canOccupy,unitTerrain} from './battlefield.mjs';
import {hexDistance} from './hex-grid.mjs';
import {unitAttributes,isRear} from './unit-stats.mjs';
import {validLoadout,configureTactics,unitTactics,hasStatus,NEGATIVE_STATUSES} from './tactics.mjs';
import {isMelee} from './engagement.mjs';
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
  const enemies=b.sides[0].units.filter(u=>u.status==='active'&&u.hp>0&&isTargetable(b,u));
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
    const support=(hasTrait(u,'formationSupport')||skills.some(s=>{
      if(s.effect==='repair')return friendlyBuilding;
      if(s.effect==='boarding')return pool.some(a=>a!==u&&a.type==='ship');
      return supportEffects.has(s.effect)||s.effect==='famous'&&s.mode==='support';
    }))&&pool.length>1;
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
  const hasFront=active.some(u=>isMelee(u));
  const injured=active.some(u=>u.hp<u.initial*.8);
  return waiting.map(u=>{
    const p=byUnit.get(u),damage=p.output/maxOutput,bulk=p.bulk/maxBulk;
    let score=55*damage+20*bulk+5*Math.min(1,u.intellect/100);
    if(lineTroop(u))score+=(lines<neededLines?28:4)*Math.sqrt(bulk)+16*cavalryShare*damage;
    if(isRear(u)&&hasFront)score+=10*damage;
    if(u.type==='cavalry')score+=(14*rearShare-14*lineShare-(['forest','marsh'].includes(b.terrain)?4:0))*damage;
    if(p.support)score+=(supports===0?(hasFront?34:12):injured?12:4)*p.aid/maxAid;
    if(attackingGate&&['siege','ram','tower'].includes(u.type))score+=(28+(p.skills.some(s=>s.effect==='ram')?12:0))*damage;
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
  const formation=formationTier(b,1)>0?formationCells(b,1):[];
  const active=units.filter(u=>u.status==='active'&&u.hp>0);
  const occupied=new Set(b.sides[0].units.filter(u=>u.status==='active').map(u=>`${u.x},${u.y}`));
  const frontRows=[3,4,2,5,1,6],wingRows=[1,6,0,7];
  // Visible enemy lanes inform flanking. Avoid spear/halberd concentrations
  // first, then approach exposed ranged troops; never inspect future RNG.
  const enemies=b.sides[0].units.filter(u=>u.status==='active'&&u.hp>0&&isTargetable(b,u));
  const lane=(y,predicate)=>enemies.filter(predicate).reduce((n,u)=>n+u.hp/(1+Math.abs(y-u.y)),0);
  const counters=u=>['spear','halberd'].includes(u.type);
  wingRows.sort((a,c)=>lane(a,counters)-lane(c,counters)||lane(c,isRear)-lane(a,isRear));
  const supportCore=active.filter(u=>['spear','halberd','cavalry'].includes(u.type)).sort(byStrength)[0];
  let front=0,wing=0,rear=0;
  // Place the line and damage dealers before auxiliaries, so the latter can
  // cover an actual friendly position instead of an unrelated preferred cell.
  for(const u of [...active].sort((a,c)=>Number(hasTrait(a,'formationSupport'))-Number(hasTrait(c,'formationSupport'))||Number(isRear(a))-Number(isRear(c))||a.id.localeCompare(c.id))){
    const preferredY=u.type==='ship'?[3,4][front++%2]:u.type==='cavalry'?wingRows[wing++%4]:isRear(u)?frontRows[rear++%6]:frontRows[front++%6];
    const preferredX=u.type==='ship'?10:u.type==='cavalry'?10:['siege','ram','tower'].includes(u.type)?12:isRear(u)?11:9;
    const candidates=[];
    for(let x=9;x<14;x++)for(let y=0;y<8;y++){
      if(!canOccupy(b,u,x,y)||occupied.has(`${x},${y}`))continue;
      const ground=unitTerrain(b,{...u,x,y});
      let score=Math.abs(x-preferredX)*4+Math.abs(y-preferredY)*2;
      if(hasTrait(u,'formationSupport')&&supportCore&&u!==supportCore){
        score+=Math.max(0,hexDistance({x,y},supportCore)-1)*20;
        if(x<supportCore.x)score+=20;
      }
      if(u.type==='cavalry')score+=({forest:7,marsh:10,hill:3,bridge:4}[ground]||0);
      if(['archer','crossbow','siege','tower'].includes(u.type)&&ground==='hill')score-=6;
      if(unitTactics(u).some(s=>s.id==='ambush')&&ground==='forest')score-=3;
      if(ground==='marsh')score+=3;
      if(formation.some(p=>p.x===x&&p.y===y))score-=u.bondGrowth?.levels.bondGuard?18:9;
      candidates.push({x,y,score});
    }
    candidates.sort((a,c)=>a.score-c.score||a.x-c.x||a.y-c.y);
    const cell=candidates[0];if(cell){u.x=cell.x;u.y=cell.y;occupied.add(`${u.x},${u.y}`);}
  }
}

// Fixed trigger order, independent of troop strength, expected benefit or RNG.
// Exclusive commands use their existing effect and keep the supplied list order.
export const COMMAND_TRIGGER_ORDER=Object.freeze(['magicImmunity','assault','disrupt','eightFormation','firestorm','range','rapidAdvance','haste','fortify','inspire','cycle','demoralize','blockade','relief','heal','regenerate','cleanse']);
export function chooseEnemyCommand(b,available,definitions,side=1){
  const own=b.sides[side],foe=b.sides[1-side],resource=side===0?b:b.enemyCommand;
  const active=s=>s.units.filter(u=>u.status==='active'&&u.hp>0);
  const allies=active(own),enemies=active(foe).filter(u=>isTargetable(b,u)),gate=b.siege?.gate;
  const targets=[...enemies,...(gate?.hp>0&&gate.side!==side?[gate]:[])];
  if(b.result||own.retreat||!allies.length||!targets.length)return null;
  const injured=()=>allies.some(u=>u.hp<u.maxHp&&Math.floor((u.battleDamage-(u.battleDeserted||0))*.35)>u.healed);
  const reserve=s=>s.units.some(u=>u.status==='reserve'&&u.hp>0);
  const triggers={
    assault:()=>targets.length>0,
    disrupt:()=>enemies.length>0,
    eightFormation:()=>enemies.length>0,
    firestorm:()=>enemies.some(u=>!hasStatus(b,u,'burn')),
    range:()=>allies.some(u=>['archer','crossbow'].includes(u.type)),
    haste:()=>true,
    rapidAdvance:()=>allies.some(u=>!hasStatus(b,u,'rapidAdvance')),
    magicImmunity:()=>allies.some(u=>!hasStatus(b,u,'magicImmune')),
    fortify:()=>enemies.length>0,
    inspire:()=>allies.some(u=>u.intent<100),
    cycle:()=>allies.some(u=>u.intent<100||unitTactics(u).some(s=>tacticUsesLeft(u,s)>0&&(u.skillReady[s.id]||0)>b.tick)),
    demoralize:()=>enemies.some(u=>u.intent>0),
    blockade:()=>reserve(foe),
    relief:()=>reserve(own),
    heal:injured,
    regenerate:injured,
    cleanse:()=>allies.some(u=>needsRemedy(b,u,'calm')),
  };
  for(const effect of COMMAND_TRIGGER_ORDER){
    for(const key of available){
      const s=definitions[key];
      if(!s||(s.effect||key)!==effect||(resource.commandReady[key]||0)>b.tick)continue;
      const target=s.side===0?own:foe;
      if(s.field&&(target[s.field]||0)>b.tick)continue;
      if(s.maxUses&&(own.stratagemUses?.[key]||0)>=s.maxUses)continue;
      if(isAreaStratagem(s)&&!chooseStratagemPoint(b,s,side))continue;
      if(triggers[effect]())return key;
    }
  }
  return null;
}
