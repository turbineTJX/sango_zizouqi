import {writeFile,readFile} from 'node:fs/promises';
const edit=async(path,fn)=>writeFile(path,fn(await readFile(path,'utf8')));
await writeFile('tests/stratagems.test.mjs',String.raw`import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,orderArmy,advanceTurn,startBattle,lockDeployment,stepBattle,issueCommand,validateSave,settleBattle,armyCommanders,armyStratagems,battleStratagems,commandIntellect,COMMAND_RESOURCE,battleWounded,activeUnits} from '../engine.mjs';
import {STRATAGEMS,selectStratagemSource} from '../stratagems.mjs';
import {chooseStratagemPoint} from '../stratagem-area.mjs';
import {setStatus,unitTactics,hasStatus} from '../tactics.mjs';
import {appointTestCommanders} from './helpers/commanders.mjs';
const full=COMMAND_RESOURCE.capacity;
function scene(leader='cao',advisor='jia'){const s=newGame();appointTestCommanders(s,leader,advisor);orderArmy(s,'a1','guandu');advanceTurn(s);startBattle(s);lockDeployment(s.battle);return s;}
function still(b){for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));setStatus(b,u,'phalanx',999);}}
function wound(u,amount){u.hp-=amount;u.battleDamage+=amount;}
test('single gauge starts empty, uses active intellect, holds one charge and resets only on success',()=>{
 const b=scene().battle;still(b);assert.equal(b.commandProgress,0);assert.ok(issueCommand(b,'cao-wuchao'));
 stepBattle(b);assert.equal(b.commandProgress,commandIntellect(b));
 const a=activeUnits(b,0).find(u=>!b.sides[0].commanders.some(c=>c.id===u.id));a.status='withdrawn';
 const before=b.commandProgress;stepBattle(b);assert.equal(b.commandProgress-before,commandIntellect(b));
 while(b.commandProgress<full)stepBattle(b);for(let i=0;i<10;i++)stepBattle(b);assert.equal(b.commandProgress,full);
 assert.equal(issueCommand(b,'cao-wuchao'),null);assert.equal(b.commandProgress,0);assert.ok(issueCommand(b,'swift',chooseStratagemPoint(b,STRATAGEMS.swift,0)));
 stepBattle(b);assert.equal(b.commandProgress,commandIntellect(b));
});
test('leader and advisor union is sparse, duplicates collapse, unassigned officers unlock nothing',()=>{
 const s=scene(),a=s.armies[0],b=s.battle;assert.deepEqual(battleStratagems(b),armyStratagems(a));
 b.commandProgress=full;assert.match(issueCommand(b,'heal',{x:2,y:2}),/未掌握/);assert.equal(b.commandProgress,full);
 a.leader='yu';a.advisor='yu';assert.deepEqual(armyStratagems(a),['cleanse']);assert.equal(armyCommanders(a).length,2);
 const changed=scene('jin','person-668');assert.deepEqual(new Set(battleStratagems(changed.battle)),new Set(['fortify','heal']));
});
test('healing uses wounded budget, never heals dead or reserves, and settlement does not duplicate it',()=>{
 const s=scene('cao','person-668'),b=s.battle;b.commandProgress=full;
 assert.ok(issueCommand(b,'heal',chooseStratagemPoint(b,STRATAGEMS.heal,0)));assert.equal(b.commandProgress,full);
 const u=b.sides[0].units[0];wound(u,1000);const reserve=b.sides[0].units.find(u=>u.status==='reserve');wound(reserve,500);
 const dead=b.sides[0].units[1];wound(dead,dead.hp);dead.status='defeated';assert.equal(battleWounded(u),350);
 assert.equal(issueCommand(b,'heal',chooseStratagemPoint(b,STRATAGEMS.heal,0)),null);assert.equal(u.hp,2350);assert.equal(u.healed,350);assert.equal(battleWounded(u),0);assert.equal(reserve.hp,2500);assert.equal(dead.hp,0);
 b.commandProgress=full;const before=structuredClone(b);assert.match(issueCommand(b,'heal',{x:u.x,y:u.y}),/冷却/);assert.deepEqual(b,before);
 b.result={winner:0,reason:'击溃'};const report=settleBattle(s);for(const side of report.stats)assert.equal(side.initial,side.remaining+side.wounded+side.killed);
 assert.equal(s.armies[0].units[0].troops,2350);assert.equal(s.armies[0].units[0].wounded,0);
});
test('fire uses declared ticks, shields absorb loss, no intent income, and broad dispel clears it',()=>{
 const b=scene('person-246','jia').battle;still(b);b.commandProgress=full;assert.equal(issueCommand(b,'zhou-redcliffs',chooseStratagemPoint(b,STRATAGEMS['zhou-redcliffs'],0)),null);
 const u=b.sides[1].units[0],ticks=STRATAGEMS['zhou-redcliffs'].duration,amount=u.statuses.burn.amount;
 setStatus(b,u,'shield',99,{amount:30,source:'test',label:'护盾'});const hp=u.hp;for(let i=0;i<ticks;i++)stepBattle(b);
 assert.equal(u.hp,hp-amount*ticks+30);assert.equal(u.intent,0);const end=u.hp;stepBattle(b);assert.equal(u.hp,end);
 const cb=scene('cao','yu').battle,own=cb.sides[0].units[0];setStatus(cb,own,'burn',12,{amount:18,sourceId:cb.sides[1].units[0].id});cb.commandProgress=full;
 assert.equal(issueCommand(cb,'cleanse',{x:own.x,y:own.y}),null);assert.equal(own.statuses.burn,undefined);assert.ok(hasStatus(cb,own,'resolve'));
});
for(const status of ['defeated','withdrawn'])for(const side of [0,1])test('departed commander loses only their repertoire: '+status+' side '+side,()=>{
 const b=scene().battle;if(side){b.sides.reverse();for(let n=0;n<2;n++)for(const u of b.sides[n].units)u.side=n;}
 const holder=b.sides[side].units.find(u=>u.id==='cao');holder.status=status;if(status==='defeated')holder.hp=0;
 const resource=side?b.enemyCommand:b;resource.commandProgress=full;assert.ok(!battleStratagems(b,side).includes('cao-wuchao'));
 assert.ok(issueCommand(b,'cao-wuchao',null,side));assert.equal(resource.commandProgress,full);assert.ok(battleStratagems(b,side).includes('swift'));
});
test('same-name falls back to remaining eligible source, saves resume and old rules are rejected',()=>{
 const s=scene('jin','shao'),b=s.battle,strong=selectStratagemSource(b.sides[0].commanders,'fortify');
 b.sides[0].units.find(u=>u.id===strong.id).status='withdrawn';const expected=selectStratagemSource(b.sides[0].commanders.filter(c=>c.id!==strong.id),'fortify');
 b.commandProgress=full;assert.equal(issueCommand(b,'fortify',chooseStratagemPoint(b,STRATAGEMS.fortify,0)),null);assert.equal(b.lastCommand.source.id,expected.id);
 const copy=validateSave(structuredClone(s));for(let i=0;i<12;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(b,copy.battle);
 const old=structuredClone(s);old.rulesVersion=107;assert.throws(()=>validateSave(old),/重新开始/);
});
`);
await writeFile('tests/stratagem-pools.test.mjs',String.raw`import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {STRATAGEMS,officerStratagems,stratagemEligible,stratagemLimit,commanderStratagems,EXCLUSIVE_STRATAGEMS,ORDINARY_STRATAGEM_POOL,selectStratagemSource,stratagemProfile} from '../stratagems.mjs';
import {validateDesignTables,DESIGN_TABLES} from '../design-catalog.mjs';
test('ten basics and three exclusives use finite rosters; intellect and level never grant repertoire',()=>{
 assert.equal(ORDINARY_STRATAGEM_POOL.length,10);assert.deepEqual(EXCLUSIVE_STRATAGEMS,{'cao-wuchao':'cao','zhou-redcliffs':'person-246','zhuge-eight':'person-290'});
 let count=0;for(const u of OFFICER_CATALOG){const keys=officerStratagems(u.id);assert.equal(new Set(keys).size,keys.length);assert.ok(keys.length<=stratagemLimit(u.id));
  if(keys.length){count++;assert.ok(u.intellect>=70);assert.equal(keys.length,u.id==='person-290'?2:1);}
  for(const key of keys){const s=STRATAGEMS[key];assert.ok(s);assert.ok(s.owner?s.owner===u.id:s.roster.includes(u.id));}
  for(const role of ['leader','advisor'])assert.deepEqual(commanderStratagems({...u,role,level:10,intellect:100}),keys);
 }
 assert.equal(count,52);assert.ok(OFFICER_CATALOG.some(u=>u.intellect>=90&&!stratagemEligible(u.id)));
 for(const id of ['person-433','chu','person-516','person-186','person-212'])assert.deepEqual(officerStratagems(id),[]);
 assert.deepEqual(officerStratagems('toString'),[]);assert.deepEqual(commanderStratagems({id:'person-290',role:'deputy'}),[]);
 for(const key of ORDINARY_STRATAGEM_POOL)assert.deepEqual(STRATAGEMS[key].roster.slice().sort(),OFFICER_CATALOG.filter(u=>officerStratagems(u.id).includes(key)).map(u=>u.id).sort());
});
test('validator rejects expansion by attribute, wrong exclusive ownership and short cooldown',()=>{
 for(const edit of [d=>{d.assignments['person-212'].stratagems=['fortify'];},d=>{d.assignments.jia.stratagems=['cao-wuchao'];},d=>{d.stratagems.invincible.cooldown=4;}]){const d=structuredClone(DESIGN_TABLES);edit(d);assert.ok(validateDesignTables(d).length);}
});
test('same name chooses one eligible source and only leadership and intellect scale it',()=>{
 const weak={id:'jin',role:'leader',leadership:50,intellect:50},strong={id:'shao',role:'advisor',leadership:90,intellect:90};
 assert.equal(selectStratagemSource([weak,strong],'fortify').id,'shao');assert.deepEqual(selectStratagemSource([strong,strong],'fortify'),selectStratagemSource([strong],'fortify'));
 const commander={...weak,leadership:95,intellect:60},adviser={...weak,leadership:60,intellect:95};
 assert.ok(stratagemProfile('fortify',commander).strength>stratagemProfile('fortify',adviser).strength);
 for(const key of ['heal','cleanse','firestorm'])assert.ok(stratagemProfile(key,adviser).strength>stratagemProfile(key,commander).strength);
 for(const key of Object.keys(STRATAGEMS)){assert.deepEqual(stratagemProfile(key,{...weak,force:1,politics:1,charm:1}),stratagemProfile(key,{...weak,force:100,politics:100,charm:100}));assert.equal(stratagemProfile(key,weak).duration,STRATAGEMS[key].duration);assert.ok(STRATAGEMS[key].cooldown>STRATAGEMS[key].duration);}
});
`);
await edit('tests/eight-formation.test.mjs',s=>s.replace('assert.equal(b.sides[0].fortifyUntil,0);','assert.equal(b.sides[0].fortifyUntil,undefined);').replace('for(let i=0;i<8;i++)','for(let i=0;i<s.cooldown;i++)').replace("b.sides[1].fortifyUntil=20;b.sides[1].stratagemEffects.fortifyUntil={strength:.2};","u.statuses.bulwark={until:20};").replace('steps===2','steps===s.zone.statusSteps').replace('after eighteen rounds','after the declared duration').replace('n<19','n<s.duration+1').replace('v.until<=b.tick+2','v.until<=b.tick+s.zone.statusSteps'));
await edit('tests/command-specials.test.mjs',s=>s.replaceAll('jia-speed','swift').replaceAll('单队','范围').replace('assert.equal(b.sides[1].disruptUntil,0)','assert.equal(b.sides[1].disruptUntil,undefined)').replace('assert.equal(b.sides[0].hasteUntil,0)','assert.equal(b.sides[0].hasteUntil,undefined)')
 .replace('assert.deepEqual(areaPreview(b,s,{point}).targetIds,[target.id]);','assert.ok(areaPreview(b,s,{point}).targetIds.includes(target.id));')
 .replace("assert.equal(b.sides[0].units.filter(u=>hasStatus(b,u,'rapidAdvance')).length,1)","assert.ok(b.sides[0].units.filter(u=>hasStatus(b,u,'rapidAdvance')).length>=1)")
 .replace('b.tick+25','b.tick+STRATAGEMS.swift.duration+1').replace("status==='rapidAdvance'?1:b.sides[1].units.filter(u=>u.status==='active').length","status==='rapidAdvance'?stratagemAreaTargets(b,STRATAGEMS.swift,b.enemyCommand.lastCommand.target,1).length:b.sides[1].units.filter(u=>u.status==='active').length"));
await edit('tests/stratagem-area.test.mjs',s=>s.replaceAll('demoralize','disrupt').replace("assert.ok(a.intent<80);assert.equal(z.intent,80);","assert.ok(a.statuses.stun);assert.equal(z.statuses.stun,undefined);").replace("for(const u of b.sides[1].units.filter(u=>u.status==='reserve'))assert.equal(u.intent,80);","for(const u of b.sides[1].units.filter(u=>u.status==='reserve'))assert.equal(u.statuses.stun,undefined);"));
await edit('tests/stratagem-placement-ai.test.mjs',s=>s.replace("['firestorm','assault'],STRATAGEMS,0),'assault'","['firestorm','fortify'],STRATAGEMS,0),'firestorm'").replaceAll('demoralize','disrupt').replace('zero-intent troops','protected troops').replace('u.intent=0','u.statuses.resolve={until:20}').replace('b.sides[1].units[1].intent=10;b.sides[1].units[2].intent=20;','b.sides[1].units[1].statuses={};b.sides[1].units[2].statuses={};'));
await edit('tests/design-tables.test.mjs',s=>s.replaceAll('stratagems.assault','stratagems.fortify').replaceAll('STRATAGEM_DESIGNS.assault','STRATAGEM_DESIGNS.fortify').replaceAll('e.STRATAGEMS.assault','e.STRATAGEMS.fortify'));
await edit('tests/proactive-command-ai.test.mjs',s=>s.replaceAll("'assault'","'fortify'").replaceAll("'regenerate'","'cleanse'").replaceAll('commandReady.assault','commandReady.fortify').replace("['assault','fortify','disrupt','firestorm','inspire','haste','range']","Object.keys(STRATAGEMS)")
 .replace("chooseEnemyCommand(b,['fortify','heal','cleanse'],STRATAGEMS),'fortify'","chooseEnemyCommand(b,['fortify','heal','cleanse'],STRATAGEMS),'heal'"));
await edit('tests/cleanse-ai.test.mjs',s=>s.replaceAll("'assault'","'fortify'").replaceAll('commandReady.assault','commandReady.fortify').replace("assert.equal(choose(),'fortify','固定顺序不因状态轻重改变')","assert.equal(choose(),'cleanse','固定顺序不因状态轻重改变')"));
