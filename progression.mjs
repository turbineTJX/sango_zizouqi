import {officerLevel, passiveList} from './passives.mjs';
import {advanceTacticLearning} from './tactic-learning.mjs';
import {TACTICS_BOOK} from './tactics.mjs';

// Prototype pacing: real frontline participation only; both sides use the same rules.
export const PROGRESSION = {maxLevel:10,participation:100,victory:50,perLevel:100};
export const experienceNeeded = level => level>=10?0:level*PROGRESSION.perLevel;
export function gainExperience(u,amount) {
  if(!Number.isSafeInteger(amount)||amount<0)throw new Error('经验增量无效');
  const before=officerLevel(u);u.level=before;u.experience ||= 0;
  if(u.level===10)return {before,after:10,gained:0,unlocked:[]};
  u.experience+=amount;
  while(u.level<10&&u.experience>=experienceNeeded(u.level)){
    u.experience-=experienceNeeded(u.level);u.level++;
  }
  if(u.level===10)u.experience=0;
  const learned=u.level>before?advanceTacticLearning(u):[];
  return {before,after:u.level,gained:amount,learned,unlocked:[...passiveList(u).filter(s=>s.level>before&&s.level<=u.level).map(s=>s.name),...learned.map(id=>TACTICS_BOOK[id].name)]};
}
