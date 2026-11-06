import {cityCaptureResources} from '../city-resources.mjs';
import {cityBaseIncome,resourceValue} from '../economy.mjs';
import {OFFICER_FATE_RULES} from '../data/design/officer-fate-rules.mjs';
import {STRATEGIC_PLANNING_RULES as R} from '../data/design/strategic-planning-rules.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {cityWoundedRecovery} from '../city-wounded.mjs';
import {foodConsumption} from '../army-supply.mjs';
import {battleWounded} from '../engine.mjs';

// Conditional receipts are utility, never funds. Inputs are the observer's
// projected city and their own real units. No hidden person or future roll.
export function occupationPayoff(view,target,{intelligence,day,units,foodUse,approachDays,siegeDays,ownLosses=0}){
 const known=!!intelligence.known,visible=!!intelligence.visible;
 const fresh=known&&intelligence.observedDay!==null&&day-intelligence.observedDay<=R.recovery.freshIntelligenceDays;
 const retained=known?cityCaptureResources(target).retained:{gold:0,grain:0,manpower:0};
 const confidence=visible?1:fresh?R.victory.observedStockShare:0;
 const expected=Object.fromEntries(Object.entries(retained).map(([k,n])=>[k,Math.floor(n*confidence)]));
 // Ordinary base production needs no invented future appointment. Discount
 // unobserved damage and reserve a whole recovery window for the occupying
 // force before valuing any surplus. Governor/worker bonuses are excluded.
 const horizon=R.recovery.horizonDays,base=known?cityBaseIncome(view,target):{gold:0,grain:0,manpower:0};
 const buildingConfidence=known?(visible?.5:.25):0;
 const production=Object.fromEntries(Object.entries(base).map(([k,n])=>[k,Math.floor(n*horizon/10*buildingConfidence)]));
 production.grain=Math.max(0,production.grain-Math.ceil(foodUse*horizon));
 const observedMen=known?target.units.reduce((n,u)=>n+u.troops,0):0;
 // Losing troops may escape or be healed. Half the observed soldiers is a
 // conservative policy scenario, not a promised battle outcome or win rate.
 const woundedUpper=Math.floor(battleWounded({initial:observedMen,hp:0})*OFFICER_FATE_RULES.woundedCaptureRate);
 const ownBattleWounded=battleWounded({initial:ownLosses,hp:0});
 // A city pool has no per-unit capacity limit. Both the observed existing
 // pool and newly captured battle casualties are conditional receipts.
 const observedPool=known?cityCaptureResources(target).wounded.retained:0;
 const capturedWounded=Math.floor((woundedUpper*.5+observedPool)*confidence);
 const healingPerDay=known?cityWoundedRecovery(target):0;
 const ownWounded=ownBattleWounded+units.reduce((n,u)=>n+u.wounded,0);
 const expectedHealingFood=Math.max(0,expected.grain+base.grain*horizon/10*buildingConfidence-Math.ceil(foodUse*horizon));
 const woundedFood=foodConsumption(0,capturedWounded+ownWounded)*horizon;
 const funded=expectedHealingFood>woundedFood;
 const beds=funded?Math.min(healingPerDay*horizon,Math.max(0,ECONOMY_RULES.capacity.manpowerMax-expected.manpower)):0;
 const earlierRecovered=known?Math.floor(Math.min(ownWounded,healingPerDay*Math.min(horizon,approachDays),beds)*confidence):0;
 const recoveredWounded=Math.floor(Math.min(capturedWounded,Math.max(0,beds-earlierRecovered)));
 // Captivity is not recruitment. Only currently visible people create a
 // modest conditional opportunity; none become troops or guaranteed income.
 const visiblePeople=visible?target.units.filter(u=>u.id):[];
 const expectedCaptives=visiblePeople.length*OFFICER_FATE_RULES.captureChance.siege*.5;
 const talentValue=visiblePeople.reduce((n,u)=>n+(OFFICER_FATE_RULES.ransom.base+Math.max(u.leadership,u.force,u.intellect,u.politics,u.charm)*OFFICER_FATE_RULES.ransom.perHighestStat)*OFFICER_FATE_RULES.captureChance.siege*.25,0);
 const stockValue=resourceValue(expected),productionValue=resourceValue(production),woundedValue=(recoveredWounded+earlierRecovered)*(ECONOMY_RULES.value.manpower||0);
 // Existing evaluator already values gold/grain loot. Add only manpower,
 // productive surplus, wounded recovery and personnel opportunities once.
 const additional=expected.manpower*(ECONOMY_RULES.value.manpower||0)+productionValue+woundedValue+talentValue;
 return {version:1,conditional:true,observedDay:intelligence.observedDay,confidence,arrivalDay:day+Math.ceil(approachDays+siegeDays),
  retained,expected,production,retainedPoolWounded:observedPool,capturedWounded,recoveredWounded,earlierRecovered,woundedUpper,expectedCaptives,guaranteedRecruits:0,
  recoveryDays:capturedWounded&&healingPerDay?Math.ceil(capturedWounded/healingPerDay):0,
  stockValue,productionValue,woundedValue,talentValue,value:stockValue+productionValue+woundedValue+talentValue,
  additionalScore:additional/R.victory.observedStockGoldPerPoint};
}

export function validOccupationPayoff(p){
 const nonnegative=n=>Number.isFinite(n)&&n>=0;
 return p?.version===1&&p.conditional===true&&p.guaranteedRecruits===0&&nonnegative(p.confidence)&&p.confidence<=1
  &&['retained','expected','production'].every(key=>p[key]&&['gold','grain','manpower'].every(k=>Number.isSafeInteger(p[key][k])&&p[key][k]>=0))
  &&['retainedPoolWounded','arrivalDay','capturedWounded','recoveredWounded','earlierRecovered','woundedUpper','expectedCaptives','recoveryDays','stockValue','productionValue','woundedValue','talentValue','value','additionalScore'].every(k=>nonnegative(p[k]))
  &&p.recoveredWounded<=p.capturedWounded&&p.capturedWounded<=p.woundedUpper+p.retainedPoolWounded&&['gold','grain','manpower'].every(k=>p.expected[k]<=p.retained[k]);
}

