import {playerName} from '../dist/character.mjs';
export async function handleHiscores(request,upstreamFetch=fetch){
  if(request.method!=='GET')return Response.json({error:'Use GET.'},{status:405});
  let name;
  try{name=playerName(new URL(request.url).searchParams.get('player'));}catch(error){return Response.json({error:error.message},{status:400});}
  const url=new URL('https://secure.runescape.com/m=hiscore_oldschool/index_lite.json');url.searchParams.set('player',name);
  try{
    const response=await upstreamFetch(url,{headers:{accept:'application/json','user-agent':'GielinorPathways/0.4 (non-commercial OSRS progression companion)'},signal:AbortSignal.timeout(12000)});
    if(response.status===404)return Response.json({error:'Character not found on the Old School Hiscores. Check the spelling and try again after logging out of the game.'},{status:404});
    if(response.status===429)return Response.json({error:'Hiscores is busy. Please try again shortly.'},{status:429,headers:{'Retry-After':'30'}});
    if(!response.ok)throw Error('Upstream unavailable');
    const text=await response.text();if(text.length>256000)throw Error('Response too large');
    const data=JSON.parse(text);
    if(!Array.isArray(data.skills)||typeof data.name!=='string')throw Error('Unexpected response');
    return Response.json(data,{headers:{'Cache-Control':'private, max-age=60'}});
  }catch{return Response.json({error:'Could not reach the official Hiscores. Your existing progress has been kept.'},{status:502});}
}
