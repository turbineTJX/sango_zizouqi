import {BOND_DESIGNS} from './data/design/bonds.mjs';
const field=u=>u.status==='active'&&u.hp>0&&!u.isDecoy;
const levels=u=>u.bondGrowth?.levels||{};
// Retired read-only inspection API for old diagnostic scripts. No formation is granted.
export const FORMATION_BONDS=Object.freeze([]),OPENING_FORMATIONS=Object.freeze([]);
export const formationMarkers=()=>[],formationCells=()=>[],openingFormationCells=()=>[],openingFormationModifiers=()=>[];
export const formationChoice=()=>null,chooseFormation=()=>null,formationTier=()=>0,formationBoost=()=>0;
export const validFormationChoice=(b,side)=>b.sides[side].bondFormationChoice===undefined;
export const validFormationEntry=(b,u)=>u.bondFormation===undefined;
export const validOpeningFormationEntries=(b,u)=>u.bondOpeningFormations===undefined;
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
