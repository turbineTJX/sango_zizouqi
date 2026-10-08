import {readFile,writeFile} from 'node:fs/promises';
const edit=async(path,fn)=>{const s=await readFile(path,'utf8');await writeFile(path,fn(s));};
await edit('unit-stats.mjs',s=>s.replace("const on=k=>statusOn(b||{tick},u,k),army=k=>(side[k]||0)>tick&&!(k==='disruptUntil'&&bondBlocksEffect(b,u,side.stratagemEffects?.[k]));","const on=k=>statusOn(b||{tick},u,k);")
 .replace(/^ const power=.+\r?\n/m,'').replace(/^ const armyLabel=.+\r?\n/m,'')
 .replace(/^ if\(army\(.+\r?\n/gm,'').replace("(on('haste')||army('hasteUntil'))","on('haste')")
 .replace("army('rangeUntil')&&combatFamily(u)==='archer'?2:0,",'').replace("if(on('phalanx')||on('root'))move.push({label:on('root')?'定身':'方阵',factor:0});","if(on('phalanx')||on('root')||on('stun'))move.push({label:on('stun')?'眩晕':on('root')?'定身':'方阵',factor:0});"));
await edit('status-display.mjs',s=>s.replace(/export const ARMY_STATUS_DISPLAY=\{[\s\S]*?\n\};/,"export const ARMY_STATUS_DISPLAY={blockadeUntil:['截断援路','暂停敌方预备队入场']};")
 .replace("['disruptUntil','blockadeUntil']","['blockadeUntil']").replaceAll("['disruptUntil','blockadeUntil']","['blockadeUntil']").replace(/^  if\(s.key==='recoveryUntil'\).+\r?\n/m,''));
for(const path of ['trait-mechanics.mjs','bonds.mjs'])await edit(path,s=>s.replaceAll("['confuse','stasis']","['stun','confuse','stasis']").replace("['confuse','seal','disrupted']","['stun','confuse','seal','disrupted']"));
await edit('battle-signals.mjs',s=>s.replace('const GLYPHS={',"const GLYPHS={stun:'晕',commandInvincible:'御',")
 .replace(/,?(assaultUntil|fortifyUntil|disruptUntil|hasteUntil|rangeUntil|recoveryUntil):'[^']*'/g,'')
 .replace(/,'(?:assaultUntil|fortifyUntil|disruptUntil|hasteUntil|rangeUntil|recoveryUntil|reliefUntil)'/g,'')
 .replace("&&(s.key!=='rangeUntil'||['archer','crossbow'].includes(u.type))",'')
 .replace("has('shield'","has('commandInvincible','shield'").replace("has('confuse'","has('stun','confuse'"));
await edit('docs/current-docs.json',s=>s.replace('"rulesVersion": 107','"rulesVersion": 108'));
