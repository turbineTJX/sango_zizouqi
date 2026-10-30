// Shared vector glyphs for bond panels and battlefield activation seals.
// Paths use only M/L/Q/C/Z so the same artwork also draws on a canvas.
const glyphs={
 bondTigerFormation:['#e9b276','strike','M2 8 L7 3 L12 6 L17 3 L22 8 L20 18 L12 23 L4 18 Z M6 10 L9 12 M18 10 L15 12 M9 17 L12 19 L15 17 M12 7 L12 12'],
 bondDragonFormation:['#94cbd9','control','M3 18 Q5 5 14 5 L18 2 L21 7 L17 9 Q12 7 10 13 Q9 19 16 18 L20 14 M4 21 L9 19 M7 3 L10 6 M15 12 L19 11 M14 20 L17 23'],
 bondPower:['#edb179','strike','M5 20 L18 7 L20 3 L16 5 L3 18 M4 14 L10 20 M3 21 L6 18'],
 bondArmor:['#9dbed5','guard','M12 2 L21 6 L19 15 Q17 20 12 22 Q7 20 5 15 L3 6 Z M12 6 L12 17 M7 10 L17 10'],
 bondHaste:['#f2ca80','swift','M3 7 L10 12 L3 17 M10 5 L19 12 L10 19 M20 5 L20 19'],
 bondSpirit:['#efca78','support','M12 3 L12 1 M5 5 L3 3 M19 5 L21 3 M3 12 L1 12 M21 12 L23 12 M8 18 L12 6 L16 18 M6 21 L18 21 M8 14 L16 14'],
 bondSuppress:['#97b6d4','control','M3 7 Q9 3 17 7 Q22 10 17 12 L7 12 M4 17 Q10 21 17 17 M5 3 L19 21'],
 bondValor:['#ffc56d','strike','M4 19 L5 9 L8 4 L16 4 L19 9 L20 19 M5 13 L9 15 L9 19 M19 13 L15 15 L15 19 M12 4 L12 1 M8 21 L16 21'],
 bondWisdom:['#c6adf2','control','M12 21 L2 9 Q12 0 22 9 Z M12 21 L7 7 M12 21 L12 5 M12 21 L17 7'],
 bondGuard:['#83c9ca','guard','M3 3 L8 3 L8 8 L3 8 Z M16 3 L21 3 L21 8 L16 8 Z M9 14 L15 14 L15 21 L9 21 Z M8 6 L16 6 M5 8 L12 14 L19 8'],
 bondRaid:['#edb286','strike','M5 22 L5 2 L20 3 L16 8 L20 13 L5 12 M9 5 L14 9 M14 5 L9 9 M10 17 L19 17 M16 14 L20 17 L16 20'],
 bondEscort:['#8bcdd7','guard','M4 7 L11 4 L15 7 L14 15 L10 19 L5 16 Z M12 7 L18 5 L22 8 L21 16 L17 20 L14 17'],
 bondBeauty:['#efa7c6','support','M12 12 C1 9 4 0 10 5 C12 -1 19 2 17 7 C24 6 24 15 18 15 C21 23 12 25 11 18 C4 23 -1 15 6 13 Z M12 10 L12 15 M9 12 L15 12'],
 bondPeach:['#efa992','support','M12 8 C4 1 0 11 6 18 Q12 25 18 18 C24 11 20 1 12 8 Z M12 8 Q12 2 18 2 Q18 7 12 8 M12 11 Q9 16 12 21'],
 bondReserve:['#b8d58f','support','M4 10 L20 10 L20 21 L4 21 Z M4 14 L20 14 M10 13 L14 13 L14 17 L10 17 Z M12 9 Q2 6 5 2 Q12 2 12 9 Q12 1 20 2 Q20 8 12 9'],
 bondSwift:['#e9c48d','swift','M4 19 L8 12 L5 9 L10 4 L17 4 L20 9 L16 11 L13 9 L11 15 L18 21 M10 4 L10 1 M15 4 L16 1 M2 13 L5 13 M1 17 L3 17'],
 bondBulwark:['#94bbc4','guard','M3 21 L3 6 L7 6 L7 10 L10 10 L10 6 L14 6 L14 10 L17 10 L17 6 L21 6 L21 21 Z M9 21 L9 16 Q12 12 15 16 L15 21'],
 bondVolley:['#aacbb6','strike','M3 20 L20 3 M13 3 L21 3 L21 11 M7 4 Q21 4 20 18 M2 13 L11 22 M2 18 L6 22'],
 bondLastStand:['#f0b39b','strike','M3 20 L8 9 L5 9 L12 2 L19 9 L16 9 L21 20 M5 16 L2 16 M22 16 L19 16 M8 22 L11 18 L13 21 L16 17'],
 bondScholar:['#b8b8e0','control','M3 4 Q7 2 12 5 Q17 2 21 4 L21 20 Q17 18 12 21 Q7 18 3 20 Z M12 5 L12 21 M6 8 L9 9 M15 9 L18 8 M6 13 L9 14 M15 14 L18 13'],
 bondSpread:['#91c7c5','guard','M8 8 L2 2 M2 7 L2 2 L7 2 M16 8 L22 2 M17 2 L22 2 L22 7 M8 16 L2 22 M2 17 L2 22 L7 22 M16 16 L22 22 M17 22 L22 22 L22 17 M10 10 L14 10 L14 14 L10 14 Z'],
 bondFinisher:['#eabd88','strike','M4 21 L16 4 M11 3 L17 3 L22 9 L18 13 L13 8 M3 16 L8 21'],
 bondAntiHorse:['#adc494','strike','M3 21 L10 4 L10 1 M6 5 L10 1 L14 5 M12 20 L16 12 L13 9 L17 5 L21 9 L20 15 L23 20 M17 5 L17 2'],
 bondSiegebreak:['#dbbc9c','strike','M3 21 L3 8 L8 8 L8 21 M16 21 L16 8 L21 8 L21 21 M3 12 L21 12 M9 19 L17 4 M13 2 L21 6 L19 10 L11 6 Z'],
 bondSteady:['#a6c8d0','guard','M5 3 L19 3 L17 11 L12 15 L7 11 Z M12 15 L12 21 M5 22 L19 22 M7 7 L17 7 M2 13 L5 16 M22 13 L19 16'],
 bondMuster:['#c8cd94','swift','M2 3 L9 10 M2 8 L2 3 L7 3 M22 3 L15 10 M17 3 L22 3 L22 8 M2 21 L9 14 M2 16 L2 21 L7 21 M22 21 L15 14 M17 21 L22 21 L22 16 M10 10 L14 10 L14 14 L10 14 Z'],
 bondSkirmish:['#c6afcb','swift','M3 21 L15 9 L12 6 L20 2 L22 10 L19 8 L7 20 Z M2 5 L8 5 M2 9 L6 9 M16 16 L21 16 L21 22'],
 bondSong:['#9ddfc1','support','M3 9 Q10 5 17 9 L17 18 Q10 22 3 18 Z M3 9 Q10 13 17 9 M3 17 Q10 13 17 17 M7 3 L14 7 M20 4 L20 13 Q16 15 17 12 Q18 10 20 11'],
 bondCrusher:['#efb88d','strike','M12 2 L21 6 L19 15 L13 22 M11 21 L5 15 L3 6 L10 3 M14 5 L10 10 L14 12 L9 18 M18 3 L22 1 M20 11 L24 11'],
 bondDoubt:['#c4b1db','control','M3 6 L7 2 L11 6 L7 10 Z M13 16 L17 12 L21 16 L17 20 Z M3 16 L7 12 L11 16 L7 20 Z M13 6 L17 2 L21 6 L17 10 Z M10 11 L14 11 M12 9 L12 13'],
 bondLure:['#d7b8d1','control','M5 3 L17 3 L17 15 Q17 23 9 21 Q3 20 5 14 L8 17 M14 6 L20 6 M3 7 L8 7 M6 4 L6 10'],
 bondFire:['#f4ae79','strike','M12 2 Q18 6 15 11 Q19 9 19 6 C27 22 4 29 4 15 Q3 9 8 6 Q6 14 10 14 Q14 12 12 2 Z M12 14 Q18 21 11 22 Q7 21 12 14'],
 bondChain:['#a9c9d9','control','M11 8 L15 4 Q19 0 22 4 Q25 7 20 12 L16 16 M13 16 L9 20 Q5 24 2 20 Q-1 17 4 12 L8 8 M7 17 L17 7'],
};
const commands=path=>path.match(/[MLQCZ]|-?\d+(?:\.\d+)?/g).reduce((rows,v)=>{if(/[MLQCZ]/.test(v))rows.push([v]);else rows.at(-1).push(Number(v));return rows;},[]);
export const BOND_VISUALS=Object.freeze(Object.fromEntries(Object.entries(glyphs).map(([id,[color,motif,path]])=>[id,Object.freeze({color,motif,path,commands:commands(path)})])));
export function bondIcon(id){const g=BOND_VISUALS[id];return g?`<svg class="bond-icon" data-bond-icon="${id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${g.path}"/></svg>`:'';}
export function drawBondGlyph(c,id,x,y,size){const g=BOND_VISUALS[id];if(!g)return;c.save();c.translate(x-size/2,y-size/2);c.scale(size/24,size/24);c.lineWidth=1.7;c.lineCap='round';c.lineJoin='round';c.beginPath();for(const [op,...n]of g.commands)c[({M:'moveTo',L:'lineTo',Q:'quadraticCurveTo',C:'bezierCurveTo',Z:'closePath'})[op]](...n);c.stroke();c.restore();}
