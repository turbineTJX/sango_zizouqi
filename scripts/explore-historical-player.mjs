import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {PLAYER_CASES,CANDIDATES,HIST_DEV_SEEDS,fightHistorical,summarizeHistorical} from './historical-player-lab.mjs';
import {sourceHash} from './basic-balance-lib.mjs';
const id=process.argv[2],c=PLAYER_CASES.find(c=>c.id===id);assert.ok(c);
const root='outputs/historical-player/',original=JSON.parse(readFileSync(root+id+'-screen.json','utf8'));
assert.ok(original.frozen,'finish initial screening first');
const source=createHash('sha256').update(sourceHash()).update(readFileSync(new URL('./historical-player-lab.mjs',import.meta.url))).update(readFileSync(new URL('./audit-historical-player.mjs',import.meta.url))).digest('hex');
const mk=(template,name,values)=>({...structuredClone(template),id:name,name,...values});
const infantry=mk(CANDIDATES.guandu[3],'步骑混编',{formation:'center',policy:'sustain',starters:['he','yan','wen','ju','tian','person-304'],types:{he:'spear',yan:'halberd',wen:'spear',ju:'archer',tian:'spear','person-304':'halberd'},weights:{he:10,yan:9,wen:7,ju:4,tian:3,'person-304':1}});
const bows=mk(infantry,'双弓保护',{formation:'center',policy:'sustain',types:{he:'spear',yan:'archer',wen:'archer',ju:'spear',tian:'spear','person-304':'halberd'}});
const split=mk(CANDIDATES.guandu[3],'双骑分路',{formation:'spread',policy:'sustain'});
const guard=mk(CANDIDATES.yiling[1],'护卫枪阵',{types:{'person-396':'spear','person-237':'halberd','person-210':'spear','person-520':'archer'},formation:'north'});
const tower=mk(CANDIDATES.wuzhang[3],'井栏军阵',{types:{'person-290':'tower','person-125':'halberd','person-137':'spear','person-46':'archer','person-439':'archer'},formation:'formation'});
const volley=mk(CANDIDATES.wuzhang[1],'双弩八阵',{types:{'person-290':'archer','person-125':'halberd','person-137':'spear','person-46':'crossbow'},formation:'center'});
const hefeiCore=mk(CANDIDATES.hefei[1],'张辽满编出击',{weights:{liao:20,'person-342':4,'person-567':3,'person-70':2,'person-610':2,'person-337':1},types:{'person-610':'archer'},formation:'north',policy:'attack'});
const hefeiGuard=mk(hefeiCore,'张辽满编军阵',{formation:'formation',policy:'control'});
const hefeiAssault=mk(CANDIDATES.hefei[0],'守军主动出击',{formation:'north',policy:'attack'});
const extras={guandu:[infantry,bows,split],yiling:[guard],wuzhang:[tower,volley],chibi:[],hefei:[hefeiCore,hefeiGuard,hefeiAssault]};
const rows=[],summaries=[];
const save=()=>writeFileSync(root+id+'-supplement.json',JSON.stringify({sourceHash:source,id,developmentSeeds:HIST_DEV_SEEDS,rows,summaries},null,2));
for(const plan of [...CANDIDATES[id],...extras[id]])for(const ratio of [1,...(extras[id].some(p=>p.id===plan.id)?[c.pressure]:[])]){
 const results=HIST_DEV_SEEDS.map(seed=>fightHistorical(id,plan,seed,{ratio}));rows.push(...results);summaries.push({plan,ratio,...summarizeHistorical(results)});save();
 console.log(id,plan.id,ratio,JSON.stringify(summarizeHistorical(results)));
}
const rank=items=>items.sort((a,b)=>b.wins-a.wins||b.draws-a.draws||b.remaining-a.remaining||a.plan.id.localeCompare(b.plan.id))[0];
const pressure=rank([...original.summaries.filter(s=>CANDIDATES[id].some(p=>p.id===s.tag)),...summaries.filter(s=>s.ratio===c.pressure)]),full=rank(summaries.filter(s=>s.ratio===1));
const frozen={...original.frozen,sourceHash:source,priorDevelopmentSourceHash:original.sourceHash,plan:pressure.plan,fullPlan:full.plan,supplementSourceHash:createHash('sha256').update(readFileSync(new URL('./explore-historical-player.mjs',import.meta.url))).digest('hex'),
 selectedFrom:[...original.frozen.selectedFrom,...summaries.map(s=>({tag:s.plan.id,ratio:s.ratio,wins:s.wins,draws:s.draws,remaining:s.remaining}))]};
writeFileSync(root+id+'-frozen.json',JSON.stringify(frozen,null,2));console.log('FROZEN',id,full.plan.id,pressure.plan.id);
