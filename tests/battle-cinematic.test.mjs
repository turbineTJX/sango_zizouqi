import test from 'node:test';
import assert from 'node:assert/strict';
import {cinematicFrame,cinematicViewport,drawFeaturedBanner,drawOrderField,orderVisualKind} from '../battle-cinematic.mjs';

test('the portrait clears before the shared hit boundary and fits the visible scrolled viewport',()=>{
 assert.equal(cinematicFrame(0).banner,0);assert.equal(cinematicFrame(.2).banner,1);
 assert.equal(cinematicFrame(.52).banner,0);assert.equal(cinematicFrame(1).banner,0);
 assert.ok(cinematicFrame(.42).leave>0);assert.equal(cinematicFrame(.55).shade,0);
 assert.deepEqual(cinematicViewport({width:960,height:400,canvas:{parentElement:{parentElement:{clientWidth:360,scrollLeft:280}}}}),{width:360,left:280,height:400});
});

test('featured banners and all military effects render finite geometry without modifying their receipts',()=>{
 const text=[],ops=[];
 const gradient=()=>({addColorStop(){}});
 const ctx=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient,fillText:(...args)=>text.push(args[0])},
  {get:(o,k)=>o[k]||((...args)=>{ops.push(k);for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),String(k));})});
 const fx={ctx,mode:'full',reduced:false,width:960,height:450,canvas:{parentElement:{parentElement:{clientWidth:360,scrollLeft:280}}},point:(x,y)=>({x:x*60,y:y*50}),line(){},glow(){}};
 const banner={id:'absent-officer',name:'测试将领',title:'八阵奇门',kind:'军略',side:1};
 const receipt={key:'storm',targets:[{id:'u',x:3,y:2,healing:50}],scope:{shape:'circle',radius:2},point:{x:3,y:2},strikes:[{point:{x:5,y:3}}]};
 const before=JSON.stringify([banner,receipt]);
 drawFeaturedBanner(fx,banner,.2);assert.ok(text.includes('八阵奇门'));assert.ok(text.includes('敌军 · 测试将领'));
 for(const key of ['fortify','invincible','ward','cao-wuchao','heal','cleanse','zhou-redcliffs','storm','zhuge-eight','disrupt','blockade','ambush','swift','reinforce','refresh']){
  drawOrderField(fx,{...receipt,key},60,.7,'#eee','#aac');
 }
 drawOrderField(fx,{...receipt,scope:{shape:'rectangle',width:4,height:2},point:{x:3,y:2,rotation:90}},60,.4,'#eee','#aac');
 assert.ok(ops.includes('stroke'));assert.ok(!ops.includes('ellipse'),'military orders do not put generic rings around troops');assert.equal(JSON.stringify([banner,receipt]),before);
 text.length=0;fx.mode='clear';drawFeaturedBanner(fx,banner,.2);assert.deepEqual(text,[]);
 fx.mode='full';fx.reduced=true;drawFeaturedBanner(fx,banner,.2);assert.deepEqual(text,[]);
 assert.notEqual(orderVisualKind('cleanse'),orderVisualKind('heal'));
});
