// 城外横向小路：中心据点、两条相邻官道的另一端。仅连接已存在的陆路。
// 不跨接关隘、港口或水路；府节点采用逐个校定的区域位置。
export const ROAD_NETWORK_DESIGN = {
  trailCost: 1.5,
  // 地名沿用当前路网；方位按用户提供古地图与附近城池校定。
  nodeNames: {
    'town-2:town-3':'徐无', 'town-2:town-4':'章武',
    'town-4:town-5':'东光', 'town-4:ye':'巨鹿',
    'town-5:ye':'曲梁', 'town-8:town-9':'剧',
    'town-10:town-9':'萧', 'atlas-pengcheng:town-10':'夏丘',
    'town-10:town-12':'任城', 'chenliu:town-10':'考城',
    'chenliu:town-12':'匡亭', 'chenliu:xuchang':'尉氏',
    'runan:xuchang':'临颍', 'wan:xuchang':'博望',
    'atlas-qiao:xuchang':'鄢陵',
    'town-29:wan':'棘阳', 'town-20:town-21':'街亭',
    'town-18:town-20':'三水', 'town-23:town-24':'曲阿',
    'town-24:town-25':'钱唐', 'town-32:town-34':'耒阳',
    'town-32:town-33':'益阳', 'town-33:town-35':'烝阳',
    'town-34:town-35':'泠道',
  },
  nodePositions: {
    'town-2:town-3':[803.9,161.5], 'town-2:town-4':[816.4,210.1],
    'town-4:town-5':[777.5,278], 'town-4:ye':[744.3,288.4],
    'town-5:ye':[733.9,339.7], 'town-8:town-9':[838.5,367.4],
    'town-10:town-9':[841.3,409], 'atlas-pengcheng:town-10':[810.8,409],
    'town-10:town-12':[780.3,392.4], 'chenliu:town-10':[782.4,415.3],
    'chenliu:town-12':[735.9,383.4], 'chenliu:xuchang':[726.2,425],
    'runan:xuchang':[728.3,463.1], 'wan:xuchang':[686.7,465.2],
    'atlas-qiao:xuchang':[731.1,433.3],
    'town-29:wan':[675.6,502.6], 'town-20:town-21':[445.4,420.1],
    'town-18:town-20':[491.9,421.5], 'town-23:town-24':[925.2,518.6],
    'town-24:town-25':[961.3,552.6], 'town-32:town-34':[688.8,748.8],
    'town-32:town-33':[654.8,687.8], 'town-33:town-35':[601.4,745.3],
    'town-34:town-35':[615.3,783.4],
  },
  // 按区域补齐转向通道；每个府至少连接另一府，避免只增加途中停靠。
  bypasses: [
    ['town-2', 'town-3', 'town-4'],
    ['town-4', 'town-5', 'ye'],
    ['ye', 'town-4', 'town-5'], // 巨鹿—曲梁：邺东侧南北通道
    ['town-9', 'town-8', 'town-10'], // 剧—萧：黄河南岸通道，不跨接两岸的府
    ['town-10', 'town-9', 'atlas-pengcheng'], // 萧—夏丘：淮河北岸小沛东侧通道
    ['town-10', 'town-12', 'chenliu'], // 任城—考城：小沛西侧通道
    ['town-12', 'chenliu', 'town-10'], // 匡亭—任城：濮阳南侧通道
    ['xuchang', 'chenliu', 'runan'],
    ['xuchang', 'atlas-qiao', 'chenliu'],
    ['xuchang', 'atlas-qiao', 'runan'],
    ['wan', 'xuchang', 'town-29'],
    ['town-20', 'town-21', 'town-18'],
    ['town-24', 'town-23', 'town-25'],
    ['town-32', 'town-34', 'town-33'],
    ['town-35', 'town-33', 'town-34'], // 烝阳—泠道：零陵东侧通道
  ],
  // The atlas rebuild applies these edits after city additions, so inherited
  // city links cannot silently reopen a mountain pass or river crossing.
  geography: {
    remove: [
      ['luoyang','xuchang'], ['jinyang','town-43'], ['luoyang','town-65'], ['town-1','town-2'],
      ['town-18','town-48'], ['town-21','town-37'],
      ['town-37','town-49'], ['town-50','town-38'], ['town-18','town-37'], ['town-38','town-39'],
      ['town-33','town-36'], ['atlas-fuling','town-33'],
      ['atlas-chengle','atlas-suifang'], ['atlas-lishi','atlas-suifang'],
      ['town-28','atlas-wuchang'], ['atlas-wuchang','town-74'], ['atlas-wuchang','town-78'],
      ['town-39','town-41'], ['town-40','town-41'], ['atlas-longbian','town-42'],
      ['atlas-fuling','town-39'], ['atlas-fuling','town-36'],
      ['town-11','runan'], ['town-30','town-80'],
      // 黄河两岸：经高唐、临济、顿丘、白马、官渡等真实港口转接。
      ['town-5','town-8'], ['town-5','town-12'], ['ye','town-12'], ['ye','chenliu'],
      ['atlas-linshi','town-5'], ['atlas-leling','atlas-linshi'],
      // 淮河及长江：保留同岸道路，删除直接越过水系的城际近路。
      ['town-9','town-11'], ['town-10','town-11'], ['atlas-qiao','town-11'],
      ['atlas-zhongli','town-11'], ['atlas-zhongli','atlas-hefei'],
      ['town-11','town-23'], ['atlas-guangling','town-23'], ['atlas-guangling','atlas-jingkou'],
      ['town-26','town-23'], ['town-26','town-27'], ['town-26','town-28'],
      ['town-27','town-28'], ['town-27','town-31'], ['town-28','town-32'],
      ['town-28','town-31'], ['town-31','town-32'], ['town-31','town-33'],
      ['atlas-baling','town-31'],
      // 汉水南北岸通过湖阳、中庐、汉津一线；三峡通航经江津、巫县。
      ['town-30','town-31'], ['town-19','town-29'], ['wan','town-19'],
      ['town-31','town-36'],
      // 金城渡黄河，不能由继承的对角直连越过河曲。
      ['town-20','town-22'], ['town-21','town-22'],
      ['atlas-jincheng','town-20'], ['atlas-jincheng','atlas-longxi'], ['atlas-longxi','atlas-xiping'],
      // 渡河不得由港口直接接到对岸城市，必须先抵达对岸港口。
      ['atlas-jincheng-port','town-20'], ['atlas-jincheng-port','atlas-longxi'],
      ['atlas-huai-port','town-11'], ['atlas-huai-port','atlas-hefei'],
    ],
    add: [
      ['town-44','xuchang'],
      ['town-21','town-48'], ['town-48','town-50'], ['town-49','town-38'],
      ['atlas-jincheng','atlas-jincheng-port'], ['atlas-jincheng-port','atlas-jincheng-east-port'],
      ['atlas-jincheng-east-port','town-20'], ['atlas-jincheng-east-port','atlas-longxi'],
      ['atlas-zhongli','atlas-huai-port'], ['atlas-huai-port','atlas-huainan-port'],
      ['atlas-huainan-port','town-11'], ['atlas-huainan-port','atlas-hefei'],
      ['town-10','atlas-zhongli'],
      ['town-26','town-61'], ['town-61','town-69'],
      ['town-30','town-79'], ['town-79','town-80'],
      ['atlas-suifang','town-67'],
      ['atlas-wuchang','town-27'], ['atlas-xunyang','atlas-wuchang'], ['atlas-baling','atlas-wuchang'],
      ['town-39','atlas-jiangzhou-port'], ['atlas-jiangzhou-port','atlas-nanjin-port'],
      ['atlas-nanjin-port','town-41'], ['atlas-nanjin-port','atlas-fuling'],
      ['town-80','town-31'],
      ['atlas-wuchang','town-75'],
    ],
    // Explicit terrain is shared by real marching, previews, ships, supply,
    // convoys and AI. Lengths are authored in road-distances.mjs.
    terrain: {
      'atlas-jingxing:jinyang':'mountain', 'luoyang:wan':'mountain',
    },
  },
};
