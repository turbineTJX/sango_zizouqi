// Hierarchical first-applicable selection. Scores order lawful alternatives
// within a method; existential threats and existing commitments come first.
export function selectFactionMethod({candidates,context}){
 const first=predicate=>candidates.find(predicate);
 const criticalCities=new Set(context.ownCities.filter(c=>c.shortages.grain>0||c.besieged).map(c=>c.id));
 const independent=c=>c.kind==='capture'&&c.ready&&c.utility>=0&&!criticalCities.has(c.staging)&&!(c.requirements||[]).some(r=>criticalCities.has(r.cityId));
 return (first(c=>c.kind==='defend')
  ||first(independent)
  ||(context.critical&&first(c=>c.kind==='recover'))
  ||first(c=>c.kind==='capture'&&c.ready&&c.utility>=0)
  ||first(c=>c.kind==='peace')
  ||first(c=>c.kind==='capture'&&c.utility>=0)
  ||first(c=>['recover','develop'].includes(c.kind))
  ||candidates[0]).id;
}
