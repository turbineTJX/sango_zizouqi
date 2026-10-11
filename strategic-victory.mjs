import {STRATEGIC_PLANNING_RULES as R} from './data/design/strategic-planning-rules.mjs';

export const emptyVictory=(totalCities=0,ownedCities=0)=>({objective:'unify',status:ownedCities===totalCities&&totalCities>0?'achieved':ownedCities?'active':totalCities?'defeated':'active',totalCities,ownedCities,remainingCities:totalCities-ownedCities,focus:null});
export const emptyVictoryValue=()=>({score:0,territory:0,regional:0,completion:0,elimination:0,connection:0,corridor:0,focus:0});

// Public geography, own holdings and dated ownership reports only. This is a
// direction for lawful operations, never a forecast of enemy moves or rewards.
export function planVictoryStrategy(context,previous=null){
 const {cities,edges}=context.territory,faction=context.faction,r=R.victory;
 const own=new Set(context.ownCities.map(c=>c.id)),byId=new Map(cities.map(c=>[c.id,c]));
 const adjacent=new Map(cities.map(c=>[c.id,[]])),regions=new Map(),holdings=new Map();
 for(const [a,b] of edges){if(!adjacent.has(a)||!adjacent.has(b))continue;adjacent.get(a).push(b);adjacent.get(b).push(a);}
 for(const c of cities){const region=c.province||c.id;if(!regions.has(region))regions.set(region,[]);regions.get(region).push(c);holdings.set(c.owner,(holdings.get(c.owner)||0)+1);}
 const components=new Map();let next=0;
 for(const id of own){if(components.has(id))continue;const queue=[id];components.set(id,next++);
  while(queue.length)for(const neighbor of adjacent.get(queue.shift())||[])if(own.has(neighbor)&&!components.has(neighbor)){components.set(neighbor,components.get(id));queue.push(neighbor);}
 }
 const frontier=new Set([...own].flatMap(id=>adjacent.get(id)||[]).filter(id=>!own.has(id)));
 const targets={};
 for(const id of [...frontier].sort()){
  const c=byId.get(id);if(!c)continue;
  const region=regions.get(c.province||c.id),owned=region.filter(x=>own.has(x.id)).length;
  const links=new Set((adjacent.get(id)||[]).filter(x=>own.has(x)).map(x=>components.get(x)));
  const opens=(adjacent.get(id)||[]).filter(x=>!own.has(x)&&!frontier.has(x)).length;
  const value={...emptyVictoryValue(),territory:r.territoryValue+r.endgameValue*own.size/Math.max(1,cities.length),
   regional:r.regionalValue*owned/region.length,completion:owned===region.length-1?r.completionValue:0,
   elimination:c.owner!=='neutral'&&holdings.get(c.owner)===1?r.eliminationValue:0,
   connection:Math.max(0,links.size-1)*r.connectionValue,corridor:Math.min(r.maxCorridors,opens)*r.corridorValue};
  value.score=Math.min(r.maxBonus,Object.values(value).reduce((n,x)=>n+x,0));
  targets[id]=value;
 }
 const ranked=Object.keys(targets).sort((a,b)=>targets[b].score-targets[a].score||a.localeCompare(b));
 let target=ranked[0]||null;
 const incumbent=ranked.find(id=>(byId.get(id).province||id)===previous?.focus?.province);
 if(incumbent&&targets[incumbent].score+r.focusSwitchMargin>=targets[target].score)target=incumbent;
 const victory=emptyVictory(cities.length,own.size);
 if(target){const province=byId.get(target).province||target;victory.focus={province,targetCity:target,reason:'整合区域领地，逐步占领全部城市取得胜利'};
  for(const [id,value] of Object.entries(targets))if((byId.get(id).province||id)===province){value.focus=r.focusValue;value.score=Math.min(r.maxBonus,value.score+value.focus);}
 }
 return {victory,targets};
}

export function victoryValueReason(value){
 if(!value?.score)return '';
 const reasons=['推进全国统一'];
 if(value.connection)reasons.push('连通分散领地');
 if(value.completion)reasons.push('完成区域占领');
 if(value.elimination)reasons.push('夺取对方已知最后据点');
 if(value.corridor)reasons.push('打开后续进攻方向');
 return reasons.join('，');
}
