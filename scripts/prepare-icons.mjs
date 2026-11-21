import {writeFile,mkdir} from 'node:fs/promises';
import {catalog,skillNames,nodesFor} from '../dist/catalog.mjs';
import {layoutTree} from '../dist/tree.mjs';
const urls=new Set(catalog.filter(node=>node.mainline&&node.icon).map(node=>node.icon.url.split('?')[0]));
for(const skill of ['Woodcutting','Runecraft','Mining','Fishing'])for(const group of layoutTree(nodesFor('Skilling',skill)).groups)if(group.nodes[0].icon)urls.add(group.nodes[0].icon.url.split('?')[0]);
for(const skill of skillNames)urls.add(`https://oldschool.runescape.wiki/images/${skill}_icon.png`);
await mkdir(new URL('../sources/',import.meta.url),{recursive:true});
await writeFile(new URL('../sources/icon-requests.json',import.meta.url),JSON.stringify([...urls]));
console.log(`Queued ${urls.size} small Wiki icons.`);
