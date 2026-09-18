import {writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {world,teams,labels,enemyTeam,fixture,simulate,mean} from './balance-v14-lib.mjs';
const tag=process.argv[2]||'formations',source=process.argv[3]||'.',out='docs/balance-v14';mkdirSync(out,{recursive:true});const w=await world(source);
const keys=Object.keys(teams),rows=[],seeds=[1009,1103,1201,1301,1409,1511,1601,1709];
for(const count of [3,6])for(const formation of ['compact','spread']){
 for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++)for(const seed of seeds)for(const mirror of [false,true]){
  const left=keys[i],right=keys[j],a=enemyTeam(w,left,count).map(u=>({...u,id:u.id.replace('enemy','ally')}));
  rows.push({left,right,count,formation,seed,mirror,...simulate(w,fixture(w,a,enemyTeam(w,right,count),formation,10,seed,mirror),mirror?1:0)});
 }
 console.log(tag,count,formation,rows.length);
}
const summary=[3,6].map(count=>({count,teams:keys.map(team=>{const rs=rows.filter(r=>r.count===count&&(r.left===team||r.right===team));return {team,label:labels[team],games:rs.length,win:mean(rs.map(r=>r.left===team?r.win:1-r.win)),matchups:Object.fromEntries(keys.filter(k=>k!==team).map(k=>[k,mean(rs.filter(r=>r.left===k||r.right===k).map(r=>r.left===team?r.win:1-r.win))]))};})}));
writeFileSync(`${out}/${tag}.json.gz`,gzipSync(JSON.stringify({hashes:w.hashes,seeds,teams,labels,rows,summary})));
writeFileSync(`${out}/${tag}-summary.json`,JSON.stringify({count:rows.length,summary},null,2));console.log(JSON.stringify(summary,null,2));
