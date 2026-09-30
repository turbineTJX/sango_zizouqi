import {armyFrontlineCapacity} from './army-trait-rules.mjs';
import {validRetreatAt} from './battle-retreat.mjs';
import {chooseArmyAdvisor,makeOfficer} from './engine.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {TROOPS} from './unit-stats.mjs';
import {TACTICS} from './engine.mjs';
import {BATTLE_TERRAINS} from './battlefield.mjs';
import {troopCapacity} from './troop-capacity.mjs';

export function defaultCustomBattle(){
  return {battleKind:'field',gateHp:12000,terrain:'land',seed:521306,ownTeam:[{id:'cao',type:'spear',troops:3000,level:5}],enemyTeam:[{id:'shao',type:'spear',troops:3000,level:5}]};
}
export function validateCustomBattle(draft){
  if(!draft||!Object.hasOwn(BATTLE_TERRAINS,draft.terrain))throw new Error('请选择有效地形');
  if(!Number.isSafeInteger(draft.seed)||draft.seed<0||draft.seed>0xffffffff)throw new Error('种子须为 0～4294967295 的整数');
  if(!['field','defense','siege'].includes(draft.battleKind??'field'))throw new Error('请选择有效战役场景');
  if(draft.gateHp!==undefined&&(!Number.isInteger(draft.gateHp)||draft.gateHp<1||draft.gateHp>1000000))throw new Error('城门耐久须为1～1000000');
  const limit=draft.limit??480,shieldPercent=draft.shieldPercent??20,holdUntil=draft.holdUntil??0,waves=draft.waves??[];
  if(!Number.isInteger(limit)||limit<1||limit>2000)throw new Error('战斗时限须为1～2000日');
  if(!Number.isInteger(shieldPercent)||shieldPercent<0||shieldPercent>100)throw new Error('开场护盾须为0～100%');
  if(!Number.isInteger(holdUntil)||holdUntil<0||holdUntil>limit||holdUntil>0&&draft.battleKind!=='defense')throw new Error('坚守目标仅用于我军守城，且不能超过时限');
  if(!Array.isArray(waves)||waves.length>4||waves.some((w,i)=>!w||!Number.isInteger(w.count)||w.count<1||!Number.isInteger(w.tick)||w.tick<0||w.tick>=limit||i>0&&w.tick<waves[i-1].tick))throw new Error('援军批次、数量或到达时间无效');
  if(waves.reduce((n,w)=>n+w.count,0)>customReserveEntries(draft,'enemyTeam').length)throw new Error('援军批次只能分配敌军实际预备队');
  for(const key of ['ownTeam','enemyTeam']){
    const team=draft[key],name=key==='ownTeam'?'我军':'敌军';
    if(!Array.isArray(team)||team.length<1||team.length>10)throw new Error(`${name}须选 1～10 支部队`);
    if(new Set(team.map(u=>u.id)).size!==team.length)throw new Error(`${name}不能重复选择同一武将`);
    for(const u of team){
      if(!Object.hasOwn(OFFICER_BY_ID,u.id)||!Object.hasOwn(TROOPS,u.type))throw new Error(`${name}武将或兵种无效`);
      if(!Number.isInteger(u.level)||u.level<1||u.level>10)throw new Error('武将等级须为 1～10');
      const cap=troopCapacity({...OFFICER_BY_ID[u.id],level:u.level});
      if(!Number.isInteger(u.troops)||u.troops<1000||u.troops>cap)throw new Error(`${OFFICER_BY_ID[u.id].name}兵力须为 1000～${cap}`);
      if(u.formation!==undefined&&!['front','middle','back','left','right'].includes(u.formation))throw new Error('部队位置无效');
      if(u.retreatAt!==undefined&&!validRetreatAt(u.retreatAt))throw new Error('撤离设置无效');
      if(u.first!==undefined&&typeof u.first!=='boolean')throw new Error('首发设置无效');
      if(u.type==='ship'&&draft.terrain!=='river')throw new Error('配置舰船时，请选择河流地形');
    }
  }
  for(const key of ['ownTeam','enemyTeam']){const roles=draft[key+'Roles'];if(roles&&(!draft[key].some(u=>u.id===roles.leader)||!draft[key].some(u=>u.id===roles.advisor)))throw new Error('军团长和军师必须来自本方阵容');}
  for(const key of ['ownTeam','enemyTeam']){if(draft[key+'Tactic']!==undefined&&!Object.hasOwn(TACTICS,draft[key+'Tactic']))throw new Error('全军策略无效');const deputy=draft[key+'Roles']?.deputy;if(deputy!=null&&!draft[key].some(u=>u.id===deputy))throw new Error('副将必须来自本方阵容');if(draft[key].every(u=>u.first===false))throw new Error('至少需要一支首发部队');}
  const ids=[...draft.ownTeam,...draft.enemyTeam].map(u=>u.id);
  if(new Set(ids).size!==ids.length)throw new Error('同一武将不能同时加入双方，请更换重复武将');
  return {...Object.fromEntries(['ownTeam','enemyTeam'].filter(key=>draft[key+'Roles']).map(key=>[key+'Roles',{leader:draft[key+'Roles'].leader,advisor:draft[key+'Roles'].advisor,...(Object.hasOwn(draft[key+'Roles'],'deputy')?{deputy:draft[key+'Roles'].deputy}:{})}])),...Object.fromEntries(['ownTeam','enemyTeam'].filter(key=>draft[key+'Tactic']).map(key=>[key+'Tactic',draft[key+'Tactic']])),limit,shieldPercent,waves:waves.map(({count,tick})=>({count,tick})),...(holdUntil?{holdUntil}:{}),battleKind:draft.battleKind??'field',gateHp:draft.gateHp??12000,terrain:draft.terrain,seed:draft.seed,...Object.fromEntries(['ownTeam','enemyTeam'].map(key=>[key,draft[key].map(({id,type,troops,level,formation,first,retreatAt})=>({id,type,troops,level,...(retreatAt!==undefined?{retreatAt}:{}),...(formation!==undefined?{formation}:{}),...(first!==undefined?{first}:{})}))]))};
}
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function customFrontlineCapacity(draft,key){const id=draft[key+'Roles']?.leader??draft[key]?.[0]?.id;return armyFrontlineCapacity({leader:id});}
export function customReserveEntries(draft,key){const cap=customFrontlineCapacity(draft,key);return (draft[key]||[]).filter((u,i)=>!(u.first??i<cap));}
export function customRoles(draft,key){return draft[key+'Roles']??{leader:draft[key][0].id,advisor:chooseArmyAdvisor({leader:draft[key][0].id,units:draft[key].map(u=>({...makeOfficer(u.id,u.troops,0,Number.isInteger(u.level)&&u.level>=1&&u.level<=10?u.level:1),type:u.type}))})??null};}
export function customBattleMarkup(draft){
 let error='';try{validateCustomBattle(draft);}catch(e){error=e.message;}
 const team=(key,label)=>`<section class="custom-team"><h3>${label}军团<small>${draft[key].length} / 10 队 · ${draft[key].reduce((n,u)=>n+u.troops,0).toLocaleString()} 人</small></h3><p>${draft[key].map(u=>esc(OFFICER_BY_ID[u.id].name)).join('、')}</p><button class="button primary" data-action="scenario-setup-open" data-team="${key}">编制${label}军团</button></section>`;
 return `<section class="custom-battle custom-muster" aria-label="自由对战配置"><div class="lobby-section-title"><h2>自定义战役</h2></div><div class="custom-options"><label>战役场景<select data-custom-option="battleKind">${[['field','野战'],['defense','我军守城'],['siege','我军攻城']].map(([id,name])=>`<option value="${id}" ${(draft.battleKind||'field')===id?'selected':''}>${name}</option>`).join('')}</select></label>${draft.battleKind&&draft.battleKind!=='field'?`<label>城门耐久<input type="number" min="1" max="1000000" data-custom-option="gateHp" value="${draft.gateHp??12000}"></label>`:''}<label>战场地形<select data-custom-option="terrain">${Object.entries(BATTLE_TERRAINS).map(([id,name])=>`<option value="${id}" ${id===draft.terrain?'selected':''}>${name}</option>`).join('')}</select></label><label>随机种子<input type="number" min="0" max="4294967295" value="${draft.seed}" data-custom-option="seed"></label><label>战斗时限（日）<input type="number" min="1" max="2000" data-custom-option="limit" value="${draft.limit??480}"></label><label>守军首发护盾（%）<input type="number" min="0" max="100" data-custom-option="shieldPercent" value="${draft.shieldPercent??20}"></label>${draft.battleKind==='defense'?`<label>坚守获胜日（0为不设置）<input type="number" min="0" max="${draft.limit??480}" data-custom-option="holdUntil" value="${draft.holdUntil??0}"></label>`:''}<button class="button secondary" data-action="custom-swap">交换双方</button></div><div class="custom-teams">${team('ownTeam','我军')}${team('enemyTeam','敌军')}</div><section class="custom-options" aria-label="敌军援军批次"><h3>敌军预备队到达时间</h3><p>批次按敌军实际预备队名单依次分配；未分配的预备队开局待命，均须等空位才能上场。</p>${(draft.waves||[]).map((w,i)=>`<label>第 ${i+1} 批队数<input type="number" min="1" max="4" data-custom-wave="count" data-index="${i}" value="${w.count}"></label><label>到达日<input type="number" min="0" max="${(draft.limit??480)-1}" data-custom-wave="tick" data-index="${i}" value="${w.tick}"></label><button class="button secondary" data-action="custom-wave-remove" data-index="${i}">移除第 ${i+1} 批</button>`).join('')}<button class="button secondary" data-action="custom-wave-add" ${(draft.waves||[]).length>=4?'disabled':''}>增加援军批次</button></section><div class="custom-launch"><p role="status">${error?esc(error):'双方军团已就绪'}</p><button class="button primary full" data-action="launch-custom" ${error?'disabled':''}>核阅双方 · 前往布阵</button></div></section>`;
}
