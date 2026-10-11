// Tactical layouts, not geographic surveys. Dots are dry ground; f/h/m/w/b/r
// are forest, high ground, marsh, water, bridge and impassable rock respectively.
const terrainKeys={'.':'land',f:'forest',h:'hill',m:'marsh',w:'water',b:'bridge',r:'rock'};
const grid=cell=>Array.from({length:8},(_,y)=>Array.from({length:14},(_,x)=>cell(x,y)));
const rows=lines=>lines.map(line=>[...line].map(key=>terrainKeys[key]));
const map=(name,terrain,description,tiles,roads=[])=>({name,terrain,description,tiles,roads});

export const FIELD_MAP_IDS={
 land:['plain-open','plain-ridges','plain-crossroads'],
 forest:['forest-belt','forest-ravine','forest-stream'],
 hill:['hill-plateau','hill-pass','hill-spurs'],
 marsh:['marsh-flats','marsh-dykes','marsh-lakes'],
 river:['river-crossing','river-twin-bridges','river-harbor'],
};
export const DEFAULT_BATTLE_MAPS=Object.fromEntries(Object.entries(FIELD_MAP_IDS).map(([terrain,ids])=>[terrain,ids[0]]));

export const BATTLE_MAPS={
 'plain-open':map('平原 · 阡陌旷野','land','中路宽阔，边缘树林和缓坡提供侧翼掩护，骑兵可沿两翼展开。',grid((x,y)=>[0,7].includes(y)&&[1,2,11,12].includes(x)?'forest':[0,13].includes(x)&&[1,6].includes(y)?'hill':'land'),[[[0,4],[4,4],[8,3],[13,3]]]),
 'plain-ridges':map('平原 · 双丘夹道','land','两片丘陵夹住低地，北面林带掩护迂回，中路与南侧均可通行。',rows([
  '..fff.........','...ffhhh......','....hhhh..ff..','....hh....ff..',
  '......hh......','......hhhh....','.......hhh....','..........ff..',
 ]),[[[0,4],[4,4],[6,3],[10,3],[13,4]],[[2,7],[5,6],[8,6],[11,7]]]),
 'plain-crossroads':map('平原 · 古道交汇','land','斜向林带分隔三条开阔进路，中央交汇处便于集中兵力，两侧可以包抄。',rows([
  '....ff........','.....ff...hh..','..hh..f.......','..hh..........',
  '........ff....','...f....fff...','..fff.........','...ff.....hh..',
 ]),[[[0,2],[4,3],[7,3],[10,5],[13,6]],[[0,6],[4,5],[7,3],[10,2],[13,1]]]),
 'forest-belt':map('林地 · 林间大道','forest','两翼林带包围宽阔中路；可沿大道快速接敌，也可从树林掩护下推进。',grid((x,y)=>x>=2&&x<=11&&[1,2,5,6].includes(y)?'forest':'land'),[[[0,3],[5,3],[8,4],[13,4]]]),
 'forest-ravine':map('林地 · 曲折山谷','forest','山壁截断中央直线进路，林中谷道向南弯折；北侧保留一条高地侧路。',rows([
  '..fffrrhhfff..','..ffffrhhfff..','...fffrrffff..','...fffr.ffhh..',
  '...ff.....hh..','..ff...hfff...','..fffhhfffff..','..ffffrrfff...',
 ]),[[[0,4],[4,4],[6,5],[8,4],[13,4]],[[0,1],[4,0],[7,0],[10,1],[13,1]]]),
 'forest-stream':map('林地 · 溪桥密林','forest','纵向溪流穿过密林，上下两座桥连接两岸；林中火攻增强，过桥须选择突破方向。',rows([
  '..ffffwwffff..','..ffffwwfffh..','...fffbbfffh..','...fffwwfff...',
  '...fffwwfff...','..hfffbbfff...','..hfffwwffff..','..ffffwwffff..',
 ]),[[[0,2],[4,2],[7,2],[10,2],[13,2]],[[0,5],[4,5],[7,5],[10,5],[13,5]]]),
 'hill-plateau':map('丘陵 · 双台对垒','hill','两侧台地适合射击和列阵，中央低地与上下边缘可通行，高地转进较慢。',grid((x,y)=>[2,3,4,9,10,11].includes(x)&&y>=1&&y<=6?'hill':'land'),[[[0,4],[5,4],[8,4],[13,4]]]),
 'hill-pass':map('丘陵 · 狭口雄关','hill','山壁封住南北两侧，中间两格宽的关道连通双方；两侧高地可掩护关口。',rows([
  '...hhrrrrhh...','...hhhrrhhh...','....hhrrhh....','....hhhhhh....',
  '....h....h....','....hhrrhh....','...hhhrrhhh...','...hhrrrrhh...',
 ]),[[[0,4],[4,4],[7,4],[10,4],[13,4]]]),
 'hill-spurs':map('丘陵 · 三岭争道','hill','三段山脊错开直线进路，北坡和南坡形成两条绕行路线，控制坡口可限制推进。',rows([
  '...hhh...hh...','...hhr...hhh..','....rrhhh.....','....hhhrhh....',
  '....hhrhhh....','.....hhhrr....','..hhh...rh....','...hh...hhh...',
 ]),[[[0,2],[3,1],[6,1],[9,2],[13,2]],[[0,5],[4,5],[7,6],[10,6],[13,5]]]),
 'marsh-flats':map('湿地 · 芦荡浅滩','marsh','中央浅滩拖慢冲锋，南北两翼保持干燥，适合绕开湿地接敌。',grid((x,y)=>x>=4&&x<=9&&y>=2&&y<=5?'marsh':'land'),[[[0,1],[5,1],[8,1],[13,1]],[[0,6],[5,6],[8,6],[13,6]]]),
 'marsh-dykes':map('湿地 · 水网堤道','marsh','水洼与芦荡交错，中部堤道和南侧小堤可供陆军通行，离开堤道会减慢行军。',rows([
  '...mmmwwmmm...','...mwwwwmmm...','....mwwmmm....','..............',
  '....mmmwwm....','...mmmmwwmm...','..............','...mmmwwmmm...',
 ]),[[[0,3],[4,3],[9,3],[13,3]],[[0,6],[4,6],[9,6],[13,6]]]),
 'marsh-lakes':map('湿地 · 双泽夹岸','marsh','南北水泽夹着中央陆桥，岸边高地可布置远程部队，外侧陆路保留包抄空间。',rows([
  '...hhmmmmhh...','...hmmwwmmh...','....mwwwwm....','....mmmmmm....',
  '..............','....mwwwwm....','...hmmwwmmh...','...hhmmmmhh...',
 ]),[[[0,4],[5,4],[8,4],[13,4]],[[2,0],[2,3],[3,6],[3,7]],[[11,0],[11,3],[10,6],[10,7]]]),
 'river-crossing':map('河流 · 两岸水道','river','两条横向水道供舰船展开，中央桥面连接南北岸，陆军也可沿同侧岸地交锋。',grid((x,y)=>[3,4].includes(y)?([6,7].includes(x)?'bridge':'water'):'land'),[[[6,0],[6,3],[7,4],[7,7]]]),
 'river-twin-bridges':map('河流 · 南北双桥','river','纵向河道隔开两军，上下两桥形成独立突破口；舰船可沿河道支援两处桥头。',rows([
  '..hhmmwwmmhh..','....mmwwmm....','......bb......','....mmwwmm....',
  '....mmwwmm....','......bb......','....mmwwmm....','..hhmmwwmmhh..',
 ]),[[[0,2],[5,2],[8,2],[13,2]],[[0,5],[5,5],[8,5],[13,5]]]),
 'river-harbor':map('河流 · 湾岸港口','river','北侧岸路与南侧开阔港湾并列，码头伸入水面；陆军争夺岸路，舰船从港湾包围。',rows([
  '..hh.....fff..','..hhh....fff..','....m.........','....mm...mm...',
  '...mmmwwwmm...','ww..wwwwww..ww','ww..wwwwww..ww','wwwwwwwwwwwwww',
 ]),[[[0,3],[4,2],[8,2],[13,3]],[[2,3],[2,5],[2,6]],[[11,3],[11,5],[11,6]]]),

 xiapi:map('下邳 · 泗水围城','marsh','城外两片积水区与湿地包围堤道，中央干堤直达城前，北岸高地可用于绕行。',rows([
  '..hhhmmmmhh...','...hmmwwmmm...','....mmwwwmm...','....mmmmmm....',
  '..............','....mwwwmm....','...mmmwwmmf...','..ffffmmmff...',
 ]),[[[0,4],[4,4],[8,4],[13,4]],[[0,0],[4,0],[8,0],[13,0]]]),
 guandu:map('官渡 · 营垒相持','land','北侧缓坡与南侧林带构成不同侧翼，中路旷野供正面展开；林缘小路可用于包抄。',rows([
  '..hhhh....hh..','...hhh...hhh..','....hh....h...','..............',
  '.......f......','...fffffff....','..ffff..ffff..','..fff.....ff..',
 ]),[[[0,3],[5,3],[8,3],[13,3]],[[0,7],[4,7],[7,6],[10,7],[13,7]]]),
 chibi:map('赤壁 · 江面交锋','river','斜向宽阔江面、岸边沙洲与中部桥面划出水陆线路；舰船在江面展开，陆军可沿两岸推进。',rows([
  '..hhffff......','....m...mmwwww','wwwwwwbbwwwwww','wwwwwwbbwwwwww',
  'wwwwwwbbwwwwww','wwwwwwbbwwwwww','wwwwmm...m....','......ffffhh..',
 ]),[[[0,0],[4,0],[8,0],[13,0]],[[0,7],[5,7],[9,7],[13,7]],[[6,0],[6,3],[7,4],[7,7]]]),
 hefei:map('合肥 · 逍遥津渡口','river','纵向水道分割城前平地与东岸湿地，中央窄桥是近路，北侧岸道可绕行。',rows([
  '..ff..........','...hmmwwmmf...','...hmmwwmm....','......bb......',
  '......bb......','....mmwwmmm...','...fmmwwmmm...','...fffwwmm....',
 ]),[[[0,4],[5,4],[8,4],[13,4]],[[0,0],[5,0],[8,0],[13,1]]]),
 yiling:map('夷陵 · 山林连营','forest','山壁与密林围出向南弯折的谷道，北侧高地留出窄路；林中火攻与迂回均受地形影响。',rows([
  '..ffrrrhhfff..','..ffffrhhfff..','...fffrfffff..','...fff..ffhh..',
  '...f......hh..','..ff...hfff...','..ffffhhhfff..','..fffrrrrfff..',
 ]),[[[0,3],[3,3],[6,4],[9,4],[13,4]],[[0,0],[3,1],[5,1],[7,0],[10,1],[13,1]]]),
 wuzhang:map('五丈原 · 渭滨对垒','hill','两片前沿台地夹住中央低地，北侧渭水设桥；后方平地、南侧林带与河道两端留出绕行路线。',rows([
  '..............','....wwbbww....','....hh..hh....','....hh..hh....',
  '....hh..hh....','....hh..hh....','....hhffhh....','..............',
 ]),[[[0,4],[4,4],[7,4],[10,4],[13,4]],[[6,0],[6,1],[6,3],[7,5],[8,7]]]),
};

export function battleMap(b){return BATTLE_MAPS[b.mapId]||BATTLE_MAPS[DEFAULT_BATTLE_MAPS[b.terrain||'land']];}

// Stable selection by actual place/road, independent of seed, faction or RNG.
export function fieldBattleMapId(terrain,placeId,kind){
 if(kind==='port'&&terrain==='river')return 'river-harbor';
 if(kind==='gate'&&terrain==='hill')return 'hill-pass';
 const ids=FIELD_MAP_IDS[terrain]||FIELD_MAP_IDS.land;
 let hash=0;for(const c of String(placeId))hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
 return ids[hash%ids.length];
}
