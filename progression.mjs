import {advanceBonds} from './bonds.mjs';
import {BOND_DESIGNS} from './data/design/bonds.mjs';
import {officerLevel} from './passives.mjs';
import {advanceTacticLearning} from './tactic-learning.mjs';
import {TACTICS_BOOK} from './tactics.mjs';

import {MERIT_RULES} from './data/design/progression.mjs';
import {troopCapacity} from './troop-capacity.mjs';

// Current progression: productive domestic work and measured battle contribution.
export const PROGRESSION = MERIT_RULES;
export const emptyContribution = () => ({damage:0,taken:0,healing:0,siege:0,protection:0,support:0,control:0});
export function recordContribution(u,key,amount) {
  if(!u||!Number.isFinite(amount)||amount<=0)return;
  u.contribution ||= emptyContribution();
  u.contribution[key]+=Math.round(amount);
}
export function battleMerit(u,won) {
  const contribution={...emptyContribution(),...u.contribution};
  const score=Math.round(Object.entries(PROGRESSION.battleWeights).reduce((n,[key,weight])=>n+contribution[key]*weight,0));
  return {contribution,score,award:score>0?Math.max(1,Math.round(score/PROGRESSION.battleDivisor*(won?PROGRESSION.winFactor:1))):0};
}
export function contributionText(c) {
  return Object.entries({damage:'杀伤',taken:'承伤',healing:'救治',siege:'攻城／修缮',protection:'护盾承伤',support:'支援',control:'有效控制'}).filter(([key])=>c?.[key]>0).map(([key,label])=>`${label} ${c[key]}`).join(' · ')||'无有效贡献';
}
export const meritNeeded = level => level>=10?0:PROGRESSION.costs[level-1];
export const meritFloor = level => PROGRESSION.costs.slice(0,level-1).reduce((n,cost)=>n+cost,0);
export const totalMerit = u => meritFloor(officerLevel(u))+(u.merit||0);
export const meritChangeText = g => `功绩 ${g.gained>=0?'+':'−'}${Math.abs(g.gained)}${g.after!==g.before?`，${g.after>g.before?'升':'降'}至${g.after}级`:''}`;
export function validMeritGrowth(g){
 const integer=x=>Number.isSafeInteger(x)&&x>=0,level=x=>integer(x)&&x>=1&&x<=10;
 return !!g&&level(g.before)&&level(g.after)&&integer(g.beforeMerit)&&integer(g.afterMerit)&&(g.before===10||g.beforeMerit<meritNeeded(g.before))&&(g.after===10||g.afterMerit<meritNeeded(g.after))&&Number.isSafeInteger(g.gained)&&g.gained===meritFloor(g.after)+g.afterMerit-meritFloor(g.before)-g.beforeMerit&&Array.isArray(g.unlocked)&&g.unlocked.every(n=>typeof n==='string');
}
export function changeMerit(u,amount) {
  if(!Number.isSafeInteger(amount))throw new Error('功绩增量无效');
  const before=officerLevel(u),beforeMerit=u.merit||0,previous=totalMerit(u),capacity=troopCapacity(u),total=Math.max(0,previous+amount);
  if(!Number.isSafeInteger(total))throw new Error('功绩总量无效');
  u.level=1;
  while(u.level<PROGRESSION.maxLevel&&total>=meritFloor(u.level+1))u.level++;
  u.merit=total-meritFloor(u.level);
  if(u.troops+u.wounded>troopCapacity(u))u.meritCapacity=Math.max(u.meritCapacity||0,capacity);
  else delete u.meritCapacity;
  const bonds=advanceBonds(u),learned=u.level>before?advanceTacticLearning(u):[];
  return {before,after:u.level,beforeMerit,afterMerit:u.merit,gained:total-previous,learned,unlocked:[...bonds.map(id=>BOND_DESIGNS[id].name),...learned.map(id=>TACTICS_BOOK[id].name)]};
}
export function gainMerit(u,amount) {
  if(!Number.isSafeInteger(amount)||amount<0)throw new Error('功绩增量无效');
  return changeMerit(u,amount);
}
export function retainFactionMerit(u){const total=totalMerit(u);return changeMerit(u,Math.floor(total*PROGRESSION.changeFactionRetention)-total);}
// One result penalty per officer, shared by both battle controllers.
export function battleMeritResult(u,b){
 const won=b.result.winner===u.side,merit=battleMerit(u,won),f=PROGRESSION.failures;
 let penalty=0;
 if(b.result.winner!==null&&!won&&(u.participated||merit.score>0)){
  penalty=f.battle;
  const commander=b.sides[u.side].commanders?.some(c=>c.id===u.id&&c.armyId===u.armyId&&c.role==='leader');
  if(commander){
   const units=b.sides[u.side].units.filter(v=>v.armyId===u.armyId&&(v.arrivalTick??0)<=b.tick),initial=units.reduce((n,v)=>n+v.initial,0),remaining=units.reduce((n,v)=>n+v.hp,0);
   penalty=remaining===0||b.siege?.gate?.side===u.side&&b.result.reason==='城门失守'?f.destroyedCommand:remaining<=initial*.25?f.severeCommand:f.command;
  }
 }
 return {...merit,penalty,net:merit.award-penalty};
}
