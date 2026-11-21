import {handleHiscores} from './api.mjs';
export async function handlePublicHiscores(request,upstreamFetch=fetch){
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const path=new URL(request.url).pathname;
  if(path!=='/'&&path!=='/api/hiscores')return new Response('Not found',{status:404,headers:cors});
  const response=await handleHiscores(request,upstreamFetch),headers=new Headers(response.headers);
  for(const [key,value] of Object.entries(cors))headers.set(key,value);
  if(response.ok)headers.set('Cache-Control','public, max-age=300');
  return new Response(response.body,{status:response.status,headers});
}
export default {async fetch(request,env,ctx){
  const cache=globalThis.caches?.default;
  if(request.method==='GET'&&cache){const cached=await cache.match(request);if(cached)return cached;}
  const response=await handlePublicHiscores(request);
  if(response.ok&&request.method==='GET'&&cache){const saving=cache.put(request,response.clone());if(ctx?.waitUntil)ctx.waitUntil(saving);else await saving;}
  return response;
}};
