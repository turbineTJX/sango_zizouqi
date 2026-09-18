import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {world,fixture,mean,officers} from './balance-v14-lib.mjs';
const mode=process.argv[2]||'quick',tag=process.argv[3]||mode,w=await world(process.argv[4]||'.'),out='docs/roles-v15';
mkdirSync(out,{recursive:true});
// Fixed kits also permit matched comparisons with rule 14, without changing its rules.
const roles={tank:['spear',['cleanse','phalanx','ward']],physicalTank:['spear',['phalanx','strike','thrust']],magicTank:['spear',['phalanx','doubt','ward']],assassin:['cavalry',['gallop','rush','valor']],mage:['archer',['smoke','wildfire','rally']],shooter:['crossbow',['pierce','repeat','retreatShot']],frontMedic:['cavalry',['gallop','relay','harass']],backMedic:['crossbow',['screen','seal','ambush']]};
const groups={doubleFront:['tank','physicalTank','shooter'],spellFront:['tank','magicTank','mage'],fireline:['tank','mage','shooter'],breach:['magicTank','assassin','mage'],riders:['assassin','assassin','assassin'],ranged:['mage','shooter','mage'],frontCare:['tank','frontMedic','shooter'],rearCare:['tank','backMedic','shooter'],doubleCare:['tank','frontMedic','backMedic'],controlFire:['magicTank','mage','mage']};
if(mode==='mixed'){for(const k of Object.keys(groups))delete groups[k];Object.assign(groups,{leanFire:['tank','mage','shooter','tank','mage','shooter'],dualControl:['magicTank','mage','mage','magicTank','mage','mage'],frontSupport:['tank','mage','shooter','frontMedic','mage','shooter'],rearSupport:['tank','mage','backMedic','tank','mage','shooter'],breachSix:['magicTank','assassin','shooter','tank','mage','shooter'],combinedCare:['tank','mage','shooter','frontMedic','mage','backMedic'],brawlers:['physicalTank','assassin','shooter','magicTank','mage','backMedic'],allMixed:['tank','frontMedic','mage','magicTank','assassin','shooter']});}
function unit(role,id){const [type,tactics]=roles[role];return {...w.makeOfficer('person-99'),id,name:id,type,skillRouteType:type,leadership:80,force:80,intellect:80,politics:80,tactics};}
const team=(key,side,count=3)=>Array.from({length:count},(_,i)=>unit(groups[key][i%groups[key].length],side+'-'+i));
function run(b,own,focalId){
 w.lockDeployment(b);let damage=0,magic=0,dot=0,healing=0,alive=0,rearDamage=0,controlled=0;
 const focal=b.sides[own].units.find(u=>u.id===focalId),enemy=b.sides[1-own].units;
 while(!b.result){if(focal?.status==='active')alive++;w.stepBattle(b);assert.ok(b.tick<=b.maxTicks);
  controlled+=enemy.filter(u=>['confuse','stun'].some(k=>w.hasStatus(b,u,k))).length;
  for(const e of b.effects)if(e.from===focalId){
   healing+=e.healing||0;
   const target=enemy.find(u=>u.id===e.to);if(!target)continue;
   damage+=e.damage;if(e.damageKind==='dot')dot+=e.damage;if(['archer','crossbow'].includes(target.type))rearDamage+=e.damage;
   if(e.damageKind==='intellect'||e.skill&&Object.values(w.TACTICS_BOOK).some(s=>s.name===e.label&&s.category==='intellect'))magic+=e.damage;
  }
 }
 const hp=s=>b.sides[s].units.reduce((n,u)=>n+u.hp,0);
 return {win:b.result.winner===own?1:b.result.winner===null?.5:0,margin:hp(own)-hp(1-own),ticks:b.tick,timeout:b.tick===b.maxTicks?1:0,damage,magic,dot,healing,rearDamage,alive,controlled,taken:focal?.battleDamage??0,remaining:focal?.hp??0,allyHp:hp(own)-(focal?.hp??0),casts:focal?.tacticCasts??{}};
}
const summarize=rs=>Object.fromEntries(['win','margin','ticks','timeout','damage','magic','dot','healing','rearDamage','alive','controlled','taken','remaining','allyHp'].map(k=>[k,mean(rs.map(r=>r[k]))]));
const rows=[],seeds=['full','special','counters','guan'].includes(mode)?[4001,4103]:[307,419],formations=['compact','spread'];
if(['teams','mixed'].includes(mode)){
 const keys=Object.keys(groups);
 for(const count of mode==='mixed'?[6]:[3,6])for(const formation of formations){
  for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++)for(const seed of [4001,4103,4201,4303])for(const mirror of [false,true]){
   const left=keys[i],right=keys[j];rows.push({left,right,count,formation,seed,mirror,...run(fixture(w,team(left,'ally',count),team(right,'enemy',count),formation,10,seed,mirror),mirror?1:0)});
  }console.log(tag,count,formation,rows.length);
 }
 const summary=(mode==='mixed'?[6]:[3,6]).map(count=>({count,teams:keys.map(key=>{const rs=rows.filter(r=>r.count===count&&(r.left===key||r.right===key));return {key,games:rs.length,win:mean(rs.map(r=>r.left===key?r.win:1-r.win)),timeout:mean(rs.map(r=>r.timeout)),matchups:Object.fromEntries(keys.filter(k=>k!==key).map(k=>[k,mean(rs.filter(r=>r.left===k||r.right===k).map(r=>r.left===key?r.win:1-r.win))]))};})}));
 writeFileSync(`${out}/${tag}-summary.json`,JSON.stringify({count:rows.length,summary},null,2));
}else{
 const names=['关羽','赵云','张飞','诸葛亮','郭嘉','黄忠','郝昭','王平','满宠','庞德'];
 const profiles=['full','counters'].includes(mode)?officers(w):mode==='guan'?[{id:'person-99',name:'关羽'}]:mode==='special'?officers(w).filter(p=>p.famous):names.map(name=>{const id=w.OFFICER_CATALOG.find(u=>u.name===name).id;return {id,name};});
 if(!['special','guan'].includes(mode))profiles.unshift({id:'generic',name:'四维80'});
 for(const profile of profiles){
  for(const role of Object.keys(roles).filter(r=>mode!=='special'||(w.TACTICS_BOOK[w.SPECIAL_TACTICS[profile.id]].category==='force'?['physicalTank','assassin']:w.TACTICS_BOOK[w.SPECIAL_TACTICS[profile.id]].mode==='support'?['frontMedic','backMedic']:['magicTank','mage']).includes(r)))for(const context of mode==='counters'?['ranged','rearCare']:['doubleFront','fireline','breach','riders'])for(const formation of formations)for(const seed of seeds)for(const mirror of [false,true]){
   const [type,tactics]=roles[role],focal=profile.id==='generic'?unit(role,'generic'):{...w.makeOfficer(profile.id),type,tactics};
   // Two fixed ally contexts: sole front + two shooters, or a tank partner + shooter.
   // Each role is tested in BOTH, rather than awarding supports a free extra tank.
   for(const allies of ['full','special','counters','guan'].includes(mode)?['protected']:['damage','protected']){
    if(mode==='special'){const special=w.SPECIAL_TACTICS[profile.id];focal.tactics=[special,...tactics.filter(id=>id!==special).slice(0,2)];}
    const us=mode==='guan'?[focal,{...w.makeOfficer('person-186'),type:'archer',tactics:['fire','suppress','unique-person-186']},{...w.makeOfficer('person-290'),type:'crossbow',tactics:['screen','seal','unique-person-290']}]:[focal,unit(allies==='damage'?'mage':'tank','ally-front'),unit('shooter','ally-shooter')];
    if(mode!=='guan'&&(['mage','shooter','backMedic'].includes(role)||allies==='protected'))[us[0],us[1]]=[us[1],us[0]];
    rows.push({id:profile.id,name:profile.name,role,context,allies,formation,seed,mirror,...run(fixture(w,us,team(context,'enemy'),formation,10,seed,mirror),mirror?1:0,profile.id)});
   }
  }console.log(tag,profile.name,rows.length);
 }
 const summary=profiles.map(p=>({...p,roles:Object.keys(roles).filter(role=>rows.some(r=>r.id===p.id&&r.role===role)).map(role=>{const rs=rows.filter(r=>r.id===p.id&&r.role===role);return {role,...summarize(rs),contexts:Object.fromEntries(Object.keys(groups).filter(c=>rs.some(r=>r.context===c)).map(c=>[c,summarize(rs.filter(r=>r.context===c))])),allies:Object.fromEntries(['damage','protected'].filter(a=>rs.some(r=>r.allies===a)).map(a=>[a,summarize(rs.filter(r=>r.allies===a))]))};})}));
 writeFileSync(`${out}/${tag}-summary.json`,JSON.stringify({count:rows.length,summary},null,2));
}
writeFileSync(`${out}/${tag}.json.gz`,gzipSync(JSON.stringify({hashes:w.hashes,roles,groups,rows})));
console.log('complete',tag,rows.length);
