import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {world} from './balance-v14-lib.mjs';
const paths={};
for(const [name,factor,phalanx] of [['pressure75',.75,.7],['pressure65',.65,.7],['pressure75guard',.75,.8]]){
 const w=await world(),file=join(w.dir,'unit-stats.mjs');let s=readFileSync(file,'utf8');
 s="import {interceptorsAt} from './engagement.mjs';\n"+s;
 const marker="if(on('valor'))atk.push";assert.ok(s.includes(marker));
 s=s.replace(marker,`if(b&&['archer','crossbow'].includes(u.type)&&interceptorsAt(b,u,u,true).length)atk.push({label:'近战压制',factor:${factor}});\n ${marker}`);
 if(phalanx!==.7){assert.ok(s.includes("on('phalanx')?.7:1"));s=s.replace("on('phalanx')?.7:1",`on('phalanx')?${phalanx}:1`);}
 writeFileSync(file,s);paths[name]=w.dir;
}
writeFileSync('docs/balance-v14/variant-paths.json',JSON.stringify(paths,null,2));console.log(paths);
