import {readFileSync,writeFileSync} from 'node:fs';
const edit=(f,fn)=>{const s=readFileSync(f,'utf8'),n=fn(s);if(n===s)throw Error(f);writeFileSync(f,n);};
const rep=(s,a,b)=>{if(!s.includes(a))throw Error(a.slice(0,70));return s.replace(a,b);};
edit('bond-display.mjs',s=>{s="import {treasureBondBonus} from './treasure-battle.mjs';\n"+s;s=rep(s,"${BOND_DESIGNS[id].name}${levels[id]||0}${active.has(id)?", "${BOND_DESIGNS[id].name}${levels[id]||0}${treasureBondBonus(u,levels)?.id===id?'＋宝物1':''}${active.has(id)?");s=rep(s,'const sums=b?sideBonds(b,side):{};',"const sums=b?sideBonds(b,side):sideBonds({sides:[{units:eligible.map(u=>({...u,status:'active',hp:u.hp??u.troops}))}]},0);");s=s.replace(/ if\(!b\)for\(const u of eligible\)for\(const \[id,n\] of Object.entries\(bondLevels\(u\)\)\)\{[^\n]+\}\n/,'');s=rep(s,'tier=d.thresholds.filter(n=>s.points>=n).length','tier=s.tier||0');s=rep(s,'points:s.points,tier,next:',"points:s.points,holders:s.holders,treasurePoints:s.treasurePoints,tier,next:");s=rep(s,'${progress}</small>','${progress}${d.treasurePoints?\' · 宝物+\'+d.treasurePoints:\'\'}${d.grade===\'basic\'?\' · \'+d.holders+\'人\':\'\'}</small>');return s;});


