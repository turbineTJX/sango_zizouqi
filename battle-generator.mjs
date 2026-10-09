import {newGame,makeOfficer,startBattle,configureBattleTerrain,fillSlots} from './engine.mjs';
import {validateCustomBattle,customRoles,customFrontlineCapacity,customReserveEntries} from './custom-battle.mjs';
import {initializeTacticLearning} from './tactic-learning.mjs';
import {setStatus} from './tactics.mjs';
import {planEnemyArmy} from './battle-ai.mjs';
import {BATTLE_MAPS} from './data/design/battle-maps.mjs';

// The only standalone battle constructor. Presets and editor drafts both enter
// through the same validation, officer creation, learning and deployment rules.
export function generateBattle(input,{id='custom-battle',name='自由对战',officerIds}={}){
  const draft=validateCustomBattle(input),state=newGame(draft.seed);
  if(draft.mapId)name=BATTLE_MAPS[draft.mapId].name;
  state.testScenario={id,seed:draft.seed,shieldPercent:draft.shieldPercent,customBattle:structuredClone(draft),...(officerIds?{officerIds}:{})};
  const [own,enemy]=state.armies;
  const columns=[{army:own,key:'ownTeam',side:0},{army:enemy,key:'enemyTeam',side:1},...draft.reinforcements.map((a,i)=>({army:{...structuredClone(a.side===0?own:enemy),id:'a'+(i+3),name:a.name},key:a.side===0?'ownTeam':'enemyTeam',side:a.side,reinforcement:a,index:i}))];
  state.armies=columns.map(({army,key,reinforcement,index})=>{
    const entries=reinforcement?.team||draft[key],roles=reinforcement?.roles||customRoles(draft,key);
    army.units=entries.map((entry,i)=>{
      const u=makeOfficer(entry.id,entry.troops,i,entry.level,draft.seed);
      Object.assign(u,{type:entry.type,...(entry.treasureId?{treasureId:entry.treasureId}:{}),equipment:structuredClone(entry.equipment),retreatAt:entry.retreatAt??null,formation:entry.formation||(['spear','halberd'].includes(entry.type)?'front':entry.type==='cavalry'?'left':'back'),first:entry.first??i<customFrontlineCapacity({[key]:entries,[key+'Roles']:roles},key)});
      if(reinforcement)Object.assign(u,{reinforcementIndex:index,arrivalTick:reinforcement.tick??null,arrivalConfirmed:reinforcement.tick===0,wave:draft.waves.length+index+1,...(reinforcement.arrivalCondition?{arrivalCondition:structuredClone(reinforcement.arrivalCondition)}:{})});
      return initializeTacticLearning(u,draft.seed);
    });
    Object.assign(army,roles,{tactic:reinforcement?.tactic||draft[key+'Tactic']||'balanced',morale:80,location:'guandu',route:[],target:null});return army;
  });
  state.nextId=state.armies.length+1;
  const defending=draft.battleKind==='defense',city=state.cities.find(c=>c.id==='guandu');
  city.garrison=0;city.owner=defending?'cao':'yuan';
  state.pending={cityId:city.id,attackerId:defending?enemy.id:own.id,defenderIds:state.armies.filter(a=>a.faction===(defending?'cao':'yuan')).map(a=>a.id),origin:'xuchang',defenderFaction:city.owner};
  startBattle(state,{deferEnemyDeployment:true});
  const b=state.battle;b.reinforcementCouncil=null;b.battleEvents=draft.events.map(e=>({...e,triggeredAt:null}));
  // Assign by draft roster, before enemy AI selects any starters.
  const reserves=customReserveEntries(draft,'enemyTeam');let index=0;
  draft.waves.forEach((wave,i)=>{
    for(const entry of reserves.slice(index,index+wave.count)){
      const u=b.sides[1].units.find(u=>u.id===entry.id);u.wave=i+1;u.arrivalTick=wave.tick;
    }
    index+=wave.count;
  });
  if(draft.mapId){b.mapId=draft.mapId;b.terrain=null;}
  configureBattleTerrain(b,draft.terrain);b.maxTicks=draft.limit;
  if(draft.holdUntil)b.holdUntil=draft.holdUntil;
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
