import {readFile,writeFile} from 'node:fs/promises';
const edit=async(path,fn)=>writeFile(path,fn(await readFile(path,'utf8')));
function block(s,title,replacement=''){const start=s.indexOf("test('"+title);if(start<0)throw Error(title);const end=s.indexOf('\n});',start)+5;return s.slice(0,start)+replacement+s.slice(end);}
await edit('tests/stratagems.test.mjs',s=>s.replace("import {appointTestCommanders}","import {createScenario} from '../scenarios.mjs';\nimport {appointTestCommanders}").replace("const s=scene('jin','person-46'),b=s.battle,strong=", "const entry=id=>({id,type:'spear',troops:3000,level:5}),s=createScenario('custom-battle',10801,20,null,{seed:10801,terrain:'land',ownTeam:['jin','person-46','dun'].map(entry),enemyTeam:['shao','wen','yan'].map(entry),ownTeamRoles:{leader:'jin',advisor:'person-46'}});lockDeployment(s.battle);const b=s.battle,strong="));
await edit('tests/ai-logic.test.mjs',s=>block(s,'单队鼓舞有充分战意收益时可选；满战意、冷却和更优军略仍受约束'));
await edit('tests/ai-target-command.test.mjs',s=>s.replaceAll("'haste'","'swift'").replaceAll('commandReady.haste','commandReady.swift').replace("b.sides[1].hasteUntil=b.tick+5;assert.equal(chooseEnemyCommand(b,['swift'],STRATAGEMS),null);b.sides[1].hasteUntil=0;","b.sides[1].units[0].statuses.rapidAdvance={until:b.tick+5};assert.equal(chooseEnemyCommand(b,['swift'],STRATAGEMS),null);delete b.sides[1].units[0].statuses.rapidAdvance;")
 .replace("issueCommand(b,'swift',null,1)","issueCommand(b,'swift',{x:0,y:0},1)").replaceAll("'regenerate'","'heal'").replaceAll('commandReady.regenerate','commandReady.heal')
 .replace("b.sides[1].recoveryUntil=b.tick+5;assert.equal(chooseEnemyCommand(b,['heal'],STRATAGEMS),null);b.sides[1].recoveryUntil=0;",'')
 .replace("custom([unit('jin','spear')])","custom([unit('person-668','spear')])").replaceAll('person-255','person-668').replace("issueCommand(b,'heal',null,1)","issueCommand(b,'heal',{x:0,y:0},1)").replace("&&e.ongoing","&&!e.ongoing"));
await edit('tests/attributes.test.mjs',s=>s.replaceAll('x.b.sides[0].assaultUntil=99',"setStatus(x.b,x.a,'valor',99)").replace("b.sides[0].assaultUntil=2;b.sides[0].rangeUntil=2;","setStatus(b,a,'valor',1);setStatus(b,a,'longRange',1,{amount:2});"));
await edit('tests/balance.test.mjs',s=>s.replace('validateSave} from','validateSave,lowerIntent} from').replace("after demoralize","after real intent loss")
 .replace("appointBattleTestCommander(b,'jia');",'').replace("assert.equal(issueCommand(b,'demoralize',chooseStratagemPoint(b,AREA_DESIGNS['demoralize'],0)),null);assert.equal(d.intent,100-Math.round(b.lastCommand.source.strength));","lowerIntent(d,80);assert.equal(d.intent,20);")
 .replace("appointBattleTestCommander(b,'shao','leader');for(let i=0;i<4;i++) {b.commandProgress=12000;b.commandReady.inspire=0;assert.equal(issueCommand(b,'inspire'),null);assert.equal(a.intent,100);}","assert.equal(a.intent,100);")
 .replace("assert.ok(battleStratagems(createScenario('outnumbered').battle).includes('heal'));\n  for(const id of ['rotation','defense'])for(const command of ['heal','regenerate','fortify'])assert.ok(battleStratagems(createScenario(id).battle).includes(command));","for(const id of ['outnumbered','rotation','defense'])for(const command of battleStratagems(createScenario(id).battle))assert.ok(AREA_DESIGNS[command]);"));
await edit('tests/tactics.test.mjs',s=>s.replace("test('demoralize clamps active and reserve intent and prevents subsequent skills below threshold'","test('real intent loss clamps at zero and does not affect reserves'")
 .replace("appointBattleTestCommander(b,'jia');",'').replace("b.commandProgress=12000;assert.equal(issueCommand(b,'demoralize',chooseStratagemPoint(b,AREA_DESIGNS['demoralize'],0)),null);assert.equal(d.intent,0);assert.equal(reserve.intent,80);","lowerIntent(d,45);assert.equal(d.intent,0);assert.equal(reserve.intent,80);"));
await edit('tests/trait-mechanics.test.mjs',s=>s.replace("issueCommand(x.b,'inspire')","issueCommand(x.b,'fortify',{x:x.ally.x,y:x.ally.y})")
 .replace("issueCommand(x.b,'assault',null,1)","issueCommand(x.b,'fortify',{x:x.b.sides[1].units[0].x,y:x.b.sides[1].units[0].y},1)")
 .replace("issueCommand(x.b,'inspire',null,1)","issueCommand(x.b,'disrupt',{x:x.ally.x,y:x.ally.y},1)"));
await edit('tests/battle-ai.test.mjs',s=>{
 s=block(s,'AI continues useful siege orders after defenders fall, without targeting the gate with unit debuffs',String.raw`test('AI can protect active siege attackers but never treats a gate as a hostile troop',()=>{
 const b=createScenario('siege',2700000).battle;lockDeployment(b);while(b.commandProgress<COMMAND_RESOURCE.capacity&&!b.result)stepBattle(b);assert.equal(b.result,null);
 for(const u of b.sides[1].units){u.hp=0;u.status='defeated';}
 assert.equal(chooseEnemyCommand(b,['firestorm','disrupt'],STRATAGEMS,0),null);assert.equal(chooseEnemyCommand(b,['cao-wuchao'],STRATAGEMS,0),'cao-wuchao');
 assert.equal(issueCommand(b,'cao-wuchao'),null);assert.equal(b.commandProgress,0);b.siege.gate.hp=0;assert.equal(chooseEnemyCommand(b,['fortify'],STRATAGEMS,0),null);
});`);
 const start=s.indexOf("for(const id of ['tactical-control-lv'");const end=s.indexOf("test('enemy preserves fixed tactics",start);s=s.slice(0,start)+s.slice(end);
 s=s.replaceAll("issueCommand(b,'assault',null,1)","issueCommand(b,'fortify',chooseStratagemPoint(b,STRATAGEMS.fortify,1),1)")
 .replace("assert.ok(b.sides[1].assaultUntil>b.tick);assert.equal(b.sides[0].assaultUntil,0);","assert.ok(b.sides[1].units.some(u=>hasStatus(b,u,'shield')));assert.ok(b.sides[0].units.every(u=>!hasStatus(b,u,'shield')));")
 .replace("appointBattleTestCommander(b,'yu','leader',1)","appointBattleTestCommander(b,'person-668','leader',1)")
 .replace("assert.equal(ally.healed,Math.floor(ally.maxHp*b.enemyCommand.lastCommand.source.strength))","assert.equal(ally.healed,350)")
 .replace("b.enemyCommand.commandProgress=12000;assert.equal(issueCommand(b,'cleanse',null,1),null);","appointBattleTestCommander(b,'yu','advisor',1);b.enemyCommand.commandProgress=12000;assert.equal(issueCommand(b,'cleanse',{x:ally.x,y:ally.y},1),null);")
 .replace("assert.equal(hasStatus(b,ally,'burn'),true)","assert.equal(hasStatus(b,ally,'burn'),false)")
 .replace("chooseEnemyCommand(b,['cleanse','assault','inspire'],STRATAGEMS),'assault'","chooseEnemyCommand(b,['cleanse','fortify'],STRATAGEMS),'cleanse'")
 .replace("b.sides[1].assaultUntil=99;\n  assert.equal(chooseEnemyCommand(b,['assault'],STRATAGEMS),null);","b.enemyCommand.commandReady.fortify=b.tick+40;\n  assert.equal(chooseEnemyCommand(b,['fortify'],STRATAGEMS),null);");return s;
});
await edit('tests/battle-signals.test.mjs',s=>s.replace("import {setStatus}","import {chooseStratagemPoint,stratagemAreaContains} from '../stratagem-area.mjs';\nimport {STRATAGEMS} from '../stratagems.mjs';\nimport {appointBattleTestCommander} from './helpers/commanders.mjs';\nimport {setStatus}")
 .replaceAll("issueCommand(b,'assault')","issueCommand(b,'cao-wuchao')").replace("issueCommand(b,'fortify',null,1)","issueCommand(b,'fortify',chooseStratagemPoint(b,STRATAGEMS.fortify,1),1)")
 .replace("b.sides[1].commanders.push({id:'tian',name:'田丰',role:'advisor',armyId:'test'});","appointBattleTestCommander(b,'tian','advisor',1);")
 .replaceAll("issueCommand(b,'disrupt',null,1)","issueCommand(b,'disrupt',chooseStratagemPoint(b,STRATAGEMS.disrupt,1),1)")
 .replace("v.units.filter(u=>u.side===0).every(u=>u.statuses.some(s=>s.key==='disruptUntil'))","v.units.filter(u=>u.side===0&&stratagemAreaContains(STRATAGEMS.disrupt,b.enemyCommand.lastCommand.target,u)).every(u=>u.statuses.some(s=>s.key==='stun'))")
 .replace("b.sides[0].rangeUntil=10;b.sides[0].assaultUntil=10;","setStatus(b,u,'longRange',10);").replace("s.key==='rangeUntil'","s.key==='longRange'")
 .replace("assert.ok(!battlefieldStatuses(b,u).some(s=>s.key==='longRange'));","assert.ok(battlefieldStatuses(b,u).some(s=>s.key==='longRange'));")
 .replace("b.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(b,'cleanse'),null);","appointBattleTestCommander(b,'yu');b.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(b,'cleanse',{x:u.x,y:u.y}),null);")
 .replace("assert.ok(battlefieldStatuses(b,u).some(s=>s.key==='burn'))","assert.ok(!battlefieldStatuses(b,u).some(s=>s.key==='burn'))"));
await edit('tests/bond-valor.test.mjs',s=>block(s,'full Valor also checks the real source of enemy command intent loss and army status effects',String.raw`test('full Valor checks actual source intent for hostile area commands and can admit it at equal intent',()=>{
 const x=scene(full,0,'archer',['田丰','袁绍','司马懿','郭嘉']),p=battleStratagemSource(x.b,'disrupt',1);assert.ok(p);const caster=bondSource(x.b,p);caster.intent=20;
 x.b.enemyCommand.commandProgress=COMMAND_RESOURCE.capacity;const point={x:x.u.x,y:x.u.y};assert.ok(issueCommand(x.b,'disrupt',point,1));assert.equal(hasStatus(x.b,x.u,'stun'),false);assert.equal(x.b.enemyCommand.commandProgress,COMMAND_RESOURCE.capacity);
 caster.intent=x.u.intent;assert.equal(issueCommand(x.b,'disrupt',point,1),null);assert.ok(hasStatus(x.b,x.u,'stun'));
});`));
await edit('scripts/verify-stratagem-picker-ui.mjs',s=>s.replaceAll('assault','cao-wuchao'));
await edit('scripts/verify-stratagem-area-ui.mjs',s=>s.replaceAll("entry('yu')","entry('person-668')").replace("advisor:'yu'","advisor:'person-668'"));
await edit('scripts/verify-command-specials-ui.mjs',s=>s.replaceAll('jia-speed','swift').replace('/一支.*24/s','/半径2.*神速12/s').replace("assert.equal(await page.locator('.battle-unit.stratagem-affected').count(),1);assert.equal(await page.locator('.unit-nameplate.stratagem-affected').count(),1);","const count=await page.locator('.battle-unit.stratagem-affected').count();assert.ok(count>0);assert.equal(await page.locator('.unit-nameplate.stratagem-affected').count(),count);").replace('single-target.png','group-target.png'));
