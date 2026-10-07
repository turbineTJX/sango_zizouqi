// City inventory derived from the supplied atlas. These are real economic
// cities in the game, distinct from pass/port/junction road nodes.
// The scan's later-period names are adapted to Three Kingdoms names where
// identifiable; a regional substitute is explicitly marked, not a same-city alias.
export const ATLAS_SAME_CITY_NAMES = [
 {label:'建康',id:'town-23',name:'建业'},
 {label:'寿阳',id:'town-11',name:'寿春'},
 {label:'南阳',id:'wan',name:'宛'},
 {label:'姑臧',id:'town-22',name:'武威'},
 {label:'上邽',id:'town-21',name:'天水'},
 {label:'白帝城',id:'town-36',name:'永安'},
 {label:'渤海',id:'town-4',name:'南皮'},
];
// User-confirmed legend: squares are major cities, circles are small cities,
// diamonds are passes. Retained scenario towns without a highlighted marker
// are small cities as a game adaptation; they are not claimed to be circles.
export const ATLAS_LARGE_CITY_IDS = Object.freeze([
 'atlas-dunhuang','atlas-zhangye','town-22','atlas-xiping','atlas-jincheng',
 'town-21','town-20','town-18','town-37','town-38','town-40','atlas-fuling',
 'atlas-chengle','atlas-pingcheng','town-3','atlas-zhongshan','town-4',
 'jinyang','ye','atlas-pingyang','town-12','atlas-suifang','atlas-linshi',
 'atlas-liucheng','atlas-feiru','atlas-pingguo',
 'luoyang','xuchang','atlas-pengcheng','atlas-qiao','wan','town-30',
 'town-11','town-23','atlas-guangling','town-31','atlas-wuchang','town-25',
 'atlas-yuzhang','town-32','atlas-panyu','atlas-longbian',
]);
export const ATLAS_CIRCLE_CITY_IDS = Object.freeze([
 'runan','town-24','town-29','town-33','town-36','town-41',
 'atlas-zhongli','atlas-hefei','atlas-jingkou','atlas-houguan','atlas-xunyang',
 'atlas-baling','atlas-linchuan','atlas-leling','atlas-donglai','atlas-lishi',
 'atlas-changzi','atlas-jingxing',
]);
const largeCities=new Set(ATLAS_LARGE_CITY_IDS);
export const atlasCitySize=id=>largeCities.has(id)?'large':'small';
export const ATLAS_POINT_REVISIONS = {
 'town-1':[1340,133], 'town-2':[1105,272], 'town-4':[1080,369],
 'town-5':[1079,422], 'town-8':[1221,510], 'town-9':[1190,587],
 'town-10':[1095,577], 'town-26':[1089,816], 'town-27':[1067,925],
 'town-28':[992,847], 'town-29':[894,732], 'town-33':[878,946],
 'town-34':[941,1078], 'town-35':[887,1120], 'town-42':[400,1226],
};
// Every addition has an explicit region, point, scenario owners and neighbors.
// Neutral border towns stay neutral; no officers or garrisons are fabricated.
export const ATLAS_CITY_ADDITIONS = [
 {id:'atlas-dunhuang',name:'敦煌',point:[44,253],province:'凉州',neighbors:['atlas-zhangye'],owners:['neutral','cao']},
 {id:'atlas-zhangye',name:'张掖',point:[307,334],province:'凉州',neighbors:['town-22','atlas-jincheng'],owners:['neutral','cao']},
 {id:'atlas-xiping',name:'西平',point:[371,493],province:'凉州',neighbors:['atlas-jincheng','town-22'],owners:['neutral','cao']},
 {id:'atlas-jincheng',name:'金城',point:[461,526],province:'凉州',neighbors:['town-20','atlas-longxi'],owners:['neutral','cao']},
 {id:'atlas-longxi',name:'陇西',point:[481,593],province:'凉州',neighbors:['town-21','atlas-xiping'],owners:['neutral','cao']},
 {id:'atlas-chengle',name:'成乐',label:'盛乐',point:[838,244],province:'并州',neighbors:['atlas-pingcheng','atlas-suifang'],owners:['neutral','yuan']},
 {id:'atlas-suifang',name:'绥方',point:[709,402],province:'并州',neighbors:['atlas-lishi','town-20'],owners:['neutral','yuan']},
 {id:'atlas-pingcheng',name:'平城',point:[907,258],province:'并州',neighbors:['atlas-yanmen','atlas-jundu'],owners:['yuan','yuan']},
 {id:'atlas-zhongshan',name:'中山',point:[997,350],province:'冀州',neighbors:['town-3','town-4','atlas-jingxing'],owners:['yuan','yuan']},
 {id:'atlas-pingyang',name:'平阳',point:[837,519],province:'并州',neighbors:['jinyang','town-65','atlas-lishi'],owners:['yuan','cao']},
 {id:'atlas-linshi',name:'临淄',label:'广固',regionalSubstitute:true,point:[1172,446],province:'青州',neighbors:['town-8','town-5','atlas-donglai'],owners:['cao','yuan']},
 {id:'atlas-pengcheng',name:'彭城',point:[1130,600],province:'徐州',neighbors:['town-10','town-9','atlas-qiao','atlas-zhongli'],owners:['cao','sunce']},
 {id:'atlas-qiao',name:'谯',label:'谯城',point:[1062,633],province:'豫州',neighbors:['xuchang','runan','town-11','town-10'],owners:['cao','cao']},
 {id:'atlas-fuling',name:'涪陵',point:[694,946],province:'益州',neighbors:['town-39','town-36','town-33'],owners:['neutral','force-2']},
 {id:'atlas-yuzhang',name:'豫章',point:[1105,956],province:'扬州',neighbors:['town-27','town-76','atlas-linchuan','atlas-houguan'],owners:['sunce','sunce']},
 {id:'atlas-panyu',name:'番禺',point:[992,1305],province:'交州',neighbors:['town-34','atlas-longbian','atlas-houguan'],owners:['neutral','sunce']},
 {id:'atlas-longbian',name:'龙编',point:[591,1450],province:'交州',neighbors:['town-41','town-42','atlas-panyu'],owners:['neutral','force-2']},
 {id:'atlas-liucheng',name:'柳城',label:'和龙',regionalSubstitute:true,point:[1218,128],province:'幽州',neighbors:['atlas-feiru','atlas-pingguo','town-1'],owners:['neutral','yuan']},
 {id:'atlas-pingguo',name:'平郭',point:[1313,199],province:'幽州',neighbors:['town-1','town-53'],owners:['neutral','yuan']},
 {id:'atlas-feiru',name:'肥如',point:[1165,232],province:'幽州',neighbors:['town-2','town-3','town-4'],owners:['yuan','yuan']},
 {id:'atlas-wuchang',name:'武昌',point:[1042,853],province:'荆北',neighbors:['town-28','town-27','town-78','town-74'],owners:['force-7','sunce']},
 {id:'atlas-zhongli',name:'钟离',point:[1165,686],province:'徐州',neighbors:['town-11','atlas-hefei','atlas-guangling'],owners:['cao','sunce']},
 {id:'atlas-hefei',name:'合肥',point:[1121,748],province:'扬州',neighbors:['town-11','town-26','town-61'],owners:['cao','cao']},
 {id:'atlas-guangling',name:'广陵',point:[1258,699],province:'徐州',neighbors:['town-60','town-23','atlas-jingkou'],owners:['cao','sunce']},
 {id:'atlas-jingkou',name:'京口',point:[1260,716],province:'扬州',neighbors:['town-23','town-24','town-71'],owners:['sunce','sunce']},
 {id:'atlas-houguan',name:'侯官',label:'晋安',point:[1311,1088],province:'扬州',neighbors:['town-25','atlas-linchuan'],owners:['neutral','sunce']},
 {id:'atlas-xunyang',name:'寻阳',point:[1100,892],province:'扬州',neighbors:['town-27','atlas-wuchang','town-74','atlas-yuzhang'],owners:['sunce','sunce']},
 {id:'atlas-baling',name:'巴陵',point:[956,923],province:'荆南',neighbors:['town-31','town-32','town-84','atlas-wuchang'],owners:['force-7','force-2']},
 {id:'atlas-linchuan',name:'临川',point:[1128,992],province:'扬州',neighbors:['town-77','town-34'],owners:['sunce','sunce']},
 {id:'atlas-leling',name:'乐陵',point:[1130,393],province:'冀州',neighbors:['town-4','town-5','atlas-linshi'],owners:['yuan','yuan']},
 {id:'atlas-donglai',name:'东莱',point:[1240,404],province:'青州',neighbors:['town-8','town-57'],owners:['cao','yuan']},
 {id:'atlas-lishi',name:'离石',point:[816,425],province:'并州',neighbors:['jinyang','town-55','atlas-changzi'],owners:['yuan','yuan']},
 {id:'atlas-changzi',name:'长子',point:[904,508],province:'并州',neighbors:['jinyang','town-43','atlas-pingyang'],owners:['yuan','cao']},
 {id:'atlas-jingxing',sourceId:1035,name:'井陉',point:[978,379],province:'冀州',neighbors:['jinyang'],owners:['yuan','yuan']},
];
export const ATLAS_GATE_ADDITIONS = [
 {id:'atlas-yanmen',sourceId:1033,name:'雁门关',point:[894,328],province:'并州',neighbors:['jinyang']},
 {id:'atlas-jundu',sourceId:1034,name:'军都关',point:[1028,225],province:'幽州',neighbors:['town-3']},
];
export const ATLAS_ADDITIONS = [...ATLAS_CITY_ADDITIONS.map(c=>({...c,kind:'city'})),...ATLAS_GATE_ADDITIONS.map(c=>({...c,kind:'gate'}))];
export const ATLAS_REPLACED_ROADS = [['town-3','jinyang']];
export const ATLAS_NAME_SOURCES = [
 ['建业／建康','https://www.xwzf.gov.cn/zjxw/xwgk/lsyg/'],
 ['寿春／寿阳','https://www.shouxian.gov.cn/ztbd/ztzl/cctwsx/fyfc/8112346.html'],
 ['侯官／晋安','https://www.fzja.gov.cn/xjwz/qzfc/jagk/jzyg/202107/t20210706_4134658.htm'],
 ['柳城区域沿革','https://www.cyx.gov.cn/cyxzf/mlcyx/index.html'],
];
