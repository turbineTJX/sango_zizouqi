import {OFFICER_BY_ID,OFFICER_CATALOG} from './officer-catalog.mjs';
import {TROOPS} from './unit-stats.mjs';
import {BATTLE_TERRAINS} from './battlefield.mjs';
import {troopCapacity} from './troop-capacity.mjs';

export function defaultCustomBattle(){
  return {terrain:'land',seed:521306,ownTeam:[{id:'cao',type:'spear',troops:3000,level:5}],enemyTeam:[{id:'shao',type:'spear',troops:3000,level:5}]};
}
export function validateCustomBattle(draft){
  if(!draft||!Object.hasOwn(BATTLE_TERRAINS,draft.terrain))throw new Error('请选择有效地形');
  if(!Number.isSafeInteger(draft.seed)||draft.seed<0||draft.seed>0xffffffff)throw new Error('种子须为 0～4294967295 的整数');
  for(const key of ['ownTeam','enemyTeam']){
    const team=draft[key],name=key==='ownTeam'?'我军':'敌军';
    if(!Array.isArray(team)||team.length<1||team.length>6)throw new Error(`${name}须选 1～6 名武将`);
    if(new Set(team.map(u=>u.id)).size!==team.length)throw new Error(`${name}不能重复选择同一武将`);
    for(const u of team){
      if(!Object.hasOwn(OFFICER_BY_ID,u.id)||!Object.hasOwn(TROOPS,u.type))throw new Error(`${name}武将或兵种无效`);
      if(!Number.isInteger(u.level)||u.level<1||u.level>10)throw new Error('武将等级须为 1～10');
      const cap=troopCapacity({...OFFICER_BY_ID[u.id],level:u.level});
      if(!Number.isInteger(u.troops)||u.troops<1||u.troops>cap)throw new Error(`${OFFICER_BY_ID[u.id].name}兵力须为 1～${cap}`);
      if(u.type==='ship'&&draft.terrain!=='river')throw new Error('配置舰船时，请选择河流地形');
    }
  }
  const ids=[...draft.ownTeam,...draft.enemyTeam].map(u=>u.id);
  if(new Set(ids).size!==ids.length)throw new Error('同一武将不能同时加入双方，请更换重复武将');
  return {terrain:draft.terrain,seed:draft.seed,...Object.fromEntries(['ownTeam','enemyTeam'].map(key=>[key,draft[key].map(({id,type,troops,level})=>({id,type,troops,level}))]))};
}
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function customBattleMarkup(draft){
  const teamMarkup=(key,label)=>`<section class="custom-team"><h3>${label}<small>${draft[key].length} / 6 队</small></h3>${draft[key].map((u,i)=>`<div class="custom-unit"><label>武将 ${i+1}<select data-custom-field="id" data-team="${key}" data-index="${i}" aria-label="${label}武将${i+1}">${OFFICER_CATALOG.map(o=>`<option value="${o.id}" ${o.id===u.id?'selected':''} ${['ownTeam','enemyTeam'].some(k=>draft[k].some((v,j)=>(k!==key||j!==i)&&v.id===o.id))?'disabled':''}>${esc(o.name)}${o.courtesy?' · '+esc(o.courtesy):''}</option>`).join('')}</select></label><label>兵种<select data-custom-field="type" data-team="${key}" data-index="${i}" aria-label="${label}兵种${i+1}">${Object.entries(TROOPS).map(([id,t])=>`<option value="${id}" ${id===u.type?'selected':''}>${t.name}</option>`).join('')}</select></label><label>等级<input type="number" min="1" max="10" value="${u.level}" data-custom-field="level" data-team="${key}" data-index="${i}" aria-label="${label}等级${i+1}"></label><label>兵力<input type="number" min="1" max="${troopCapacity({...OFFICER_BY_ID[u.id],level:u.level})}" value="${u.troops}" data-custom-field="troops" data-team="${key}" data-index="${i}" aria-label="${label}兵力${i+1}"><small>上限 ${troopCapacity({...OFFICER_BY_ID[u.id],level:u.level})}</small></label><button class="text-button" data-action="custom-remove" data-team="${key}" data-index="${i}" ${draft[key].length===1?'disabled':''} aria-label="移除${label}武将${i+1}">移除</button></div>`).join('')}<button class="button secondary" data-action="custom-add" data-team="${key}" ${draft[key].length===6?'disabled':''}>＋ 添加${label}武将</button></section>`;
  return `<section class="custom-battle" aria-label="自由对战配置"><div class="lobby-section-title"><h2>自由对战</h2><span>双方选将 · 自定兵种</span></div><p>双方各选 1～6 名武将，可自由组合不同阵营武将，同一武将仅可加入一方。首位为主将；军师优先补充主将尚未掌握的军略，数量相同时取智力较高者。双方均从均衡姿态开始，按兵种自动配置战法。</p><div class="custom-options"><label>战场地形<select data-custom-option="terrain" aria-label="自由对战地形">${Object.entries(BATTLE_TERRAINS).map(([id,name])=>`<option value="${id}" ${draft.terrain===id?'selected':''}>${name}</option>`).join('')}</select></label><label>随机种子<input type="number" min="0" max="4294967295" value="${draft.seed}" data-custom-option="seed" aria-label="自由对战种子"></label><small>舰船需选河流。相同配置、种子和操作可复现战局。</small></div><div class="custom-teams">${teamMarkup('ownTeam','我军')}${teamMarkup('enemyTeam','敌军')}</div><button class="button primary full" data-action="launch-custom">自由对战 · 前往布阵 →</button><small class="history-save-note">开始后替换当前战役进度；同局重试保留双方配置。</small></section>`;
}
