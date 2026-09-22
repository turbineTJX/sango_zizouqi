import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,orderArmy,advanceTurn,startBattle,lockDeployment,stepBattle,validateSave,makeOfficer} from '../engine.mjs';
import {roleTraits,activeCommandTraits,COMMAND_TRAITS,COMMAND_TRAIT_HOLDERS} from '../officer-traits.mjs';
import {passiveAttributes,passiveList} from '../passives.mjs';
import {commanderComparison} from '../combat-comparison.mjs';
import {officerRecommendation} from '../officer-recommendation.mjs';
function battle(){const s=newGame(99);orderArmy(s,'a1','guandu');advanceTurn(s);assert.equal(startBattle(s),null);lockDeployment(s.battle);return s;}
test('appointment traits affect only the appointed role and its own army independent of personal deployment',()=>{
 const s=battle(),b=s.battle,side=b.sides[0],u=side.units.find(u=>u.id==='dun'),cao=side.units.find(u=>u.id==='cao');
 assert.ok(roleTraits(cao,'leader').length);const id=roleTraits(cao,'leader')[0];assert.ok(activeCommandTraits(b,u).includes(id));
 const stat=Object.keys(COMMAND_TRAITS[id].stats)[0];assert.ok(passiveAttributes(b,u)[stat].some(m=>m.label.includes(COMMAND_TRAITS[id].name)));
 const c=side.commanders.find(c=>c.id==='cao'&&c.role==='leader');c.role='advisor';assert.ok(!activeCommandTraits(b,u).includes(id));c.role='leader';
 const army=u.armyId;u.armyId='other';assert.deepEqual(activeCommandTraits(b,u),[]);u.armyId=army;
 for(const status of ['reserve','waiting','active','defeated']){cao.status=status;assert.ok(activeCommandTraits(b,u).includes(id));}
 cao.hp=0;assert.ok(activeCommandTraits(b,u).includes(id));
 for(const v of side.units.filter(v=>v.armyId===army))assert.ok(activeCommandTraits(b,v).includes(id));
});
test('advisor traits require advisor appointment and do not leak from ordinary officers',()=>{
 const s=battle(),b=s.battle,side=b.sides[0],jia=side.units.find(u=>u.id==='jia'),target=side.units.find(u=>u.id==='dun');
 const id=roleTraits(jia,'advisor')[0];assert.ok(id);assert.ok(activeCommandTraits(b,target).includes(id));
 const c=side.commanders.find(c=>c.id==='jia');c.role='leader';assert.ok(!activeCommandTraits(b,target).includes(id));c.role='advisor';
 assert.equal(passiveList(jia,b).find(t=>t.id===id).state,'军团任职生效');
 side.commanders.push({...c});assert.equal(activeCommandTraits(b,target).filter(t=>t===id).length,1);
});
test('appointment UI displays the matching trait effect and recommendation uses it',()=>{
 const s=newGame(99),a=s.armies[0],u=a.units.find(u=>u.id==='cao');
 const r=officerRecommendation(s,u,{task:'role',role:'leader'});assert.ok(r.traits.length);assert.ok(r.score>u.leadership);
 const html=commanderComparison(s,a.units,a,'data-role');assert.ok(html.includes('任职特性'));assert.ok(!html.includes('高级·军团特技'));for(const t of r.traits){assert.ok(html.includes(t.name));assert.ok(html.includes(t.description));}
 assert.deepEqual(officerRecommendation(s,u,{task:'role',role:'deputy'}).traits,[]);
 assert.deepEqual(roleTraits({...u,level:10,intellect:1,leadership:1,type:'ship'},'leader'),roleTraits(u,'leader'));
});
test('current save preserves command eligibility and deterministic continuation',()=>{
 const s=battle();for(let i=0;i<6;i++)stepBattle(s.battle);
 const saved=JSON.parse(JSON.stringify(s));assert.ok(validateSave(saved));
 const restored=validateSave(saved);assert.ok(restored.battle);
 for(let i=0;i<12;i++){stepBattle(s.battle);stepBattle(restored.battle);}assert.deepEqual(restored.battle,s.battle);
});

test('army traits are rare fixed identity assignments, never awarded by stat thresholds',()=>{
 assert.equal(Object.keys(COMMAND_TRAIT_HOLDERS).length,10);
 for(const [id,traits] of Object.entries(COMMAND_TRAIT_HOLDERS)){
  const u=makeOfficer(id,3000);assert.deepEqual([...roleTraits(u,'leader'),...roleTraits(u,'advisor')].sort(),[...traits].sort());
 }
 const ordinary={...makeOfficer('dun',3000),leadership:100,intellect:100,force:100,politics:100};
 assert.deepEqual(roleTraits(ordinary,'leader'),[]);assert.deepEqual(roleTraits(ordinary,'advisor'),[]);
});
