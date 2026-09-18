import {writeFileSync,mkdirSync} from 'node:fs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,unitAttributes,issueCommand,lockDeployment,COMBAT} from '../engine.mjs';
import {unitTactics} from '../tactics.mjs';

const probes={};
// Compare absolute troop strength as well as almost-defeated units.
probes.strength=[1,1800,3000].map(hp=>{
  const b=createScenario('field',1).battle,u=b.sides[0].units[0];
  u.hp=hp;u.maxHp=hp===1?3000:hp;
  return {hp,maxHp:u.maxHp,strength:unitAttributes(u,b).strength,attack:unitAttributes(u,b).attack};
});
// Spearman enters phalanx at distance two and cannot close on an archer.
{
  const b=createScenario('field',1).battle;
  const u=b.sides[0].units[0],e=b.sides[1].units.find(u=>u.id==='tian');
  b.sides[0].units=[u];b.sides[1].units=[e];
  Object.assign(u,{x:5,y:4,intent:65,cooldown:0});Object.assign(e,{x:7,y:4,cooldown:0});
  for(const s of unitTactics(e))e.skillReady[s.id]=999;
  probes.phalanx=[];
  for(let i=0;i<10;i++){stepBattle(b);probes.phalanx.push({tick:b.tick,x:u.x,y:u.y,action:u.action,hp:u.hp,damageBySpear:b.effects.filter(x=>x.from===u.id&&x.damage>0).reduce((n,e)=>n+e.damage,0)});}
}
// An in-range target is available but the AI moves towards a weak counter target.
{
  const b=createScenario('field',1).battle,u=b.sides[0].units[0];
  const close=b.sides[1].units[0],far=b.sides[1].units[1];
  b.sides[0].units=[u];b.sides[1].units=[close,far];
  Object.assign(u,{x:5,y:4,intent:0,cooldown:0});
  Object.assign(close,{x:6,y:4,cooldown:999,intent:0});
  Object.assign(far,{x:7,y:4,hp:260,cooldown:999,intent:0});
  stepBattle(b);
  probes.targetChoice={action:u.action,position:{x:u.x,y:u.y},damage:b.effects.filter(e=>e.from===u.id&&e.damage>0),closeTarget:close.name,pursuedTarget:far.name};
}
// Compare tactic thresholds before and after intent reduction at the current cap.
{
  const b=createScenario('field',1).battle;lockDeployment(b);b.commandProgress=12000;
  for(const u of b.sides[1].units)u.intent=COMBAT.intentCap;
  const before=b.sides[1].units.map(u=>({name:u.name,intent:u.intent,thresholds:unitTactics(u).map(s=>s.threshold)}));
  const error=issueCommand(b,'demoralize');
  probes.demoralize={error,before,after:b.sides[1].units.map(u=>({name:u.name,intent:u.intent,allThresholdsStillMet:unitTactics(u).every(s=>u.intent>=s.threshold)}))};
}
// Actual wave arrival versus earliest deployment in the preset battle.
{
  const b=createScenario('reinforcements').battle,entered={};
  while(!b.result){stepBattle(b);for(const u of b.sides[1].units)if(u.wave&&u.status==='active')entered[u.id]??=b.tick;}
  probes.waves=b.sides[1].units.filter(u=>u.wave).map(u=>({name:u.name,wave:u.wave,arrival:u.arrivalTick,entry:entered[u.id]??null}));
}
// Default command access is material to the rotation and healing trial.
{
  const b=createScenario('rotation').battle;lockDeployment(b);b.commandProgress=12000;
  probes.rotationCommands=['heal','regenerate','relief'].map(id=>({id,error:issueCommand(b,id)}));
}
const out=new URL(`../docs/balance-audit-v${RULES_VERSION}/`,import.meta.url);
mkdirSync(out,{recursive:true});
writeFileSync(new URL('probes.json',out),JSON.stringify(probes,null,2)+'\n');
console.log(JSON.stringify(probes,null,2));
