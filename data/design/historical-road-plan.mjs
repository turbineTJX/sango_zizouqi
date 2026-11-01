// Late-Han / Three-Kingdoms corridor references, adapted to the game's atlas.
// Evidence establishes corridors and old place names, not surveyed road lines.
export const HISTORICAL_ROAD_PLAN = {
 version:1,
 sources:{
  hanRoads:{title:'全国社科工作办：曹家齐《中国历史上的陆路交通》',url:'https://www.nopss.gov.cn/n1/2023/0531/c448861-40003026.html',basis:'秦汉干道、魏晋交通中心及东汉桂阳—零陵交通干线'},
  hexi:{title:'甘肃文博局：丝路文化',url:'https://www.gswbj.gov.cn/a/2023/09/15/18638.html',basis:'长安—天水—陇西—金城—武威与河西干道；南北道路有明确地域约束'},
  taihang:{title:'北京园林绿化局：《述征记》与太行八陉',url:'https://yllhj.beijing.gov.cn/ztxx/lhysh/st/202401/t20240131_3551664.shtml',basis:'井陉、滏口、军都等通道，山地跨区通过既有关口'},
  shudao:{title:'国家林草局：蜀道明珠翠云廊',url:'https://www.forestry.gov.cn/c/www/szxx/515054.jhtml',basis:'汉中—剑门—成都金牛道走廊；不以穿山近路替代'},
  nanyang:{title:'方城县政府：博望镇情简介',url:'https://www.fangcheng.gov.cn/2024/08-09/797941.html',basis:'汉博望在宛北、方城以南，按南阳盆地通道接路'},
  jiyang:{title:'新野县政府：名胜古迹',url:'https://www.xinye.gov.cn/2018/10-01/977403.html',basis:'新野北依宛洛、南接荆襄；已有汉棘阳故城'},
  qua:{title:'复旦CHGIS：曲阿县',url:'https://tgaz.fudan.edu.cn/tgaz/placename/hvd_40575',basis:'曲阿县在今丹阳；保留建业—曲阿—吴的区域干道，经曲阿接港口'},
  leiyang:{title:'CHGIS：汉晋耒阳县',url:'https://chgis.hudci.org/tgaz/placename/hvd_41850',basis:'耒阳在桂阳郡北部，城址在今耒阳；位于长沙与桂阳之间'},
  zhengyang:{title:'衡阳珠晖区政府：政区沿革',url:'https://www.hyzhq.gov.cn/zhqq/index.html',basis:'烝阳在衡阳地区；不放在零陵以西的郊野'},
  lingdao:{title:'永州地方志：永州府志卷二',url:'https://dsfz.yzcity.gov.cn/yzdqw/jzjz/202004/7b241d683db14a9c9793c5323b47aae0/files/a37a9a0c05b64d4abcbf5e4ccdec4447.pdf',basis:'汉泠道为今宁远一带，后汉及三国沿置；位于零陵东南'},
  water:{title:'《历史地理研究》：《汉书·地理志》所记水道里程',url:'https://www.lsdlyj.com.cn/EN/10.20166/j.issn.2096-6822.L20230064',basis:'黄河、淮河、长江、汉水为水运要道；水陆转接仍在港口'}
 },
 corridors:[
  {id:'hexi',name:'河西走廊',through:['atlas-dunhuang','atlas-zhangye','town-22','atlas-jincheng'],sources:['hexi'],adaptation:'沿既有同岸通道串联，关闭张掖直插金城的多余斜线'},
  {id:'taihang',name:'太行通道',through:['atlas-pingcheng','atlas-yanmen','jinyang','atlas-jingxing','atlas-zhongshan','atlas-changzi','town-43','ye'],sources:['taihang'],adaptation:'各陉是不同通道，不将名单当成一条连续直线；保留关隘与绕行约束'},
  {id:'guanzhong',name:'关中—河洛',through:['town-18','town-45','town-46','luoyang','town-44','chenliu'],sources:['hanRoads'],adaptation:'干路经潼关、函谷、虎牢等既有地点，不新增穿山支线'},
  {id:'nanyang',name:'南阳—荆襄',through:['xuchang','junction:wan:xuchang','wan','junction:town-29:wan','town-29','town-30'],sources:['nanyang','jiyang'],adaptation:'保留博望、棘阳和城市主干；撤除陈留直接斜插宛的近路'},
  {id:'central',name:'陈留—颍川—谯沛',through:['chenliu','junction:chenliu:xuchang','xuchang','junction:atlas-qiao:xuchang','atlas-qiao','atlas-pengcheng','town-10'],sources:['hanRoads'],adaptation:'以既有汉县地名组织区域连接，不在每次几何相交处编造新地名'},
  {id:'shudao',name:'汉中—剑门—成都',through:['town-37','town-48','town-50','town-49','town-38','town-51','town-52','town-40'],sources:['shudao'],adaptation:'复用既有金牛道关隘链及地理游戏适配，不宣称每个关名均为同期道路实测点'},
  {id:'jiangnan',name:'建业—曲阿—吴会',through:['town-23','junction:town-23:town-24','town-24','junction:town-24:town-25','town-25'],sources:['qua','water'],adaptation:'保留曲阿及吴的陆路接港，不用曲阿—钱唐斜线绕过吴'},
  {id:'xiangnan',name:'桂阳—零陵',through:['town-32','junction:town-32:town-34','town-34','junction:town-34:town-35','town-35'],sources:['hanRoads','leiyang','zhengyang','lingdao','water'],adaptation:'桂阳—零陵是有依据的干线；校正耒阳、烝阳、泠道相对方位，不保留临川跨山直插桂阳的斜路'}
 ],
 // Three regional links replace the previous blanket city-bypass triangles.
 retainedBypasses:[
  ['ye','town-4','town-5'],
  ['xuchang','atlas-qiao','chenliu'],
  ['wan','xuchang','town-29']
 ],
 // Game coordinates respect the historical relative locations, not GIS precision.
 prefecturePositions:{'town-32:town-34':[690,722],'town-33:town-35':[658,735],'town-34:town-35':[678,788]},
 restore:[['town-23','junction:town-23:town-24'],['town-24','town-71'],['junction:wan:xuchang','junction:town-29:wan'],['junction:town-33:town-35','town-35']],
 remove:[['atlas-linchuan','town-34'],['town-33','junction:town-33:town-35']],
 reconnect:[{from:'junction:town-32:town-33',to:'junction:town-33:town-35',distance:26.3,terrain:'land',sources:['hanRoads','zhengyang'],reason:'武陵南路先汇于益阳，再向烝阳、零陵，不另画穿过益阳近旁的斜线'}]
};
