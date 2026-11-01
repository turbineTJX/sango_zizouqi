import {supplyDuration} from './information-display.mjs';
import {bondsMarkup} from './bond-display.mjs';
import {abilityButton} from './ability-reference.mjs';
import {armyCommanders,battleWounded} from './engine.mjs';
import {armyBattle,liveSoldiers,supplyConnection} from './strategic-campaign.mjs';
import {movementPoints,renderSupplyRoute} from './strategic-movement.mjs';
import {armyVisionRadius,intelligenceWorld} from './strategic-vision.mjs';
import {playerFaction} from './player-faction.mjs';
import {mapNode} from './road-network.mjs';
import {commanderStratagems,STRATAGEMS,selectStratagemSource,stratagemEffectText} from './stratagems.mjs';
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isFinite(v)?v.toLocaleString('zh-CN',{maximumFractionDigits:1}):'—';
const fields=items=>`<dl class="info-fields">${items.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
// Read the same current troops and wound pool as campaign rations, without settling a battle.
export function armyInfoCounts(s,a){
 const record=s?armyBattle(s,a.id):null,combat=record?.battle.sides.flatMap(side=>side.units).filter(u=>u.armyId===a.id)||[],byId=new Map(combat.map(u=>[u.id,u]));
 const members=a.units.map(unit=>{const live=byId.get(unit.id),departed=!!live?.retreatDispatched;return {unit,departed,soldiers:record?(live&&!departed?live.hp:0):(unit.hp??unit.troops),wounded:(unit.wounded||0)+(live&&!departed?battleWounded(live):0)};});
 return {soldiers:s?liveSoldiers(s,a):members.reduce((n,u)=>n+u.soldiers,0),wounded:a.units.reduce((n,u)=>n+(u.wounded||0),0)+combat.filter(u=>!u.retreatDispatched).reduce((n,u)=>n+battleWounded(u),0),unitCount:members.filter(u=>u.soldiers>0&&!u.departed).length,members};
}
export function armySupplyInfo(s,a){
 s=intelligenceWorld(s);const army=s.armies.find(x=>x.id===a?.id&&!x.disbanded&&x.faction===playerFaction(s));if(!army)return undefined;
 const link=supplyConnection(s,army),source=link?mapNode(s,link.source):null;
 return {army,link,label:source?.name||'未连接'};
}
export function armySupplyRouteMarkup(s,ui){
 if(!ui.mapSupplyArmy)return '';
 const info=armySupplyInfo(s,{id:ui.mapSupplyArmy});if(!info?.link)return '';
 return `<g class="army-supply-route" data-supply-army="${esc(info.army.id)}" data-supply-source="${esc(info.link.source)}" role="img" aria-label="${esc(info.label)}至${esc(info.army.name)}的粮道">${renderSupplyRoute(intelligenceWorld(s),info.army,info.link)}</g>`;
}
// The directory and draft preview share these sections and the map movement rule.
export function armyDetailSections(a,{soldiers=a.units.reduce((n,u)=>n+(u.hp??u.troops),0),wounded=a.units.reduce((n,u)=>n+(u.wounded||0),0),unitCount=a.units.filter(u=>(u.hp??u.troops)>0).length,consumption,supplyLabel,person=id=>esc(a.units.find(u=>u.id===id)?.name||'未任命')}={}){
 const followers=a.units.filter(u=>u.troops===0),spoilsGold=a.units.reduce((n,u)=>n+(u.spoilsGold||0),0),spoilsGrain=a.units.reduce((n,u)=>n+(u.spoilsGrain||0),0);
 const commanders=armyCommanders(a),strategies=[...new Set(commanders.flatMap(commanderStratagems))];
 return [
  {id:'bonds',title:'羁绊',html:bondsMarkup(a.units,{army:a})},
  {id:'command',title:'指挥',html:fields([['军团长',person(a.leader)],['军师',person(a.advisor)],['视野半径',armyVisionRadius(a).toLocaleString('zh-CN',{maximumFractionDigits:2})]])},
  {id:'supply',title:'兵力与行军',html:fields([['现役兵',number(soldiers)],['伤兵',number(wounded)],['部队数',number(unitCount)+' 队'],['随军待整编',number(followers.length)+' 人'],['行动力',number(movementPoints(a))+' 点 / 日'],['士气',number(a.morale)+' / 100'],...(a.supply!==undefined?[['携粮',number(a.supply)+' / '+number(a.supplyCapacity)]]:[]),...(consumption!==undefined?[['每日耗粮',number(consumption)],...(a.supply!==undefined?[['无补给续航',supplyDuration(a.supply,consumption)]]:[])]:[]),...(spoilsGold||spoilsGrain?[['缴获物资（待入库）',number(spoilsGold)+' 金 · '+number(spoilsGrain)+' 粮']]:[]),...(supplyLabel!==undefined?[['粮道',esc(supplyLabel)]]:[])])},
  ...(followers.length?[{id:'followers',title:'随军待整编',html:'<p>'+followers.map(u=>esc(u.name)).join('、')+' · 待返城整补</p>'}]:[]),
  {id:'strategy',title:'军略',html:strategies.map(id=>{const source=selectStratagemSource(commanders,id);return abilityButton('stratagem',id,source.name+'「'+STRATAGEMS[id].name+'」',stratagemEffectText(source));}).join('')||'<p>暂无可用军略</p>'}
 ];
}
export function armyDetailsMarkup(a,options={}){
 return `<section class="army-details-preview"><h3>军团</h3>${armyDetailSections(a,options).map(s=>`<section><h4>${s.title}</h4>${s.html}</section>`).join('')}</section>`;
}
