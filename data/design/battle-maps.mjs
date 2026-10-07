const grid=cell=>Array.from({length:8},(_,y)=>Array.from({length:14},(_,x)=>cell(x,y)));
// Tactical adaptations, not geographic surveys. All movement uses these tiles.
export const BATTLE_MAPS={
 xiapi:{name:'下邳 · 泗水围城',terrain:'marsh',description:'城前湿地拖慢冲锋，中路与两翼保留陆上通道。水淹背景以湿地表现，不脚本化决堤。',tiles:grid((x,y)=>x>=4&&x<=9&&[1,2,5,6].includes(y)?'marsh':x>=10&&[1,6].includes(y)?'hill':'land')},
 guandu:{name:'官渡 · 营垒相持',terrain:'land',description:'中路开阔，两翼林带与后方高地形成射击、包抄路线；不预设乌巢焚粮胜负。',tiles:grid((x,y)=>x>=3&&x<=10&&[1,6].includes(y)?'forest':[2,3,10,11].includes(x)&&[2,5].includes(y)?'hill':'land')},
 chibi:{name:'赤壁 · 江面交锋',terrain:'river',description:'四条江面航道供舰船展开，两岸与中央桥面可容纳陆军；火攻使用真实战法与军略。',tiles:grid((x,y)=>y>=2&&y<=5?([6,7].includes(x)&&[3,4].includes(y)?'bridge':'water'):[2,3,10,11].includes(x)?'hill':'land')},
 hefei:{name:'合肥 · 逍遥津渡口',terrain:'river',description:'渡口水面与桥梁分割中路，岸边可绕行；守军可坚守城门，也可主动出击。',tiles:grid((x,y)=>[3,4].includes(y)&&x>=4&&x<=9?([6,7].includes(x)?'bridge':'water'):x>=4&&x<=9&&[2,5].includes(y)?'marsh':[3,10].includes(x)&&[1,6].includes(y)?'forest':'land')},
 yiling:{name:'夷陵 · 山林连营',terrain:'forest',description:'山林分布于两翼，狭长中路可接敌；林中火攻更强，骑兵转进受地形限制。',tiles:grid((x,y)=>x>=2&&x<=11&&[1,2,5,6].includes(y)?'forest':[4,9].includes(x)&&[0,7].includes(y)?'hill':'land')},
 wuzhang:{name:'五丈原 · 渭滨对垒',terrain:'hill',description:'两侧台地夹住中央通路，北面渭水设桥。以局部交锋改编长期对峙，不演绎诸葛亮阵亡。',tiles:grid((x,y)=>y===1&&x>=4&&x<=9?([6,7].includes(x)?'bridge':'water'):[2,3,4,9,10,11].includes(x)&&y>=2&&y<=6?'hill':y===6&&[6,7].includes(x)?'forest':'land')},
};
