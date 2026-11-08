import {atlasPoint,ATLAS_COAST,ATLAS_FRONTIER,ATLAS_HIGHLANDS,ATLAS_PROVINCES} from './data/design/ancient-atlas.mjs';
// One aspect-preserving projection for terrain, cities and roads.
// River courses are traced/adapted from the supplied scan, not historical GIS.
const points=ps=>ps.map(atlasPoint);
export const polygonPath=ps=>'M'+ps.map(p=>p.join(' ')).join('L')+'Z';
export const LAND_POLYGON=points(ATLAS_COAST);
export const LAND_PATH=polygonPath(LAND_POLYGON);
// Display geometry only. Labels and scenery must use the same coast as the atlas.
export function isLandPoint(x,y){
 let inside=false;
 for(let i=0,j=LAND_POLYGON.length-1;i<LAND_POLYGON.length;j=i++){
  const a=LAND_POLYGON[i],b=LAND_POLYGON[j];
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
export const NORTHERN_PATH=polygonPath(points([[-50,-35],[1420,-35],...ATLAS_FRONTIER.toReversed(),[-50,280]]));
export const HIGHLAND_PATH=polygonPath(points([...ATLAS_HIGHLANDS,[190,1260],[310,1384],[560,1477],[-50,1515],[-50,282]]));
export const PROVINCE_LABELS=ATLAS_PROVINCES.map(([name,x,y])=>({name,point:atlasPoint([x,y])}));
export const RIVERS=[
 {id:'huanghe',name:'黄河',width:10,points:points([[0,790],[116,835],[249,850],[364,789],[438,686],[454,576],[487,468],[535,401],[566,333],[607,256],[685,235],[760,234],[817,238],[822,302],[794,400],[793,468],[831,525],[907,535],[976,527],[1033,497],[1048,454],[1084,437],[1120,430],[1170,399],[1232,390],[1270,374]]),label:atlasPoint([1068,428]).concat(-18)},
 // Keep the river between the actual banks: Jiangxia/Guangling on the north,
 // Wuchang/Chaisang/Jianye/Jingkou on the south; ports sit on those banks.
 {id:'changjiang',name:'长江',width:12,points:points([[0,1225],[48,1142],[91,1105],[130,1192],[199,1205],[240,1299],[270,1331],[351,1360],[416,1326],[445,1264],[398,1230],[338,1185],[363,1120],[478,995],[554,975],[602,967],[604,955],[629,940],[666,900],[733,855],[776,855],[824,860],[870,880],[917,892],[958,907],[1000,850],[1030,840],[1070,830],[1100,850],[1117,866],[1164,780],[1208,723],[1241,711],[1284,697],[1315,690]]),label:atlasPoint([942,915]).concat(8)},
 {id:'huaihe',name:'淮河',width:7,points:points([[930,735],[975,735],[1013,730],[1050,720],[1104,697],[1149,722],[1201,715],[1231,710],[1259,705]]),label:atlasPoint([1137,732]).concat(0)},
 {id:'hanshui',name:'汉水',width:7,points:points([[593,675],[653,704],[716,717],[766,733],[804,754],[848,765],[886,793],[921,811],[945,843],[970,868],[990,864]]),label:atlasPoint([821,789]).concat(23)},
 {id:'weishui',name:'渭水',width:4,points:points([[532,642],[590,627],[643,634],[699,650],[749,649],[792,628],[815,589],[833,556],[839,526]]),label:atlasPoint([682,656]).concat(0)},
 {id:'xiangshui',name:'湘水',width:5,points:points([[841,1155],[878,1112],[878,1070],[907,1037],[938,999],[934,982],[930,965],[927,945]]),label:atlasPoint([912,1050]).concat(-60)},
 {id:'ganshui',name:'赣水',width:5,points:points([[1077,1222],[1059,1177],[1095,1137],[1121,1106],[1100,1070],[1096,1035],[1098,1002],[1086,975],[1088,950],[1103,930]]),label:atlasPoint([1084,1055]).concat(-82)},
 {id:'fushui',name:'抚水',width:3.5,points:points([[1167,1100],[1146,1045],[1141,992],[1135,960],[1129,920]]),label:atlasPoint([1158,1027]).concat(-82)},
 {id:'yuanshui',name:'沅水',width:4.5,points:points([[780,1040],[815,1010],[842,983],[863,966],[888,952],[906,945]]),label:atlasPoint([827,1008]).concat(-28)},
 {id:'lishui',name:'澧水',width:3.5,points:points([[800,882],[835,909],[866,922],[900,928],[911,935]]),label:atlasPoint([840,906]).concat(20)},
 {id:'dongting-outlet',name:'洞庭水道',width:6,points:points([[931,914],[945,913],[958,907]]),label:atlasPoint([938,912]).concat(0),unlabeled:true},
 {id:'poyang-outlet',name:'彭蠡水道',width:6,points:points([[1117,899],[1118,882],[1117,866]]),label:atlasPoint([1118,885]).concat(-85),unlabeled:true},
 {id:'rushui',name:'濡须水',width:5,points:points([[1152,772],[1158,782],[1156,794.64]]),label:atlasPoint([1167,786]).concat(65)},
 {id:'dushui',name:'堵水',width:3.5,points:points([[733,800],[755,772],[767,752],[777,739]]),label:atlasPoint([752,775]).concat(-55)},
 {id:'minjiang',name:'岷江',width:4,points:points([[413,771],[431,821],[460,875],[481,923],[478,962],[478,995]]),label:atlasPoint([436,907]).concat(67)},
 {id:'jialing',name:'嘉陵江',width:4,points:points([[562,668],[584,730],[569,789],[576,823],[587,865],[603,887],[604,932],[604,955]]),label:atlasPoint([610,821]).concat(77)},
 {id:'liaoshui',name:'辽水',width:4,points:points([[1298,75],[1284,119],[1298,167],[1278,202],[1266,234],[1265,275],[1262,296]]),label:atlasPoint([1321,127]).concat(72)},
 {id:'fenshui',name:'汾水',width:3.5,points:points([[855,322],[858,355],[863,406],[865,453],[843,493],[839,526]]),label:atlasPoint([852,445]).concat(82)},
];
const lake=(name,ps,label)=>({name,points:points(ps),d:polygonPath(points(ps)),label:atlasPoint(label)});
export const LAKES=[
 lake('洞庭湖',[[908,920],[922,912],[936,914],[946,930],[946,952],[939,975],[921,983],[906,969],[901,948]],[925,946]),
 lake('鄱阳湖',[[1100,905],[1117,899],[1131,907],[1135,924],[1128,940],[1117,946],[1104,942],[1099,928]],[1117,924]),
 lake('太湖',[[1290,782],[1305,777],[1317,790],[1311,814],[1297,818],[1286,804]],[1302,799]),
 lake('巢湖',[[1128,761],[1140,755],[1157,760],[1161,772],[1150,781],[1135,779],[1125,770]],[1141,768]),
];
export const WATER_SHORES=[...RIVERS,...LAKES.map(l=>({id:l.name,width:0,points:[...l.points,l.points[0]]})),{id:'coast',width:0,points:LAND_POLYGON}];
export function nearestWaterPoint(point,id){
 let best={distance:Infinity};
 for(const line of WATER_SHORES.filter(l=>!id||l.id===id))for(let i=1;i<line.points.length;i++){
  const a=line.points[i-1],b=line.points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.y-a[1])*dy)/(dx*dx+dy*dy||1))),x=a[0]+dx*t,y=a[1]+dy*t,distance=Math.hypot(point.x-x,point.y-y);
  if(distance<best.distance)best={distance,x,y,width:line.width,id:line.id};
 }
 return best;
}
export function isLakePoint(point,name=null){
 for(const lake of LAKES.filter(l=>!name||l.name===name)){let inside=false;for(let i=0,j=lake.points.length-1;i<lake.points.length;j=i++){
  const a=lake.points[i],b=lake.points[j];if((a[1]>point.y)!==(b[1]>point.y)&&point.x<(b[0]-a[0])*(point.y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }if(inside)return true;}return false;
}
export function isWaterPoint(point,padding=0){
 if(!isLandPoint(point.x,point.y)||padding>0&&nearestWaterPoint(point,'coast').distance<=padding)return true;
 if(isLakePoint(point)||padding>0&&LAKES.some(l=>nearestWaterPoint(point,l.name).distance<=padding))return true;
 return RIVERS.some(r=>nearestWaterPoint(point,r.id).distance<=r.width/2+padding);
}
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
export function geographyLabels(){return `<g class="geography-labels" pointer-events="none" fill="#355c66" font-family="serif" font-size="11" letter-spacing="3" paint-order="stroke" stroke="#e6d6b2" stroke-width="2.5" stroke-opacity=".85">${RIVERS.filter(r=>!r.unlabeled).map(r=>`<text transform="translate(${r.label[0]} ${r.label[1]}) rotate(${r.label[2]})" text-anchor="middle">${r.name}</text>`).join('')}${LAKES.map(l=>`<text x="${l.label[0]}" y="${l.label[1]}" text-anchor="middle" font-size="8" letter-spacing="1">${l.name}</text>`).join('')}<g fill="#655545" stroke="#e5cda4" font-size="10" letter-spacing="2">${MOUNTAINS.map(m=>`<text x="${m.label[0]}" y="${m.label[1]}" text-anchor="middle">${m.name}</text>`).join('')}</g></g>`;}
