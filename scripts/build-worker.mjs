import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url),assets={};
for(const file of await readdir(new URL('dist/',root)))if(/^[a-z-]+\.(?:html|css|mjs)$/.test(file))assets['/'+file]=await readFile(new URL('dist/'+file,root),'utf8');
const character=(await readFile(new URL('dist/character.mjs',root),'utf8')).replace(/^export /gm,'');
const api=(await readFile(new URL('worker/api.mjs',root),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const code=`${character}\n${api}\nconst assets=${JSON.stringify(assets)};\nexport default {async fetch(request){const path=new URL(request.url).pathname;if(path==='/api/hiscores')return handleHiscores(request);const file=path==='/'?'/index.html':path;const body=assets[file];if(body===undefined)return new Response('Not found',{status:404});return new Response(body,{headers:{'Content-Type':file.endsWith('.mjs')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff'}});}};\n`;
await mkdir(new URL('dist/server/',root),{recursive:true});await writeFile(new URL('dist/server/index.js',root),code);
console.log(`Built Worker with ${Object.keys(assets).length} assets and the Hiscores endpoint.`);
