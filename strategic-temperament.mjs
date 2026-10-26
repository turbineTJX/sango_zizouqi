import {STRATEGIC_PLANNING_RULES as R} from './data/design/strategic-planning-rules.mjs';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const disposition=p=>p===1||p===2?'cautious':p===4?'bold':'balanced';

// This die expresses a ruler's preference, not a prediction of combat RNG.
// Both the die and the preference survive saves; candidates never draw dice.
export function temperamentProbability({turn,personality,leadership,intellect,politics,quietTurns}){
 const r=R.temperament,judgment=(leadership+intellect)/2;
 const impatience=Math.min(r.maximumQuietBonus,Math.max(0,quietTurns-r.quietAfterTurns)*r.quietPerTurn);
 const chance=r.baseChance[personality]+(50-judgment)/100*r.judgmentWeight+(50-politics)/100*r.politicsWeight+impatience;
 return Math.round(clamp(chance*(turn<=R.tempo.earlyLastTurn?r.earlyFactor:1),r.minimumChance,r.maximumChance)*10000)/10000;
}
export function drawFactionTemperament(ai,faction,turn,profile,quietTurns){
 const policy=ai.factions[faction];if(policy.temperament?.turn===turn)return policy.temperament;
 ai.temperamentSeed=(Math.imul(ai.temperamentSeed,1664525)+1013904223)>>>0;
 const intent={turn,lordId:profile.lordId,personality:profile.personality,leadership:profile.leadership,intellect:profile.intellect,politics:profile.politics,quietTurns,probability:0,roll:ai.temperamentSeed/4294967296,willing:false};
 intent.probability=temperamentProbability(intent);intent.willing=intent.roll<intent.probability;
 policy.temperament=intent;return intent;
}
export function temperamentTolerance(intent,lossShare,recovery){
 const r=R.temperament,style=disposition(intent?.personality);
 const active=!!intent?.willing&&recovery.feasible&&lossShare<=r.maximumLossShare;
 return {active,ratioRelief:active?r.ratioRelief[style]:0,minimumAdvantage:active?r.minimumAdvantage[style]:Infinity,valueBonus:active?r.valueTolerance[style]:0};
}
export function temperamentAdvantage(base,tolerance){return tolerance.active?Math.max(tolerance.minimumAdvantage,base-tolerance.ratioRelief):base;}
export function validTemperament(intent,turn,officer){
 if(intent===null)return true;
 const integer=n=>Number.isSafeInteger(n)&&n>=0;
 return !!intent&&Object.keys(intent).length===10&&integer(intent.turn)&&intent.turn>0&&intent.turn<=turn&&officer(intent.lordId)&&[1,2,3,4].includes(intent.personality)
  &&['leadership','intellect','politics'].every(k=>Number.isFinite(intent[k])&&intent[k]>=0&&intent[k]<=100)&&integer(intent.quietTurns)&&intent.quietTurns<=intent.turn
  &&Number.isFinite(intent.roll)&&intent.roll>=0&&intent.roll<1&&intent.probability===temperamentProbability(intent)&&typeof intent.willing==='boolean'&&intent.willing===(intent.roll<intent.probability);
}
