import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nodesFor} from '../dist/catalog.mjs';
import {layoutTree,groupEdges} from '../dist/tree.mjs';
test('the tree fits its available width without horizontal panning',()=>{
  for(const width of [320,480,720,1100])for(const skill of ['Woodcutting','Runecraft','Construction']){
    const view=layoutTree(nodesFor('Skilling',skill),'all','',{width});
    assert.ok(view.width<=width,`${skill}: ${view.width}px tree exceeds ${width}px viewport`);
    for(const group of view.groups)assert.ok(group.x>=0&&group.x<=width,`${group.id} is outside the viewport`);
  }
});
test('Runecraft skill mastery stays on the progression spine',()=>{
  const view=layoutTree(nodesFor('Skilling','Runecraft'));
  const mastery=view.groups.find(g=>g.nodes.some(n=>n.note==='Skill mastery'));
  assert.ok(mastery,'Mastery exists');assert.equal(mastery.x,view.center);
});
test('core rune types occupy the main line while multipliers and optional activities branch out',()=>{
  const view=layoutTree(nodesFor('Skilling','Runecraft'));
  const air=view.groups.find(g=>g.nodes.some(n=>n.note.startsWith('Craft air runes')));assert.equal(air.role,'spine');
  const multiplier=view.groups.find(g=>g.nodes.some(n=>/Craft [2-9] air runes/.test(n.note)));assert.ok(multiplier);assert.equal(multiplier.role,'branch');
  for(const group of view.groups)assert.equal(group.role,group.nodes.some(n=>n.mainline)?'spine':'branch');
  for(const edge of groupEdges(view.groups)){assert.equal(edge.from.x,view.center);assert.equal(edge.from.y,view.levels[edge.to.level]);}
});
test('every skill has a populated core path and Wiki images are restricted to the Wiki host',()=>{
  for(const skill of ['Woodcutting','Runecraft','Mining','Fishing','Sailing'])assert.ok(nodesFor('Skilling',skill).filter(n=>n.mainline).length>=4);
  for(const node of nodesFor('Skilling','Woodcutting').filter(n=>n.icon))assert.ok(node.icon.url.startsWith('https://oldschool.runescape.wiki/images/'));
});
