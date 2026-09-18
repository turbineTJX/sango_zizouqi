import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {world,officers,builds,focalTeam,enemyTeam,fixture,simulate,stats,mean} from './balance-v14-lib.mjs';
const tag=process.argv[2]||'validated',source=process.argv[3]||'.',w=await world(source),out='docs/balance-v14';
const extra=process.argv.includes('--extra');
const discovery=JSON.parse(gunzipSync(readFileSync(`${out}/candidate-profiles.json.gz`))),seeds=extra?[5003,5101,5209,5303,5407,5501]:[1009,1201,1409,1601,1801,2003],rows=[];
for(const g of officers(w)){
 const options=builds(w,g),all=discovery.rows.filter(r=>r.id===g.id),avg=b=>mean(all.filter(r=>r.build===b.key).map(r=>r.margin));
 const basic=options.filter(b=>!b.key.endsWith('Special')).sort((a,b)=>avg(b)-avg(a))[0];
 const special=options.filter(b=>b.key.endsWith('Special')).sort((a,b)=>avg(b)-avg(a))[0];
 for(const level of [3,10])for(const enemy of (extra?['flames','piercers']:['doubleFront','fireline','breach','riders']))for(const formation of ['compact','spread'])for(const seed of seeds)for(const mirror of [false,true]){
  for(const build of [basic,special].filter(Boolean))rows.push({id:g.id,build:build.key,enemy,formation,seed,mirror,level,...simulate(w,fixture(w,focalTeam(w,g,build.ids),enemyTeam(w,enemy),formation,level,seed,mirror),mirror?1:0,g.id)});
 }
 console.log(tag,g.name,rows.length);
}
const summary=officers(w).map(g=>({...g,results:[3,10].map(level=>({level,builds:[...new Set(rows.filter(r=>r.id===g.id).map(r=>r.build))].map(build=>({build,...stats(rows.filter(r=>r.id===g.id&&r.level===level&&r.build===build))}))}))}));
writeFileSync(`${out}/${tag}.json.gz`,gzipSync(JSON.stringify({hashes:w.hashes,seeds,count:rows.length,rows,summary})));
writeFileSync(`${out}/${tag}-summary.json`,JSON.stringify(summary,null,2));console.log('complete',rows.length);
