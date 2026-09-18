import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {world,fixture,simulate,mean} from './balance-v14-lib.mjs';
const out='docs/balance-v14',tag=process.argv[2]||'mixed',source=process.argv[3]||'.',w=await world(source);
const discovered=JSON.parse(readFileSync(`${out}/candidate-summary.json`,'utf8')).summary;
const skeleton=[['spear','guard'],['archer','assault'],['crossbow','guard'],['spear','assault'],['cavalry','assault'],['archer','assault']];
const groups={
 famousA:['于禁','黄忠','诸葛亮','张飞','关羽','周瑜'],
 famousB:['许褚','夏侯渊','荀攸','曹操','张辽','陆逊'],
 famousC:['高览','太史慈','沮授','魏延','赵云','黄盖'],
 commonA:['郝昭','王平','满宠','曹仁','庞德','李严'],
 commonB:['郭淮','严颜','程昱','丁奉','高顺','陆抗'],
 commonC:['廖化','文聘','陈宫','乐进','马岱','荀彧'],
 mixedA:['郝昭','黄忠','满宠','张飞','庞德','周瑜'],
 mixedB:['于禁','王平','诸葛亮','曹仁','关羽','李严'],
};
function team(key){return groups[key].map((name,i)=>{const profile=w.OFFICER_CATALOG.find(u=>u.name===name);assert.ok(profile,name);const u=w.makeOfficer(profile.id),[type,role]=skeleton[i];u.type=type;
  const basic=w.roleTacticIds(u,role),p=discovered.find(g=>g.id===u.id&&g.type===type),chosen=p?.builds.filter(b=>[role,role+'Special'].includes(b.key)).sort((a,b)=>b.margin-a.margin)[0];
  u.tactics=chosen?.ids||basic;return u;
});}
const keys=Object.keys(groups),rows=[],seeds=[3001,3109,3203,3301,3407,3511,3607,3701];
for(const level of [3,10])for(const formation of ['compact','spread']){
 for(let a=0;a<keys.length;a++)for(let c=a+1;c<keys.length;c++)for(const seed of seeds)for(const mirror of [false,true]){
  const left=keys[a],right=keys[c],own=team(left),opponent=team(right);
  // Skip shared identities: renaming them would erase personal kits, while
  // duplicates would invalidate target references in the real battle model.
  if(own.some(u=>opponent.some(v=>v.id===u.id)))continue;
  rows.push({left,right,level,formation,seed,mirror,...simulate(w,fixture(w,own,opponent,formation,level,seed,mirror),mirror?1:0)});
 }
 console.log(tag,level,formation,rows.length);
}
const summary=[3,10].map(level=>({level,teams:keys.map(key=>{const rs=rows.filter(r=>r.level===level&&(r.left===key||r.right===key));return {key,names:groups[key],games:rs.length,win:mean(rs.map(r=>r.left===key?r.win:1-r.win)),matchups:Object.fromEntries(keys.filter(k=>rows.some(r=>r.level===level&&(r.left===key&&r.right===k||r.right===key&&r.left===k))).map(k=>[k,mean(rs.filter(r=>r.left===k||r.right===k).map(r=>r.left===key?r.win:1-r.win))]))};})}));
writeFileSync(`${out}/${tag}.json.gz`,gzipSync(JSON.stringify({count:rows.length,hashes:w.hashes,seeds,groups,loadouts:Object.fromEntries(keys.map(k=>[k,team(k).map(u=>({id:u.id,type:u.type,tactics:u.tactics}))])),rows,summary})));
writeFileSync(`${out}/${tag}-summary.json`,JSON.stringify(summary,null,2));console.log('complete',rows.length);
