// Shared, derived battle attributes. Never store a second mutable copy in saves.
export const TROOPS = {
 spear:{name:'枪兵',icon:'槍',attack:80,defense:90,discipline:40,move:1,interval:3,range:1,siege:0,beats:'cavalry'},
 cavalry:{name:'骑兵',icon:'騎',attack:100,defense:60,discipline:30,move:2,interval:3,range:1,siege:0,beats:'archer'},
 archer:{name:'弓兵',icon:'弓',attack:65,defense:45,discipline:25,move:1,interval:2,range:4,siege:0,beats:'spear'},
 crossbow:{name:'弩兵',icon:'弩',attack:120,defense:55,discipline:35,move:1,interval:4,range:4,siege:0,beats:'spear'},
};
export const ATTRIBUTE_LABELS={attack:'攻击',defense:'防御',move:'移速',range:'射程',siege:'攻城',attackSpeed:'攻速',discipline:'军纪',martialPower:'武技威力',strategyPower:'谋略威力'};
export const POLITICS={cao:94,dun:70,liao:78,chu:32,jia:86,yu:95,yuanxia:61,jin:76,shao:81,yan:35,wen:31,he:73,ju:92,tian:90,gao:60};
export function unitAttributes(u,b=null) {
 const t=TROOPS[u.type],tick=b?.tick||0,side=b?.sides?.[u.side]||{};
 const on=k=>(u.statuses?.[k]?.until||0)>tick,army=k=>(side[k]||0)>tick;
 const breakdown={},out={breakdown};
 function stat(key,base,officer,source,mods=[]) {
   let value=base+officer;for(const m of mods)value=m.add!==undefined?value+m.add:value*m.factor;
   value=Math.max(0,value);out[key]=value;breakdown[key]={base,officer,source,modifiers:mods,value};return value;
 }
 const leadership=u.leadership||0,politics=u.politics??65;
 const atk=[],def=[],martial=[],strategy=[],move=[],range=[];
 if(u.commandBonus){atk.push({label:'主将统率',factor:1+u.commandBonus});def.push({label:'主将统率',factor:1+u.commandBonus});}
 if(u.deputyBonus)martial.push({label:'副将武力',factor:1+u.deputyBonus});
 if(u.advisorBonus)strategy.push({label:'军师智力',factor:1+u.advisorBonus});
 if(side.tactic==='aggressive'){atk.push({label:'激进策略',factor:1.18});def.push({label:'激进策略',factor:.91});}
 if(side.tactic==='defensive'){atk.push({label:'防守策略',factor:.92});def.push({label:'防守策略',factor:1.15});}
 if(army('assaultUntil'))atk.push({label:'击鼓催锋',factor:1.25});
 if(army('fortifyUntil'))def.push({label:'坚壁列阵',factor:1.3});
 if(army('disruptUntil')){atk.push({label:'离间疲敌',factor:.8});def.push({label:'离间疲敌',factor:.8});}
 if(on('valor'))atk.push({label:'骁骑奋战',factor:1.25});
 if(on('weaken'))atk.push({label:'疲弱',factor:.8});
 if(on('armorBreak'))def.push({label:'破防',factor:.8});
 if(on('haste')||army('hasteUntil'))move.push({label:'疾行（同类不叠加）',add:1});
 if(on('slow'))move.push({label:'迟滞',factor:.5});
 if(on('phalanx')||on('stun'))move.push({label:on('stun')?'眩晕':'铁壁枪阵',factor:0});
 if(army('rangeUntil')&&['archer','crossbow'].includes(u.type))range.push({label:'引弦远射',add:2});
 stat('attack',t.attack,leadership*1.6,'统率 × 1.6',atk);
 stat('defense',t.defense,leadership*.65,'统率 × 0.65',def);
 stat('move',t.move,0,'兵种决定',move);stat('range',t.range,0,'兵种决定',range);stat('siege',t.siege,0,'预留，尚无建筑伤害结算');
 stat('attackSpeed',1000/(700*t.interval),0,'兵种攻击间隔 '+t.interval+' 步');out.attackInterval=t.interval;
 stat('discipline',t.discipline,politics*.8,'政治 × 0.8');
 stat('martialPower',80,(u.force||0)*2,'武力 × 2',martial);
 stat('strategyPower',80,(u.intellect||0)*2,'智力 × 2',strategy);
 out.controlResistance=Math.min(.6,out.discipline/(out.discipline+150));
 out.damageReduction=1-(on('phalanx')?.7:1)*(on('ward')?1-u.statuses.ward.percent/100:1);
 out.strength=.5+.5*Math.sqrt(Math.max(0,Math.min(1,(u.hp??u.troops)/Math.max(1,u.maxHp??3000))));
 return out;
}
export function disciplineDuration(b,u,steps){return Math.max(1,Math.round(steps*(1-unitAttributes(u,b).controlResistance)));}
