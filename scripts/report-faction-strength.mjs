import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const base=resolve(process.argv[2]||'outputs/faction-strength-20261011');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const dirs=readdirSync(base).filter(n=>/^shard-\d+$/.test(n)).sort();
if(!dirs.length&&existsSync(join(base,'run.json')))dirs.push('.');
assert.ok(dirs.length);
const runs=dirs.map(d=>read(join(base,d,'run.json')));
assert.ok(runs.every(r=>r.sourceHash===runs[0].sourceHash&&r.rulesVersion===runs[0].rulesVersion&&!r.pilot));
const source=runs[0].source,manifest=read(join(source,'..','manifest.json'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [p,h] of Object.entries(manifest.hashes))assert.equal(sha(readFileSync(join(source,p))),h,'Snapshot changed: '+p);
const data=read(join(base,dirs[0],'cases.json'));
assert.ok(dirs.every(d=>read(join(base,d,'cases.json')).rulesVersion===data.rulesVersion));
const rows=dirs.flatMap(d=>readFileSync(join(base,d,'battles.jsonl'),'utf8').trim().split('\n').map(line=>{
 const row=JSON.parse(line);for(const side of row.units)for(const unit of side)delete unit.entered;
 if(row.sample){row.sample=d+'/'+row.sample.replaceAll('\\','/');assert.ok(existsSync(join(base,row.sample)));}return row;
}));
assert.equal(rows.length,runs.reduce((n,r)=>n+r.battles,0));
assert.equal(new Set(rows.map(r=>r.caseId+':'+r.phase+':'+r.seed+':'+r.swapped)).size,rows.length);
const expected=data.cases.length*Object.values(data.seeds).flat().length*2;
assert.equal(rows.length,expected);
for(const c of data.cases)for(const [phase,seeds] of Object.entries(data.seeds))for(const seed of seeds)for(const swapped of [false,true]){
 assert.ok(rows.some(r=>r.caseId===c.id&&r.phase===phase&&r.seed===seed&&r.swapped===swapped),'Missing battle');
}
assert.ok(rows.every(r=>r.saveChecked));
const validation=rows.filter(r=>r.phase==='validation');
assert.equal(validation.filter(r=>r.replayChecked).length,data.cases.length);
const load=file=>import(pathToFileURL(join(source,file)));
const {BATTLE_MAPS}=await load('data/design/battle-maps.mjs');
const {BOND_DESIGNS}=await load('data/design/bonds.mjs');
const {STRATAGEM_DESIGNS}=await load('data/design/stratagems.mjs');
const {generateBattle}=await load('battle-generator.mjs');
const {swapCustomBattle}=await load('custom-battle.mjs');
const {planBattleCouncilsAI,validateSave}=await load('engine.mjs');
const {TROOPS}=await load('unit-stats.mjs');
const mean=xs=>xs.reduce((n,x)=>n+x,0)/(xs.length||1),round=x=>Math.round(x*100)/100;
const side=(r,f)=>r.a===f?r.aSide:1-r.aSide;
const isWin=(r,f)=>r.result.winner===side(r,f);
const belongs=(r,f)=>r.a===f||r.z===f;
function statistics(xs,f){
 const wins=xs.filter(r=>isWin(r,f)).length,draws=xs.filter(r=>r.result.winner===null).length;
 const take=s=>xs.filter(r=>side(r,f)===s);
 const sideRate=s=>round(mean(take(s).map(r=>Number(isWin(r,f))))*100);
 const officers=new Map(),commands={},bonds={};
 for(const r of xs){const s=side(r,f);
  for(const [id,n] of Object.entries(r.counts.commands[s]))commands[id]=(commands[id]||0)+n;
  for(const [id,b] of Object.entries(r.opening[s].bonds)){const rec=bonds[id]||={name:BOND_DESIGNS[id].name,tierCounts:[0,0,0,0]};rec.tierCounts[b.tier]++;}
  for(const u of r.units[s]){const rec=officers.get(u.id)||{id:u.id,name:u.name,battles:0,damage:0,control:0,healing:0,protection:0,support:0,remaining:0,casts:0};
   rec.battles++;rec.remaining+=u.remaining;rec.casts+=Object.values(u.casts).reduce((n,x)=>n+x,0);
   for(const key of ['damage','control','healing','protection','support'])rec[key]+=u.contribution[key]||0;
   officers.set(u.id,rec);
  }
 }
 return {games:xs.length,wins,draws,losses:xs.length-wins-draws,winPct:round(wins/(xs.length||1)*100),
  scorePct:round((wins+draws*.5)/(xs.length||1)*100),leftWinPct:sideRate(0),rightWinPct:sideRate(1),
  lossPct:round(mean(xs.map(r=>r.lost[side(r,f)]/(r.remaining[side(r,f)]+r.lost[side(r,f)])))*100),
  ownRemaining:round(mean(xs.map(r=>r.remaining[side(r,f)]))),foeRemaining:round(mean(xs.map(r=>r.remaining[1-side(r,f)]))),
  marginPct:round(mean(xs.map(r=>(r.remaining[side(r,f)]-r.remaining[1-side(r,f)])/(r.remaining[side(r,f)]+r.lost[side(r,f)])))*100),
  days:round(mean(xs.map(r=>r.days))),trainingGold:round(mean(xs.map(r=>r.trainingGold[side(r,f)]))),
  commands:Object.entries(commands).map(([id,count])=>({id,name:STRATAGEM_DESIGNS[id]?.name||id,count,perBattle:round(count/(xs.length||1))})),
  openingBonds:bonds,officers:[...officers.values()].map(o=>({...o,...Object.fromEntries(['damage','control','healing','protection','support','remaining','casts'].map(k=>[k,round(o[k]/o.battles)]))})).sort((a,b)=>b.damage-a.damage)};
}
const contexts=data.modes.flatMap(m=>m.maps.map(mapId=>({mode:m.id,mapId}))).concat(data.modes.map(m=>({mode:m.id,mapId:'all'})));
const summaries=contexts.map(context=>{
 const rs=validation.filter(r=>r.mode===context.mode&&(context.mapId==='all'||r.mapId===context.mapId));
 return {...context,forces:data.forces.map(f=>({id:f.id,name:f.name,...statistics(rs.filter(r=>belongs(r,f.id)),f.id)})),
  matchups:data.forces.flatMap(a=>data.forces.filter(z=>z.id!==a.id).map(z=>{
   const xs=rs.filter(r=>belongs(r,a.id)&&belongs(r,z.id));return {a:a.id,z:z.id,...statistics(xs,a.id)};
  }))};
});
// Export editable, current-version starts, with both choices of player side.
mkdirSync(join(base,'presets'),{recursive:true});
const presets=[];
const chosen=data.cases.filter(c=>c.mode==='main10'&&c.mapId==='plain-open'&&(c.a==='cao'||c.a==='force-2'&&c.z==='force-3'));
for(const c of chosen)for(const swapped of [false,true]){
 let draft={...structuredClone(c.draft),seed:data.seeds.validation[0]};if(swapped)draft=swapCustomBattle(draft);
 const state=generateBattle(draft);planBattleCouncilsAI(state.battle,[0,1]);validateSave(structuredClone(state));
 const path='presets/'+c.id+'-play-'+(swapped?c.z:c.a)+'.json';writeFileSync(join(base,path),JSON.stringify(state));
 presets.push({path,a:c.a,z:c.z,player:swapped?c.z:c.a});
}
const checked={totalBattles:rows.length,developmentBattles:rows.length-validation.length,validationBattles:validation.length,
 configs:data.cases.length,swappedBattles:rows.filter(r=>r.swapped).length,replayChecks:rows.filter(r=>r.replayChecked).length,
 saveChecks:rows.length,draws:rows.filter(r=>r.result.winner===null).length,timeouts:rows.filter(r=>r.result.reason==='久战收兵').length,
 samples:rows.filter(r=>r.sample).length,presets:presets.length,leftWins:validation.filter(r=>r.result.winner===0).length,
 rightWins:validation.filter(r=>r.result.winner===1).length};
const changed=Object.entries(manifest.hashes).filter(([p,h])=>!existsSync(join(process.cwd(),p))||sha(readFileSync(join(process.cwd(),p)))!==h).map(([p])=>p);
const currentCheck=existsSync(join(base,'current-check.json'))?read(join(base,'current-check.json')):null;
const report={rulesVersion:data.rulesVersion,sourceHash:manifest.sourceHash,source,checked,changedSinceSnapshot:changed,currentCheck,forces:data.forces,modes:data.modes,seeds:data.seeds,summaries,presets,
 method:'Frozen current simulation; actual all-heroes-251 affiliation. Predeclared main rosters, base troop types selected by public aptitude rule. Main10: six units × 3000, four maps; reserve10: eight × 3000 including public AI starters/reserves; main5: six × 3000, level 5; cost10: six × 3000 with identical 2 spear/1 halberd/1 cavalry/2 archer mix assigned by aptitude. Shared AI councils, replacements, tactics and stratagems on both sides, swapped starts. No treasure, free shield, event, added tactics or combat multiplier. River: both sides carry basic ships. Gold costs differ outside cost10 and are reported. Fixed development seed and separate validation seeds; no tuning from outcome. Current-save validation for every battle; each setup replays from tick 20. Loss is reduction in field-active manpower including wounded, not officer deaths. Single-battle roster diagnosis, not strategic economy or the strongest possible roster.'};
writeFileSync(join(base,'summary.json'),JSON.stringify(report,null,2));
writeFileSync(join(base,'battles.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
writeFileSync(join(base,'cases.json'),JSON.stringify(data,null,2));
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>主要势力主力实战评测</title>
<style>:root{font-family:"Microsoft YaHei",system-ui;color:#e7ebf2;background:#10151f}body{max-width:1240px;margin:auto;padding:32px 24px}h1{font-size:30px;margin-bottom:10px}h2{margin:34px 0 16px;font-size:22px}.note{color:#aebbcf;line-height:1.85;font-size:14px}a{color:#83b7ff}select{background:#222f44;color:#fff;padding:10px 16px;border:1px solid #415575;border-radius:8px;margin:0 16px 12px 6px}.kpis{display:flex;gap:12px;flex-wrap:wrap}.kpi{background:#1d293a;padding:18px 26px;border-radius:10px}.kpi b{display:block;font-size:27px}.kpi small{color:#aebbcf}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:11px 9px;text-align:right;border-bottom:1px solid #2b3648}th:first-child,td:first-child{text-align:left}th{color:#aebbcf;background:#1b2636}td:first-child{font-weight:600;white-space:nowrap}.scroll{overflow:auto;border:1px solid #2b3648;border-radius:9px}#matrix th{white-space:nowrap}#matrix td{min-width:56px;text-align:center}.card{background:#192333;border:1px solid #2b3648;border-radius:10px;padding:20px;margin:16px 0}.card h3{margin:0 0 12px}.chips span{display:inline-block;margin:3px 6px 3px 0;border-radius:6px;padding:5px 8px;background:#2c3a50;font-size:13px}.weak{color:#aebbcf}details{margin:14px 0}summary{cursor:pointer;color:#a8c9fa}code{font-size:12px;overflow-wrap:anywhere}.winner{color:#74d6b3}button{cursor:pointer;border:0;background:#344a6a;color:white;border-radius:6px;padding:6px 10px}</style>
<h1>主要势力主力实战评测</h1><p class="note">2026-10-11 · 规则 ${data.rulesVersion} · 十二支实际归属主力 · 双方真实 AI 军议与作战</p>
<div class="kpis"><div class="kpi"><b>${checked.totalBattles}</b><small>完整实战</small></div><div class="kpi"><b>${checked.validationBattles}</b><small>独立验证场次</small></div><div class="kpi"><b>${checked.configs}</b><small>战役配置</small></div><div class="kpi"><b>${checked.replayChecks}</b><small>确定性续战通过</small></div></div>
<p class="note">胜率为对其余十一支指定阵容的本轮样本结果；每个对手、地形均交换阵营。默认只展示独立验证结果。各地图每对阵 ${data.seeds.validation.length*2} 场，种子与换边结果有关联，不能把场次数当作同等数量的独立样本。六队各3000人；后备专项八队各3000人。现役损耗含伤兵。</p>
<label>对照<select id="mode"></select></label><label>地图<select id="map"></select></label>
<div id="description" class="note"></div><h2>整体表现</h2><div id="ranking" class="scroll"></div>
<h2>互战胜率</h2><p class="note">行方对列方；鼠标悬停可查看胜、平、负。数字是胜率，平局不算获胜。</p><div id="matrix" class="scroll"></div>
<h2>阵容与实际贡献</h2><p class="note">输出、控制、救治与护盾列为平均每场实际记录。没有做技能关闭对照，整体胜率不能归因于某一项羁绊或专属。</p><div id="forces"></div>
<h2>可直接导入的自定义战役</h2><p class="note">在游戏“设置 → 导入”选择开局 JSON；存档停在可编辑的战前会议。可从以下链接选择我方，每局沿用本轮合法兵力、名单和地图。结束存档及完整败局记录见 samples 和 battles.jsonl。</p><div id="presets" class="chips"></div>
<h2>方法与验收</h2><p class="note">按“群雄集结”实际人员归属组阵，未从别的势力借将。例如本次曹操军没有吕布麾下的张辽，袁军没有韩馥麾下的张郃、沮授；刘备军没有马腾麾下的马超或韩玄麾下的黄忠。江东包含当前孙坚势力的跨年代人物。以上是架空主力对照，不能解释为某年历史军队或全国统一能力。</p>
<p class="note">特色阵容仅统一兵力预算，编制金因兵种不同而不同；同费用专项同时统一兵种数量和实际编制金。仅使用四大基础兵科；水战双方携带基础走舸。等级5使用正常成长结果，满级10达到当前固定上限。无宝物、免费护盾、战役事件及单方倍率。AI按公共规则择序，不主动凑羁绊；自然形成的羁绊正常结算。未针对验证结果改名单。</p>
<p class="note">${checked.saveChecks} 场存档合法；${checked.replayChecks} 组战中读取后与原局逐字段一致。平局 ${checked.draws} 场，久战收兵 ${checked.timeouts} 场。完整首个验证种子终局保存 ${checked.samples} 份，所有种子的每队余兵、贡献、战法次数、军略、开场档位与胜负保存在逐局记录。${changed.length?'测试期间工作区有其他修改，以下结论严格对应所保存的源代码快照。':'报告生成时，工作区模拟源仍与测试快照一致。'}${currentCheck?.allEqual?'当前工作区代码另抽验 '+currentCheck.checks+' 场，战斗状态与快照结果逐字段一致。':''}</p>
<p class="note">开发种子：${data.seeds.development.join('、')}；验证种子：${data.seeds.validation.join('、')}。模拟源摘要：<code>${manifest.sourceHash}</code>。<a href="summary.json">统计 JSON</a> · <a href="cases.json">完整战役配置</a> · <a href="battles.jsonl">逐局记录</a></p>
<script>const DATA=${JSON.stringify(report).replaceAll('<','\\u003c')};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const names=Object.fromEntries(DATA.forces.map(f=>[f.id,f.name]));
const maps=${JSON.stringify(Object.fromEntries(Object.entries(BATTLE_MAPS).map(([id,m])=>[id,m.name])))};
const mode=document.getElementById('mode'),map=document.getElementById('map');
mode.innerHTML=DATA.modes.map(m=>'<option value="'+m.id+'">'+m.name+'</option>').join('');
function options(){const m=DATA.modes.find(m=>m.id===mode.value);map.innerHTML='<option value="all">全部地图</option>'+m.maps.map(id=>'<option value="'+id+'">'+maps[id]+'</option>').join('');render();}
function render(){
const s=DATA.summaries.find(s=>s.mode===mode.value&&s.mapId===map.value),m=DATA.modes.find(m=>m.id===mode.value);
const ranked=[...s.forces].sort((a,b)=>b.scorePct-a.scorePct||b.marginPct-a.marginPct);
document.getElementById('description').textContent=m.id==='cost10'?'双方同为2枪、1戟、1骑、2弓，按适性分配人员，编制金完全一致。':'采用各将最高适性的基础兵种。编制金列为真实成本，未宣称金与兵力同时等预算。';
document.getElementById('ranking').innerHTML='<table><tr><th>势力</th><th>胜 / 平 / 负</th><th>胜率</th><th>平均余兵</th><th>现役损耗</th><th>余兵差</th><th>左方胜率</th><th>右方胜率</th><th>编制金</th></tr>'+ranked.map(f=>'<tr><td>'+f.name+'</td><td>'+f.wins+' / '+f.draws+' / '+f.losses+'</td><td>'+f.winPct+'%</td><td>'+Math.round(f.ownRemaining)+'</td><td>'+f.lossPct+'%</td><td>'+f.marginPct+'%</td><td>'+f.leftWinPct+'%</td><td>'+f.rightWinPct+'%</td><td>'+f.trainingGold+'</td></tr>').join('')+'</table>';
document.getElementById('matrix').innerHTML='<table><tr><th>行方 ∕ 列方</th>'+DATA.forces.map(f=>'<th>'+f.name+'</th>').join('')+'</tr>'+DATA.forces.map(f=>'<tr><td>'+f.name+'</td>'+DATA.forces.map(z=>{if(f.id===z.id)return '<td>—</td>';const x=s.matchups.find(x=>x.a===f.id&&x.z===z.id);return '<td title="'+x.wins+'胜 '+x.draws+'平 '+x.losses+'负" style="background:rgba('+(x.winPct>=50?'39,165,124':'173,77,87')+','+(Math.abs(x.winPct-50)/100+.07)+')">'+x.winPct+'%</td>';}).join('')+'</tr>').join('')+'</table>';
document.getElementById('forces').innerHTML=ranked.map(f=>{const force=DATA.forces.find(x=>x.id===f.id),roster=force.officers.slice(0,m.count);
const activated=Object.values(f.openingBonds).filter(b=>b.tierCounts.slice(1).some(n=>n)).map(b=>b.name+' '+b.tierCounts.map((n,i)=>n&&i?i+'档×'+n:'').filter(Boolean).join(' / '));
return '<div class="card"><h3>'+f.name+' · '+f.winPct+'%</h3><div class="chips">'+roster.map(u=>'<span>'+u.name+'</span>').join('')+'</div><p class="note">实际军略：'+(f.commands.map(c=>c.name+' '+c.count+'次').join('；')||'未施放')+'</p><details><summary>开场羁绊档位与每队贡献</summary><p class="note">'+activated.join('；')+'</p><div class="scroll"><table><tr><th>武将</th><th>平均伤害</th><th>平均控制</th><th>平均救治</th><th>平均保护</th><th>平均支援</th><th>平均施法次数</th></tr>'+f.officers.map(o=>'<tr><td>'+o.name+'</td>'+['damage','control','healing','protection','support','casts'].map(k=>'<td>'+o[k]+'</td>').join('')+'</tr>').join('')+'</table></div></details></div>'}).join('');
}
document.getElementById('presets').innerHTML=DATA.presets.map(p=>'<span><a href="'+p.path+'" download>'+names[p.a]+' 对 '+names[p.z]+' · 我方 '+names[p.player]+'</a></span>').join('');
mode.onchange=options;map.onchange=render;options();
</script></html>`;
writeFileSync(join(base,'report.html'),html);
console.log(JSON.stringify({checked,rulesVersion:data.rulesVersion,changedSinceSnapshot:changed,ranking:summaries.find(s=>s.mode==='main10'&&s.mapId==='all').forces.map(f=>({name:f.name,wins:f.wins,games:f.games,winPct:f.winPct,lossPct:f.lossPct})).sort((a,b)=>b.winPct-a.winPct)},null,2));
