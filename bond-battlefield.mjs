import {BOND_DESIGNS} from './data/design/bonds.mjs';
import {terrainAt} from './battlefield.mjs';
import {battleBuildings} from './building-rules.mjs';
import {sideBondDetails} from './bonds.mjs';
import {TREASURE_RULES} from './data/design/treasures.mjs';
import {setStatus} from './tactics.mjs';
import {sideCell,compareSideCells} from './hex-grid.mjs';
const field=u=>u.status==='active'&&u.hp>0&&!u.isDecoy;
const levels=u=>u.bondGrowth?.levels||{};
export const FORMATION_BONDS=Object.keys(BOND_DESIGNS).filter(id=>['formationTiles','openingFormation'].includes(BOND_DESIGNS[id].special));
export function chooseFormation(b,side){
 if(!b?.sides?.[side])return null;
 const sums=sideBondDetails(b,side);
 return FORMATION_BONDS.map(id=>({id,points:sums[id]?.points||0,holders:sums[id]?.holders||0,tier:sums[id]?.tier||0})).filter(e=>e.tier>0).sort((a,c)=>c.points-a.points||FORMATION_BONDS.indexOf(a.id)-FORMATION_BONDS.indexOf(c.id))[0]||null;
}
export function formationChoice(b,side){return b?.deploymentLocked&&b.sides?.[side]&&Object.hasOwn(b.sides[side],'bondFormationChoice')?b.sides[side].bondFormationChoice:chooseFormation(b,side);}
export function lockFormationChoice(b,side){if(!Object.hasOwn(b.sides[side],'bondFormationChoice'))b.sides[side].bondFormationChoice=chooseFormation(b,side);}
export function validFormationChoice(b,side){
 const army=b.sides[side],e=army.bondFormationChoice;
 if(!b.deploymentLocked)return e===undefined;
 return e===null||!!e&&Object.keys(e).length===4&&FORMATION_BONDS.includes(e.id)&&Number.isInteger(e.points)&&e.points>0&&e.points<=30&&Number.isInteger(e.holders)&&e.holders>0&&e.holders<=army.units.length&&e.tier===BOND_DESIGNS[e.id].thresholds.filter((n,i)=>e.points>=n&&e.holders>=TREASURE_RULES.minimumHolders[i]).length&&e.tier>0;
}
export function formationTier(b,side,id='bondGuard'){return sideBondDetails(b,side)[id]?.tier||0;}
// Public, mirrored ground/naval layouts. They do not consume or inspect RNG.
export function formationCells(b,side,id='bondGuard'){
 const units=b.sides[side]?.units.filter(u=>!u.isDecoy)||[],ship=units.some(u=>u.type==='ship'),land=units.some(u=>u.type!=='ship');
 const patterns=BOND_DESIGNS[id].patterns,anchors=patterns[b.terrain==='river'&&ship?(land?'mixed':'naval'):(b.terrain||'land')];
 const occupied=new Set(battleBuildings(b).map(v=>v.x+','+v.y)),taken=new Set(),result=[];
 for(const [ax,ay]of anchors){const list=[];for(let x=0;x<5;x++)for(let y=0;y<8;y++){
  const p=sideCell({x,y},side),key=p.x+','+p.y,ground=terrainAt(b,p.x,p.y);
  if(ground==='rock'||taken.has(key)||occupied.has(key)||ground==='water'&&!ship||ground!=='water'&&ground!=='bridge'&&!land)continue;
  list.push({...p,score:Math.abs(x-ax)+Math.abs(y-ay),key});
 }list.sort((a,c)=>a.score-c.score||compareSideCells(a,c,side));if(list[0]){const p=list[0];result.push({x:p.x,y:p.y});taken.add(p.key);}}
 return result;
}
export const OPENING_FORMATIONS=Object.keys(BOND_DESIGNS).filter(id=>BOND_DESIGNS[id].special==='openingFormation');
const statNames={attack:'攻击',defense:'防御',discipline:'军纪',martialPower:'武技威力',strategyPower:'谋略威力',attackSpeed:'攻速'};
export function openingFormationCells(b,side){
 const choice=formationChoice(b,side);
 return OPENING_FORMATIONS.filter(id=>choice?.id===id).flatMap(id=>{
  const d=BOND_DESIGNS[id],tier=choice.tier;
  return formationCells(b,side,id).map((p,slot)=>({...p,side,id,slot,tier,short:d.formationSlots[slot].name.slice(0,-1),title:d.name+' · '+d.formationSlots[slot].name+' · '+d.formationSlots[slot].stats.map(k=>statNames[k]).join('、')+' +'+Math.round(d.formationSlots[slot].values[Math.max(0,tier-1)]*100)+'%'}));
 });
}
export function grantOpeningFormationEntries(b,pending,side){
 const marks=b.tick===0?openingFormationCells(b,side).filter(m=>m.tier>0):[];
 for(const u of pending)u.bondOpeningFormations=marks.filter(m=>m.x===u.x&&m.y===u.y).map(m=>({id:m.id,tier:m.tier,slot:m.slot,x:m.x,y:m.y}));
 // Each occupied opening role grants one third of the full shield once.
 // Re-entry, later reserves and walking onto a mark cannot add or refill it.
 const occupied=marks.filter(m=>b.sides[side].units.some(u=>field(u)&&u.x===m.x&&u.y===m.y)).length;
 if(marks.length!==3||occupied===0)return;
 const {id,tier}=marks[0],d=BOND_DESIGNS[id];
 for(const u of pending)setStatus(b,u,'shield',d.completeSteps,{amount:Math.floor(u.maxHp*d.completeShield[tier-1]*occupied/3),source:'formation:'+id,sourceId:u.id,label:d.name+' · 成阵护盾'});
}
export function validOpeningFormationShield(b,u){
 const layers=(u.statuses?.shield?.layers||[]).filter(l=>l.source?.startsWith('formation:'));
 if(!layers.length)return true;
 const choice=formationChoice(b,u.side),d=BOND_DESIGNS[choice?.id],army=b.sides[u.side];
 if(!OPENING_FORMATIONS.includes(choice?.id)||u.bondEntry?.tick!==0||!army.bondReserve?.starters.includes(u.id))return false;
 const slots=new Set(army.units.filter(v=>army.bondReserve.starters.includes(v.id)).flatMap(v=>(v.bondOpeningFormations||[]).filter(e=>e.id===choice.id&&e.tier===choice.tier).map(e=>e.slot)));
 return slots.size>=1&&slots.size<=3&&layers.length===1&&layers.every(l=>l.source==='formation:'+choice.id&&l.sourceId===u.id&&l.label===d.name+' · 成阵护盾'&&l.until===d.completeSteps+1&&Number.isInteger(l.amount)&&l.amount>0&&l.amount<=Math.floor(u.maxHp*d.completeShield[choice.tier-1]*slots.size/3)&&l.sourceCommand===undefined&&l.sourceTreasure===undefined&&l.bondGuardTier===undefined);
}
export function openingFormationModifiers(b,u){
 if(!field(u))return [];
 return (u.bondOpeningFormations||[]).flatMap(e=>{
  const d=BOND_DESIGNS[e.id],slot=d?.formationSlots?.[e.slot];
  return slot?slot.stats.map(stat=>({id:e.id,stat,label:d.name+' · '+slot.name,factor:1+slot.values[e.tier-1]})):[];
 });
}
export function validOpeningFormationEntries(b,u){
 const entries=u.bondOpeningFormations;
 if(!u.bondEntry)return entries===undefined;
 if(!Array.isArray(entries)||entries.length>1)return false;
 const choice=formationChoice(b,u.side);
 return entries.every(e=>e&&Object.keys(e).length===5&&OPENING_FORMATIONS.includes(e.id)&&choice?.id===e.id&&choice.tier===e.tier&&u.bondEntry.tick===0&&Number.isInteger(e.slot)&&e.slot>=0&&e.slot<BOND_DESIGNS[e.id].formationSlots.length&&formationCells(b,u.side,e.id).some((p,i)=>i===e.slot&&p.x===e.x&&p.y===e.y));
}
export function formationMarkers(b,side){
 const choice=formationChoice(b,side);if(!choice)return [];
 return choice.id==='bondGuard'?formationCells(b,side).map(p=>({...p,side,id:choice.id,tier:choice.tier,short:'天',title:'天覆阵位'})):openingFormationCells(b,side);
}
export function grantFormationEntries(b,pending,side,tier){
 const cells=formationCells(b,side),matches=u=>cells.some(p=>p.x===u.x&&p.y===u.y),complete=tier===BOND_DESIGNS.bondGuard.thresholds.length&&cells.length===3&&cells.every(p=>b.sides[side].units.some(u=>field(u)&&u.x===p.x&&u.y===p.y));
 for(const u of pending)u.bondFormation={tick:b.tick,tier,x:u.x,y:u.y,matched:matches(u),complete,holder:!!levels(u).bondGuard};
}
export function formationBoost(b,u){
 if(formationChoice(b,u.side)?.id!=='bondGuard')return 0;
 const e=u.bondFormation,d=BOND_DESIGNS.bondGuard;if(!field(u)||!e?.matched||!e.tier||b.tick>=e.tick+(e.complete?d.fullDuration:d.entryDuration[e.tier-1])+1)return 0;
 return d.values[e.tier-1]*(e.holder?d.holderMultiplier:1);
}
export function validFormationEntry(b,u){
 const e=u.bondFormation;if(!e)return !u.bondEntry;
 if(!u.bondEntry||!e||Object.keys(e).length!==7||!Number.isInteger(e.tick)||e.tick!==u.bondEntry.tick||!Number.isInteger(e.tier)||e.tier<0||e.tier>3||!Number.isInteger(e.x)||!Number.isInteger(e.y)||e.x<0||e.x>13||e.y<0||e.y>7||typeof e.matched!=='boolean'||typeof e.complete!=='boolean'||typeof e.holder!=='boolean')return false;
 return e.tier===(formationChoice(b,u.side)?.id==='bondGuard'?formationChoice(b,u.side).tier:0)&&e.matched===formationCells(b,u.side).some(p=>p.x===e.x&&p.y===e.y)&&(!e.complete||e.tier===3)&&e.holder===!!levels(u).bondGuard;
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
