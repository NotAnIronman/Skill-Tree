import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,status,methodsFor,validateCatalog} from '../dist/engine.mjs';
import {catalog,skillNames,optionsFor,nodesFor,acquisitionMethods} from '../dist/catalog.mjs';
import {wikiData} from '../dist/wiki-data.mjs';
import {layoutTree,levelY,TREE} from '../dist/tree.mjs';
const profile={levels:{Woodcutting:61,Firemaking:85},owned:{'dragon-axe':true},confirmed:{}};
test('all 24 skill tables cover levels 1 through 99 with real mastery entries',()=>{
  assert.equal(skillNames.length,24);assert.ok(skillNames.includes('Sailing'));
  for(const skill of skillNames){assert.equal(wikiData.skills[skill].levels.length,99,skill);const nodes=nodesFor('Skilling',skill);assert.ok(nodes.length>1,skill);assert.ok(nodes.some(n=>n.min===99),skill);}
});
test('an optional axe does not gate chopping a resource',()=>{
  const yew=catalog.find(n=>n.skill==='Woodcutting'&&n.note==='Chop yew logs');assert.ok(yew);
  assert.equal(status(yew,{levels:{Woodcutting:60},owned:{}}),'met');
});
test('infernal axe needs both skill levels and both ingredients',()=>{
  const n=catalog.find(n=>n.id==='infernal-craft');assert.equal(status(n,profile),'unknown');
  assert.equal(status(n,{...profile,owned:{...profile.owned,'smouldering-stone':false}}),'locked');
  assert.equal(status(n,{...profile,owned:{...profile.owned,'smouldering-stone':true}}),'met');
  assert.equal(status(n,{levels:{Woodcutting:61,Firemaking:84},owned:{'dragon-axe':true,'smouldering-stone':true}}),'locked');
});
test('Ironman removes player trading while retaining self-obtain methods',()=>{
  assert.equal(methodsFor('dragon-axe','main',acquisitionMethods).length,2);
  assert.equal(methodsFor('dragon-axe','ironman',acquisitionMethods).length,1);
  const main=nodesFor('Skilling','Woodcutting','main'),iron=nodesFor('Skilling','Woodcutting','ironman');
  assert.equal(main.find(n=>n.id==='rune-axe-plan-main').min,41);
  assert.equal(iron.find(n=>n.id==='rune-axe-plan-ironman').min,60);
  assert.ok(!iron.some(n=>n.id==='rune-axe-plan-main'));
});
test('unknown non-level conditions remain unknown',()=>{
  const crystal=catalog.find(n=>n.skill==='Woodcutting'&&n.note.startsWith('Use crystal axes'));
  assert.equal(status(crystal,{levels:{Woodcutting:99},owned:{[crystal.id]:true},confirmed:{}}),'unknown');
});
test('alternatives accept a valid route without requiring other options',()=>{
  const r={kind:'any',requirements:[{kind:'owned',id:'unobserved'},{kind:'level',skill:'Woodcutting',min:60}]};
  assert.equal(evaluate(r,profile),true);assert.equal(evaluate(r,{levels:{Woodcutting:1},owned:{}}),null);
});
test('every tree node rises with level, stays in bounds, and survives grouping',()=>{
  assert.ok(levelY(99)<levelY(1));
  for(const skill of skillNames){const nodes=nodesFor('Skilling',skill),view=layoutTree(nodes);assert.equal(view.groups.flatMap(g=>g.nodes).length,nodes.length);for(const g of view.groups){assert.ok(g.x-g.nodeWidth/2>=0&&g.x+g.nodeWidth/2<=view.width);assert.ok(g.y>0&&g.y<view.height);}}
});
test('dependent menus contain the correct skill, quest, and diary choices',()=>{
  assert.deepEqual(optionsFor('Skilling'),skillNames);assert.equal(optionsFor('Achievement').length,12);assert.ok(!optionsFor('Achievement').includes('Achievement Diary'));assert.ok(optionsFor('Questing').includes('A Kingdom Divided'));
  assert.ok(nodesFor('Achievement','Falador Diary').every(n=>n.kind==='diary'));
});
test('source catalog uses unique IDs, valid levels, and reviewed revisions',()=>{
  assert.equal(validateCatalog(catalog,[]),true);assert.ok(catalog.length>4800);assert.ok(catalog.filter(n=>n.id.startsWith('wiki-')).every(n=>Number.isInteger(n.revision)));
});
