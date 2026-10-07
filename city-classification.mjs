export const citySizeName=city=>({large:'大城',small:'小城'})[city.citySize]||'城池';
// The caller supplies a translated group and controlled SVG attributes.
export function cityMarkerShape(city,radius,attributes=''){
 return city.citySize==='large'
  ? `<rect x="${-radius}" y="${-radius}" width="${radius*2}" height="${radius*2}" ${attributes}/>`
  : `<circle r="${radius}" ${attributes}/>`;
}
