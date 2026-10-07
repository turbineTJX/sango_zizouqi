import {equipmentEntry} from './helpers/current-battle.mjs';
import {combatType} from '../troop-equipment.mjs';
import {remedy} from '../battle-status-rules.mjs';
import {isTargetable} from '../engagement.mjs';
import {chooseStratagemPoint,stratagemAreaContains} from '../stratagem-area.mjs';
import {STRATAGEMS as AREA_DESIGNS} from '../stratagems.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {OFFICER_STRATAGEMS,EXCLUSIVE_STRATAGEMS,STRATAGEMS,ORDINARY_STRATAGEM_POOL,officerStratagems,commanderStratagems,selectStratagemSource} from '../stratagems.mjs';
import {createScenario} from '../scenarios.mjs';
import {battleStratagems,lockDeployment,stepBattle,syncCombatForm,issueCommand,validateSave,COMMAND_RESOURCE} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {hasStatus} from '../tactics.mjs';
const entry=(id,type='spear')=>({...equipmentEntry(id,type),level:5});
function scene(leader,advisor=leader){const ownTeam=[entry(leader),...(advisor===leader?[]:[entry(advisor,'crossbow')])];return createScenario('custom-battle',4511,20,null,{seed:4511,terrain:'land',ownTeam,enemyTeam:[entry('shao'),entry('wen'),entry('yan')],ownTeamRoles:{leader,advisor},enemyTeamRoles:{leader:'shao',advisor:'wen'}});}
test('832人遵守0/2/3军略名额，专属计入总数，只有诸葛亮三项',()=>{
 const three=[];for(const u of OFFICER_CATALOG){const keys=officerStratagems(u.id);assert.equal(keys.length,u.id==='person-290'?3:u.intellect>=70?2:0);assert.equal(new Set(keys).size,keys.length);if(keys.length===3)three.push(u.id);for(const key of keys){assert.ok(STRATAGEMS[key]);if(EXCLUSIVE_STRATAGEMS[key])assert.equal(EXCLUSIVE_STRATAGEMS[key],u.id);else assert.ok(ORDINARY_STRATAGEM_POOL.includes(key));}}
 assert.deepEqual(three,['person-290']);assert.deepEqual(officerStratagems('toString'),[]);
});
test('军团长和军师统一基础智力70门槛，升级和任职不能绕过',()=>{
 for(const n of [69,70]){const u=OFFICER_CATALOG.find(u=>u.intellect===n);assert.ok(u);for(const role of ['leader','advisor'])assert.equal(commanderStratagems({id:u.id,role,intellect:100,level:10}).length,n===69?0:2);}
 const s=scene('cao','chu');assert.deepEqual(battleStratagems(s.battle),officerStratagems('cao'));
 const reversed=scene('chu','cao');assert.deepEqual(new Set(battleStratagems(reversed.battle)),new Set([...officerStratagems('chu'),...officerStratagems('cao')]));
 assert.deepEqual(commanderStratagems({id:'person-290',role:'deputy'}),[]);
});
test('低智军团长没有保底军略，自然满条也不能施放，存读档不恢复资格',()=>{
 const s=createScenario('custom-battle',4511,20,null,{seed:4511,terrain:'land',ownTeam:[entry('person-472'),entry('chu'),entry('jia','crossbow'),entry('yu','halberd')],enemyTeam:[entry('shao'),entry('wen'),entry('yan')],ownTeamRoles:{leader:'person-472',advisor:'chu'}}),b=s.battle;lockDeployment(b);
 assert.deepEqual(battleStratagems(b),[]);
 while(!b.result&&b.commandProgress<COMMAND_RESOURCE.capacity)stepBattle(b);
 assert.equal(b.result,null);assert.equal(b.commandProgress,COMMAND_RESOURCE.capacity);
 const before=structuredClone(b);
 assert.match(issueCommand(b,'basic-guard'),/未掌握/);
 assert.deepEqual(b,before);
 assert.equal(chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0),null);
 const loaded=validateSave(structuredClone(s));
 for(let n=0;n<10&&!b.result;n++){stepBattle(b);stepBattle(loaded.battle);}
 assert.deepEqual(loaded.battle,b);assert.deepEqual(battleStratagems(loaded.battle),[]);
});

for(const [key,id] of Object.entries(EXCLUSIVE_STRATAGEMS))test(`${key}：史实出处、双方AI识别、自然蓄力与确定性续战`,()=>{
 assert.ok(STRATAGEMS[key].history&&STRATAGEMS[key].source);
 const draft={seed:4511,terrain:'land',ownTeam:[entry(id,'crossbow'),entry(id==='cao'?'jin':'cao'),entry('yu','halberd')],enemyTeam:[entry('shao'),entry('wen'),entry('yan')],ownTeamRoles:{leader:id,advisor:id}};
 const s=createScenario('custom-battle',4511,20,null,draft),b=s.battle;lockDeployment(b);
 while(!b.result&&b.commandProgress<COMMAND_RESOURCE.capacity)stepBattle(b);
 assert.equal(b.result,null);assert.equal(b.commandProgress,COMMAND_RESOURCE.capacity);
 if(key==='zhou-redcliffs')for(const u of b.sides[1].units)remedy(b,u,'quench');
 if(key==='sima-isolate'){
  // Actual reinforcement fixture separately covers casting with reserves.
  assert.match(issueCommand(b,key,chooseStratagemPoint(b,STRATAGEMS[key],0)),/预备队/);assert.equal(b.commandProgress,COMMAND_RESOURCE.capacity);
 }else{
  assert.equal(issueCommand(b,key,chooseStratagemPoint(b,STRATAGEMS[key],0)),null);assert.equal(b.commandProgress,0);
  if(key==='zhuge-eight'){assert.equal(b.stratagemZones.length,1);assert.equal(b.sides[0].fortifyUntil,0);}
 }
 const copy=validateSave(structuredClone(s));for(let n=0;n<20&&!b.result;n++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
 if(key==='zhuge-eight'){assert.equal(chooseEnemyCommand(b,[key],STRATAGEMS,0),null);return;}
 const alias=STRATAGEMS[key].effect;
 for(const side of [0,1])assert.equal(chooseEnemyCommand(b,[key],STRATAGEMS,side)?key:null,chooseEnemyCommand(b,[alias],{...STRATAGEMS,[alias]:STRATAGEMS[key]},side)?key:null);
});
test('赤壁火攻仅对舰船提高火势，普通目标保持共同结算规则',async()=>{
 const {unitAttributes}=await import('../engine.mjs');
 const draft={seed:4511,terrain:'river',ownTeam:[entry('person-246','ship'),entry('cao'),entry('yu','halberd')],enemyTeam:[{...entry('shao','ship'),troops:7000},entry('wen'),entry('yan')],ownTeamRoles:{leader:'person-246',advisor:'yu'}};
 const s=createScenario('custom-battle',4511,20,null,draft),b=s.battle;for(const u of b.sides.flatMap(s=>s.units))u.retreatAt=null;lockDeployment(b);
 while(!b.result&&b.commandProgress<COMMAND_RESOURCE.capacity)stepBattle(b);
 assert.equal(b.result,null);const boat=b.sides[1].units.find(u=>u.equipment.ship);boat.x=9;boat.y=4;syncCombatForm(b,boat);const allies=b.sides[0].units.filter(u=>u.status==='active'&&u.hp>0),targets=b.sides[1].units.filter(u=>u.status==='active'&&u.hp>0&&isTargetable(b,u));
 assert.ok(targets.some(u=>combatType(u)==='ship'));assert.ok(targets.some(u=>combatType(u)!=='ship'));
 const amount=Math.floor(allies.reduce((sum,u)=>sum+unitAttributes(u,b).strategyPower,0)*(18/280)*selectStratagemSource(b.sides[0].commanders,'zhou-redcliffs').power/targets.length);
 for(const u of targets)remedy(b,u,'quench');
 assert.equal(issueCommand(b,'zhou-redcliffs',chooseStratagemPoint(b,AREA_DESIGNS['zhou-redcliffs'],0)),null);
 for(const u of targets)if(stratagemAreaContains(STRATAGEMS['zhou-redcliffs'],b.lastCommand.target,u))assert.equal(u.statuses.burn.amount,Math.floor(amount*(combatType(u)==='ship'?1.25:1)));else assert.equal(u.statuses.burn,undefined);
});


test('曹操军略进入真实结算，并保存提供者与效果',async()=>{
 const {unitAttributes}=await import('../engine.mjs');
 for(const [id,key,min,max] of [['cao','assault',.32,.33]]){
  const draft={seed:4511,terrain:'land',ownTeam:[entry(id,'crossbow'),entry('jia','crossbow'),entry('yu','halberd')],enemyTeam:[entry('shao'),entry('wen'),entry('yan')],ownTeamRoles:{leader:id,advisor:'yu'}};const state=createScenario('custom-battle',4511,20,null,draft),b=state.battle;lockDeployment(b);
  while(!b.result&&b.commandProgress<COMMAND_RESOURCE.capacity)stepBattle(b);
  assert.equal(b.result,null);
  const u=b.sides[0].units.find(u=>u.status==='active'),before=unitAttributes(u,b);
  assert.equal(issueCommand(b,key,chooseStratagemPoint(b,STRATAGEMS[key],0)),null);
  const effect=b.sides[0].stratagemEffects[STRATAGEMS[key].field];
  assert.ok(effect.strength>min&&effect.strength<max);
  const after=unitAttributes(u,b);assert.notDeepEqual(after,before);
  const loaded=validateSave(structuredClone(state));stepBattle(b);stepBattle(loaded.battle);assert.deepEqual(loaded.battle,b);
  const corrupt=structuredClone(state);corrupt.battle.sides[0].stratagemEffects[STRATAGEMS[key].field].strength=9;assert.throws(()=>validateSave(corrupt),/军略强度/);
  const forged=structuredClone(state);forged.battle.lastCommand.source.power=99;assert.throws(()=>validateSave(forged),/军略施放来源/);
 }
});

test('相同军略取合资格持有者的较强效果，武力不影响军略倍率',async()=>{
 const {stratagemProfile}=await import('../stratagems.mjs');
 const weak={id:'cao',role:'leader',leadership:50,intellect:50};
 const strong={id:'shao',role:'advisor',leadership:90,intellect:90};
 assert.equal(selectStratagemSource([weak,strong],'assault').id,'shao');
 assert.equal(selectStratagemSource([weak,strong,strong],'assault').power,selectStratagemSource([strong],'assault').power);
 assert.ok(stratagemProfile('assault',strong).strength>stratagemProfile('assault',weak).strength);
 assert.equal(stratagemProfile('assault',{...weak,force:100}).strength,stratagemProfile('assault',{...weak,force:1}).strength);
 assert.equal(selectStratagemSource([{id:'person-472',role:'advisor'}],'basic-guard'),null);
});


test('统帅与军师各擅其长，武力政治魅力不影响任何军略效果',async()=>{
 const {stratagemProfile}=await import('../stratagems.mjs');
 const commander={id:'cao',role:'leader',leadership:95,intellect:60};
 const adviser={id:'cao',role:'leader',leadership:60,intellect:95};
 const warrior={id:'cao',role:'leader',leadership:45,intellect:35,force:100};
 assert.ok(stratagemProfile('assault',commander).strength>stratagemProfile('assault',adviser).strength);
 for(const key of ['heal','regenerate','disrupt','demoralize'])assert.ok(stratagemProfile(key,adviser).strength>stratagemProfile(key,commander).strength);
 for(const key of Object.keys(STRATAGEMS)){
  const low=stratagemProfile(key,{...warrior,force:1,politics:1,charm:1});
  const high=stratagemProfile(key,{...warrior,force:100,politics:100,charm:100});
  assert.deepEqual(high,low,key+'不受武政魅影响');
  assert.deepEqual(Object.keys(high.weights).sort(),['intellect','leadership']);
  assert.ok(stratagemProfile(key,commander).power>high.power,key+'统帅优于纯武力型');
  assert.ok(stratagemProfile(key,adviser).power>high.power,key+'军师优于纯武力型');
 }
});
