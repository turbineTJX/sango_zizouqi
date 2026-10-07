import assert from 'node:assert/strict';
import {BOND_DESIGNS as D} from '../../data/design/bonds.mjs';
import {BOND_ASSIGNMENTS as A} from '../../data/design/bond-assignments.mjs';
import {OFFICER_DESIGNS as O} from '../../data/design/officers.mjs';
// Pick actual officers for mechanic fixtures; never grant points or exceed six slots.
export function bondLineup(key,keep=[],tier=D[key].thresholds.length){
 const ids=keep.map(n=>Object.values(O).find(o=>o.name===n).id),target=D[key].thresholds[tier-1];
 const candidates=Object.entries(A).filter(([id,a])=>a[key]&&!ids.includes(id)).sort((a,b)=>b[1][key]-a[1][key]);
 let points=ids.reduce((n,id)=>n+(A[id][key]||0),0);
 while(points<target&&ids.length<6&&candidates.length){const [id,a]=candidates.shift();ids.push(id);points+=a[key];}
 assert.ok(points>=target,`${key}: requested roster cannot reach tier ${tier} within six slots`);
 return ids.map(id=>O[id].name);
}
