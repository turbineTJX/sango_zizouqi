// Capacity is a derived officer attribute. Wounded soldiers still occupy their places.
export function troopCapacity(unit) {
  const command=Math.max(0,Math.min(100,unit.leadership||0));
  const level=Math.max(1,Math.min(10,unit.level||1));
  return Math.floor((3000+command*50+(level-1)*200)/100)*100;
}
