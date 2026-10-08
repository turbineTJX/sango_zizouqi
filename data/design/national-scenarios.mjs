// Authoritative strategic scenarios. Historical territory is an adaptation of
// the reference project's cities and households, not an imported historical save.
export const EXTRA_FACTION_DESIGNS = {
 sunce:{name:'孙策',leaderName:'孙策',short:'孙',color:'#ac7a35'},
 liuzhang:{name:'刘璋',leaderName:'刘璋',short:'刘',color:'#667743'},
 lijue:{name:'李傕',leaderName:'李傕',short:'李',color:'#8b6856'},
 sunquan:{name:'孙权',leaderName:'孙权',short:'孙',color:'#b58b42'},
 gongsunkang:{name:'公孙康',leaderName:'公孙康',short:'公',color:'#587f91'},
 gongsungong:{name:'公孙恭',leaderName:'公孙恭',short:'公',color:'#587f91'},
};
// Added atlas towns inherit a named regional anchor. Unassigned frontier towns
// stay neutral; their ownership is never guessed from a ruler's display color.
export const ATLAS_SCENARIO_ANCHORS = {
 'atlas-dunhuang':22,'atlas-zhangye':22,'atlas-xiping':22,'atlas-jincheng':20,'atlas-longxi':21,
 'atlas-chengle':6,'atlas-suifang':6,'atlas-pingcheng':6,'atlas-zhongshan':7,'atlas-pingyang':6,
 'atlas-linshi':8,'atlas-pengcheng':9,'atlas-qiao':14,'atlas-fuling':39,'atlas-yuzhang':27,
 'atlas-liucheng':2,'atlas-pingguo':1,'atlas-feiru':2,'atlas-wuchang':28,'atlas-zhongli':11,
 'atlas-hefei':11,'atlas-guangling':9,'atlas-jingkou':23,'atlas-houguan':25,'atlas-xunyang':27,
 'atlas-baling':32,'atlas-linchuan':27,'atlas-leling':4,'atlas-donglai':8,'atlas-lishi':6,
 'atlas-changzi':6,'atlas-jingxing':7,
};
const historicalNote='人物与势力关系参考项目人物库，领地按年代作玩法适配；未登场及已去世人物不进入开局。';
export const NATIONAL_SCENARIO_DESIGNS = [
 {id:'guandu-200',name:'官渡风云',year:200,era:'建安五年',kind:'historical',difficulty:'推荐入门',capital:'xuchang',description:'曹操立足许昌，袁绍雄踞河北。先守住黄河沿线，再向江东、荆襄与巴蜀推进。',hint:'曹操开局拥有多座城池与充足人才；先委任内政，再从许昌编军北上。',factions:['cao','yuan','force-7','sunce'],note:'四势力试玩：曹操、袁绍、刘表、孙策。其他地区为地方据点；归属与兵力为玩法改编。',layout:'legacy-guandu'},
 {id:'heroes-251',name:'英雄集结',year:251,era:'群英并起',kind:'fictional',difficulty:'群雄混战',capital:'xuchang',description:'曹操居中原，袁绍据河北，刘备领巴蜀荆襄，孙策控江东。四方群英同世，争夺关津与天下。',hint:'四方均有腹地与前线，先守住关隘和粮道，再集中军团突破。',factions:['cao','yuan','force-2','sunce'],note:'四势力架空试玩；参考项目人物按区域归并，不限制生卒年。',layout:'legacy-heroes'},
 {id:'coalition-190',name:'群雄讨董',year:190,era:'初平元年',kind:'historical',difficulty:'诸侯并起',capital:'chenliu',layout:'historical',rosterDistribution:'reference',description:'董卓据守关中与洛阳，关东诸侯各有城池。曹操、袁绍、孙坚与刘备从各自领地起兵。',hint:'小势力先稳住本城、招揽人才；关中势力依托关隘守备。',note:historicalNote,
  capitals:{'force-4':'town-22','force-5':'town-40','force-7':'town-30'},officerPlacements:[{sourceId:390,faction:'force-17',cityId:'town-8'},{sourceId:447,faction:'cao',cityId:'chenliu'}],
  cityGroups:{cao:[13],yuan:[4],'force-6':[16,18,19,20],'force-2':[5],'force-3':[32],'force-4':[21,22],'force-5':[36,37,38,39,40,41,42],'force-7':[28,29,30,31,33,34,35],'force-9':[17],'force-12':[2],'force-13':[1],'force-14':[3],'force-15':[7],'force-17':[8],'force-18':[12],'force-19':[9,10],'force-20':[15]},
  referenceGroups:{cao:[1],yuan:[8],'force-6':[6,11,16,21,26,30],'force-2':[2],'force-3':[3],'force-4':[4,42],'force-5':[5,10,27,28,39,40],'force-7':[7,32,33,34,35],'force-9':[9],'force-12':[12],'force-13':[13],'force-14':[14],'force-15':[15],'force-17':[17],'force-18':[18],'force-19':[19,41],'force-20':[20]}},
 {id:'warlords-194',name:'群雄割据',year:194,era:'兴平元年',kind:'historical',difficulty:'多方争城',capital:'chenliu',layout:'historical',rosterDistribution:'reference',description:'曹操与吕布争夺兖州，袁绍拓展河北，袁术立足淮南。刘备、刘表与蜀地诸侯各守一方。',hint:'关注邻城归属与城外岔路，集中人员守住主要城池。',note:historicalNote,
  capitals:{yuan:'ye',lijue:'town-18','force-4':'town-22',liuzhang:'town-40','force-7':'town-30'},officerExclusions:[615],officerPlacements:[{sourceId:390,faction:'force-25',cityId:'town-23'}],
  cityGroups:{cao:[13,14,15],yuan:[4,6,7],'force-2':[10],'force-11':[12],lijue:[16,18,20],'force-4':[21,22],liuzhang:[36,38,39,40,41,42],'force-10':[37],'force-7':[19,28,29,30,31,32,33,34,35],'force-9':[11,17,26],'force-12':[2,3,5],'force-13':[1],'force-17':[8],'force-19':[9],'force-23':[25],'force-24':[24],'force-25':[23,27]},
  referenceGroups:{cao:[1,18,20],yuan:[8,14,15,21],'force-2':[2],'force-11':[11],lijue:[6,16,26,30],'force-4':[4,42],liuzhang:[5,27,28,39,40],'force-10':[10],'force-7':[7,32,33,34,35],'force-9':[3,9,41],'force-12':[12],'force-13':[13],'force-17':[17],'force-19':[19],'force-23':[23],'force-24':[24],'force-25':[25]}},
 {id:'red-cliffs-208',name:'赤壁风云',year:208,era:'建安十三年',kind:'historical',difficulty:'南北争锋',capital:'xuchang',layout:'historical',rosterDistribution:'reference',description:'曹操据有北方，刘备驻新野，孙权经营江东。荆襄、汉中与益州仍有独立势力。',hint:'荆州位于多方交界，港口驻军与实际粮道决定进退。',note:historicalNote,
  capitals:{sunquan:'town-24',liuzhang:'town-40','force-7':'town-30','force-4':'town-22'},
  cityGroups:{cao:[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],'force-2':[29],sunquan:[23,24,25,26,27],'force-7':[19,28,30,31,32,33,34,35],liuzhang:[36,38,39,40,41,42],'force-10':[37],'force-4':[20,21,22],gongsunkang:[1]},
  referenceGroups:{cao:[1,8,11,12,14,15,16,17,18,19,20,21,26,29,30,41],'force-2':[2],sunquan:[3,9,23,24,25],'force-7':[7,32,33,34,35],liuzhang:[5,27,28,39,40],'force-10':[10],'force-4':[4,42],gongsunkang:[13]}},
 {id:'hanzhong-219',name:'汉中争雄',year:219,era:'建安二十四年',kind:'historical',difficulty:'三方争衡',capital:'xuchang',layout:'historical',rosterDistribution:'reference',description:'曹操据守北方与汉中，刘备以益州为根基，孙权控制江东。汉中与荆州两线决定天下局势。',hint:'蜀地依托关隘北进，江东可沿长江转向荆州。',note:historicalNote,
  capitals:{'force-2':'town-40'},officerExclusions:[625],officerPlacements:[{sourceId:186,faction:'force-2',cityId:'town-40'},{sourceId:125,faction:'force-2',cityId:'town-40'}],
  cityGroups:{cao:[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,29,30,37],'force-2':[31,33,35,36,38,39,40,41,42],sunquan:[23,24,25,26,27,28,32,34],gongsungong:[1]},
  referenceGroups:{cao:[1,8,10,11,12,14,15,16,17,18,19,20,21,26,29,30,41],'force-2':[2,4,5,27,28,33,35,39,40,42],sunquan:[3,7,9,23,24,25,32,34],gongsungong:[13]}},
 {id:'all-heroes-251',name:'群雄集结',year:251,era:'群雄同世',kind:'fictional',difficulty:'天下混战',capital:'xuchang',layout:'reference',rosterDistribution:'reference',description:'按参考项目的群雄版图开局，曹操、刘备、孙坚、董卓、吕布、张角等37位有城君主同世争雄。',hint:'每位君主保留独立势力，人物按来源驻城；可从地图或君主列表选择。',note:'参考项目英雄集结的城市归属及公共人物驻地；生卒年无效，新增城池按区域接入。'},
];
export const NATIONAL_SCENARIO_SOURCES = [
 ['人物与势力分布','Build/Content/Scenario/Scenario.json'],
 ['讨董、兖州与南征背景','https://www.quanxue.cn/ls_zhengshi/sanguozhi/sanguozhi01.html'],
 ['刘备与汉中背景','https://www.quanxue.cn/ls_zhengshi/sanguozhi/sanguozhi32.html'],
 ['孙权与江东背景','https://www.quanxue.cn/ls_zhengshi/sanguozhi/sanguozhi47.html'],
];
// Gameplay chronology; legendary weapons follow the documented literary setup.
export const TREASURE_INITIAL_HOLDERS={
 skyHalberd:{early:'person-661',fictional:'person-661'},
 greenDragon:{all:'person-99'},serpentSpear:{all:'person-433'},
 blueSteel:{190:'cao',194:'cao',200:'cao',208:'cao',219:'person-396',fictional:'person-396'},
 heavenSword:{all:'cao'},
 ancientBlade:{190:'person-366',194:'person-371',200:'person-371',208:'person-368',219:'person-368',fictional:'person-366'},
 twinSwords:{all:'person-636'},
 redHare:{early:'person-661',late:'person-99',fictional:'person-661'},
 dillu:{208:'person-636',219:'person-636',fictional:'person-636'},
 shadow:{early:'cao',fictional:'cao',absentAfter:197},
 yellowLightning:{all:'cao'},
 medicineBook:{190:'person-705',194:'person-705',200:'person-705',fictional:'person-705'},
 mengde:{late:'cao',fictional:'cao',absentBefore:200},
 peaceBook:{fictional:'person-404'}
};
