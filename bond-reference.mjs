import {equipmentText} from './bond-equipment.mjs';
import {BOND_DESIGNS} from './data/design/bonds.mjs';
export const BOND_STAT_NAMES={attack:'攻击',defense:'防御',move:'移速',attackSpeed:'攻速',siege:'攻城威力',martialPower:'武技威力',strategyPower:'谋略威力',discipline:'军纪'};
const families={spear:'枪兵',cavalry:'骑兵',archer:'弓兵（含弩兵）',halberd:'戟兵',siege:'兵器（冲车、投石、井栏）',ship:'水军'};
export const bondRecipients=d=>d.special==='reserveEntry'?'开战锁定名额内后续首次实际补入的己方预备队，不限兵种，无需持有蓄锐':d.special==='formationTiles'?'己方首次实际入场时站在阵位的部队，军阵持有者效果翻倍':d.family?`本方在场${families[d.family]||d.family}部队`:'本方在场且已获得该羁绊的部队';
const baseBondTierText=(d,i)=>d.special==='formationTiles'?`阵位首次入场：攻击、武技、谋略威力 +${Math.round(d.values[i]*100)}%，持续${d.entryDuration[i]}回合；军阵持有者翻倍${i===d.thresholds.length-1?'；三个阵位同时有人则延长至'+d.fullDuration+'回合':''}`:d.special==='routMomentum'?`持有者直接伤害 +${Math.round(d.values[i]*100)}%，每次击溃再 +${Math.round(d.killBonus[i]*100)}%；累计${d.killGoal}队进入乘胜，${i===d.thresholds.length-1?'己方全军':'持有者'}攻速 +${Math.round(d.burstSpeed[i]*100)}%，持续${d.burstDuration}回合`:d.special==='swornLink'?`在场桃园成员平均分担伤害；成员溃败后其余在场成员获得${d.furySteps}回合攻击与双威力 +${Math.round(d.furyPower*100)}%、攻速 +${Math.round(d.furySpeed*100)}%${i===1?'；三人曾同时在场，累计两人溃败后最后一人另获'+d.invincibleSteps+'回合无敌':''}`:d.special==='reserveEntry'?`开战锁定后续${d.slots[i]}支预备队：首次补入获得${d.intent}战意及${d.entrySteps}回合疾行、速攻${i===2?'；首个普通小战法额外一次使用额度':''}`:d.special==='valorRamp'?`武技威力 +${Math.round(d.values[i]*100)}%；有效普攻积累攻速，每层${Math.round(d.stackRates[i]*100)}%，最多${d.maxStacks}层${i===d.thresholds.length-1?'；满层获得'+d.rallyIntent+'战意，每场一次':''}`:d.special==='beautyHit'?`普攻命中削弱武技、谋略威力${d.specialValue*100}%，持续${d.hitDuration[i]}回合${i===2?'；同时尝试施加迟滞'+d.controlSteps+'回合':''}`:`${BOND_STAT_NAMES[d.stat]||d.stat}提高${Number((d.values[i]*100).toFixed(2))}%`+(i===d.thresholds.length-1&&d.extraValue?`；${BOND_STAT_NAMES[d.extra]||d.extra}额外提高${Number((d.extraValue*100).toFixed(2))}%`:'');
export function bondReference(id){
 const d=BOND_DESIGNS[id];if(!d)return null;
 return {title:'羁绊说明',groups:[{name:d.name,rows:[['受益部队','',bondRecipients(d)],['点数','',`本方实际在场部队的「${d.name}」个人等级相加，贡献不限制当前兵种。后备、未抵达、已离场及诱饵不计入。`],...d.thresholds.map((n,i)=>[`${n} 点`,'',bondTierText(d,i)]),['完整效果','',d.description],['成长','', '个人当前等级与上限分别显示；升级概率获得，10级达到个人预设上限。各档只取最高档，不逐档叠加。']]}]};
}
export function bondOverview(){
 return {title:'羁绊一览',groups:[{name:'全部',rows:Object.entries(BOND_DESIGNS).map(([id,d])=>[d.name,'',`${bondRecipients(d)}\n${d.thresholds.map((n,i)=>`${n}点：${bondTierText(d,i)}`).join('\n')}\n${d.description}`])},...Object.keys(BOND_DESIGNS).map(id=>bondReference(id).groups[0])]};
}

export const bondTierText=(d,i)=>baseBondTierText(d,i)+(d.entryEquipment?"；"+equipmentText({...d,entryEquipment:{...d.entryEquipment,charges:[d.entryEquipment.charges[i]]}}):"");
