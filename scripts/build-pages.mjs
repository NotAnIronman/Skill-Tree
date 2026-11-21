import {readdir,readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function buildPages({outDir=join(root,'pages'),endpoint=process.env.HISCORES_ENDPOINT||''}={}){
  if(endpoint){const parsed=new URL(endpoint);if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash)throw Error('HISCORES_ENDPOINT must be a public HTTPS URL without credentials, a query, or a fragment.');}
  await mkdir(outDir,{recursive:true});
  const files=(await readdir(join(root,'dist'))).filter(file=>/^[a-z-]+\.(?:html|css|mjs)$/.test(file));
  for(const file of files)await copyFile(join(root,'dist',file),join(outDir,file));
  await writeFile(join(outDir,'config.mjs'),`export const siteConfig=${JSON.stringify({hiscoresEndpoint:endpoint})};\n`);
  await writeFile(join(outDir,'.nojekyll'),'');
  console.log(`Built GitHub Pages: ${files.length} static assets. ${endpoint?'Live Hiscores proxy configured.':'Hiscores JSON import enabled; no backend required.'}`);
  return {outDir,files};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await buildPages();
