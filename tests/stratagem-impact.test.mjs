import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,issueCommand,validateSave,COMMAND_RESOURCE,unitAttributes,battleWounded} from '../engine.mjs';
import {STRATAGEMS,stratagemEffectText,selectStratagemSource} from '../stratagems.mjs';
import {chooseStratagemPoint,stratagemAreaTargets,stratagemAreaContains} from '../stratagem-area.mjs';
import {areaPreview} from '../stratagem-area-view.mjs';
import {setStatus,hasStatus,shieldAmount,unitTactics,readyTactic} from '../tactics.mjs';
import {holdsLine} from '../engagement.mjs';

function scene(key,side=0,seed=10801){
 const design=STRATAGEMS[key],holder=design.roster[0],entry=id=>({id,type:'spear',troops:4000,level:10});
 const own=[holder,...['chu','dun','yuanxia','he','gao','yan'].filter(id=>id!==holder)].map(entry),enemy=['shao','wen','person-17','person-70','person-186','person-516','person-243','person-439'].filter(id=>!own.some(u=>u.id===id)).slice(0,7).map(entry);
 const state=createScenario('custom-battle',seed,20,null,{seed,terrain:'land',ownTeam:side?enemy:own,enemyTeam:side?own:enemy,ownTeamRoles:{leader:side?enemy[0].id:holder,advisor:side?enemy[0].id:holder},enemyTeamRoles:{leader:side?holder:enemy[0].id,advisor:side?holder:enemy[0].id}});
 const b=state.battle;if(key==='refresh'){lockDeployment(b);while(!b.result&&!b.sides[side].units.some(u=>u.skillCasts>0))stepBattle(b,{aiSides:[]});assert.equal(b.result,null);}
 for(const u of b.sides.flatMap(s=>s.units)){u.retreatAt=null;u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));setStatus(b,u,'phalanx',999);}
 lockDeployment(b);while(!b.result&&(side?b.enemyCommand:b).commandProgress<COMMAND_RESOURCE.capacity)stepBattle(b,{aiSides:[]});
 assert.equal(b.result,null);return state;
}
for(const key of Object.keys(STRATAGEMS))for(const side of [0,1])test(key+' side '+side+': real charging, exact targets, independent cooldown and deterministic continuation',()=>{
 const state=scene(key,side),b=state.battle,s=STRATAGEMS[key],resource=side?b.enemyCommand:b,own=b.sides[side].units.find(u=>u.status==='active'),foe=b.sides[1-side].units.find(u=>u.status==='active');
 if(s.effect==='heal'){own.hp-=1000;own.battleDamage+=1000;}
 if(s.effect==='cleanse')setStatus(b,own,'burn',20,{amount:10,sourceId:foe.id});
 const point=chooseStratagemPoint(b,s,side),targets=point?stratagemAreaTargets(b,s,point,side):b.sides[side].units.filter(u=>u.status==='active');
 assert.equal(resource.commandProgress,COMMAND_RESOURCE.capacity);assert.equal(issueCommand(b,key,point,side),null);
 const tick=b.tick;assert.equal(resource.commandProgress,0);assert.equal(resource.commandReady[key],tick+s.cooldown);assert.ok(stratagemEffectText(resource.lastCommand.source).includes('冷却 '+s.cooldown));
 if(['shield','heal','cleanse','invincible','ambush','stun','magicImmunity','rapidAdvance'].includes(s.effect)){
  const status={shield:'shield',cleanse:'resolve',invincible:'commandInvincible',ambush:'stealth',stun:'stun',magicImmunity:'magicImmune',rapidAdvance:'rapidAdvance'}[s.effect];
  if(s.effect==='heal')assert.equal(battleWounded(own),0);else assert.ok(targets.some(u=>hasStatus(b,u,status)));
  if(point)for(const u of b.sides[s.side?1-side:side].units)if(u.status!=='active'||!stratagemAreaContains(s,point,u))assert.ok(!hasStatus(b,u,status));
 }
 const saved=validateSave(structuredClone(state));for(let n=0;n<Math.max(s.duration,8)+2&&!b.result;n++){stepBattle(b,{aiSides:[]});stepBattle(saved.battle,{aiSides:[]});assert.deepEqual(saved.battle,b);}
 const before=structuredClone(b);assert.match(issueCommand(b,key,point,side),/冷却/);assert.deepEqual(b,before);
 const corrupt=structuredClone(state);(side?corrupt.battle.enemyCommand:corrupt.battle).commandReady[key]--;assert.throws(()=>validateSave(corrupt),/冷却/);
});
test('range stun cancels action, attack, tactics and ZOC; protected troops are excluded from preview and consume nothing',()=>{
 const state=scene('disrupt'),b=state.battle,s=STRATAGEMS.disrupt,foes=b.sides[1].units.filter(u=>u.status==='active');
 for(const u of foes)setStatus(b,u,'resolve',8);const before=structuredClone(b),p={x:foes[0].x,y:foes[0].y};
 assert.deepEqual(areaPreview(b,s,{point:p}).targetIds,[]);assert.ok(issueCommand(b,'disrupt',p));assert.deepEqual(b,before);
 for(const u of foes)delete u.statuses.resolve;const target=foes[0],point={x:target.x,y:target.y};target.cooldown=0;target.skillReady=Object.fromEntries(unitTactics(target).map(s=>[s.id,0]));target.intent=100;delete target.statuses.phalanx;
 assert.equal(issueCommand(b,'disrupt',point),null);assert.equal(holdsLine(b,target),false);assert.equal(readyTactic(b,target,4),null);assert.equal(unitAttributes(target,b).move,0);
 const casts=target.skillCasts,pos=[target.x,target.y];for(let n=0;n<b.lastCommand.source.duration;n++){stepBattle(b,{aiSides:[]});assert.equal(target.skillCasts,casts);assert.deepEqual([target.x,target.y],pos);assert.ok(!b.effects.some(e=>e.from===target.id&&(e.damage>0||e.skill)));}
 stepBattle(b,{aiSides:[]});assert.ok(!hasStatus(b,target,'stun'));assert.ok(hasStatus(b,target,'resolve'),'shared post-control protection survives');validateSave(structuredClone(state));
});
test('broad dispel clears control, fire, disease and debuffs, preserves food shortage and longer existing protection',()=>{
 const state=scene('cleanse'),b=state.battle,u=b.sides[0].units[0],enemy=b.sides[1].units[0];
 for(const key of ['stun','burn','plague','armorBreak','intentSuppression'])setStatus(b,u,key,10,{amount:20,sourceId:enemy.id});
 // Supply is an external condition, not a removable spell.
 u.statuses.hunger={until:999,fraction:.2};setStatus(b,u,'resolve',20);const until=u.statuses.resolve.until;
 assert.equal(issueCommand(b,'cleanse',{x:u.x,y:u.y}),null);
 for(const key of ['stun','burn','plague','armorBreak','intentSuppression'])assert.equal(u.statuses[key],undefined);
 assert.ok(hasStatus(b,u,'hunger'));assert.equal(u.statuses.resolve.until,until);
});
test('shield is substantial, affects selected troops only, saves its source and rejects forged layers',()=>{
 const state=scene('fortify'),b=state.battle,u=b.sides[0].units[0],point={x:u.x,y:u.y};
 assert.equal(issueCommand(b,'fortify',point),null);assert.equal(shieldAmount(b,u),Math.round(u.maxHp*selectStratagemSource(b.sides[0].commanders,'fortify').strength));validateSave(structuredClone(state));
 for(const mutate of [l=>l.sourceId='chu',l=>l.castTick++,l=>l.amount=u.maxHp]){const bad=structuredClone(state),v=bad.battle.sides[0].units.find(v=>v.id===u.id),l=v.statuses.shield.layers.find(l=>l.sourceCommand);mutate(l);v.statuses.shield.amount=v.statuses.shield.layers.reduce((n,l)=>n+l.amount,0);v.statuses.shield.until=Math.max(...v.statuses.shield.layers.map(l=>l.until));assert.throws(()=>validateSave(bad));}
});
test('manual invulnerability blocks incoming damage while units still perform real legal actions; later damage resumes',()=>{
 const state=scene('invincible'),b=state.battle,u=b.sides[0].units[0],enemy=b.sides[1].units[0];
 for(const unit of [u,enemy]){delete unit.statuses.phalanx;unit.cooldown=0;}
 Object.assign(u,{x:5,y:3});Object.assign(enemy,{x:6,y:3});
 assert.equal(issueCommand(b,'invincible',{x:5,y:3}),null);const hp=u.hp,foeHp=enemy.hp;
 const copy=validateSave(structuredClone(state));for(let n=0;n<b.lastCommand.source.duration;n++){stepBattle(b,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});assert.deepEqual(copy.battle,b);assert.equal(u.hp,hp);}
 assert.ok(enemy.hp<foeHp,'invincible unit can attack');assert.ok(!hasStatus(b,u,'stasis'));
 for(let n=0;n<12;n++)stepBattle(b,{aiSides:[]});assert.ok(u.hp<hp,'damage resumes after protection');
});
