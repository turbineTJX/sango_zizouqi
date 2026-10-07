// Pointy-top hexagons, odd rows shifted right. Stored x/y remain offset coordinates.
export const HEX_GRID = { cols:14, rows:8, width:14.5, height:6.25 };
export const HEX_ASPECT = HEX_GRID.width * Math.sqrt(3) / (HEX_GRID.height * 2);
export const toAxial = ({x,y}) => ({q:x-(y-(y&1))/2,r:y});
export const fromAxial = ({q,r}) => ({x:q+(r-(r&1))/2,y:r});
export function hexDistance(a,b) {
  const p=toAxial(a),t=toAxial(b),dq=p.q-t.q,dr=p.r-t.r;
  return Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr));
}
export function hexNeighbors({x,y}) {
  const shift=y&1;
  return [[x-1,y],[x+1,y],[x-1+shift,y-1],[x+shift,y-1],[x-1+shift,y+1],[x+shift,y+1]];
}
export const insideHexGrid = (x,y) => Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<HEX_GRID.cols&&y>=0&&y<HEX_GRID.rows;
export function hexBeyond(a,b,steps=1) {
  const start=toAxial(a),end=toAxial(b);
  return fromAxial({q:end.q+(end.q-start.q)*steps,r:end.r+(end.r-start.r)*steps});
}
export function hexCenter(x,y) {
  return {x:(x+(y&1)*.5+.5)/HEX_GRID.width,y:(y*.75+.5)/HEX_GRID.height};
}
export function hexCellStyle(x,y) {
  const p=hexCenter(x,y);
  return `left:${p.x*100}%;top:${p.y*100}%;`;
}
