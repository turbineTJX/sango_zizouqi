// The existing gate field and all future building kinds share this target collection.
// Additional buildings: {id,name,type:'building',kind,side,x,y,hp,maxHp,lastDamagedTick?}.
export function battleBuildings(b){
  return [...(b.siege?.gate?[b.siege.gate]:[]),...(b.buildings||[])];
}
