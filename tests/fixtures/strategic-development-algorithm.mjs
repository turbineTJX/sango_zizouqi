// Audit example: a deliberately conservative selector, not a stronger AI claim.
export const strategicAlgorithms=[{kind:'selector',id:'development-example-v1',run:({candidates})=>
 (candidates.find(c=>c.kind==='recover'||c.kind==='develop')||candidates[0]).id}];
