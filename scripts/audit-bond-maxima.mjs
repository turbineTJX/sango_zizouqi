import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {BOND_DESIGNS as D} from '../data/design/bonds.mjs';import {generateBattle} from '../battle-generator.mjs';import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';import {fixedOwnAI,VALIDATION_SEEDS} from './xiapi-player-lab.mjs';import {sideBonds} from '../bonds.mjs';import {RULES_VERSION} from '../combat-rules.mjs';
const current=structuredClone(D),previous=JSON.parse(readFileSync('outputs/xiapi-playability/tuning.json','utf8')).before,rows=[];
const teams={beauty:['person-661','liao','person-425','person-301','person-388','person-267'],valor:['person-661','person-396','person-472','chu','person-516','liao']};
const foes={elite:['cao','person-636','person-99','person-433','jia','yu'],ordinary:['person-525','person-117','person-305','person-82','person-46','person-567']};
for(const mode of ['before','updated']){
 for(const key of ['bondBeauty','bondValor'])Object.assign(D[key],structuredClone(mode==='before'?previous[key]:current[key]));
 for(const [kind,ids]of Object.entries(teams))for(const [opponent,enemies]of Object.entries(foes)){
  for(const seed of VALIDATION_SEEDS.slice(0,4)){
   const team=(ids,subject)=>ids.map((id,i)=>({id,type:subject&&kind==='beauty'&&i>1?'archer':subject&&kind==='valor'?'cavalry':i%3===2?'crossbow':'spear',troops:3000,level:10}));
   const state=generateBattle({terrain:'land',battleKind:'field',seed,limit:480,shieldPercent:0,ownTeam:team(ids,true),enemyTeam:team(enemies,false)}),b=state.battle;fixedOwnAI(b);lockDeployment(b);const opening=sideBonds(b,0);if(opening[kind==='beauty'?'bondBeauty':'bondValor'].tier!==3)throw Error('maximum roster did not qualify');
   while(!b.result)stepBattle(b,{aiSides:[0,1]});validateSave(structuredClone(state));rows.push({mode,kind,opponent,seed,winner:b.result.winner,reason:b.result.reason,opening,remaining:b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0))});
  }
  const rs=rows.filter(r=>r.mode===mode&&r.kind===kind&&r.opponent===opponent);console.log(mode,kind,opponent,rs.filter(r=>r.winner===0).length+'/'+rs.length);mkdirSync('outputs/xiapi-playability',{recursive:true});writeFileSync('outputs/xiapi-playability/maxima-screen.json',JSON.stringify({rulesVersion:RULES_VERSION,rows},null,2));
 }
}
