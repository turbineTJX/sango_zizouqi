// Authored factions use immutable scenario-scoped ids. Existing catalogues keep
// their object identity so every simulation subsystem sees the same definition.
const tables=new Set(),definitions=new Map();
export function attachFactionTable(table){tables.add(table);for(const [id,value]of definitions)table[id]=value;return table;}
export function registerRuntimeFaction(id,input){const value=Object.freeze({...input}),old=definitions.get(id);if(old&&JSON.stringify(old)!==JSON.stringify(value))throw Error('势力开局快照冲突');definitions.set(id,value);for(const table of tables)table[id]=value;}
