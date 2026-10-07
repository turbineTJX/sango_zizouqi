import {advanceBonds} from './bonds.mjs';
import {BOND_DESIGNS} from './data/design/bonds.mjs';
import {officerLevel} from './passives.mjs';
import {advanceTacticLearning} from './tactic-learning.mjs';
import {TACTICS_BOOK} from './tactics.mjs';

import {MERIT_RULES} from './data/design/progression.mjs';

// Current progression: productive domestic work and measured battle contribution.
export const PROGRESSION = MERIT_RULES;
export const emptyContribution = () => ({damage:0,taken:0,healing:0,siege:0,support:0,control:0});
export function recordContribution(u,key,amount) {
  if(!u||!Number.isFinite(amount)||amount<=0)return;
  u.contribution ||= emptyContribution();
  u.contribution[key]+=Math.round(amount);
}
export function battleMerit(u,won) {
  const contribution={...emptyContribution(),...u.contribution};
  const c=contribution,score=Math.round(c.damage+c.taken*.35+c.healing*1.2+c.siege*.5+c.support*100+c.control*150);
  return {contribution,score,award:score>0?Math.max(1,Math.round(score/PROGRESSION.battleDivisor*(won?1.25:1))):0};
}
export function contributionText(c) {
  return Object.entries({damage:'杀伤',taken:'承伤',healing:'救治',siege:'攻城／修缮',support:'支援',control:'控制'}).filter(([key])=>c?.[key]>0).map(([key,label])=>`${label} ${c[key]}`).join(' · ')||'无有效贡献';
}
export const meritNeeded = level => level>=10?0:PROGRESSION.costs[level-1];
export function gainMerit(u,amount) {
  if(!Number.isSafeInteger(amount)||amount<0)throw new Error('功绩增量无效');
  const before=officerLevel(u);u.level=before;u.merit ||= 0;
  if(u.level===10)return {before,after:10,gained:0,unlocked:[]};
  u.merit+=amount;
  while(u.level<10&&u.merit>=meritNeeded(u.level)){
    u.merit-=meritNeeded(u.level);u.level++;
  }
  if(u.level===10)u.merit=0;
  const bonds=advanceBonds(u);
  const learned=u.level>before?advanceTacticLearning(u):[];
  return {before,after:u.level,gained:amount,learned,unlocked:[...bonds.map(id=>BOND_DESIGNS[id].name),...learned.map(id=>TACTICS_BOOK[id].name)]};
}
