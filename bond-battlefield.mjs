import {BOND_DESIGNS} from './data/design/bonds.mjs';
import {terrainAt} from './battlefield.mjs';
import {battleBuildings} from './building-rules.mjs';
const field=u=>u.status==='active'&&u.hp>0&&!u.isDecoy;
const levels=u=>u.bondGrowth?.levels||{};
export function formationTier(b,side){const n=(b.sides[side]?.units||[]).filter(field).reduce((n,u)=>n+(levels(u).bondGuard||0),0);return BOND_DESIGNS.bondGuard.thresholds.filter(v=>n>=v).length;}
// Public, mirrored ground/naval layouts. They do not consume or inspect RNG.
export function formationCells(b,side){
 const units=b.sides[side]?.units.filter(u=>!u.isDecoy)||[],ship=units.some(u=>u.type==='ship'),land=units.some(u=>u.type!=='ship');
 const patterns=BOND_DESIGNS.bondGuard.patterns,anchors=patterns[b.terrain==='river'&&ship?(land?'mixed':'naval'):(b.terrain||'land')];
 const occupied=new Set(battleBuildings(b).map(v=>v.x+','+v.y)),taken=new Set(),result=[];
 for(const [ax,ay]of anchors){const list=[];for(let x=0;x<5;x++)for(let y=0;y<8;y++){
  const p={x:side?13-x:x,y:side?7-y:y},key=p.x+','+p.y,ground=terrainAt(b,p.x,p.y);
  if(taken.has(key)||occupied.has(key)||ground==='water'&&!ship||ground!=='water'&&ground!=='bridge'&&!land)continue;
  list.push({...p,score:Math.abs(x-ax)+Math.abs(y-ay),key});
 }list.sort((a,c)=>a.score-c.score||a.x-c.x||a.y-c.y);if(list[0]){const p=list[0];result.push({x:p.x,y:p.y});taken.add(p.key);}}
 return result;
}
export function grantFormationEntries(b,pending,side,tier){
 const cells=formationCells(b,side),matches=u=>cells.some(p=>p.x===u.x&&p.y===u.y),complete=tier===BOND_DESIGNS.bondGuard.thresholds.length&&cells.length===3&&cells.every(p=>b.sides[side].units.some(u=>field(u)&&u.x===p.x&&u.y===p.y));
 for(const u of pending)u.bondFormation={tick:b.tick,tier,x:u.x,y:u.y,matched:matches(u),complete,holder:!!levels(u).bondGuard};
}
export function formationBoost(b,u){
 const e=u.bondFormation,d=BOND_DESIGNS.bondGuard;if(!field(u)||!e?.matched||!e.tier||b.tick>=e.tick+(e.complete?d.fullDuration:d.entryDuration[e.tier-1])+1)return 0;
 return d.values[e.tier-1]*(e.holder?d.holderMultiplier:1);
}
export function validFormationEntry(b,u){
 const e=u.bondFormation;if(!e)return !u.bondEntry;
 if(!u.bondEntry||!e||Object.keys(e).length!==7||!Number.isInteger(e.tick)||e.tick!==u.bondEntry.tick||!Number.isInteger(e.tier)||e.tier<0||e.tier>3||!Number.isInteger(e.x)||!Number.isInteger(e.y)||e.x<0||e.x>13||e.y<0||e.y>7||typeof e.matched!=='boolean'||typeof e.complete!=='boolean'||typeof e.holder!=='boolean')return false;
 return e.matched===formationCells(b,u.side).some(p=>p.x===e.x&&p.y===e.y)&&(!e.complete||e.tier===3)&&e.holder===!!levels(u).bondGuard;
}
export function routTier(b,side){const n=(b.sides[side]?.units||[]).filter(field).reduce((n,u)=>n+(levels(u).bondRaid||0),0);return BOND_DESIGNS.bondRaid.thresholds.filter(v=>n>=v).length;}
export function recordBondDefeat(b,target,source){
 if(!b.sides[target.side]?.units.includes(target)||!b.sides[source?.side]?.units.includes(source)||!source||source.side===target.side||source.isDecoy||!b.deploymentLocked||target.isDecoy||target.type==='gate'||target.status!=='active'||target.hp>0)return null;
 const side=1-target.side,tier=routTier(b,side),d=BOND_DESIGNS.bondRaid;if(!tier||b.sides[side].retreat)return null;
 const s=b.sides[side].bondRout ||= {targets:[],burstAt:null,burstTier:0};if(s.targets.includes(target.id)||s.targets.length>=d.killGoal)return null;
 s.targets.push(target.id);
 if(s.targets.length===d.killGoal){s.burstAt=b.tick;s.burstTier=tier;return b.sides[side].units.find(u=>field(u)&&levels(u).bondRaid);}
 return null;
}
export function routDamageBonus(b,u){if(!b?.sides)return 0;const tier=routTier(b,u.side),d=BOND_DESIGNS.bondRaid;return tier&&field(u)&&levels(u).bondRaid?d.values[tier-1]+(b.sides[u.side].bondRout?.targets.length||0)*d.killBonus[tier-1]:0;}
export function routSpeedBonus(b,u){const s=b.sides[u.side]?.bondRout,d=BOND_DESIGNS.bondRaid;return field(u)&&s?.burstAt!==null&&s?.burstTier>0&&b.tick<s.burstAt+d.burstDuration+1&&(s.burstTier===d.thresholds.length||levels(u).bondRaid)?d.burstSpeed[s.burstTier-1]:0;}
export function validBondRout(b,side){
 const s=b.sides[side].bondRout,d=BOND_DESIGNS.bondRaid;if(s===undefined)return true;
 if(!s||Object.keys(s).length!==3||!Array.isArray(s.targets)||s.targets.length<1||s.targets.length>d.killGoal||new Set(s.targets).size!==s.targets.length||s.targets.some(id=>!b.sides[1-side].units.some(u=>u.id===id&&!u.isDecoy&&u.hp===0&&u.status==='defeated')))return false;
 return s.targets.length<d.killGoal?s.burstAt===null&&s.burstTier===0:Number.isInteger(s.burstAt)&&s.burstAt>=0&&s.burstAt<=b.tick&&Number.isInteger(s.burstTier)&&s.burstTier>=1&&s.burstTier<=d.thresholds.length;
}
