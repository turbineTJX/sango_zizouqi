import {cityIntelligence,intelligenceLabel,visionEnabled} from './strategic-vision.mjs';
import {playerFaction} from './player-faction.mjs';
import {isPlanning,armyBattle} from './strategic-campaign.mjs';

// Presentation queries only: missing private information is never a confirmed zero.
export const administrationKnown=(s,faction)=>!visionEnabled(s)||faction===playerFaction(s);
export function cityInformation(s,id){
 const intel=cityIntelligence(s,id);
 return {...intel,state:intel.visible?'current':intel.data?'stale':'unknown',get label(){return intelligenceLabel(s,id);}};
}
export function planningRestriction(s,{army=null}={}){
 if(s.finished)return '已结束';
 if(army&&armyBattle(s,army.id))return '交战中';
 return isPlanning(s)?'':'执行中';
}
export const supplyDuration=(supply,consumption)=>consumption>0?`${Math.floor(supply/consumption*10)/10} 天`:'—';
