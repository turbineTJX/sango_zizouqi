import fs from 'node:fs';
const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8').replaceAll('\r\n','\n')));
edit('national-map-view.mjs',s=>{
 s="import {operationMapView} from './strategic-map-camera.mjs';\n"+s;
 const land=s.match(/<path d="(M0 0H1024V70[^"]+)"/)[1];
 s=s.replace("export function nationalTerrain",`const NATIONAL_LAND_PATH='${land}';\nexport function nationalTerrain`);
 s=s.replace(`d="${land}"`,'d="${NATIONAL_LAND_PATH}"');
 s=s.replace("const spec=nationalScenario(s.campaign.scenarioId),byId=id=>s.cities.find(c=>c.id===id),v=ui.strategicMapView||{x:0,y:0,width:1024,height:1024};", "const spec=nationalScenario(s.campaign.scenarioId),{view:v,focus}=operationMapView(s,ui,army);");
 s=s.replace('山河舆图 · ${spec.name}', '周边舆图 · ${esc(focus.name)}');
 s=s.replace('42 城 · 10 关 · 35 港 · ${s.junctions?.length||0} 路口 · 拖动平移 / 滚轮缩放','拖动主图巡视 · 滚轮缩放 · 小地图快速定位');
 s=s.replace('<button data-map-view="national">全国</button><button data-map-view="theater">中原</button><button data-map-view="selected">定位</button>', '<button data-map-view="selected">操作中心</button>');
 s=s.replace(' <svg class="strategy-world strategy-world-art strategy-world-drawn national-world', ' <div class="national-map-stage"><svg data-focus-x="${focus.x}" data-focus-y="${focus.y}" class="strategy-world strategy-world-art strategy-world-drawn national-world');
 s=s.replace('aria-label="天下全图，87处据点可交互，方向键平移，加减键缩放"','aria-label="当前操作区域，方向键平移，加减键缩放；全国位置见小地图"');
 s=s.replace('${spec.name} · 中国城郭关津全图','${spec.name} · ${esc(focus.name)}周边');
 s=s.replace("</g>`).join('')}</svg>\n <details class=\"national-legend\"", "</g>`).join('')}</svg>${radarMap(s,v)}</div>\n <details class=\"national-legend\"");
 s+=`
function radarMap(s,v){
 return \`<aside class="strategy-radar" aria-label="全国小地图"><div class="radar-heading"><b>天下略图</b><span>点击 / 拖动定位</span></div><svg data-strategy-radar viewBox="0 0 1024 1024" role="group" tabindex="0" aria-label="全国雷达地图，点击或拖动移动主图视野，方向键平移，Home返回操作中心"><rect width="1024" height="1024" fill="#a8beb6"/><path d="\${NATIONAL_LAND_PATH}" fill="#d6d8b4" stroke="#71806b" stroke-width="5"/>\${s.cities.map(c=>\`<circle cx="\${c.x}" cy="\${c.y}" r="\${c.kind==='city'?7:4}" fill="\${FACTIONS[c.owner].color}"/>\`).join('')}\${s.armies.filter(a=>!a.disbanded).map(a=>{const p=armyPosition(s,a);return \`<path d="M\${p.x} \${p.y-9}l8 15h-16Z" fill="\${FACTIONS[a.faction].color}" stroke="#fff8d3" stroke-width="2"/>\`;}).join('')}<rect class="radar-viewport" x="\${v.x}" y="\${v.y}" width="\${v.width}" height="\${v.height}"/></svg></aside>\`;
}
`;
 return s;
});
edit('strategic-view.mjs',s=>s.replace("s.campaign.scenarioId?'天下全图':'中原战区'", "s.campaign.scenarioId?'当前操作区域':'中原战区'"));
edit('app.js',s=>s.replace("p.mapUI.city=p.destination;", "p.mapUI.city=p.destination||p.city;").replace("ui.zoom = 1; render(); window.scrollTo", "ui.zoom = 1;ui.strategicMapView=null;ui.mapFocusKey=null;ui.mapCameraManual=false; render(); window.scrollTo"));
edit('sw.js',s=>s.replace(/const CACHE = '[^']+';/,"const CACHE = 'sango-local-radar-20260922';").replace('const ASSETS = [',"const ASSETS = ['./strategic-map-camera.mjs',"));
