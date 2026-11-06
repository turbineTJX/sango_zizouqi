import test from 'node:test';
import assert from 'node:assert/strict';
import {STATUS_DISPLAY,statusIcon,statusRemaining,statusTimeLabel,visibleStatuses,inspectionStatuses,statusSources} from '../status-display.mjs';
import {createScenario} from './helpers/scenarios.mjs';
import {STRATAGEMS} from '../stratagems.mjs';
import {setStatus} from '../tactics.mjs';

test('status timer matches exclusive expiration and distinguishes the final active step from expired state',()=>{
  const b={tick:10},u={statuses:{}};setStatus(b,u,'confuse',3);
  assert.equal(statusRemaining(u.statuses.confuse.until,b.tick),3);
  assert.equal(statusTimeLabel(u.statuses.confuse.until,b.tick),'生效中');
  b.tick=13;assert.equal(visibleStatuses(b,u)[0].time,'即将结束');
  b.tick=14;assert.deepEqual(visibleStatuses(b,u),[]);
});

test('hard control and DOT take precedence over buffs; icons, stacks and hit counts remain available',()=>{
  const b={tick:0},u={statuses:{}};
  setStatus(b,u,'valor',8);setStatus(b,u,'attackHaste',8);
  setStatus(b,u,'burn',6,{amount:12,sourceId:'actor'});setStatus(b,u,'burn',6,{amount:12,sourceId:'actor'});
  setStatus(b,u,'plague',10,{amount:20,sourceId:'actor'});setStatus(b,u,'confuse',2);
  const list=visibleStatuses(b,u);
  assert.deepEqual(list.slice(0,3).map(s=>s.key),['confuse','burn','plague']);
  assert.equal(list.find(s=>s.key==='burn').state.stacks,2);
  assert.ok(list.some(s=>s.key==='attackHaste'));
  for(const s of list){assert.ok(s.description);assert.match(statusIcon(s.key),/<svg.*<path/);}
  assert.notEqual(statusIcon('confuse'),statusIcon('burn'));assert.notEqual(statusIcon('burn'),statusIcon('plague'));
  assert.ok(STATUS_DISPLAY.stealth&&STATUS_DISPLAY.decoy&&STATUS_DISPLAY.stun);
  assert.equal(STATUS_DISPLAY.stun.name,'眩晕');
});

test('army status names remain distinct from the supplying stratagem while preserving provenance',()=>{
  const b=createScenario('field').battle,u=b.sides[0].units[0];
  b.sides[0].blockadeUntil=b.tick+8;
  b.sides[0].stratagemEffects={blockadeUntil:{key:'blockade',duration:8,cooldown:28,power:1,strength:0}};
  const before=JSON.stringify(b),status=inspectionStatuses(b,u).find(s=>s.key==='blockadeUntil');
  assert.equal(status.name,'截断援路');assert.notEqual(status.name,STRATAGEMS.blockade.name);
  assert.ok(status.sources.some(source=>source.includes(STRATAGEMS.blockade.name)));
  assert.equal(JSON.stringify(b),before);
});

test('an enhanced attack uses the formal status name and keeps its tactic name in the source',()=>{
  const b={tick:0},u={statuses:{}};
  setStatus(b,u,'attackOrb',6,{skillId:'fire',sourceSkillName:'火矢',charges:2});
  const before=JSON.stringify(u),status=visibleStatuses(b,u).find(s=>s.key==='attackOrb');
  assert.equal(status.name,'强化普攻');assert.deepEqual(statusSources(b,status),['「火矢」']);
  assert.equal(JSON.stringify(u),before);
});
