import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const dir=resolve(process.argv[2]||'outputs/historical-synergy-20261011');
const read=p=>JSON.parse(readFileSync(join(dir,p),'utf8'));
const before=read('before-validated/summary.json'),after=read('after-validated/summary.json');
assert.deepEqual(before.seeds,after.seeds);assert.equal(before.rows.length,after.rows.length);
const beforeManifest=JSON.parse(readFileSync(resolve('work/historical-synergy-r123-20261011/manifest.json'),'utf8'));
const afterManifest=JSON.parse(readFileSync(resolve('work/historical-synergy-final2-r124-20261011/manifest.json'),'utf8'));
const rows=after.rows.map(r=>{
 const old=before.rows.find(x=>x.name===r.name),cell=(r,bits)=>r.cells.find(x=>x.bits===bits),a=cell(r,'11'),b=cell(old,'11');
 return {name:r.name,chain:r.chain,beforeMarginPP:b.marginPP,afterMarginPP:a.marginPP,changePP:Math.round((a.marginPP-b.marginPP)*100)/100,beforeWins:b.wins,afterWins:a.wins,games:a.games,interactionPP:r.interactionPP,interactionChangePP:Math.round((r.interactionPP-old.interactionPP)*100)/100,cells:r.cells,losses:r.losses,draws:r.draws,replays:r.replays};
});
const checkLogs=['historical-synergy-mechanism-final2-tests.log','historical-synergy-bond-tests.log','historical-synergy-ai-latest-tests.log'].map(file=>({file,tail:readFileSync(resolve('work',file),'utf8').slice(-700)}));
const continuation=read('all-ai-final/campaign-audit.json');
const report={rulesVersion:after.rulesVersion,seeds:after.seeds,battles:before.battles+after.battles,replays:[before,after].flatMap(r=>r.rows).reduce((n,r)=>n+r.replays,0),beforeManifest,afterManifest,rows,method:after.method,checkLogs,naturalAllAI:continuation.metrics};
writeFileSync(join(dir,'comparison.json'),JSON.stringify(report,null,2));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const num=n=>(n>0?'+':'')+n.toFixed(2);
const body=rows.map(r=>`<tr><td><strong>${esc(r.name)}</strong><small>${esc(r.chain)}</small></td><td>${r.beforeMarginPP.toFixed(2)} → ${r.afterMarginPP.toFixed(2)}<small>变动 ${num(r.changePP)} 点</small></td><td>${r.beforeWins}/${r.games} → ${r.afterWins}/${r.games}</td><td>${num(r.interactionPP)}<small>前后变化 ${num(r.interactionChangePP)} 点</small></td></tr>`).join('');
const matrices=rows.map(r=>`<details><summary>${esc(r.name)}：四组当前合法名单</summary><div class="matrix">${r.cells.map(c=>`<p><b>${({'00':'两个普通参照','10':'仅A名将','01':'仅B搭档','11':'A+B协作组合'})[c.bits]}</b><br>胜 ${c.wins}/${c.games}，军力差 ${c.marginPP.toFixed(2)} 点</p>`).join('')}</div></details>`).join('');
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>名将历史协作 · 规则124</title><style>
*{box-sizing:border-box}body{font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif;color:#24343f;background:#f4f6f5;margin:0}main{max-width:1080px;padding:32px 24px;margin:auto}h1{font-size:30px;margin:0}h2{font-size:20px;margin-top:32px}.sub,small{color:#52646e}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}.card{background:white;border:1px solid #dbe3df;border-radius:12px;padding:18px}.card b{display:block;font-size:26px;color:#1b6657}table{width:100%;border-collapse:collapse;background:white;font-size:15px}td,th{padding:14px 12px;border-bottom:1px solid #e2e8e5;text-align:left;vertical-align:top}th{background:#e5eeea}td:first-child{width:42%}small{display:block;font-size:13px}p{margin:12px 0}a{color:#176754}details{padding:12px 16px;background:white;border:1px solid #dbe3df;margin:10px 0;border-radius:10px}summary{cursor:pointer}.matrix{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.note{padding:16px;border-left:4px solid #438b74;background:#eaf2ee}code{overflow-wrap:anywhere;font-size:12px}@media(max-width:600px){main{padding:20px 12px}h1{font-size:24px}.metrics{gap:6px}.card{padding:12px}.card b{font-size:22px}table{font-size:12px}td,th{padding:9px 5px}td:first-child{width:37%}small{font-size:11px}.matrix{grid-template-columns:repeat(2,1fr)}}
</style><main><p class="sub">三国 · 战斗协作验证 · 当前规则124</p><h1>让历史搭档的能力接得上</h1><p>以吕布、貂蝉的削战意与勇武配合为参照，增强制造条件、利用条件、协助启动和伤害传导。通过公共机制结算，其他合法人物也能接续；AI策略继续忽略羁绊。</p>
<div class="metrics"><div class="card"><b>${report.battles}</b>最终前后完整战斗</div><div class="card"><b>${report.replays}</b>完整读档续战对照</div><div class="card"><b>6组</b>班底与原设计参照</div></div>
<h2>实际接续效果</h2><ul><li>张飞65战意、基础混乱6回合，关羽可利用已有混乱追击。</li><li>司马懿追加破甲5回合，保持原有疲弱和战意压制，供张郃等队友进攻。</li><li>孙策鼓舞本军团两队在场友军，各增加基础20战意，优先补足可用战法门槛；骑兵突进后仍能支援后排。</li><li>庞统50战意启动、连环12回合，后续伤害35%的总额向同组敌军传导；不需火源，传导不递归。</li><li>陆逊利用施放前已有灼烧，增加0.65伤害倍率；自己新施加的灼烧不触发。</li></ul>
<h2>普通AI布阵下的完整战斗</h2><p class="note">军力差＝（本方剩余兵力−敌方剩余兵力）÷18000×100。下表是整组班底的结果，并非某项技能的纯增益或通用强度排名。强队已经全胜时，胜率无法继续增长。负交互量也不能单独证明机制互斥；普通AI布阵未必充分发挥玩家设计的配合。</p>
<table><thead><tr><th>班底与衔接</th><th>军力差 / 百分点</th><th>胜局 / 8局</th><th>当前整套交互量</th></tr></thead><tbody>${body}</tbody></table>
<p>交互量＝A+B−仅A−仅B＋普通参照，包含基础属性、羁绊档位、任命和胜负饱和的非线性变化。它只适用于此阵容与对手。吕布、貂蝉保持用户原设计，普通AI对照收益不足，不能据此声称该组合在所有阵型下都强。</p>${matrices}
<h2>验证范围</h2><p>四组名单全部合法，10级、18000兵力、同兵种和训练费用，双方使用同一军议与战斗AI。开发种子41100101；最终验证种子${after.seeds.join('、')}。记录所有失败和完整存档，不注入战法、资源或战果。单一平原对手不覆盖水战、全部地形或长期内政。</p>
<p>机制与相关引擎回归119项通过；羁绊回归123项通过；AI决策回归391项、21类通过。设计表、生成文档与语法检查通过。最终源码上的全国AI从真实第${continuation.metrics.startDay}天存档继续${continuation.metrics.requestedDays}天，实际结束于第${continuation.metrics.completedDay}天，确定性检查${continuation.metrics.deterministicCheckpoints}次，实际已结算战斗${continuation.metrics.settledBattles}场；未出现的战斗不作为战斗平衡证据。</p>
<p><a href="comparison.json">汇总数据与来源哈希</a> · <a href="after-validated/summary.json">当前四组对照</a> · <a href="before-validated/summary.json">变更前对照</a></p><small>最终源码 SHA-256：<code>${afterManifest.sourceHash}</code></small>
<h2>合作班底依据</h2><p>历史合作用于选择分工，游戏技能与倍率属于改编：孙策、周瑜见<a href="https://zh.wikisource.org/wiki/三國志/卷54">《三国志》卷54</a>；陆逊与朱然、韩当见<a href="https://zh.wikisource.org/wiki/三國志/卷58">卷58</a>；郭淮与张郃及司马懿见<a href="https://zh.wikisource.org/wiki/三國志/卷26">卷26</a>；庞统随刘备入蜀见<a href="https://zh.wikisource.org/wiki/三國志/卷37">卷37</a>，黄忠随军入蜀见<a href="https://zh.wikisource.org/wiki/三國志/卷36">卷36</a>。</p></main></html>`;
writeFileSync(join(dir,'report.html'),html);console.log(JSON.stringify({report:join(dir,'report.html'),battles:report.battles,replays:report.replays,rows:rows.map(r=>({name:r.name,changePP:r.changePP,interactionPP:r.interactionPP}))}));
