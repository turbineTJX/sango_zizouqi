// Shared map lookup without importing any rendering modules.
export function mapNode(s,id){return s.cities.find(c=>c.id===id)||s.junctions?.find(c=>c.id===id);}
export function mapNodes(s){return [...s.cities,...(s.junctions||[])];}
