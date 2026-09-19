import assert from 'node:assert/strict';
import {availableTactics,unitTactics,configureTactics,TACTICS_BOOK} from '../../tactics.mjs';
import {learnFixtureTactics} from './learn-tactics.mjs';

// Exercise the real immediate-cast path, including intent, targeting and cooldowns.
export function primeTactic(u,id){
  const available=availableTactics(u).map(s=>s.id);
  assert.ok(available.includes(id),`${u.id} cannot equip ${id}`);
  assert.equal(learnFixtureTactics(u,[id]),null);
  const ids=unitTactics(u).map(s=>s.id);
  u.skillReady=Object.fromEntries(ids.map(key=>[key,key===id?0:999]));
  u.intent=Math.max(u.intent||0,TACTICS_BOOK[id].threshold);
}
