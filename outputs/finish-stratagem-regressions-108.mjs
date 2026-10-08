import {readFile,writeFile} from 'node:fs/promises';
const edit=async(path,fn)=>writeFile(path,fn(await readFile(path,'utf8')));
function block(s,title,replacement=''){const start=s.indexOf("test('"+title);if(start<0)throw Error(title);const end=s.indexOf('\n});',start)+5;return s.slice(0,start)+replacement+s.slice(end);}
await edit('tests/engine.test.mjs',s=>{
 s=block(s,'paused stratagem consumes a full gauge, preserves time and includes reserves',String.raw`test('paused command consumes full gauge, preserves time and covers active troops only',()=>{
 const s=encounter(521200,'cao'),b=s.battle;b.commandProgress=12000;assert.equal(issueCommand(b,'cao-wuchao'),null);
 assert.equal(b.tick,0);assert.equal(b.commandProgress,0);for(const u of b.sides[0].units)assert.equal(!!u.statuses.magicImmune,u.status==='active');
 assert.ok(issueCommand(b,'cao-wuchao'));validateSave(JSON.parse(JSON.stringify(s)));
});`);
 return block(s,'attack and defense stratagems change actual damage and stop at expiration');
});
await edit('tests/loadouts.test.mjs',s=>{
 s=block(s,'new army strategies cleanse controls, shorten cooldowns and persist across saves',String.raw`test('area dispel and speed preserve real tactic cooldowns and persist across current saves',()=>{
 const state=encounter('person-290','liao'),b=state.battle;lockDeployment(b);const u=b.sides[0].units[0],skill=unitTactics(u)[0].id;
 setStatus(b,u,'confuse',20);setStatus(b,u,'burn',20,{amount:20,sourceId:b.sides[1].units[0].id});u.skillReady[skill]=20;
 b.commandProgress=12000;assert.equal(issueCommand(b,'cleanse',{x:u.x,y:u.y}),null);assert.equal(u.statuses.confuse,undefined);assert.equal(u.statuses.burn,undefined);assert.ok(hasStatus(b,u,'resolve'));assert.equal(u.skillReady[skill],20);
 b.commandProgress=12000;assert.equal(issueCommand(b,'swift',{x:u.x,y:u.y}),null);assert.equal(b.commandProgress,0);assert.ok(hasStatus(b,u,'rapidAdvance'));assert.equal(u.skillReady[skill],20);
 const copy=validateSave(structuredClone(syncFixtureLearning(state)));assert.deepEqual(copy.battle,b);
});`);
 return block(s,'blockade delays replacement but expires; relief shields automatic reinforcements',String.raw`test('ordinary blockade delays replacement until its actual saved expiry',()=>{
 const state=encounter('person-264','jia'),b=state.battle;lockDeployment(b);
 b.commandProgress=12000;assert.equal(issueCommand(b,'blockade'),null);
 const dead=b.sides[1].units.find(u=>u.status==='active');dead.hp=0;dead.battleDamage=dead.initial;dead.status='defeated';stepBattle(b);
 assert.equal(b.sides[1].units.filter(u=>u.status==='active').length,5);const copy=validateSave(structuredClone(syncFixtureLearning(state)));
 while(b.tick<b.sides[1].blockadeUntil){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
 assert.equal(b.sides[1].units.filter(u=>u.status==='active').length,6);
});`);
});
await edit('tests/scenarios.test.mjs',s=>s.replaceAll("'sima-isolate'","'blockade'").replace("appointTestCommanders(state,'person-226','jia')","appointTestCommanders(state,'person-264','jia')"));
await edit('tests/engine-foundations.test.mjs',s=>s.replaceAll("['assault','inspire','disrupt','cleanse']","['fortify','swift']").replace("assert.equal(army.advisor,'person-512')","assert.equal(army.advisor,'liao')").replace("chooseArmyAdvisor(s.armies[0]),'person-512'","chooseArmyAdvisor(s.armies[0]),'liao'")
 .replace("assert.deepEqual(battleStratagems(noCommands.battle),['fortify','swift'])","assert.deepEqual(battleStratagems(noCommands.battle),['fortify'])"));
await edit('tests/officer-catalog.test.mjs',s=>s.replace(/ const historicalCommanders=.+\r?\n/,'').replace("assert.equal(officerStratagems(u.id).length,entry.intellect>=70?2:0)","assert.ok(officerStratagems(u.id).length<=(entry.intellect>=70?1:0))"));
await edit('tests/siege-power.test.mjs',s=>s.replace("import {unitTactics}","import {unitTactics,setStatus}").replace("if(buff)b.sides[0].assaultUntil=9999;","if(buff)setStatus(b,u,'valor',9999);"));
await edit('scripts/custom-playability-lib.mjs',s=>s.replace(/ const priorities=\[.+;/," const priorities=[...(impaired?['cleanse']:[]),...(hurt?['heal']:[]),...(engaged?['invincible','ward','disrupt','zhuge-eight','zhou-redcliffs','firestorm','fortify','swift']:['ambush'])];"));
await edit('scripts/historical-player-lab.mjs',s=>s.replace("regenerate:()=>hurt.length>=2,fortify:()=>contact,","shield:()=>contact,invincible:()=>contact&&hurt.length>0,stun:()=>contact&&foes.some(u=>u.intent>=50),ambush:()=>near&&!contact,")
 .replace(/  assault:.+\r?\n/,'').replace(/  cycle:.+\r?\n/,'').replace(/  demoralize:.+\r?\n/,'').replace('rapidAdvance:()=>near,blockade:()=>contact,relief:()=>hurt.length>=2','rapidAdvance:()=>near,blockade:()=>contact')
 .replace(/ const priorities=plan.policy===['"]sustain['"][\s\S]*? const available=/," const priorities=plan.policy==='sustain'?['cleanse','heal','invincible','magicImmunity','shield','stun','eightFormation','firestorm','ambush','rapidAdvance','blockade']:\n  ['cleanse','invincible','stun','magicImmunity','eightFormation','heal','firestorm','ambush','rapidAdvance','shield','blockade'];\n const available="));
await edit('scripts/calibrate-trials.mjs',s=>s.replace("[...(hurt?['regenerate','heal']:[]),'firestorm','assault','fortify','inspire']","[...(hurt?['heal']:[]),'invincible','ward','disrupt','firestorm','fortify','ambush','swift']"));
for(const path of ['README.md','docs/野外路口与横向小路-2026-09-22.md'])await edit(path,s=>s.replace(/\[用户提供的古地图\]\([^)]*ancient-atlas-reference\.jpg\)/g,'用户提供的古地图').replace(/\[([^\]]+)\]\([^)]*ancient-atlas-reference\.jpg\)/g,'$1'));
await edit('docs/玩家布阵与羁绊强度-下邳.md',s=>s.replace('[逐局记录](../outputs/historical-reinforcements/final-results.json)','逐局记录'));
