import {atlasPoint,ATLAS_COAST,ATLAS_FRONTIER,ATLAS_HIGHLANDS,ATLAS_PROVINCES} from './data/design/ancient-atlas.mjs';
// One aspect-preserving projection for terrain, cities, roads and radar.
// River courses are traced/adapted from the supplied scan, not historical GIS.
const points=ps=>ps.map(atlasPoint);
export const polygonPath=ps=>'M'+ps.map(p=>p.join(' ')).join('L')+'Z';
export const LAND_PATH=polygonPath(points(ATLAS_COAST));
export const NORTHERN_PATH=polygonPath(points([[-50,-35],[1420,-35],...ATLAS_FRONTIER.toReversed(),[-50,280]]));
export const HIGHLAND_PATH=polygonPath(points([...ATLAS_HIGHLANDS,[190,1260],[310,1384],[560,1477],[-50,1515],[-50,282]]));
export const PROVINCE_LABELS=ATLAS_PROVINCES.map(([name,x,y])=>({name,point:atlasPoint([x,y])}));
export const RIVERS=[
 {id:'huanghe',name:'黄河',width:5,points:points([[0,790],[116,835],[249,850],[364,789],[438,686],[454,576],[487,468],[535,401],[566,333],[607,256],[685,235],[760,234],[817,238],[822,302],[794,400],[793,468],[831,525],[907,535],[976,527],[1033,497],[1048,454],[1084,437],[1120,430],[1170,399],[1232,390]]),label:atlasPoint([1068,428]).concat(-18)},
 {id:'changjiang',name:'长江',width:6,points:points([[0,1225],[48,1142],[91,1105],[130,1192],[199,1205],[240,1299],[270,1331],[351,1360],[416,1326],[445,1264],[398,1230],[338,1185],[363,1120],[478,995],[554,975],[602,967],[604,932],[629,904],[666,869],[733,832],[776,831],[824,844],[870,859],[917,892],[958,907],[1009,890],[1080,887],[1117,866],[1164,844],[1208,813],[1241,778],[1248,753],[1284,744],[1315,722]]),label:atlasPoint([942,915]).concat(8)},
 {id:'huaihe',name:'淮河',width:3,points:points([[997,638],[1013,678],[1050,694],[1104,697],[1149,722],[1201,701],[1231,686],[1259,685]]),label:atlasPoint([1137,732]).concat(0)},
 {id:'hanshui',name:'汉水',width:2.8,points:points([[593,675],[653,704],[716,717],[766,733],[804,754],[848,765],[886,793],[921,811],[945,843],[970,868],[990,888]]),label:atlasPoint([821,789]).concat(23)},
 {id:'weishui',name:'渭水',width:2.4,points:points([[532,642],[590,627],[643,634],[699,650],[749,649],[792,628],[815,589],[833,556]]),label:atlasPoint([682,656]).concat(0)},
 {id:'xiangshui',name:'湘水',width:2.1,points:points([[841,1155],[878,1112],[878,1070],[907,1037],[938,999],[946,957],[920,926],[908,895]]),label:atlasPoint([912,1050]).concat(-60)},
 {id:'ganshui',name:'赣水',width:2.1,points:points([[1077,1222],[1059,1177],[1095,1137],[1121,1106],[1110,1043],[1130,995],[1121,956],[1107,919],[1080,887]]),label:atlasPoint([1143,1057]).concat(-75)},
 {id:'minjiang',name:'岷江',width:2.1,points:points([[413,771],[431,821],[460,875],[481,923],[478,962],[478,995]]),label:atlasPoint([436,907]).concat(67)},
 {id:'jialing',name:'嘉陵江',width:1.8,points:points([[562,668],[584,730],[569,789],[576,823],[587,865],[603,887],[604,932]]),label:atlasPoint([610,821]).concat(77)},
 {id:'liaoshui',name:'辽水',width:2.1,points:points([[1298,75],[1284,119],[1298,167],[1278,202],[1266,234],[1265,275]]),label:atlasPoint([1321,127]).concat(72)},
 {id:'fenshui',name:'汾水',width:1.7,points:points([[896,311],[887,358],[863,406],[865,453],[843,493],[833,556]]),label:atlasPoint([852,445]).concat(82)},
];
const lake=(name,ps,label)=>({name,d:polygonPath(points(ps)),label:atlasPoint(label)});
export const LAKES=[
 lake('洞庭湖',[[862,910],[883,901],[901,914],[916,910],[928,934],[920,957],[900,954],[877,967],[860,948]],[894,936]),
 lake('鄱阳湖',[[1110,912],[1120,920],[1119,939],[1132,949],[1129,968],[1115,974],[1101,955],[1104,938]],[1118,945]),
 lake('太湖',[[1290,782],[1305,777],[1317,790],[1311,814],[1297,818],[1286,804]],[1302,799]),
];
const mountain=(name,ps,width,label)=>({name,points:points(ps),width,label:atlasPoint(label)});
export const MOUNTAINS=[
 mountain('燕山',[[963,191],[1030,211],[1095,200],[1151,191],[1198,161]],17,[1082,200]),
 mountain('太行山',[[934,304],[922,365],[930,419],[927,475],[907,513]],15,[936,412]),
 mountain('吕梁山',[[839,328],[830,390],[830,456],[802,514]],13,[799,410]),
 mountain('祁连山',[[146,295],[216,323],[279,352],[328,400]],21,[244,333]),
 mountain('陇山',[[587,538],[594,584],[620,622]],12,[569,571]),
 mountain('秦岭',[[558,650],[617,658],[678,671],[736,687],[800,696],[848,714]],17,[713,688]),
 mountain('大巴山',[[646,763],[689,764],[740,775],[785,794]],17,[695,785]),
 mountain('大别山',[[1093,771],[1137,791],[1184,799]],12,[1139,787]),
 mountain('泰山',[[1161,483],[1173,517],[1203,542]],11,[1191,519]),
 mountain('巫山',[[792,816],[821,826],[846,844]],12,[817,819]),
 mountain('武陵山',[[773,887],[798,940],[817,984],[825,1046]],19,[794,970]),
 mountain('雪山',[[300,608],[328,676],[353,723],[355,785],[371,852],[365,905]],25,[325,768]),
 mountain('南岭',[[750,1216],[825,1224],[878,1219],[948,1205],[1014,1193]],18,[897,1208]),
 mountain('武夷山',[[1213,1013],[1191,1060],[1197,1107],[1161,1149]],17,[1231,1100]),
 mountain('会稽山',[[1332,885],[1304,918],[1289,967]],13,[1330,935]),
 mountain('乌蒙山',[[410,1029],[450,1070],[487,1102],[516,1154]],18,[477,1085]),
];
export function polyline(ps){
 let d=`M${ps[0][0]} ${ps[0][1]}`;
 for(let i=1;i<ps.length-1;i++){
  const a=ps[i-1],b=ps[i],c=ps[i+1],before=Math.hypot(a[0]-b[0],a[1]-b[1]),after=Math.hypot(c[0]-b[0],c[1]-b[1]),r=Math.min(5,before/3,after/3);
  if(!before||!after)continue;
  d+=`L${b[0]+(a[0]-b[0])*r/before} ${b[1]+(a[1]-b[1])*r/before}Q${b[0]} ${b[1]} ${b[0]+(c[0]-b[0])*r/after} ${b[1]+(c[1]-b[1])*r/after}`;
 }
 return d+`L${ps.at(-1)[0]} ${ps.at(-1)[1]}`;
}
export function waterMarkup({labels=true,mini=false}={}){
 return `<g class="map-water-system" pointer-events="none">${RIVERS.map(r=>`<path d="${polyline(r.points)}" fill="none" stroke="#f2dcb4" stroke-opacity=".75" stroke-width="${r.width+2}" stroke-linejoin="round" stroke-linecap="round"/><path data-river="${r.id}" d="${polyline(r.points)}" fill="none" stroke="#77a8b4" stroke-width="${mini?Math.max(3,r.width):r.width}" stroke-linejoin="round" stroke-linecap="round"/>${mini?'':`<path d="${polyline(r.points)}" fill="none" stroke="#c8e1df" stroke-opacity=".65" stroke-width="${r.width*.22}" stroke-linejoin="round"/>`}`).join('')}${LAKES.map(l=>`<path d="${l.d}" fill="#98bfca" stroke="#eddbb4" stroke-width="1.5"/>`).join('')}${labels?geographyLabels():''}</g>`;
}
export function geographyLabels(){return `<g class="geography-labels" pointer-events="none" fill="#355c66" font-family="serif" font-size="11" letter-spacing="3" paint-order="stroke" stroke="#e6d6b2" stroke-width="2.5" stroke-opacity=".85">${RIVERS.map(r=>`<text transform="translate(${r.label[0]} ${r.label[1]}) rotate(${r.label[2]})" text-anchor="middle">${r.name}</text>`).join('')}${LAKES.map(l=>`<text x="${l.label[0]}" y="${l.label[1]}" text-anchor="middle" font-size="8" letter-spacing="1">${l.name}</text>`).join('')}<g fill="#655545" stroke="#e5cda4" font-size="10" letter-spacing="2">${MOUNTAINS.map(m=>`<text x="${m.label[0]}" y="${m.label[1]}" text-anchor="middle">${m.name}</text>`).join('')}</g></g>`;}
