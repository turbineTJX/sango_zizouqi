export const citySizeName=city=>({large:'大城',small:'府'})[city.citySize]||'城池';
export const metropolitanSiteName=(node,center)=>node.id===center.id?'主城':({city:'府',junction:'府',port:'港口',gate:'关卡'})[node.kind]||'府';
// The caller supplies a translated group and controlled SVG attributes.
export function cityMarkerShape(city,radius,attributes=''){
 return city.citySize==='large'
  ? `<rect x="${-radius}" y="${-radius}" width="${radius*2}" height="${radius*2}" ${attributes}/>`
  : `<circle r="${radius}" ${attributes}/>`;
}
