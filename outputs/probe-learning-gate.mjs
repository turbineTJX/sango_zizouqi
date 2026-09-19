import {createScenario,SCENARIOS} from '../scenarios.mjs';
import {stepBattle,lockDeployment} from '../engine.mjs';
import {learnFixtureTactics} from '../tests/helpers/learn-tactics.mjs';
 const unit=(id,type,troops)=>({id,type,troops,level:5});
 // An authored siege fixture: enough gate durability to observe the period
 // after the defenders fall. No intent, cooldown or wounded ledger injection.
 const fixture={...SCENARIOS.find(s=>s.id==='siege'),id:'engine-gate-support',ownName:'攻城验证军',enemyName:'守城验证军',terrain:'land',gateHp:60000,limit:480,waves:[],ownAdvisor:'yu',enemyAdvisor:'jin',ownTeam:[unit('person-396','cavalry',6000),unit('person-636','spear',3000),unit('yu','crossbow',3000)],enemyTeam:[unit('jin','spear',1500),unit('yuanxia','archer',1500),unit('person-610','crossbow',1500)]};
SCENARIOS.push(fixture);
for(let seed=0;seed<100;seed++){
 const state=createScenario(fixture.id,seed),b=state.battle;b.sides.forEach(s=>s.tactic='balanced');
 const liu=b.sides[0].units.find(u=>u.id==='person-636'),yu=b.sides[0].units.find(u=>u.id==='yu');
 learnFixtureTactics(liu,['unique-person-636','phalanx','strike']);learnFixtureTactics(yu,['screen','seal','ambush']);lockDeployment(b);
 while(!b.result&&b.sides[1].units.some(u=>u.status==='active'&&u.hp>0))stepBattle(b);
 const a=liu.tacticCasts['unique-person-636']||0,z=yu.tacticCasts.screen||0;
 while(!b.result)stepBattle(b);
 if(liu.tacticCasts['unique-person-636']>a&&yu.tacticCasts.screen>z&&b.result.reason==='城门失守'){console.log('gate seed',seed);break;}
}
