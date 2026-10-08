import {statusValue} from './battle-status-rules.mjs';
import {passiveAttributes} from './passives.mjs';
import {statusFraction} from './tactic-power.mjs';
import {terrainMoveFactor,unitTerrain,TERRAIN_NAMES} from './battlefield.mjs';
// Shared, derived battle attributes. Never store a second mutable copy in saves.
import {TROOP_DESIGNS} from './data/design/troops.mjs';
export const TROOPS = structuredClone(TROOP_DESIGNS);
export const isRear=u=>['archer','crossbow','siege','tower'].includes(u.type);
export const ATTRIBUTE_LABELS={attack:'攻击',defense:'防御',move:'移速',range:'射程',siege:'攻城',attackSpeed:'攻速',discipline:'军纪',martialPower:'武技威力',strategyPower:'谋略威力',supportPower:'营务威力'};
export const POLITICS={cao:94,dun:70,liao:78,chu:32,jia:86,yu:95,yuanxia:61,jin:76,shao:81,yan:35,wen:31,he:73,ju:92,tian:90,gao:60};
export function unitAttributes(u,b=null) {
 const t=TROOPS[u.type],tick=b?.tick||0,side=b?.sides?.[u.side]||{};
 const on=k=>(u.statuses?.[k]?.until||0)>tick,army=k=>(side[k]||0)>tick;
 const breakdown={},out={breakdown},passives=passiveAttributes(b,u);
 const soldiers=Math.max(0,u.hp??u.troops??0);
 const troopAttributes=new Set(['attack','martialPower','strategyPower','supportPower']);
 function stat(key,base,officer,source,mods=[]) {
   // Offense is the sum of current soldiers' contributions, shared by panel and combat.
   if(troopAttributes.has(key)){base=base/3000*soldiers;officer=officer/3000*soldiers;source+=`（现役 ${soldiers} 人）`;}
   mods=[...(passives[key]||[]),...mods];
   let value=base+officer;for(const m of mods)value=m.add!==undefined?value+m.add:value*m.factor;
   value=Math.max(0,value);out[key]=value;breakdown[key]={base,officer,source,modifiers:mods,value};return value;
 }
 const leadership=u.leadership||0,politics=u.politics??65;
 const power=(field,base)=>side.stratagemEffects?.[field]?.strength??base;
 const armyLabel=(field,label)=>side.stratagemEffects?.[field]?label+' · '+side.stratagemEffects[field].name:label;
 const atk=[],def=[],martial=[],strategy=[],move=[],range=[],discipline=[];
 if(u.supplyPenalty){const m={label:'缺粮',factor:1-u.supplyPenalty};atk.push(m);martial.push(m);strategy.push(m);}
 if(b?.terrain&&u.status==='active'){
   const factor=terrainMoveFactor(b,u);
   if(factor!==1)move.push({label:TERRAIN_NAMES[unitTerrain(b,u)]+'行军',factor});
 }
 if(on('bulwark')){def.push({label:'坚阵',factor:1+statusFraction(u,'bulwark',.3)});discipline.push({label:'坚阵',factor:1+statusFraction(u,'bulwark',.2)});move.push({label:'坚阵',factor:.5});}
 if(on('camp'))def.push({label:'营垒',factor:1+statusFraction(u,'camp',.25)});
 if(on('nexus')){strategy.push({label:'阵枢',factor:1+statusFraction(u,'nexus',.2)});discipline.push({label:'阵枢',factor:1+statusFraction(u,'nexus',.2)});}
 if(on('emplaced')){atk.push({label:'架设',factor:1+statusFraction(u,'emplaced',.2)});range.push({label:'架设',add:1});}
 if(on('anchored')||on('emplaced'))move.push({label:on('anchored')?'抛锚':'架设',factor:0});
 if(u.commandBonus){atk.push({label:'主将统率',factor:1+u.commandBonus});def.push({label:'主将统率',factor:1+u.commandBonus});}
 if(u.deputyBonus)martial.push({label:'副将武力',factor:1+u.deputyBonus});
 if(u.advisorBonus)strategy.push({label:'军师智力',factor:1+u.advisorBonus});
 if(army('assaultUntil'))atk.push({label:armyLabel('assaultUntil','军略增攻'),factor:1+power('assaultUntil',.25)});
 if(army('fortifyUntil')){def.push({label:armyLabel('fortifyUntil','军略固守'),factor:1+power('fortifyUntil',.2)});discipline.push({label:armyLabel('fortifyUntil','军略固守'),factor:1+power('fortifyUntil',.2)});}
 if(army('disruptUntil')){atk.push({label:armyLabel('disruptUntil','军略削弱'),factor:1-power('disruptUntil',.15)});def.push({label:armyLabel('disruptUntil','军略削弱'),factor:1-power('disruptUntil',.15)});discipline.push({label:armyLabel('disruptUntil','军略削弱'),factor:1-power('disruptUntil',.15)});}
 if(on('valor'))atk.push({label:'奋战',factor:1+statusFraction(u,'valor',.25)});
 if(on('weaken'))atk.push({label:'疲弱',factor:1-(u.statuses.weaken.fraction??statusFraction(u,'weaken',.2))});
 if(on('powerDown')){const m={label:'挫锐',factor:1-(u.statuses.powerDown.fraction??statusFraction(u,'powerDown',.2))};martial.push(m);strategy.push(m);}
 if(on('armorBreak'))def.push({label:'破防',factor:1-(u.statuses.armorBreak.fraction??statusFraction(u,'armorBreak',.2))});
 if(on('haste')||army('hasteUntil'))move.push({label:'疾行（同类不叠加）',add:1});
 if(on('slow'))move.push({label:'迟滞',factor:1-statusFraction(u,'slow',.5)});
 if(on('phalanx')||on('root'))move.push({label:on('root')?'定身':'方阵',factor:0});
 if(army('rangeUntil')&&['archer','crossbow'].includes(u.type))range.push({label:'引弦远射',add:2});
 stat('supportPower',80,politics*1.4+(u.intellect||0)*.6,'政治 × 1.4 ＋ 智力 × 0.6',u.supplyPenalty?[{label:'缺粮',factor:1-u.supplyPenalty}]:[]);
 stat('attack',t.attack,leadership*1.6,'统率 × 1.6',atk);
 stat('defense',t.defense,leadership*.65,'统率 × 0.65',def);
 if(t.range>1){const extra=Math.max(on('longRange')?statusValue(u,'longRange','amount'):0,army('rangeUntil')&&['archer','crossbow'].includes(u.type)?2:0,on('emplaced')?1:0)-(on('shortRange')?statusValue(u,'shortRange','amount'):0);range.length=0;if(extra)range.push({label:'射程状态（同类取最高）',add:Math.max((t.minRange||1)-t.range,extra)});}
 stat('move',t.move,0,'兵种决定',move);stat('range',t.range,0,'兵种决定',range);stat('siege',out.attack*t.siegeFactor,0,`${t.name}攻城系数 × ${t.siegeFactor}（已计入基础）`);
 const intervalFactor=(on('attackSlow')?1+statusValue(u,'attackSlow','fraction'):1)*(on('attackHaste')?1-statusValue(u,'attackHaste','fraction'):1);
 stat('attackSpeed',1000/(700*t.interval),0,'兵种攻击间隔 '+t.interval+' 日',[{label:'攻速状态',factor:1/intervalFactor}]);out.attackInterval=t.interval*intervalFactor/(passives.attackSpeed||[]).reduce((n,m)=>n*(m.factor??1),1);out.minRange=t.minRange||0;
 stat('discipline',t.discipline,politics*.8,'政治 × 0.8',discipline);
 stat('martialPower',80,(u.force||0)*2,'武力 × 2',martial);
 stat('strategyPower',80,(u.intellect||0)*2,'智力 × 2',strategy);
 out.controlResistance=Math.min(.6,out.discipline/(out.discipline+150));
 out.damageReduction=1-(on('phalanx')?1-statusFraction(u,'phalanx',.3):1)*(on('ward')?1-u.statuses.ward.percent/100:1)*(on('anchored')?1-statusFraction(u,'anchored',.25):1);
 return out;
}
export function disciplineDuration(b,u,steps){return Math.max(1,Math.round(steps*(1-unitAttributes(u,b).controlResistance)));}
