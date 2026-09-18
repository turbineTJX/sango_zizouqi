// Capacity is a derived officer attribute. Wounded soldiers still occupy their places.
export function troopCapacity(unit) {
  const command=Math.max(0,Math.min(100,unit.leadership||0));
  const level=Math.max(1,Math.min(10,unit.level||1));
  return Math.floor((3000+command*50+(level-1)*200)/100)*100;
}
export function troopStrength(soldiers) {
  // 3,000 is the reference strength, not a cap. Larger formations retain real firepower.
  const ratio=Math.max(0,soldiers)/3000;
  return ratio<=1?Math.sqrt(ratio):ratio;
}
