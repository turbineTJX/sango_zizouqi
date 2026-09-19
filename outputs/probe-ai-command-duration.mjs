import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,configureUnitTactics} from '../engine.mjs';
import {SPECIAL_TACTICS} from '../tactics.mjs';
import {setupRulePlayer,unit} from '../scripts/custom-playability-lib.mjs';
const seed=12100000,id='person-661',draft={seed,terrain:'land',ownTeam:[unit(id,'cavalry',6000,5),unit('person-646','spear',1500,5),unit('person-123','logistics',1500,5)],enemyTeam:[unit('jin','spear'),unit('yuanxia','archer'),unit('person-610','crossbow')]};
const state=createScenario('custom-battle',seed,20,null,draft),b=state.battle;setupRulePlayer(state);configureUnitTactics(state,id,[SPECIAL_TACTICS[id],'gallop','relay']);lockDeployment(b);
let serial=0;const commands=[],trace=[];
while(!b.result){
 stepBattle(b);
 if(b.enemyCommand.commandSerial!==serial){serial=b.enemyCommand.commandSerial;commands.push({...b.enemyCommand.lastCommand});}
 if(b.tick>=440)trace.push({tick:b.tick,units:b.sides.flatMap(s=>s.units).filter(u=>u.status==='active').map(u=>({id:u.id,hp:u.hp,action:u.action})),damage:b.effects.filter(e=>e.damage>0).map(e=>({from:e.from,to:e.to,damage:e.damage}))});
}
console.log(JSON.stringify({result:b.result,ticks:b.tick,commands,trace},null,2));
