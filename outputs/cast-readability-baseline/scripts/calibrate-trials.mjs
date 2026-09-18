// Candidate sweep mutates only in-memory fixtures, never the saved catalog.
import {SCENARIOS,createScenario} from '../scenarios.mjs';
import {stepBattle,issueCommand,lockDeployment,battleStratagems,battleWounded,activeUnits} from '../engine.mjs';
export function commandTrial(b) {
  if(b.commandProgress<12000)return;
  const allowed=battleStratagems(b),own=activeUnits(b,0);
  const hurt=own.reduce((n,u)=>n+battleWounded(u),0)>own.reduce((n,u)=>n+u.initial,0)*.04;
  const options=[...(hurt?['regenerate','heal']:[]),'firestorm','assault','fortify','inspire'];
  for(const id of options)if(allowed.includes(id)&&issueCommand(b,id)===null)break;
}
export function sample(c,n=20,command=false) {
  let wins=0,draws=0,ticks=0,thirdWave=0;
  for(let i=0;i<n;i++) {
    const b=createScenario(c.id,c.seed+i).battle;lockDeployment(b);let entered=false;
    while(!b.result){if(command)commandTrial(b);stepBattle(b);entered ||= b.sides[1].units.some(u=>u.wave===3&&u.status==='active');}
    wins+=b.result.winner===0;draws+=b.result.winner===null;ticks+=b.tick;thirdWave+=entered;
  }
  return {id:c.id,enemyTroops:c.enemyTroops,n,command,wins,draws,seconds:Math.round(ticks*.7/n),thirdWave};
}
if(process.argv.includes('--sweep')) {
  const choices={field:[2300,2400,2500],outnumbered:[1100,1300,1500],reinforcements:[1500,1700,1900],siege:[1600,1700,1800],defense:[1200,1400,1600],rotation:[1500,1700,1900]};
  for(const c of SCENARIOS)for(const troops of choices[c.id]){c.enemyTroops=troops;for(const command of [false,true])console.log(JSON.stringify(sample(c,20,command)));}
}
