// Metropolitan membership uses the nearest major city along authored roads.
// Weights guide automatic construction; walls remain at the defended city.
export const METROPOLITAN_RULES=Object.freeze({
 siteKinds:['city','gate','port'],
 constructionWeights:{
  commerce:{main:4,small:4,gate:1,port:6},
  farm:{main:3,small:6,gate:1,port:2},
  granary:{main:4,small:3,gate:3,port:5},
  workshop:{main:4,small:5,gate:2,port:3},
  barracks:{main:4,small:3,gate:5,port:2},
  clinic:{main:5,small:4,gate:2,port:2},
  drill:{main:4,small:3,gate:5,port:2},
  walls:{main:1,small:0,gate:0,port:0},
  hall:{main:6,small:3,gate:1,port:2},
  arrowTower:{main:6,small:4,gate:5,port:4},
  musicStage:{main:6,small:4,gate:4,port:3},
  aidCamp:{main:6,small:4,gate:3,port:3},
 }
});
