import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {world,focalTeam,enemyTeam,fixture,simulate,stats,mean,builds,synthetic} from './balance-v14-lib.mjs';
const w=await world(),out='docs/balance-v14',contexts=['doubleFront','fireline','breach','riders'];
const cases=[['person-99','cavalry','named'],['person-99','spear','named'],['person-661','cavalry','front'],['person-661','spear','rear'],['person-433','spear','rear'],['person-69','spear','rear'],['person-46','archer','rear'],['person-567','crossbow','rear'],['person-559','cavalry','front']];
function own(g,ids,mode){const us=focalTeam(w,g,ids);if(mode==='front')us[1]=synthetic(w,'control','ally-controller');
 if(mode==='named'){us[1]={...w.makeOfficer('person-186'),tactics:['fire','wildfire','suppress']};us[2]={...w.makeOfficer('person-290'),tactics:['screen','seal','unique-person-290']};}return us;}
const rows=[],validation=[];
for(const [id,type,mode] of cases){
 const g={id,type,name:w.makeOfficer(id).name},skills=w.availableTactics(g).sort((a,b)=>a.threshold-b.threshold||a.id.localeCompare(b.id)),options=new Map();
 const add=ids=>options.set(ids.join('|'),ids);
 for(let i=0;i<skills.length;i++)for(let j=i+1;j<skills.length;j++)for(let k=j+1;k<skills.length;k++)add([skills[i].id,skills[j].id,skills[k].id]);
 for(const b of builds(w,g))add(b.ids);
 const local=[];
 for(const ids of options.values())for(const enemy of contexts)for(const seed of [307,419])for(const mirror of [false,true]){
  const r={id,type,mode,ids,enemy,seed,mirror,...simulate(w,fixture(w,own(g,ids,mode),enemyTeam(w,enemy),'compact',10,seed,mirror),mirror?1:0,id)};rows.push(r);local.push(r);
 }
 const key=ids=>ids.join('|'),rank=rs=>[...options.values()].map(ids=>({ids,margin:mean(rs.filter(r=>key(r.ids)===key(ids)).map(r=>r.margin))})).sort((a,b)=>b.margin-a.margin);
 const fixed=rank(local)[0].ids;
 for(const enemy of contexts){const selected=rank(local.filter(r=>r.enemy===enemy))[0].ids,candidates=new Map([[key(fixed),fixed],[key(selected),selected]]);
  for(const ids of candidates.values())for(const formation of ['compact','spread'])for(const seed of [4001,4103,4201,4303,4409,4513])for(const mirror of [false,true])validation.push({id,type,mode,enemy,ids,fixed,selected,formation,seed,mirror,...simulate(w,fixture(w,own(g,ids,mode),enemyTeam(w,enemy),formation,10,seed,mirror),mirror?1:0,id)});
 }
 console.log(g.name,type,mode,'discovery',rows.length,'validation',validation.length);
}
const summary=cases.map(([id,type,mode])=>({id,name:w.makeOfficer(id).name,type,mode,contexts:contexts.map(enemy=>{const rs=validation.filter(r=>r.id===id&&r.type===type&&r.mode===mode&&r.enemy===enemy),fixed=rs[0].fixed,selected=rs[0].selected;return {enemy,fixed,selected,fixedResult:stats(rs.filter(r=>r.ids.join('|')===fixed.join('|'))),selectedResult:stats(rs.filter(r=>r.ids.join('|')===selected.join('|')))};})}));
writeFileSync(`${out}/role-search.json.gz`,gzipSync(JSON.stringify({hashes:w.hashes,count:rows.length+validation.length,rows,validation,summary})));
writeFileSync(`${out}/role-search-summary.json`,JSON.stringify(summary,null,2));console.log('complete',rows.length+validation.length);
