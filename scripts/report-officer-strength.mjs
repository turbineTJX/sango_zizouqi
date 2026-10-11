import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const base=resolve(process.argv[2]||'outputs/officer-strength-r123-20261011');
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const single=json(join(base,'single-roles/single-summary.json')),team=json(join(base,'team-roles/team-summary.json'));
const comboFiles=['combo-roles','combo-support'],combos=comboFiles.map(p=>json(join(base,p,'combo-summary.json')));
const manifest=json('work/officer-strength-r123-20261011/manifest.json');
let battles=0,replays=0,draws=0,timeouts=0,losses=0;
const folders=[['single-roles','single'],['team-roles','team'],...comboFiles.map(p=>[p,'combo'])];
for(const [folder,mode]of folders){
 const s=json(join(base,folder,mode+'-summary.json'));assert.equal(s.rulesVersion,123);assert.equal(s.source,manifest.runtime);battles+=s.battles;
 for(const p of readFileSync(join(base,folder,mode+'-pairs.jsonl'),'utf8').trim().split('\n').map(JSON.parse)){
  assert.equal(p.on.troops,p.off.troops);assert.equal(p.on.trainingGold,p.off.trainingGold);
  for(const r of [p.on,p.off]){replays+=Number(r.replayChecked);draws+=Number(r.draw);timeouts+=Number(r.result.reason==='久战收兵');losses+=Number(!r.win&&!r.draw);}
 }
}
assert.equal(battles,1024);
const currentSourceChanges=Object.keys(manifest.hashes).filter(p=>createHash('sha256').update(readFileSync(p)).digest('hex')!==manifest.hashes[p]);
const evaluations={
 '吕布':['单队武勇、勇武核心','匹配','武力100，勇武2点使自身能激活一档；满勇武阵容中又是关键凑档核心。专属爆发的独特性仍需单独观察。'],
 '曹操':['统军、全队强化与编制','匹配','统率96、智力91，魏武之强支援友军；奸雄须实际任军团长，并由真实第七队使用。不能只用单队伤害评判。'],
 '刘备':['续航保护、桃园核心','匹配','面板较温和，义勇援军、固若金汤与桃园共同体现团队生存价值；本人也可获得合法续航与军略保护。'],
 '关羽':['单队斩将、桃园战斗主核','大体匹配','统率95、武力97且枪戟S，脱离桃园仍有个人战力。专属一次高门槛的决定性需继续关注。'],
 '张飞':['前排突破、群体扰乱','存在明显落差','本次单队及普通团战对照均弱于戟兵参照文聘；桃园组合中有增益，但不足以单独证明先锋定位兑现。建议优先检查怒喝、承伤和突破能力。'],
 '司马懿':['统军谋略、反制与资源节奏','基础匹配，特色偏淡','统率98、智力96保证基础战力；隐忍及鹰视狼顾应突出敌方军略与战意反制。深谋满档队的增量受其它成员已有强度影响。'],
 '诸葛亮':['军师控制、深谋主核、科研','匹配','智力100、弓S、深谋2点和两项军略形成完整优势；陆地测试中单队也很强，不能因为旧专属消融收益低就判本人弱。科研价值未在本次量化。'],
 '周瑜':['火系输出、团战主核','匹配且突出','高统高智、弓S，个人火谋3点可激活一档并作为满档核心。普通火矢、灼烧、羁绊及专属共同形成输出。'],
 '陆逊':['范围谋略、火系输出与副核','基本匹配','当前陆地团战表现很强；没有火谋点数，因此火系组阵核心性与周瑜不同。不能把缺少火谋直接等同于战力不足。'],
 '孙策':['突击输出、进攻节奏','可用，特色仍需突出','高统高武、骑S，霸王讨逆带来速攻和友军战意。当前更接近优质骑兵，破军组合能用，但独特突破收益尚不醒目。'],
 '孙权':['军团防护、任职支援','匹配','单队与戟兵参照接近，普通团战收益明显；碧眼和金城汤池体现防御支援。政治89的内政价值不属于本次战斗对照。'],
 '赵云':['单队持续作战、护卫配合','匹配','七进七出低门槛、可用两次并提供真实伤兵救治与护盾；既有单队续战，也能支持护卫、勇武组合。'],
 '马超':['骑兵突击、勇武成员','基础可用，突击特色需观察','骑S、武力97有个人战力；西凉铁骑的定身不阻止攻击，不能把它当成全面压制。纯团战增量较小不等于骑兵场景普遍弱。'],
 '黄忠':['远程武技、后排狙击','匹配且突出','弓S、百步穿杨射程5且可用两次，远击3点提供自身一档；蓄锐组阵与后备价值未在本次补测。'],
 '张辽':['机动统军、骑兵突破','基础匹配，战场特色可加强','统率93、骑S与突進专属支持战斗；轻装、急行的战略机动价值没有被陆地战斗收益完整覆盖。'],
 '郭嘉':['低门槛战意压制、军师支援','组合定位兑现，泛用性低','智力98但低统率及普通兵种B适性限制直接输出。普通混搭收益很小；带真实后备的支援团收益+29.01，胜局由参照4/8提高到8/8。评价重点是战意压制、军略与实际配合。'],
 '庞统':['控制、连环与火系协同','有配合价值，特色仍偏弱','普通队伍与单队表现一般；连环3点需要实际灼烧目标。与周瑜、阚泽等火系搭配收益+6.13，但个人及普适团战收益仍不突出，应继续关注连环桥接能力。']
};
const rows=team.rows.map(t=>({name:t.name,officer:t.officer,reference:t.reference,single:single.rows.find(r=>r.name===t.name).all,team:t.all,combo:combos.flatMap(s=>s.rows).find(r=>r.name===t.name)||null,role:evaluations[t.name][0],assessment:evaluations[t.name][1],reason:evaluations[t.name][2]}));
const scope=[
 '全套合法武将对照，不把特性、羁绊与专属消融收益简单相加。每组只替换一名实际武将，保留其余成员、兵种、人数和训练费用，双方交换，并使用四个固定验证种子。',
 '单队对照分别面对高顺、程昱；普通团战采用固定五名辅助；组合测试采用明确实际阵容。主测17人，组合补测13人。全部10级，陆地平原；不代表水战、复杂地形、低等级和长期内政表现。',
 '任职由共用recommendArmyAppointments在空任命上推荐，再走共同生成、军议、部署和战斗流程；AI不搜索羁绊组合。首次试验继承默认首位军团长，结果另存但未纳入本报告。',
 '单队/普通队参照：枪兵李典、戟兵文聘、骑兵臧霸、弓兵蒋济。曹操八队组合参照为陈兰。不同兵种与参照使跨武将数值不能构成通用因果排名。',
 '收益为启用该武将与替换参照后的（己方剩余兵力－敌方剩余兵力）差，除以己方初始人数，单位百分点；不是胜率，可超过100。组合替换还会改变羁绊档位和任命，这正是该阵容的实际边际价值。',
 '已胜局里更快获胜会使其他队伍的总伤害下降，因此他人伤害差不能直接解释为负面支援。组合都获胜时，也不能据小增量判某名将普遍弱。置信区间为小样本场景/种子簇近似区间。',
 '本次只评价，没有改变武将、特性、羁绊、战法或AI规则。未根据结果调数值或挑选胜局；败局、平局和超时都在JSONL及failures目录保留。'
];
const report={rulesVersion:123,sourceHash:manifest.sourceHash,currentSourceChanges,battles,replays,draws,timeouts,losses,seeds:team.seeds,rows,scope};
writeFileSync(join(base,'evaluation.json'),JSON.stringify(report,null,2));
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),num=x=>(x>=0?'+':'')+x.toFixed(2),metric=x=>`<b>${num(x.marginGainPP)}</b><small>${x.onWins}／${x.offWins}胜（各${x.pairs}局）<br>约95%：${x.approx95.join('～')}</small>`;
const troopNames={spear:'枪兵',halberd:'戟兵',cavalry:'骑兵',archer:'弓兵'};
writeFileSync(join(base,'report.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>名将定位与强度 · 规则123</title><style>body{margin:0;background:#f3f4f0;color:#273b32;font:15px/1.7 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1360px;margin:auto;padding:28px 20px}h1{margin:0;font-size:30px}p{margin:12px 0}.cards{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}.card{background:white;border:1px solid #dde6de;border-radius:10px;padding:14px 22px;flex:1;min-width:120px}.card b{display:block;font-size:27px;color:#267459}.scroll{overflow:auto;border-radius:10px}table{border-collapse:collapse;width:100%;background:white}th,td{padding:13px;border-bottom:1px solid #e2e8e3;text-align:left;vertical-align:top}th{background:#e6eee7}td small{display:block;font-size:12px;color:#657a6b}.name{min-width:78px}.reason{min-width:230px;max-width:350px}.note{background:white;border-radius:12px;padding:18px 24px;margin-top:22px}li{margin-bottom:9px}a{color:#247158}@media(max-width:700px){main{padding:18px 12px}h1{font-size:24px}table{min-width:1120px}.card{min-width:100px;padding:12px}}</style><main><h1>名将定位与强度 · 规则123</h1><p>单部队攻防、军团支援与组合价值分别评价。名将无需在同一项指标上都强。</p><div class="cards"><div class="card"><b>17人</b>完整武将配置</div><div class="card"><b>${battles}场</b>合法换将对照</div><div class="card"><b>${replays}次</b>完整读档复现</div><div class="card"><b>规则123</b>评价期间未改数值</div></div><p>列中数值是相对各自参照的剩余兵力优势收益，单位百分点；不是跨武将总排名。组合列包含实际凑档与任职变化。</p><div class="scroll"><table><thead><tr><th>武将</th><th>统／武／智／政</th><th>职责与匹配度</th><th>单队收益</th><th>普通团战收益</th><th>组合收益</th><th>解释</th></tr></thead><tbody>${rows.map(r=>`<tr><td class="name"><b>${esc(r.name)}</b><small>${esc(troopNames[r.officer.testType])} · 参照${esc(r.reference)}</small></td><td>${[r.officer.leadership,r.officer.force,r.officer.intellect,r.officer.politics].join('／')}</td><td><b>${esc(r.assessment)}</b><small>${esc(r.role)}</small></td><td>${metric(r.single)}</td><td>${metric(r.team)}</td><td>${r.combo?metric(r.combo.all)+'<small>'+esc(r.combo.contexts[0].context)+'</small>':'未测对应组合'}</td><td class="reason">${esc(r.reason)}<small>羁绊：${r.officer.bonds.map(b=>esc(b.name)+b.cap).join('、')}<br>专属：${esc(r.officer.special?.name||'无')}<br>军略：${r.officer.stratagems.map(s=>esc(s.name)).join('、')||'无'}</small></td></tr>`).join('')}</tbody></table></div><div class="note"><ul>${scope.map(s=>'<li>'+esc(s)+'</li>').join('')}</ul><p>全部${battles}局通过当前存档校验，${replays}局保存后完整续战一致；${losses}个败局、${draws}个平局、${timeouts}个久战收兵结果均保留。${currentSourceChanges.length?'当前源码另有变化：'+esc(currentSourceChanges.join('、')):'当前游戏源码与冻结测试版本一致。'}</p><p><a href="evaluation.json">完整评价与统计JSON</a> · <a href="single-roles/single-summary.json">单队数据</a> · <a href="team-roles/team-summary.json">普通团战数据</a> · <a href="combo-roles/combo-summary.json">主要组合数据</a> · <a href="combo-support/combo-summary.json">谋士配合补测</a></p></div></main></html>`);
console.log(JSON.stringify({report:join(base,'report.html'),battles,replays,draws,timeouts,losses,currentSourceChanges,summary:rows.map(r=>({name:r.name,single:r.single.marginGainPP,team:r.team.marginGainPP,combo:r.combo?.all.marginGainPP}))}));
