import {equipmentText} from './bond-equipment.mjs';
import {BOND_DESIGNS} from './data/design/bonds.mjs';
import {BOND_ASSIGNMENTS} from './data/design/bond-assignments.mjs';
import {OFFICER_DESIGNS} from './data/design/officers.mjs';
export const bondHolders=id=>Object.entries(BOND_ASSIGNMENTS).filter(([,a])=>a[id]).map(([person,a])=>({id:person,name:OFFICER_DESIGNS[person].name,cap:a[id]}));
export const BOND_STAT_NAMES={attack:'攻击',defense:'防御',move:'移速',attackSpeed:'攻速',siege:'攻城威力',martialPower:'武技威力',strategyPower:'谋略威力',discipline:'军纪'};
export const bondGradeLabel=d=>d.grade==='advanced'?'高级羁绊':'低级羁绊';
export const bondRecipients=d=>d.special==='reserveEntry'?'锁定名额内后续首次补入的己方预备队，无需持有蓄锐':d.special==='formationTiles'?'首次入场时站在阵位的己方部队，持有者翻倍':d.special==='escort'?'护卫持有者相邻的其他友军':'本方实际在场且已获得该羁绊的部队';
const pct=n=>Number((n*100).toFixed(2));
export function bondTierText(d,i){
 const top=i===d.thresholds.length-1;
 switch(d.special){
 case 'attackPower':case 'defenseArmor':case 'rapidAttack':return BOND_STAT_NAMES[d.stat]+' +'+pct(d.values[i])+'%'+(d.special==='rapidAttack'?'，实际缩短普攻间隔，不影响战法冷却与调息':'');
 case 'intentIncome':return '普攻与受击战意获取 +'+pct(d.incomeBonus[i])+'%，最终收入四舍五入；分击仅一份攻击收入，固定鼓舞与入场奖励沿用原值';
 case 'hitIntentDeny':return '有效普攻有'+pct(d.chance[i])+'%概率阻止该次受击战意'+(top?'，满档必定生效':'')+'；分击各目标独立判定，不削减已有战意，不阻止目标攻击或友军增益，战法、反击与持续伤害不触发';
 case 'scholarPower':return '谋略威力 +'+pct(d.values[i])+'%';
 case 'steadyDiscipline':return '军纪 +'+pct(d.values[i])+'%，不提供异常免疫';
 case 'spreadGuard':return '没有相邻真实友军时，谋略直接伤害降低'+pct(d.values[i])+'%';
 case 'finishStrike':return '对兵力 ≤'+pct(d.hpThreshold)+'% 的敌军直接伤害 +'+pct(d.values[i])+'%'+(top?'；对该条件下破甲敌军，普攻必定暴击':'');
 case 'counterHorse':return '对骑兵直接伤害 +'+pct(d.values[i])+'%';
 case 'siegeStrike':return '对城门伤害 +'+pct(d.values[i])+'%，野战不增伤';
 case 'nearAllySpeed':return '有相邻真实友军时，攻速 +'+pct(d.values[i])+'%';
 case 'isolatedStrike':return '对没有相邻真实友军的敌军直接伤害 +'+pct(d.values[i])+'%'+(top?'；有效普攻命中后自身穿阵'+d.phaseSteps+'回合':'');
 case 'valorIntent':return '对战意严格低于自身的敌军伤害 +'+pct(d.values[i])+'%；'+(top?'免疫所有低战意来源的伤害、有害状态与战法有害效果；治疗、护盾和增益正常生效':'有'+pct(d.immunityChance[i])+'%概率免疫低战意来源的伤害');
 case 'swiftBurst':return '首次可行动前触发，此后每'+d.period+'回合可再次突进：移动力 +'+pct(d.values[i])+'%，持续'+d.burstSteps[i]+'回合；无视ZOC，优先合法后排；不可达则攻击合法目标，遵守占位、地形、定身、嘲讽与有效集火';
 case 'physicalGuard':return '受到的物理直接伤害降低'+pct(d.values[i])+'%，不减免谋略或持续伤害';
 case 'distantStrike':return '对至少'+d.minDistance+'格外敌军的直接伤害 +'+pct(d.values[i])+'%；目标混乱、封技或失阵时，再 +'+pct(d.controlBonus[i])+'%'+(top?'，物理直接伤害无视'+pct(d.defenseIgnore)+'%防御':'')+'；不增加射程';
 case 'escort':return '每'+d.period+'回合，为相邻兵力比例最低且 ≤'+pct(d.hpThreshold)+'% 的其他友军提供'+pct(d.shieldFraction[i])+'%最大兵力的护盾，持续'+d.shieldSteps+'回合，同名取较强者'+(top?'；受伤破盾且批次结束仍存活，获得'+d.invincibleSteps+'回合护卫免伤，每队每场一次':'');
 case 'songAttack':return '有效普攻为相邻战意最低的其他友军增加'+d.intentGain[i]+'战意，每次攻击一次'+(top?'；溢出每点转为1%最大兵力护盾，上限'+pct(d.overflowShieldCap)+'%，持续'+d.shieldSteps+'回合':'');
 case 'crusherAttack':return '有效普攻有'+pct(d.chance[i])+'%概率附加'+d.statusSteps+'回合破甲'+(top?'；成功破甲同时削减'+d.intentDrain+'战意':'');
 case 'doubtPulse':return '每'+d.period+'回合对合法普攻目标有'+pct(d.chance[i])+'%概率附加'+d.statusSteps+'回合失阵'+(top?'；额外对目标'+d.range+'格内另一敌军独立判定':'');
 case 'lureAttack':return '有效普攻有'+pct(d.chance[i])+'%概率嘲讽'+d.statusSteps+'回合'+(top?'；成功后使目标'+d.range+'格内其他敌军迟滞'+d.statusSteps+'回合':'');
 case 'fireAttack':return '有效普攻有'+pct(d.chance[i])+'%概率灼烧'+d.statusSteps+'回合，单层按谋略威力'+pct(d.burnRate)+'%及目标军纪计算，最多三层'+(top?'；每'+d.period+'回合把己方来源既有灼烧传给其'+d.range+'格内一名未灼烧敌军，保留原单层威力与来源':'');
 case 'chainAttack':return '有效普攻灼烧敌军时，至多每'+d.period+'回合连环'+d.targets[i]+'队，范围'+d.range+'格、持续'+d.statusSteps+'回合；后续直接兵力伤害的'+pct(d.fraction[i])+'%作为额外传导总额，其他成员平分，不递归、不传导持续伤害';
 case 'beautyHit':return '有效普攻削减命中目标'+d.intentDrain[i]+'战意；'+(top?'全场在场敌军各有':'命中单位有')+pct(d.statusChance[i])+'%概率附加'+d.statusSteps+'回合随机异常（混乱、封技、失阵、迟滞、疲弱、破甲）';
 case 'lastStand':return '现役兵力 ≤'+pct(d.hpThreshold)+'%：攻击、武技、谋略威力 +'+pct(d.values[i])+'%；直接伤害降低'+pct(d.protection[i])+'%，持续伤害不减免';
 case 'formationTiles':return '阵位首次入场：攻击、武技、谋略威力 +'+pct(d.values[i])+'%，持续'+d.entryDuration[i]+'回合；持有者翻倍'+(top?'；三格齐备延长至'+d.fullDuration+'回合':'');
 case 'routMomentum':return '直接伤害 +'+pct(d.values[i])+'%，每击溃一队再 +'+pct(d.killBonus[i])+'%；击溃'+d.killGoal+'队后'+(top?'己方全军':'持有者')+'攻速 +'+pct(d.burstSpeed[i])+'%，持续'+d.burstDuration+'回合';
 case 'reserveEntry':return '开战锁定后续'+d.slots[i]+'支预备队：入场获得'+d.intent+'战意及'+d.entrySteps+'回合疾行、速攻'+(top?'；首个普通小战法额外一次使用额度':'');
 case 'swornLink':return '持有者军纪 +'+pct(d.singleDiscipline)+'%'+(i>=1?'；在场成员平均分担伤害；成员溃败后其余成员获得'+d.furySteps+'回合攻击与双威力 +'+pct(d.furyPower)+'%、攻速 +'+pct(d.furySpeed)+'%':'')+(top?'；三人曾同时在场，两人溃败后最后一人另获'+d.invincibleSteps+'回合无敌':'');
 case 'lowIntent':return '谋略威力 +'+pct(d.values[i])+'%'+(top?'；军纪 +'+pct(d.extraValue)+'%；对战意低于60的目标谋略伤害 +'+pct(d.specialValue)+'%':'')+'；'+equipmentText({...d,entryEquipment:{...d.entryEquipment,charges:[d.entryEquipment.charges[i]]}});
 default:throw new Error('Unknown bond handler: '+d.special);
 }
}
export function bondReference(id){
 const d=BOND_DESIGNS[id];if(!d)return null;
 return {title:d.name+' · 羁绊说明',groups:[{name:d.name,rows:d.thresholds.map((n,i)=>[n+' 点','',bondTierText(d,i)])}]};
}
export function bondOverview(){
 return {title:'羁绊一览',groups:['basic','advanced'].map(grade=>({name:grade==='basic'?'低级羁绊 · 常见武将':'高级羁绊 · 稀缺武将',rows:Object.entries(BOND_DESIGNS).filter(([,d])=>d.grade===grade).map(([id,d])=>[d.name,'',d.summary+'\n'+bondHolders(id).length+'名持有者 · 门槛：'+d.thresholds.join(' / ')+'点\n'+d.tradeoff])}))};
}
