import {LAND_PATH,RIVERS,LAKES} from './national-geography.mjs';
// Code and art must agree on coastlines and actual road curves. Changed maps
// use current vector geography until their compiled art becomes available.
export function mapGPUGeometry(roads){
 return JSON.stringify({land:LAND_PATH,rivers:RIVERS.map(r=>[r.id,r.width,r.points]),lakes:LAKES.map(l=>[l.name,l.d]),roads:roads.map(r=>JSON.stringify(r)).sort()});
}
