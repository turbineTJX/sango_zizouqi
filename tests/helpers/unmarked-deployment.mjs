import assert from 'node:assert/strict';
import {deployBattleUnit} from '../../battle-deployment.mjs';
import {formationMarkers} from '../../bond-battlefield.mjs';

// Plain-map contact fixtures isolate an effect from opening formation rewards.
// Use legal deployment before lock instead of deleting a granted combat effect.
export function deployUnmarkedStarters(b){
 for(const side of [0,1]){
  const marks=formationMarkers(b,side);
  for(const [i,u]of b.sides[side].units.filter(u=>u.status==='active').entries()){
   const x=side?13:0,y=i;assert.ok(!marks.some(p=>p.x===x&&p.y===y));
   assert.equal(deployBattleUnit(b,u.id,x,y,side),null);
  }
 }
}
