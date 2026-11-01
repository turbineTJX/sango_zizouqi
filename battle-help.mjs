import {icon} from './ui-icons.mjs';
import {STATUS_DISPLAY,statusIcon} from './status-display.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const BATTLE_HELP_TOPICS={basics:'入门',controls:'操作',tactics:'用兵',statuses:'状态'};
const row=(symbol,name,operation,effect)=>`<div class="battle-help-row"><span class="battle-help-symbol" aria-hidden="true">${symbol}</span><div><h3>${esc(name)}</h3><p>${esc(operation)}</p>${effect?`<small>${esc(effect)}</small>`:''}</div></div>`;
const control=(symbol,...args)=>row(icon(symbol),...args);
export function battleHelpMarkup(topic='basics',{deploying=false,guided=false}={}){
 if(!Object.hasOwn(BATTLE_HELP_TOPICS,topic))topic='basics';
 const pages={
  basics:()=>`<p class="info-strip">你负责布阵与军略时机。部队会自动移动、普攻和施放战法。</p><ol class="battle-help-steps">
   <li><h3>布阵</h3><p>点模型或头像查看部队。战前拖到空格调整站位，拖到友军交换；松手后确认，才会换位。</p></li>
   <li><h3>后备</h3><p>战前从底部后备席拖队上阵，也可把首发拖回空席位。左右滑动查看后备，拖动调整出场顺序；“待援”部队须等抵达。</p></li>
   <li><h3>开战</h3><p>点“开战”后不能再调整站位和意图。点暂停或按空格停下观察，点倍率切换速度。查看部队也会暂停。</p></li>
   <li><h3>军略</h3><p>底部军略条蓄满后，选择军略。范围军略先选落点、查看覆盖，再确认；全军军略点选即施放。取消不消耗进度。</p></li>
   <li><h3>战况</h3><p>点部队看伤兵、护盾、状态和战法次数；点卷轴看战斗日志。关闭详情后仍暂停，点“继续战斗”恢复。</p></li>
  </ol>${guided?'':'<button class="button secondary" data-action="battle-help-tour">跟随指引</button>'}<p class="muted">${deploying?'准备好后，点“开战”。':'部队正在自动作战。'}</p>`,
  controls:()=>[
   control('play','开战与继续','点底部三角按钮开始战斗或继续。','开战前请检查首发和站位。'),
   control('pause','暂停','点暂停或按空格，停下查看战况、考虑军略。','暂停时，状态剩余回合也停止减少。'),
   row('<b>1×</b>','战斗速度','点倍率按钮切换速度。',''),
   row('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M11 4 5 9H2v6h3l6 5Z"/><path d="m16 9 6 6m0-6-6 6"/></svg>','声音','点喇叭开关声音，带叉表示静音。','音量和语音可在设置中调整。'),
   control('people','军议','点左下人像按钮打开军议。','战前可调整任命、意图和撤离条件；援军军议不能改动意图或在场站位。'),
   control('flag','军略','点底部军略条打开列表。','军团长和军师提供军略；满条后仍要满足冷却、次数和目标条件。'),
   control('info','战况','点信息按钮查看双方兵力和援军。','兵力分为在场、后备和待援。'),
   control('scroll','战斗日志','点卷轴查看和筛选战斗记录。','可查施放者、命中目标、伤害、护盾和免疫。'),
   control('bond','羁绊','点左侧链结按钮展开或收起，点“我军 / 敌军”切换。','点单个图标查看效果和贡献部队。开场亮起表示激活，战中亮起表示触发。'),
   row('<b>头像</b>','部队','点模型或头像查看详情；战前可拖动我军布阵。','上条是兵力：实色为现役、浅金为伤兵、深色为不可恢复损失。下条是战意。'),
   row('<b>阵位</b>','阵位与范围','战前查看阵法标记，战中查看战法覆盖格。','虎翼、龙飞须在开场占位；战法蓄势后锁定范围，目标移出可能落空。'),
   control('check','确认与取消','调整站位后，点勾号确认；点叉号或按 Esc 取消。','范围军略也须确认；矩形范围可旋转。'),
   control('reset','重置阵型','军议内的回转箭头恢复默认阵型。','仅战前可用；不恢复兵力、军略进度或战法次数。'),
   control('sword','战法','点军议中的双剑查看战法。','战法自动施放，按兵种和武将固定携带。'),
   control('flag','军团','点军议中的旗帜查看军团。',''),
   row('<b>地形</b>','地形','底部图例列出本图地形。','树林、坡地、水域等会影响部队行动和属性，详情中可查看所在格。'),
   control('gear','工具','点右上齿轮打开军团情报、特效和设置。','要全军撤退，请到军略列表中下令；部队仍须走到出口。'),
   control('home','返回首页','点右上房屋保存进度，返回首页。',''),
   control('help','指引','点右上问号查看战场指引，按 F1 查看当前页面的分步指引。','点关闭或按 Esc 返回。')
  ].join(''),
  tactics:()=>`<dl class="battle-help-advice">
   <div><dt>前排顶住，后排输出</dt><dd>把能承伤的近战放前面，弓弩留出距离并保护侧翼。远程有最小射程，被贴近后会影响发挥；也要给友军留出通行空间。</dd></div>
   <div><dt>让战法覆盖到人</dt><dd>先点战法读目标、范围与门槛。贯阵、横扫等按蓄势时的覆盖格命中，合理初始站位能改善覆盖；开战后部队自行选敌行动。</dd></div>
   <div><dt>组合与阵位一起安排</dt><dd>点羁绊图标看点数、档位和贡献部队。后备不计在场羁绊；虎翼、龙飞须在开场占对应阵位，后到者不会补领。</dd></div>
   <div><dt>治疗看伤兵，护盾看时机</dt><dd>浅金段是可救治的伤兵，深色损失不能治回。护盾适合在承伤前施放；点部队查看剩余盾量和期限。</dd></div>
   <div><dt>驱散看异常，攻击看覆盖</dt><dd>先看减益的说明，核对军略能解除哪类异常。范围攻击或支援先预览覆盖，尽量覆盖更多有效目标；全军军略点选即生效，先读效果再选。</dd></div>
   <div><dt>战意、次数与军略分开看</dt><dd>战意足够时，也可能因缺少目标、冷却、调息或次数用尽而无法出招。点战法查看原因；军略另有进度条。</dd></div>
   <div><dt>保住要紧的部队</dt><dd>战前在军议中设置撤离兵力。达到条件后仍须走到出口，途中会受击。溃败会降低在场友军战意，后备要等空位补入。</dd></div>
  </dl>`,
  statuses:()=>`<p class="info-strip">点部队，在“状态”中查看效果、来源和剩余时间。</p>
   <ol class="battle-help-steps"><li><h3>效果与来源</h3><p>同样的图标可能代表不同效果，请看状态名称和说明。来源列出施加者或能力；缺粮等状态另有解除条件。</p></li><li><h3>回合与次数</h3><p>“剩余 N 战斗回合”随战斗推进减少，暂停时不变。强化普攻看剩余次数；护盾可能在到期前被打破。</p></li><li><h3>属性变化</h3><p>展开“属性变化”，比较有无此状态时的属性。常驻特性、羁绊和其他属性在“详细情报”中。</p></li></ol>
   <details class="profile-disclosure"><summary>状态图例</summary><p class="muted">图例列出基础效果；部队身上的数值和期限请看详情。</p>${Object.entries(STATUS_DISPLAY).map(([key,s])=>row(statusIcon(key),s.name,s.description,'')).join('')}</details>`
 };
 return `<div class="battle-help">${guided?`<p class="info-strip">${topic==='basics'||topic==='controls'?'先熟悉布阵和操作，开战后再介绍用兵与状态。':'接着介绍用兵与状态。'} 点关闭或按 Esc 可跳过剩余指引。</p>`:`<nav class="directory-tabs" aria-label="战场指引主题">${Object.entries(BATTLE_HELP_TOPICS).map(([key,name])=>`<button class="button secondary" data-action="battle-help-topic" data-topic="${key}" aria-pressed="${key===topic}">${name}</button>`).join('')}</nav>`}<section class="battle-help-content" aria-label="${BATTLE_HELP_TOPICS[topic]}">${pages[topic]()}</section></div>`;
}
