import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';
for(let seed=0;seed<200;seed++){
 const unit=id=>({id,type:'logistics',level:5,troops:3000});
 const s=createScenario('custom-battle',seed,20,null,{seed,terrain:'land',ownTeam:[unit('person-443')],enemyTeam:[unit('jin')]}),b=s.battle;
 lockDeployment(b);let cast=false,healing=0;
 while(!b.result){stepBattle(b);cast ||= b.enemyCommand.lastCommand?.key==='regenerate';healing+=b.effects.filter(e=>e.from==='jin'&&e.label==='救治伤兵'&&e.ongoing).reduce((n,e)=>n+(e.healing||0),0);}
 if(cast&&healing>0){console.log({seed,healing,ticks:b.tick});break;}
}
