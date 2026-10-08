import {readFileSync,writeFileSync} from 'node:fs';
import {STRATAGEM_DESIGNS} from '../data/design/stratagems.mjs';
import {OFFICER_ASSIGNMENTS} from '../data/design/assignments.mjs';
const changes={
 'person-255':'heal', // 荀彧：军队组织与支援，与司马懿分工。
 'person-520':'ward', // 马良：荆州军事辅佐与夷陵协同。
 'person-601':'ward', // 陆抗：吴方防护。
 ju:'ward',          // 沮授：袁方防护。
 'person-366':'swift', // 孙坚：吴方主动突进。
 'person-368':'invincible', // 孙权：吴方统军保护。
 'person-137':'swift', // 姜维：蜀方机动。
 'person-304':'invincible', // 审配：袁方死守。
 'person-662':'blockade', // 吕蒙：封锁补位。
 'person-605':'firestorm', // 李儒：群雄火攻，玩法演绎。
 'person-642':'disrupt', // 刘晔：魏方扰敌，与钟会封锁分工。
};
for(const [id,key]of Object.entries(changes)){
 const old=OFFICER_ASSIGNMENTS[id].stratagems;
 if(old.length!==1)throw Error('expected one stratagem: '+id);
 const prev=STRATAGEM_DESIGNS[old[0]].roster;
 if(!prev?.includes(id))throw Error('missing roster: '+id);
 STRATAGEM_DESIGNS[old[0]].roster=prev.filter(u=>u!==id);
 STRATAGEM_DESIGNS[key].roster.push(id);
 OFFICER_ASSIGNMENTS[id].stratagems=[key];
}
for(const [path,name,data]of [
 ['data/design/stratagems.mjs','STRATAGEM_DESIGNS',STRATAGEM_DESIGNS],
 ['data/design/assignments.mjs','OFFICER_ASSIGNMENTS',OFFICER_ASSIGNMENTS],
]){
 const original=readFileSync(path,'utf8'),header=original.split(/\r?\n/)[0],tailIndex=original.indexOf('\nexport const TROOP_TACTIC_POOLS');
 const tail=tailIndex>=0?original.slice(tailIndex):'';
 writeFileSync(path,header+'\nexport const '+name+' = '+JSON.stringify(data,null,2)+';\n'+tail);
}
console.log('Redistributed 11 officers; stratagem count, recipient count and effects unchanged.');
