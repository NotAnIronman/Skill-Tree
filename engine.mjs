export function evaluate(requirement,profile) {
  if(requirement.kind==='all') {
    const values=requirement.requirements.map(r=>evaluate(r,profile));
    return values.includes(false)?false:values.includes(null)?null:true;
  }
  if(requirement.kind==='any') {
    const values=requirement.requirements.map(r=>evaluate(r,profile));
    return values.includes(true)?true:values.includes(null)?null:false;
  }
  if(requirement.kind==='level') return profile.levels[requirement.skill] == null ? null : profile.levels[requirement.skill]>=requirement.min;
  if(requirement.kind==='owned') return Object.hasOwn(profile.owned,requirement.id)?profile.owned[requirement.id]:null;
  if(requirement.kind==='confirmed') return Object.hasOwn(profile.confirmed||{},requirement.id)?profile.confirmed[requirement.id]:null;
  throw Error(`Unknown requirement: ${requirement.kind}`);
}
export function status(node,profile) {
  const result=evaluate({kind:'all',requirements:node.requirements},profile);
  return result===true?'met':result===false?'locked':'unknown';
}
export function methodsFor(item,mode,methods) { return methods.filter(m=>m.item===item&&(m.mode==='both'||m.mode===mode)); }
export function validateCatalog(nodes,relations) {
  const ids=new Set();
  for(const n of nodes) { if(ids.has(n.id))throw Error(`Duplicate ${n.id}`); ids.add(n.id); if(n.min<1||n.min>99)throw Error(`Invalid level ${n.id}`); }
  for(const r of relations)if(!ids.has(r.from)||!ids.has(r.to))throw Error('Dangling connection');
  return true;
}
