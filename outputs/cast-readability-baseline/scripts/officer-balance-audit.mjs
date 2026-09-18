import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {world,officers,builds,focalTeam,enemyTeam,fixture,simulate,stats} from './balance-v14-lib.mjs';
const tag=process.argv[2]||'candidate',source=process.argv[3]||'.',out='docs/balance-v14';mkdirSync(out,{recursive:true});
const w=await world(source),catalog=officers(w),rows=[],seeds=[101,211],contexts=['doubleFront','fireline','breach','riders'];
for(const g of catalog){
 for(const build of builds(w,g))for(const enemy of contexts)for(const formation of ['compact','spread'])for(const seed of seeds)for(const mirror of [false,true]){
  const b=fixture(w,focalTeam(w,g,build.ids),enemyTeam(w,enemy),formation,10,seed,mirror);
  rows.push({id:g.id,build:build.key,enemy,formation,seed,mirror,level:10,...simulate(w,b,mirror?1:0,g.id)});
 }
 console.log(tag,g.name,rows.length);
}
const summary=catalog.map(g=>({...g,builds:builds(w,g).map(build=>({...build,...stats(rows.filter(r=>r.id===g.id&&r.build===build.key))})).sort((a,b)=>b.margin-a.margin)}));
writeFileSync(`${out}/${tag}-profiles.json.gz`,gzipSync(JSON.stringify({tag,count:rows.length,hashes:w.hashes,seeds,contexts,catalog,rows,summary})));
writeFileSync(`${out}/${tag}-summary.json`,JSON.stringify({tag,count:rows.length,hashes:w.hashes,summary},null,2));
console.log('complete',tag,rows.length);
