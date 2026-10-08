import {newGame,makeOfficer,startBattle,configureBattleTerrain,fillSlots} from './engine.mjs';
import {validateCustomBattle,customRoles,customFrontlineCapacity} from './custom-battle.mjs';
import {initializeTacticLearning} from './tactic-learning.mjs';
import {setStatus} from './tactics.mjs';
import {planEnemyArmy} from './battle-ai.mjs';

// The only standalone battle constructor. Presets and editor drafts both enter
// through the same validation, officer creation, learning and deployment rules.
export function generateBattle(input,{id='custom-battle',name='自由对战',officerIds}={}){
  const draft=validateCustomBattle(input),state=newGame(draft.seed);
  state.testScenario={id,seed:draft.seed,shieldPercent:draft.shieldPercent,customBattle:structuredClone(draft),...(officerIds?{officerIds}:{})};
  const [own,enemy]=state.armies;
  for(const [army,key] of [[own,'ownTeam'],[enemy,'enemyTeam']]){
    army.units=draft[key].map((entry,i)=>{
      const u=makeOfficer(entry.id,entry.troops,i,entry.level,draft.seed);
      Object.assign(u,{type:entry.type,retreatAt:entry.retreatAt??null,formation:entry.formation||(['spear','halberd'].includes(entry.type)?'front':entry.type==='cavalry'?'left':'back'),first:entry.first??i<customFrontlineCapacity(draft,key)});
      return initializeTacticLearning(u,draft.seed);
    });
    Object.assign(army,customRoles(draft,key),{deputy:draft[key+'Roles']?.deputy??null,tactic:draft[key+'Tactic']||'balanced',morale:80,location:'guandu'});
  }
  const defending=draft.battleKind==='defense',city=state.cities.find(c=>c.id==='guandu');
  city.garrison=0;city.owner=defending?'cao':'yuan';
  state.pending={cityId:city.id,attackerId:defending?enemy.id:own.id,defenderIds:[defending?own.id:enemy.id],origin:'xuchang',defenderFaction:city.owner};
  startBattle(state,{deferEnemyDeployment:true});
  const b=state.battle;
  configureBattleTerrain(b,draft.terrain);b.maxTicks=draft.limit;
  if(draft.holdUntil)b.holdUntil=draft.holdUntil;
  // Assign by draft roster, before enemy AI selects any starters.
  let index=customFrontlineCapacity(draft,'enemyTeam');
  draft.waves.forEach((wave,i)=>{
    for(const entry of draft.enemyTeam.slice(index,index+wave.count)){
      const u=b.sides[1].units.find(u=>u.id===entry.id);u.wave=i+1;u.arrivalTick=wave.tick;
    }
    index+=wave.count;
  });
  if(draft.battleKind!=='field'){
    const side=defending?0:1;
    b.siege={attackerSide:1-side,gate:{id:'siege-gate',name:'城门',type:'gate',side,x:side===0?1:12,y:4,hp:draft.gateHp,maxHp:draft.gateHp}};
    const occupant=b.sides[side].units.find(u=>u.status==='active'&&u.x===b.siege.gate.x&&u.y===4);
    if(occupant){occupant.status='reserve';occupant.x=-1;occupant.y=-1;}
    fillSlots(b,0);
  }
  fillSlots(b,1);planEnemyArmy(b);
  if(b.siege&&draft.shieldPercent)for(const u of b.sides[b.siege.gate.side].units.filter(u=>u.status==='active')){
    setStatus(b,u,'shield',draft.limit,{amount:Math.round(u.initial*draft.shieldPercent/100),source:'siege:opening',label:'守城首发护盾'});
  }
  b.logs=[{tick:0,text:`${name}，双方军团已就绪。请在战前会议布阵后开战。`}];
  return state;
}
