import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildPages} from '../scripts/build-pages.mjs';
import {handlePublicHiscores} from '../worker/public-hiscores.mjs';
test('Pages output is static, complete, and independent of the private preview backend',async()=>{
  const outDir=await mkdtemp(join(tmpdir(),'gielinor-pages-'));await buildPages({outDir,endpoint:''});
  const files=await readdir(outDir);assert.ok(files.includes('index.html'));assert.ok(files.includes('.nojekyll'));assert.ok(files.includes('icon-data.mjs'));assert.ok(!files.includes('server'));assert.ok(!files.includes('.openai'));
  const {siteConfig}=await import(pathToFileURL(join(outDir,'config.mjs')));assert.equal(siteConfig.hiscoresEndpoint,'');
  const html=await readFile(join(outDir,'index.html'),'utf8');assert.ok(!html.includes('id="breadcrumb"'));assert.ok(!html.includes('id="title"'));assert.ok(html.includes('id="character-json-preview"'));
  for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){const value=match[1];if(!value.startsWith('http'))assert.ok(!value.startsWith('/'),'Local assets must work under a repository subpath');}
});
test('optional live lookup is configured at build time and rejects credential-bearing endpoints',async()=>{
  const outDir=await mkdtemp(join(tmpdir(),'gielinor-proxy-'));await buildPages({outDir,endpoint:'https://example.workers.dev/api/hiscores'});
  const {siteConfig}=await import(pathToFileURL(join(outDir,'config.mjs')));assert.equal(siteConfig.hiscoresEndpoint,'https://example.workers.dev/api/hiscores');
  await assert.rejects(buildPages({outDir,endpoint:'https://secret@example.test'}));
});
test('the optional public proxy allows cross-origin read-only lookups',async()=>{
  const request=new Request('https://example.workers.dev/api/hiscores?player=Test%20Hero');
  const response=await handlePublicHiscores(request,async()=>Response.json({name:'Test Hero',skills:[{name:'Sailing',level:55}]}));
  assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'*');assert.equal(response.headers.get('Access-Control-Allow-Credentials'),null);
  assert.equal((await handlePublicHiscores(new Request(request.url,{method:'OPTIONS'}))).status,204);
});
