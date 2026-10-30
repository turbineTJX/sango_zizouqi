import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {RECIPES} from './common-roster-recipes.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
const root=resolve('work/common-roster-trial'),variant=args.variant||'sustain',runtime=join(root,variant+'/runtime'),playRoot=resolve(args.out||root),out=join(playRoot,'demos');mkdirSync(out,{recursive:true});
const E=await import(pathToFileURL(join(runtime,'engine.mjs'))),cards=[];
for(const r of RECIPES){
 const roles=variant==='initiative'||['wei','liu'].includes(r.id),group=variant==='initiative'?'dev-initiative':roles?'dev-roles':'dev-sustain',buttons=[];
 for(const enemy of ['yuan-common','yuan-elite']){
  const s=JSON.parse(readFileSync(join(root,group,'battles',`${r.id}-${enemy}-plain-open-28104001-0-fixed-l5-start.json`))),id=r.id+'-'+enemy;
  E.validateSave(structuredClone(s));writeFileSync(join(out,id+'-start.json'),JSON.stringify(s));
  while(!s.battle.result&&s.battle.commandProgress<E.COMMAND_RESOURCE.capacity)E.stepBattle(s.battle,{aiSides:[1],pauseForReinforcements:false});
  assert.ok(!s.battle.result);E.validateSave(structuredClone(s));writeFileSync(join(out,id+'-ready.json'),JSON.stringify(s));
  buttons.push(`<div class="choices"><span>${enemy==='yuan-common'?'对河北常备军':'对河北主力'}</span><button data-save="${id}-start">从开战开始</button><button data-save="${id}-ready">从军略就绪开始</button></div>`);
 }
 cards.push(`<article><h2>${r.name}</h2><p>${r.team.map((t,i)=>`${t[0]} ${roles?[5000,5000,5000,1000,1000,1000][i]:3000}`).join(' · ')}</p><small>${r.scenario==='guandu-200'?'官渡风云':'群雄割据'}开局同势力同城；5级，基础兵种，共18000兵。</small>${buttons.join('')}</article>`);
}
writeFileSync(join(playRoot,'play.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>普通班底 · 军略实战</title><style>*{box-sizing:border-box}body{margin:40px auto;padding:24px;max-width:1040px;background:#f4f1e8;color:#20383d;font:16px/1.8 'Microsoft YaHei',sans-serif}h1{font-size:34px;margin:0}h2{margin:0;font-size:23px}article{background:#fff;border:1px solid #d4dcd7;border-radius:14px;padding:24px;margin:20px 0}small{color:#5c6f70}button{font:inherit;border:0;background:#216c67;color:white;padding:9px 16px;border-radius:8px;cursor:pointer}.choices{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:16px}.choices span{min-width:140px}#message{color:#a23624}@media(max-width:600px){body{padding:16px;margin:12px auto}h1{font-size:27px}article{padding:18px}.choices span{width:100%}}</style><small>三国 · 君临 / 三层分工试验 · 第二轮</small><h1>普通班底，也要有下令的理由</h1><p>战法自动施放。军略由你选择时机和落点。满宠的励军使附近部队在护盾完全吸收直击时仍获得受击战意。</p><p>${variant==='initiative'?'双方开场携带半条指挥准备，让第一道军略能更早下达。':''}本轮保留短时集中护盾，减缓残兵攻击衰减；没有采用额外延长蓄势的试验。可反复重开同一局，比较立即施放、承压时施放与保护不同部队。</p>${cards.join('')}<p id="message"></p><small>上述均为开发种子，强敌局保留真实难度。选人依据实际开局名册；独立战役未模拟全国征兵与调运成本。点击会替换此试验地址的战役进度。</small><script type="module">import {writeSavedGame} from './save-storage.mjs';import {validateSave} from './engine.mjs';for(const b of document.querySelectorAll('[data-save]'))b.onclick=async()=>{try{document.querySelector('#message').textContent='正在载入…';const r=await fetch('/demos/'+b.dataset.save+'.json');if(!r.ok)throw Error('找不到战役');const s=validateSave(await r.json());await writeSavedGame('sango-historical-battle-v1',JSON.stringify(s));location.href='/#historical-battle';}catch(e){document.querySelector('#message').textContent=e.message;}};</script></html>`);
console.log('8 scenarios / 16 actual saves prepared');
