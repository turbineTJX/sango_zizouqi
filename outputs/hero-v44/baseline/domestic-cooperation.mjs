import {relationshipInfo,relationshipKey,changeRelationshipScore} from './relationships.mjs';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function compatibilityInfo(a,b){
 const x=a?.compatibility,y=b?.compatibility;
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>149||y<0||y>149)return {distance:null,label:'未载',modifier:0,growth:2};
 const distance=Math.min(Math.abs(x-y),150-Math.abs(x-y));
 const [label,modifier,growth]=distance<=10?['很合拍',8,3]:distance<=25?['合拍',4,2]:distance<=45?['一般',0,2]:distance<=60?['不太合拍',-4,1]:['难合拍',-8,1];
 return {distance,label,modifier,growth};
}
export function domesticAbility(u,direction){
 return clamp(direction==='technology'?(u.intellect+u.politics)/2:direction==='talent'?((u.charm??u.politics)+u.politics)/2:direction==='military'?(u.leadership+u.politics)/2:u.politics,0,100);
}
export function cooperationProfile(s,actor,helper,direction){
 const relation=relationshipInfo(actor.id,helper.id,s.relationshipScores,s.relationshipTypes),affinity=compatibilityInfo(actor,helper),ability=domesticAbility(helper,direction);
 return {chance:clamp(20+.4*(relation.score-50)+2*affinity.modifier,5,65)/100,gain:.1+.15*ability/100,chanceGain:.03+.05*ability/100,relation:relation.score,affinity:affinity.label};
}
export const COOPERATION_MODES=Object.freeze({build:'progress',research:'quantity',cash:'quantity',grain:'quantity',effect:'quantity',discount:'quantity',recruit:'quantity',heal:'quantity',repair:'quantity',prepare:'quantity',trade:'chance',rescue:'chance',trial:'chance',explore:'chance',hire:'chance',persuade:'chance',reassure:'chance'});
// Strategic events change the world relationship only. Running battles retain
// their opening snapshots, including when one of them is being controlled.
export function growCooperationRelationship(s,a,b,currentTurn){
 const ledger=s.campaign.domestic.cooperationGrowth,key=relationshipKey(a.id,b.id),info=relationshipInfo(a.id,b.id,s.relationshipScores,s.relationshipTypes);
 if(ledger[key]===currentTurn||info.type==='disliked')return 0;
 const world={relationshipScores:s.relationshipScores,relationshipTypes:s.relationshipTypes};
 const error=changeRelationshipScore(world,a.id,b.id,compatibilityInfo(a,b).growth);
 if(error)return 0;
 ledger[key]=currentTurn;
 return relationshipInfo(a.id,b.id,s.relationshipScores,s.relationshipTypes).score-info.score;
}
