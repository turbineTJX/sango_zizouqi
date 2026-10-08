// 城外横向小路：中心据点、两条相邻官道的另一端。仅连接已存在的陆路。
// 不跨接关隘、港口或水路；坐标由对应官道的中点确定。
export const ROAD_NETWORK_DESIGN = {
  trailCost: 1.5,
  bypasses: [
    ['town-2', 'town-3', 'town-4'],
    ['town-4', 'town-5', 'ye'],
    ['town-5', 'ye', 'town-8'],
    ['town-10', 'town-9', 'town-11'],
    ['town-10', 'town-12', 'chenliu'],
    ['chenliu', 'town-12', 'xuchang'],
    ['xuchang', 'chenliu', 'runan'],
    ['xuchang', 'runan', 'wan'],
    ['wan', 'xuchang', 'town-29'],
    ['town-20', 'town-21', 'town-22'],
    ['town-24', 'town-23', 'town-25'],
    ['town-32', 'town-34', 'town-33'],
    ['town-35', 'town-33', 'town-34'],
  ],
};
