import {bondsMarkup} from './bond-display.mjs';
import {abilityButton} from './ability-reference.mjs';
import {armyCommanders} from './engine.mjs';
import {movementPoints} from './strategic-movement.mjs';
import {armyVisionRadius} from './strategic-vision.mjs';
import {commanderStratagems,STRATAGEMS,selectStratagemSource,stratagemEffectText} from './stratagems.mjs';
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isFinite(v)?v.toLocaleString('zh-CN',{maximumFractionDigits:1}):'—';
const fields=items=>`<dl class="info-fields">${items.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
// The directory and draft preview share these sections and the map movement rule.
export function armyDetailSections(a,{soldiers=a.units.reduce((n,u)=>n+(u.hp??u.troops),0),consumption,person=id=>esc(a.units.find(u=>u.id===id)?.name||'未任命')}={}){
 const followers=a.units.filter(u=>u.troops===0);
 const commanders=armyCommanders(a),strategies=[...new Set(commanders.flatMap(commanderStratagems))];
 return [
  {id:'bonds',title:'羁绊',html:bondsMarkup(a.units,{army:a})},
  {id:'command',title:'指挥任职',html:fields([['军团长',person(a.leader)],['军师',person(a.advisor)],['大地图视野半径',armyVisionRadius(a).toLocaleString('zh-CN',{maximumFractionDigits:2})]])},
  {id:'supply',title:'兵力与行军',html:fields([['现役总兵力',number(soldiers)],['有兵部队',number(a.units.filter(u=>(u.hp??u.troops)>0).length)],['随军待整编',number(followers.length)+' 人'],['大地图移动力',number(movementPoints(a))+' 点 / 日'],['士气',number(a.morale)],...(a.supply!==undefined?[['携粮',number(a.supply)+' / '+number(a.supplyCapacity)]]:[]),...(consumption!==undefined?[['每日耗粮',number(consumption)]]:[])])},
  ...(followers.length?[{id:'followers',title:'随军待整编',html:'<p>'+followers.map(u=>esc(u.name)).join('、')+' · 待返城整补</p>'}]:[]),
  {id:'strategy',title:'军团军略',html:strategies.map(id=>{const source=selectStratagemSource(commanders,id);return abilityButton('stratagem',id,STRATAGEMS[id].name+' · '+source.name,stratagemEffectText(source));}).join('')||'<p>暂无可用军略</p>'}
 ];
}
export function armyDetailsMarkup(a,options={}){
 return `<section class="army-details-preview"><h3>军团</h3>${armyDetailSections(a,options).map(s=>`<section><h4>${s.title}</h4>${s.html}</section>`).join('')}</section>`;
}
