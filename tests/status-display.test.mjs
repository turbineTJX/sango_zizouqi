import test from 'node:test';
import assert from 'node:assert/strict';
import {STATUS_DISPLAY,statusIcon,statusRemaining,statusTimeLabel,visibleStatuses} from '../status-display.mjs';
import {setStatus} from '../tactics.mjs';

test('status timer matches exclusive expiration and distinguishes the final active step from expired state',()=>{
  const b={tick:10},u={statuses:{}};setStatus(b,u,'confuse',3);
  assert.equal(statusRemaining(u.statuses.confuse.until,b.tick),3);
  assert.equal(statusTimeLabel(u.statuses.confuse.until,b.tick),'3 日');
  b.tick=13;assert.equal(visibleStatuses(b,u)[0].time,'本日结束');
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
  assert.ok(STATUS_DISPLAY.stealth&&STATUS_DISPLAY.decoy&&!STATUS_DISPLAY.stun);
});
