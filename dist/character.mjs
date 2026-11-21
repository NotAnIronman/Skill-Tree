export function playerName(value){
  const name=String(value??'').trim().replace(/_/g,' ');
  if(!/^[\p{L}\p{N} -]{1,12}$/u.test(name))throw Error('Enter a character name of 1–12 letters, numbers, spaces, or hyphens.');
  return name;
}
export function parseHiscores(raw,knownSkills){
  if(!raw||typeof raw.name!=='string'||!Array.isArray(raw.skills))throw Error('Hiscores returned an unexpected response. No progress was changed.');
  const levels={},missing=[];
  for(const skill of knownSkills){
    const record=raw.skills.find(row=>row.name===skill||(skill==='Runecraft'&&row.name==='Runecrafting'));
    if(!record||record.level===-1){missing.push(skill);continue;}
    if(!Number.isInteger(record.level)||record.level<1||record.level>99)throw Error(`Invalid level for ${skill}. No progress was changed.`);
    levels[skill]=record.level;
  }
  if(!Object.keys(levels).length)throw Error('No usable Old School skill levels were found.');
  return {name:playerName(raw.name),levels,missing,source:'hiscores',fetchedAt:new Date().toISOString()};
}
export function mergeCharacter(profile,character){
  return {...profile,levels:{...profile.levels,...character.levels},character};
}
