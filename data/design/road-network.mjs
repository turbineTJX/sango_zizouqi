// 城外横向小路：中心据点、两条相邻官道的另一端。仅连接已存在的陆路。
// 不跨接关隘、港口或水路；府节点采用逐个校定的区域位置。
export const ROAD_NETWORK_DESIGN = {
  trailCost: 1.5,
  // 地名沿用当前路网；方位按用户提供古地图与附近城池校定。
  nodeNames: {
    'town-2:town-3':'徐无', 'town-2:town-4':'章武',
    'town-4:town-5':'东光', 'town-4:ye':'巨鹿',
    'town-5:ye':'曲梁', 'town-5:town-8':'剧',
    'town-10:town-9':'萧', 'town-10:town-11':'夏丘',
    'town-10:town-12':'任城', 'chenliu:town-10':'考城',
    'chenliu:town-12':'匡亭', 'chenliu:xuchang':'尉氏',
    'runan:xuchang':'临颍', 'wan:xuchang':'博望',
    'town-29:wan':'棘阳', 'town-20:town-21':'街亭',
    'town-20:town-22':'三水', 'town-23:town-24':'曲阿',
    'town-24:town-25':'钱唐', 'town-32:town-34':'耒阳',
    'town-32:town-33':'益阳', 'town-33:town-35':'烝阳',
    'town-34:town-35':'泠道',
  },
  nodePositions: {
    'town-2:town-3':[803.9,161.5], 'town-2:town-4':[816.4,210.1],
    'town-4:town-5':[790,303.7], 'town-4:ye':[744.3,288.4],
    'town-5:ye':[733.9,339.7], 'town-5:town-8':[811.5,330.7],
    'town-10:town-9':[841.3,409], 'town-10:town-11':[799,452],
    'town-10:town-12':[780.3,392.4], 'chenliu:town-10':[782.4,415.3],
    'chenliu:town-12':[735.9,383.4], 'chenliu:xuchang':[726.2,425],
    'runan:xuchang':[728.3,463.1], 'wan:xuchang':[686.7,465.2],
    'town-29:wan':[675.6,502.6], 'town-20:town-21':[445.4,420.1],
    'town-20:town-22':[407.3,357], 'town-23:town-24':[925.2,518.6],
    'town-24:town-25':[961.3,552.6], 'town-32:town-34':[688.8,748.8],
    'town-32:town-33':[654.8,687.8], 'town-33:town-35':[601.4,745.3],
    'town-34:town-35':[615.3,783.4],
  },
  // 按区域补齐转向通道；每个府至少连接另一府，避免只增加途中停靠。
  bypasses: [
    ['town-2', 'town-3', 'town-4'],
    ['town-4', 'town-5', 'ye'],
    ['ye', 'town-4', 'town-5'], // 巨鹿—曲梁：邺东侧南北通道
    ['town-5', 'town-4', 'town-8'], // 东光—临淄：平原东侧通道
    ['town-10', 'town-9', 'town-11'], // 彭城—夏丘：小沛东侧通道
    ['town-10', 'town-12', 'chenliu'], // 任城—考城：小沛西侧通道
    ['town-12', 'chenliu', 'town-10'], // 匡亭—任城：濮阳南侧通道
    ['xuchang', 'chenliu', 'runan'],
    ['wan', 'xuchang', 'town-29'],
    ['town-20', 'town-21', 'town-22'],
    ['town-24', 'town-23', 'town-25'],
    ['town-32', 'town-34', 'town-33'],
    ['town-35', 'town-33', 'town-34'], // 烝阳—泠道：零陵东侧通道
  ],
};
