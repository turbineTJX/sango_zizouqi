// Build a standalone exploratory report from preserved real simulations.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';

const root=resolve(process.argv[2]||'work/counterattack-experience');
const phases=['development','validation','transfer','ablation'];
const summaries=phases.map(p=>JSON.parse(readFileSync(join(root,p,'summary.json'))));
const rows=phases.flatMap(p=>readFileSync(join(root,p,'runs.jsonl'),'utf8').trim().split('\n').map(JSON.parse));
assert.equal(new Set(summaries.map(s=>s.sourceHash)).size,1);
assert.equal(new Set(summaries.map(s=>s.harnessHash)).size,1);
assert.ok(rows.every(r=>r.deterministic));
const hash=x=>createHash('sha256').update(x).digest('hex');
let identicalStartGroups=0;
for(const r of rows.filter(r=>r.phase==='validation'&&r.profile==='formation')){
 const peers=rows.filter(p=>p.phase===r.phase&&p.recipe===r.recipe&&p.enemy===r.enemy&&p.seed===r.seed&&p.side===r.side&&p.mapId===r.mapId&&['formation','timed','late','no-command'].includes(p.profile));
 assert.equal(peers.length,4);
 assert.equal(new Set(peers.map(p=>hash(readFileSync(join(root,p.phase,'battles',p.id+'-start.json'))))).size,1,'Timing comparisons must start from exactly the same state');
 identicalStartGroups++;
}
for(const r of rows){
 const end=JSON.parse(readFileSync(join(root,r.phase,'battles',r.id+'-end.json'))),last=r.trajectory.at(-1);
 assert.equal(last.sides[0].casts,end.battle.sides[r.side].units.reduce((n,u)=>n+Object.values(u.tacticCasts).reduce((a,b)=>a+b,0),0));
 assert.equal(last.sides[0].hp,r.remaining);
 if(r.firstCoreSpecial)assert.ok(last.core.specialCasts>0);
}
const names={guan:'关羽＋普通辅助',zhou:'周瑜＋普通辅助',reserve:'关羽、黄忠分批接战',stars:'六名将',yuan:'袁绍混合队',default:'默认布阵',formation:'完整成阵＋固定军略',timed:'完整成阵＋承压保护',late:'完整成阵＋较晚保护',incomplete:'缺一阵位','no-command':'完整成阵＋不用军略','core-first':'主核首发',wait:'主核后备／等空位',rotate:'前锋预设1000兵撤离',reverse:'预设撤离／反转后备',development:'开发样本',validation:'独立验证',transfer:'换地图验证',ablation:'护盾机制消融'};
const colors={default:'#dc6b50',formation:'#187c94',timed:'#9b6ac4',late:'#c78c24',incomplete:'#8f6243','no-command':'#718181','core-first':'#187c94',wait:'#dc6b50',rotate:'#9b6ac4',reverse:'#c78c24'};
const fmt=n=>n===null||n===undefined?'—':Math.round(n).toLocaleString('zh-CN');
const pct=n=>n===null||n===undefined?'—':(n*100).toFixed(1)+'%';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mean=(rs,f)=>{const vs=rs.map(f).filter(Number.isFinite);return vs.length?vs.reduce((a,b)=>a+b,0)/vs.length:null;};
const subset=(phase,recipe,enemy,profile)=>rows.filter(r=>r.phase===phase&&r.recipe===recipe&&r.enemy===enemy&&r.profile===profile);
const pairStats=[];
for(const recipe of ['guan','zhou'])for(const enemy of ['stars','yuan']){
 const baseline=subset('validation',recipe,enemy,'formation');
 for(const p of ['timed','late','no-command']){
  const ps=subset('validation',recipe,enemy,p),pairs=baseline.map(r=>[r,ps.find(x=>x.seed===r.seed&&x.side===r.side)]);
  pairStats.push({recipe,enemy,profile:p,n:pairs.length,better:pairs.filter(([a,b])=>b.gap>a.gap).length,worse:pairs.filter(([a,b])=>b.gap<a.gap).length,tied:pairs.filter(([a,b])=>b.gap===a.gap).length,winGains:pairs.filter(([a,b])=>!a.win&&b.win).length,winLosses:pairs.filter(([a,b])=>a.win&&!b.win).length,meanGapDelta:mean(pairs,([a,b])=>b.gap-a.gap)});
 }
}
const main=rows.filter(r=>r.phase==='validation'),full=main.filter(r=>['guan','zhou'].includes(r.recipe)&&r.profile==='formation');
const reserve=main.filter(r=>r.recipe==='reserve'),reserveLate=reserve.filter(r=>r.profile!=='core-first');
const coreEntries=reserveLate.flatMap(r=>r.events.filter(e=>e.kind==='status'&&e.side===0&&e.from==='reserve'&&e.to==='active').map(e=>{const t=r.trajectory.find(t=>t.tick===e.tick);return {game:r.id,name:e.name,tick:e.tick,gap:t.sides[0].fighting-t.sides[1].fighting,active:t.sides[0].active};}));
const allStats={rules:summaries[0].rulesVersion,sourceHash:summaries[0].sourceHash,harnessHash:summaries[0].harnessHash,total:rows.length,byPhase:Object.fromEntries(summaries.map(s=>[s.phase,s.games])),identicalStartGroups,formationWins:full.filter(r=>r.win).length,formationGames:full.length,formationComebacks:full.filter(r=>r.comeback).length,formationSpecialMissingWins:full.filter(r=>r.win&&!r.firstCoreSpecial).length,reserveWins:reserve.filter(r=>r.win).length,reserveGames:reserve.length,reserveLateWins:reserveLate.filter(r=>r.win).length,reserveLateGames:reserveLate.length,meanReserveEntryGap:mean(coreEntries,x=>x.gap),meanReserveEntryActive:mean(coreEntries,x=>x.active),pairStats};
writeFileSync(join(root,'analysis.json'),JSON.stringify(allStats,null,2));

function chart(recipe,yTop){
 const profiles=recipe==='reserve'?['core-first','wait','rotate','reverse']:['default','formation','timed','no-command'];
 const rs=profiles.map(p=>main.find(r=>r.recipe===recipe&&r.enemy==='stars'&&r.side===0&&r.seed===summaries[1].seeds[0]&&r.profile===p));
 const x0=88,x1=1090,y0=yTop+76,y1=yTop+277,maxTick=Math.max(...rs.map(r=>r.ticks)),limit=18000;
 const xp=t=>x0+t/maxTick*(x1-x0),yp=v=>y1-(v+limit)/(limit*2)*(y1-y0);
 let s=`<text x="38" y="${yTop+25}" class="title">${names[recipe]} · 六名将对手</text>`;
 profiles.forEach((p,i)=>{const x=40+i*285;s+=`<line x1="${x}" y1="${yTop+49}" x2="${x+21}" y2="${yTop+49}" stroke="${colors[p]}" stroke-width="3"/><text x="${x+28}" y="${yTop+54}" class="label">${names[p]}</text>`;});
 for(const v of [-18000,-9000,0,9000,18000])s+=`<line x1="${x0}" y1="${yp(v)}" x2="${x1}" y2="${yp(v)}" stroke="${v===0?'#7d9196':'#dce5e5'}"/><text x="${x0-12}" y="${yp(v)+5}" text-anchor="end" class="label">${v/1000}千</text>`;
 for(let k=0;k<=5;k++){const tick=maxTick*k/5;s+=`<text x="${xp(tick)}" y="${y1+24}" text-anchor="middle" class="label">${(tick/24).toFixed(1)}</text>`;}
 for(const r of rs){const path=r.trajectory.map((p,i)=>(i?'L':'M')+xp(p.tick).toFixed(1)+','+yp(p.sides[0].fighting-p.sides[1].fighting).toFixed(1)).join(' ');s+=`<path d="${path}" fill="none" stroke="${colors[r.profile]}" stroke-width="2.5" opacity=".95"/>`;}
 s+=`<text x="${x1}" y="${y1+44}" text-anchor="end" class="label">交战天数（24模拟步／天）</text>`;
 return s;
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="1160" viewBox="0 0 1160 1160"><style>text{font-family:'Microsoft YaHei','Arial',sans-serif;fill:#17383d}.title{font-size:22px;font-weight:bold}.label{font-size:14px}.sub{font-size:16px;fill:#526b70}</style><rect width="1160" height="1160" fill="#f8fbfa"/><text x="38" y="42" font-size="29" font-weight="bold">承压反攻 · 实际战斗进程</text><text x="38" y="72" class="sub">首个独立验证种子 ${summaries[1].seeds[0]}，左侧出生；纵轴为双方仍可参战兵力差，含后备。</text><text x="38" y="99" class="sub">正值表示本方兵力更多，不能直接视为战力或胜率。重合曲线表示过程相同。</text>${chart('guan',128)}${chart('zhou',465)}${chart('reserve',802)}</svg>`;
writeFileSync(join(root,'battle-curves.svg'),svg);

const groupTable=phase=>`<div class="scroll"><table><thead><tr><th>阵容／对手</th><th>安排</th><th>胜局</th><th>兵力落后后获胜</th><th>主核专属发动局</th><th>发动时主核余兵</th><th>平均最终余兵</th><th>平均尾段</th></tr></thead><tbody>${summaries.find(s=>s.phase===phase).groups.map(g=>`<tr><td>${names[g.recipe]}<small>${names[g.enemy]}</small></td><td>${names[g.profile]}</td><td>${g.wins}/${g.n}</td><td>${g.comebacks}/${g.n}</td><td>${g.specialGames}/${g.n}</td><td>${pct(g.meanSpecialHp)}</td><td>${fmt(g.meanRemaining)}</td><td>${(g.meanTail/24).toFixed(2)}天</td></tr>`).join('')}</tbody></table></div>`;
const starFull=full.filter(r=>r.enemy==='stars'),starNo=main.filter(r=>r.enemy==='stars'&&['guan','zhou'].includes(r.recipe)&&r.profile==='no-command');
const timed=pairStats.filter(p=>p.enemy==='stars'&&p.profile==='timed');
const ablation=rows.filter(r=>r.phase==='ablation'&&r.enemy==='stars'&&r.profile==='formation');
const zhouAblationFixed=subset('ablation','zhou','stars','formation'),zhouAblationTimed=subset('ablation','zhou','stars','timed');
const firstLossWins=full.filter(r=>r.win&&r.firstDefeat?.side===0).length;
const allRows=rows.map(r=>`<tr data-phase="${r.phase}"><td>${names[r.phase]}</td><td>${names[r.recipe]}<small>${names[r.enemy]} · ${r.mapId}</small></td><td>${names[r.profile]}</td><td>${r.seed}<small>${r.side===0?'左侧':'右侧'}出生</small></td><td>${r.win?'胜':r.draw?'平':'败'}</td><td>${fmt(r.remaining)}</td><td>${r.firstCoreSpecial?pct(r.firstCoreSpecial.hpRatio):'未发动'}</td><td><a href="${r.phase}/battles/${r.id}-start.json" download>开局</a> · <a href="${r.phase}/battles/${r.id}-end.json" download>结局</a></td></tr>`).join('');
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>承压反攻体验试验 · 规则133</title><style>
*{box-sizing:border-box}body{margin:0;background:#eef3f1;color:#17383d;font-family:'Microsoft YaHei',system-ui,sans-serif;line-height:1.65}.wrap{max-width:1200px;margin:auto;padding:36px 24px 70px}h1{font-size:34px;line-height:1.3;margin:8px 0 16px}h2{font-size:23px;margin:28px 0 12px}.eyebrow{font-size:13px;letter-spacing:2px;color:#41766c}.lead{font-size:19px;max-width:1000px}.muted,small{color:#61766e}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0}.card,section{background:#fff;border:1px solid #dce5df;border-radius:12px;padding:24px;margin-bottom:20px}.card{margin:0}.big{font-size:30px;font-weight:700;color:#196c67}.card p{margin:8px 0}a{color:#136f85}small{display:block;font-size:12px}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px;white-space:nowrap}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #e5ece8}th{background:#edf3ee}tbody tr:hover{background:#f3f8f5}summary{cursor:pointer;font-weight:bold;padding:10px 0}img{max-width:100%;height:auto}.note{border-left:4px solid #bd8946;padding:10px 18px;background:#faf6ee}.pill{display:inline-block;padding:3px 9px;background:#e4f0e8;border-radius:20px;margin-right:6px;font-size:13px}.facts li{margin:10px 0}select{padding:7px 12px;margin:10px;border:1px solid #b9cdc4;border-radius:7px}code{font-size:12px;overflow-wrap:anywhere}@media(max-width:750px){.cards{grid-template-columns:1fr}.wrap{padding:22px 14px}h1{font-size:27px}.card,section{padding:17px}}
</style><div class="wrap"><div class="eyebrow">SANGO · 局部体验试验 · 2026-10-28</div><h1>成阵变强已经成立，承压反攻仍需验证</h1><p class="lead">使用冻结规则133，实际运行 ${rows.length} 局。主核、辅助、护盾、军略和后备均走现有公共处理器；本轮没有修改游戏规则。所有结果和存档均保留。</p><span class="pill">独立验证 ${summaries[1].games} 局</span><span class="pill">换地图 ${summaries[2].games} 局</span><span class="pill">机制消融 ${summaries[3].games} 局</span><span class="pill">确定性续战 ${rows.length}/${rows.length}</span>
<div class="cards"><div class="card"><div class="big">${starFull.filter(r=>r.win).length}/${starFull.length}</div><p>对六名将，完整成阵＋固定军略胜局</p><small>同站位移除成阵护盾：${ablation.filter(r=>r.win).length}/${ablation.length}。消融仅用于机制诊断。</small></div><div class="card"><div class="big">${starFull.filter(r=>r.comeback).length}/${starFull.length}</div><p>兵力明显落后后仍获胜</p><small>描述口径：可参战兵力曾落后至少1800。并非战力判断或游戏验收要求。</small></div><div class="card"><div class="big">${allStats.reserveLateWins}/${allStats.reserveLateGames}</div><p>本轮主核后备安排胜局</p><small>相同名单也测试主核首发；没有据此推断所有后备阵容均不可行。</small></div></div>
<section><h2>这轮真正回答了什么</h2><ul class="facts"><li>对六名将，完整成阵后即使不用军略也有 ${starNo.filter(r=>r.win).length}/${starNo.length} 胜局。需要区分开局护盾优势与战中时机收益。</li><li>承压保护相对同开局固定军略：${timed.reduce((n,p)=>n+p.better,0)} 局余兵差改善，${timed.reduce((n,p)=>n+p.worse,0)} 局变差，${timed.reduce((n,p)=>n+p.tied,0)} 局相同；额外取胜 ${timed.reduce((n,p)=>n+p.winGains,0)} 局。由于基线已全胜，不能据此推断军略普遍无用。</li><li>只移除成阵护盾的周瑜机制消融中，固定军略 ${zhouAblationFixed.filter(r=>r.win).length}/${zhouAblationFixed.length} 胜，承压保护 ${zhouAblationTimed.filter(r=>r.win).length}/${zhouAblationTimed.length} 胜；但后者平均收尾更长。时机有潜力，仍需要合适的压力和兑现窗口，不能直接推出应删除护盾。</li><li>全部完整成阵＋固定军略样本中，有 ${allStats.formationSpecialMissingWins} 个胜局在主核专属未发动时结束。名将的普攻、其他战法和军略仍有贡献；本指标只说明专属兑现与胜率需要分开评价。</li><li>${firstLossWins}/${full.length} 个完整成阵胜局先损失了己方一队。因此，“先减员就无法翻盘”这一宽泛假设不成立，损失的是谁、多少兵力以及还剩什么能力更重要。</li><li>主核后备的实际入场记录中，己方平均可参战兵力差为 ${fmt(allStats.meanReserveEntryGap)}。后备保有完整兵力，并不代表仍有完整支援环境。</li></ul><p class="note">自动对照验证机制、过程与取舍，无法代替玩家对“好玩”的主观判断。这里的种子、阵容、1800兵描述线和样本数均不升级为全游戏或发行门槛。</p></section>
<section><h2>观看实际曲线</h2><p class="muted">固定展示首个独立验证种子、左侧出生。全部换边与失败样本见下方表格。纵轴包含真实未入场后备，排除已撤离与正在撤离者；军略和事件改变后的曲线来自真实续行。</p><img src="battle-curves.svg" alt="三组阵容在不同安排下的实际兵力差曲线"></section>
<section><h2>独立验证</h2>${groupTable('validation')}</section><section><h2>换到双丘夹道</h2><p>保持名单、兵种、兵力及策略定义。只换地图，同时交换出生侧。</p>${groupTable('transfer')}</section><section><h2>同站位护盾消融</h2><p>仅在离线诊断中，移除本方开场成阵护盾，其他阵位属性、人员、AI和能力保留。此操作不是玩家选项。</p>${groupTable('ablation')}</section>
<section><h2>实验边界与复现</h2><p>双方各18000实际士兵、10级、真实固定战法。相同名单内保持兵种、兵力、任命及敌方算法；不同名单训练费单列，不声称双方完整经济预算相同。保护策略只读取当前可见敌军位置、己方伤兵／护盾和实际军略资格，不读取未来随机数。军略由玩家侧在模拟步之间合法施放。后备必须实际走完撤离交接并取得空位。</p><p>成阵、承压保护、晚保护、不使用军略共有 ${identicalStartGroups} 组四方案，开局存档逐字节相同；每局施放统计还与结局真实账本复核。${rows.length} 局全部检查当前存档和确定性续战。开发样本 ${summaries[0].games} 局单列；独立种子固定为 ${summaries[1].seeds.join('、')}。早期 dev-01 仅为仪器调试，其专属次数统计有误，未纳入以上数据。</p><p>源码 SHA：<code>${allStats.sourceHash}</code><br>实验脚本 SHA：<code>${allStats.harnessHash}</code></p><p><a href="analysis.json">汇总分析 JSON</a> · <a href="validation/summary.json">独立验证汇总</a> · <a href="validation/runs.jsonl">完整逐步记录</a> · <a href="frozen-133/manifest.json">冻结源码清单</a></p></section>
<section><details><summary>全部 ${rows.length} 局记录与可导入存档</summary><label>筛选<select id="phase"><option value="">全部</option>${phases.map(p=>`<option value="${p}">${names[p]}</option>`).join('')}</select></label><div class="scroll"><table id="runs"><thead><tr><th>阶段</th><th>阵容／对手</th><th>安排</th><th>种子／出生侧</th><th>胜负</th><th>己方余兵</th><th>专属时余兵</th><th>存档</th></tr></thead><tbody>${allRows}</tbody></table></div></details></section><p class="muted">测试脚本：scripts/audit-counterattack-experience.mjs · 报告脚本：scripts/report-counterattack-experience.mjs。没有提交、推送或更改游戏规则。</p></div><script>document.getElementById('phase').addEventListener('change',e=>{for(const r of document.querySelectorAll('#runs tbody tr'))r.hidden=Boolean(e.target.value&&r.dataset.phase!==e.target.value)});</script></html>`;
writeFileSync(join(root,'report.html'),html);
console.log(JSON.stringify(allStats));
