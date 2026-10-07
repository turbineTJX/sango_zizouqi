export const METROPOLITAN_DETAIL_THRESHOLD=420;
export const SETTLEMENT_DETAIL_THRESHOLD=170;
export const MAP_DETAIL_NAMES={metropolis:'都市圈',settlements:'圈内据点',interior:'城内'};
export function mapDetailLevel(view){
 const size=Math.min(view.width,view.height);
 return size>METROPOLITAN_DETAIL_THRESHOLD?'metropolis':size>SETTLEMENT_DETAIL_THRESHOLD?'settlements':'interior';
}
// Overlapping visual bands keep geometry on the map while semantic controls retain three levels.
export function mapDetailBlend(view){
 const size=Math.min(view.width,view.height),smooth=(a,b)=>{const t=Math.max(0,Math.min(1,(a-size)/(a-b)));return t*t*(3-2*t);};
 const settlements=smooth(490,350),interior=smooth(240,110);
 return {metropolis:1-settlements,settlements,interior};
}
