import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from './helpers/scenarios.mjs';
import {lockDeployment} from '../engine.mjs';
import {setStatus,unitTactics} from '../tactics.mjs';
import {battleInspectionBriefMarkup,battleInspectionTacticsMarkup,battleInspectionContextMarkup,battleInspectionStatusesMarkup} from '../battle-inspection-view.mjs';
import {tacticUseLimit} from '../tactic-tempo.mjs';

test('battle brief shows injury, intent and live shields without a second full attribute table',()=>{
 const b=createScenario('history-guandu').battle,u=b.sides[0].units[0];
 u.battleDamage=400;u.hp=u.initial-400;u.intent=63;setStatus(b,u,'shield',8,{amount:200,source:'test',label:'测试护盾'});
 const before=JSON.stringify(b),html=battleInspectionBriefMarkup(b,u);
 assert.ok(html.includes(`${u.hp} / ${u.hp+140} / ${u.initial}`));assert.match(html,/战意.*63/s);assert.match(html,/护盾.*200/s);
 assert.doesNotMatch(html,/兵种适性|attribute-card|带兵上限|battle-info-fields/);
 assert.doesNotMatch(battleInspectionContextMarkup(b,u),/当前兵 \/ 可恢复上限 \/ 原上限|当前战意|本场伤兵/);
 assert.equal(JSON.stringify(b),before);
});

test('compact tactic buttons retain actual remaining limits, passive labels and detail actions',()=>{
 const b=createScenario('history-guandu').battle,u=b.sides[0].units[0],skill=unitTactics(u).find(s=>!s.passive);
 u.tacticCasts[skill.id]=tacticUseLimit(u,skill);const before=JSON.stringify(b),html=battleInspectionTacticsMarkup(b,u);
 assert.ok(html.includes(`0 / ${tacticUseLimit(u,skill)}`));assert.match(html,/data-action="tactic-detail"/);assert.match(html,/本场次数已用尽/);
 assert.equal(JSON.stringify(b),before);
});

test('the brief does not expose hidden enemy health or actions',()=>{
 const b=createScenario('history-guandu').battle;lockDeployment(b);const enemy=b.sides[1].units[0];setStatus(b,enemy,'stealth',8);
 const html=battleInspectionBriefMarkup(b,enemy);assert.match(html,/尚未识破/);assert.doesNotMatch(html,/progressbar|兵力|护盾/);
});

test('status brief exposes real effects, source, exact duration and optional marginal values without changing combat',()=>{
 const b=createScenario('history-guandu').battle;lockDeployment(b);const u=b.sides[0].units[0];
 setStatus(b,u,'valor',8,{sourceName:'测试武将',sourceSkillName:'鼓舞'});
 setStatus(b,u,'confuse',3,{sourceName:'敌将',sourceSkillName:'混乱'});
 const before=JSON.stringify(b),html=battleInspectionStatusesMarkup(b,u);
 assert.match(html,/2项/);assert.match(html,/剩余 8 战斗回合/);
 assert.match(html,/<b>混乱<\/b>/);assert.match(html,/测试武将「鼓舞」/);
 assert.match(html,/<details open class="effect-tile/);assert.match(html,/攻击提高/);assert.match(html,/属性变化/);
 assert.equal(JSON.stringify(b),before);
 b.tick+=2;assert.match(battleInspectionStatusesMarkup(b,u),/剩余 6 战斗回合/);
});

test('status brief stays short when empty and does not reveal hidden enemy effects',()=>{
 const b=createScenario('history-guandu').battle,u=b.sides[0].units[0];
 assert.match(battleInspectionStatusesMarkup(b,u),/<small>无<\/small>/);
 lockDeployment(b);const enemy=b.sides[1].units[0];setStatus(b,enemy,'stealth',8);setStatus(b,enemy,'valor',8);
 assert.equal(battleInspectionStatusesMarkup(b,enemy),'');
});
