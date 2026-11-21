import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHiscores,mergeCharacter,playerName} from '../dist/character.mjs';
import {handleHiscores} from '../worker/api.mjs';
import {skillNames} from '../dist/catalog.mjs';
const fixture={name:'Test Hero',skills:skillNames.map((name,index)=>({name:name==='Runecraft'?'Runecrafting':name,level:index===23?55:40+index})),activities:[]};
test('Hiscores imports by skill name, including Runecrafting and Sailing, regardless of order',()=>{
  const result=parseHiscores({...fixture,skills:fixture.skills.toReversed()},skillNames);
  assert.equal(result.levels.Runecraft,46);assert.equal(result.levels.Sailing,55);assert.equal(Object.keys(result.levels).length,24);
});
test('missing and unranked values keep existing levels and manual facts',()=>{
  const parsed=parseHiscores({...fixture,skills:fixture.skills.filter(s=>s.name!=='Mining').map(s=>s.name==='Sailing'?{...s,level:-1}:s)},skillNames);
  const original={levels:{Mining:72,Sailing:12},owned:{axe:true},confirmed:{quest:true}};
  const updated=mergeCharacter(original,parsed);
  assert.equal(updated.levels.Mining,72);assert.equal(updated.levels.Sailing,12);assert.deepEqual(updated.owned,original.owned);assert.deepEqual(updated.confirmed,original.confirmed);assert.deepEqual(original.levels,{Mining:72,Sailing:12});
});
test('invalid data and invalid player names fail before mutating an account',()=>{
  assert.throws(()=>parseHiscores({skills:[]},skillNames));assert.throws(()=>parseHiscores({name:'Test Hero',skills:[{name:'Attack',level:500}]},skillNames));assert.throws(()=>playerName('https://evil.test'));assert.equal(playerName(' Test_Hero '),'Test Hero');
});
test('the importer calls only the official Old School Hiscores and returns upstream data',async()=>{
  const response=await handleHiscores(new Request('https://example.test/api/hiscores?player=Test%20Hero'),async url=>{assert.equal(url.hostname,'secure.runescape.com');assert.equal(url.pathname,'/m=hiscore_oldschool/index_lite.json');assert.equal(url.searchParams.get('player'),'Test Hero');return Response.json(fixture);});
  assert.equal(response.status,200);assert.equal((await response.json()).name,'Test Hero');
});
test('missing characters and upstream failures produce useful errors without changing progress',async()=>{
  const request=new Request('https://example.test/api/hiscores?player=Test%20Hero');
  assert.equal((await handleHiscores(request,async()=>new Response('',{status:404}))).status,404);
  assert.equal((await handleHiscores(request,async()=>{throw Error('offline');})).status,502);
  assert.equal((await handleHiscores(new Request('https://example.test/api/hiscores?player=%3Cbad%3E'),()=>{throw Error('Must not fetch');})).status,400);
});
