import {readFileSync,writeFileSync} from 'node:fs';
import {STRATAGEM_DESIGNS as old} from '../data/design/stratagems.mjs';
import {OFFICER_ASSIGNMENTS as assignments} from '../data/design/assignments.mjs';
import {OFFICER_BY_ID as officers} from '../officer-catalog.mjs';
const rosters={
 fortify:['shao','person-368','person-637','person-567'],
 heal:['person-668','person-255','person-263','person-443','person-420'],
 cleanse:['person-290','person-294','person-462','person-502'],
 invincible:['person-636','person-578','person-304','person-436'],
 ambush:['person-61','person-557','person-447','person-54','person-146','person-553'],
 disrupt:['person-558','tian','person-642','person-55'],
 ward:['person-226','person-601','ju','person-520'],
 reinforce:['jia','person-371','person-137','person-482','person-366','person-441'],
 refresh:['yu','person-529','person-22','person-411','person-281'],
 storm:['person-404','person-605'],
};
const names={fortify:'金城汤池',heal:'济世安军',cleanse:'扶正祛邪',invincible:'固若金汤',ambush:'瞒天过海',disrupt:'威震三军',ward:'百邪不侵','cao-wuchao':'魏武雄风','zhou-redcliffs':'业火连营','zhuge-eight':'八阵奇门'};
const designs={};
for(const [key,s]of Object.entries(old))if(!['swift','blockade','firestorm'].includes(key))designs[key]={...s,name:names[key],...(rosters[key]?{roster:rosters[key]}:{})};
designs.reinforce={name:'奇兵天降',group:'support',cost:1,duration:0,cooldown:96,maxUses:1,description:'每场一次；让已经抵达的后备部队额外出场，基准2队，队数按施放者统率与智力折算（1～4队）；突破通常上场人数，使用真实部队及合法空位。额外部队溃败或离场后不补充额外名额。',side:0,effect:'forceReserve',icon:'wind',pool:'ordinary',owner:null,scope:{shape:'reserve'},baseCount:2,weights:{leadership:.3,intellect:.7},scaling:'count',roster:rosters.reinforce};
designs.refresh={name:'重整旗鼓',group:'support',cost:1,duration:0,cooldown:112,maxUses:1,description:'每场一次；刷新己方已经抵达且仍在场或候补的真实部队全部主动战法使用次数，包括专属，恢复到现有上限；并按施放者统智缩短剩余战法冷却，基准40%（20%～80%）。保留战意、调息、正在蓄力的战法、既有施放与贡献记录；不恢复军略次数。',side:0,effect:'tacticRefresh',icon:'home',pool:'ordinary',owner:null,scope:{shape:'army'},baseStrength:.4,weights:{leadership:.3,intellect:.7},scaling:'strength',roster:rosters.refresh};
designs.storm={name:'天雷地火',group:'control',cost:1,duration:0,cooldown:128,maxUses:1,description:'每场一次；全战场随机落下8道雷火，每道影响半径2格内的在场部队，不分敌我。每次基准伤害为被击部队初始兵力的25%，按施放者统智折算，并独立浮动75%～125%；护盾、无敌、魔免及共同伤害保护正常生效，不命中后备或离场部队。结果随战斗种子保存。',side:2,effect:'catastrophe',icon:'wind',pool:'ordinary',owner:null,scope:{shape:'battlefield'},baseStrength:.25,strikes:8,strikeRadius:2,randomDamage:{min:.75,max:1.25},weights:{leadership:.3,intellect:.7},scaling:'strength',roster:rosters.storm};
const before=new Set(Object.entries(assignments).filter(([,a])=>a.stratagems.length).map(([id])=>id));
for(const a of Object.values(assignments))a.stratagems=[];
for(const [key,s]of Object.entries(designs))for(const id of s.roster||[s.owner])assignments[id].stratagems.push(key);
const after=new Set(Object.entries(assignments).filter(([,a])=>a.stratagems.length).map(([id])=>id));
const designPath='data/design/stratagems.mjs',src=readFileSync(designPath,'utf8');writeFileSync(designPath,src.split(/\r?\n/)[0]+'\nexport const STRATAGEM_DESIGNS = '+JSON.stringify(designs,null,2)+';\n');
const assignmentPath='data/design/assignments.mjs',original=readFileSync(assignmentPath,'utf8'),tail=original.indexOf('\nexport const TROOP_TACTIC_POOLS');if(tail<0)throw Error('Missing tactic pool exports');
writeFileSync(assignmentPath,original.split(/\r?\n/)[0]+'\nexport const OFFICER_ASSIGNMENTS = '+JSON.stringify(assignments,null,2)+';\n'+original.slice(tail));
console.log(JSON.stringify({holders:after.size,added:[...after].filter(id=>!before.has(id)).map(id=>officers[id].name),removed:[...before].filter(id=>!after.has(id)).map(id=>officers[id].name)},null,2));
