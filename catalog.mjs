import {wikiData} from './wiki-data.mjs';
import {coreUnlockIds} from './progression.mjs';
import {bossingData} from './boss-data.mjs';
import {questOptions,questsFor} from './questing.mjs';
export const skillNames=Object.keys(wikiData.skills);
export const skills=Object.fromEntries(skillNames.map(name=>[name,{icon:name.slice(0,2).toUpperCase()}]));
export const kinds={resource:{label:'Gather & make',symbol:'◈',offset:0},tool:{label:'Equipment',symbol:'⚒',offset:1},activity:{label:'Activities & access',symbol:'⌘',offset:-1},quest:{label:'Quest gates',symbol:'✧',offset:-2},diary:{label:'Diary gates',symbol:'❖',offset:2},milestone:{label:'Milestones',symbol:'✦',offset:0},advice:{label:'Suggested upgrades',symbol:'◇',offset:3},boss:{label:'Boss encounter',symbol:'⚔',offset:0}};
const level=(skill,min)=>({kind:'level',skill,min});
function classify(text,links){
  if(/^Required .*diary/i.test(text))return 'diary';
  if(/^Required (?:for|to)/i.test(text))return links.some(l=>l.title==='Quest points')?'quest':'activity';
  if(/Skill mastery|cape and hood|maximum (?:hit|combat)|combat level/i.test(text))return 'milestone';
  if(/^(?:Use |Chop with |Wear |Wield |Equip |Craft and use )/i.test(text))return 'tool';
  if(/Access|Guild|shortcut|course|arena|Wintertodt|Tempoross|Guardians of the Rift|Zalcano/i.test(text))return 'activity';
  return 'resource';
}
const ignoredLink=t=>skillNames.includes(t)||['Quest points','Coins','Free-to-play','Members'].includes(t);
export const catalog=wikiData.entries.map(entry=>{
  const kind=classify(entry.text,entry.links),links=entry.links.filter(l=>!ignoredLink(l.title));
  const source=wikiData.skills[entry.skill];
  const requirements=[level(entry.skill,entry.level)];
  for(const skill of skillNames){const match=entry.text.match(new RegExp(`\\b${skill} (\\d{1,2})\\b`));if(match&&skill!==entry.skill)requirements.push(level(skill,Number(match[1])));}
  const conditional=/\(with\b|\bafter\b|\brequir|\bcompleted\b|Guild|diary|Quest/i.test(entry.text);
  if(conditional)requirements.push({kind:'confirmed',id:entry.id});
  if(kind==='tool')requirements.push({kind:'owned',id:entry.id});
  let title=links[0]?.title||entry.text;
  if(kind==='quest'||kind==='diary')title=links.find(l=>/Diary/.test(l.title)&&l.title!=='Achievement Diary')?.title||links[0]?.title||entry.text;
  return {...entry,title,note:entry.text,min:entry.level,kind,requirements,source:source.source+'#'+entry.level,revision:source.revision,reviewed:wikiData.retrieved.slice(0,10),links};
});
catalog.push({id:'infernal-craft',skill:'Woodcutting',title:'Create infernal axe',min:61,level:61,kind:'advice',members:true,note:'Optional side upgrade. Creating an infernal axe requires 61 Woodcutting, 85 Firemaking, a dragon axe, and a smouldering stone. The skill requirements cannot be boosted. This is a crafting branch, not a requirement for higher trees.',requirements:[level('Woodcutting',61),level('Firemaking',85),{kind:'owned',id:'dragon-axe'},{kind:'owned',id:'smouldering-stone'}],source:'https://oldschool.runescape.wiki/w/Infernal_axe',reviewed:'2026-11-20',revision:null,links:[]});
for(const [accountMode,min,title,note] of [
  ['main',41,'Consider buying a rune axe','Suggested acquisition point. A rune axe becomes usable at 41 Woodcutting. A main account can buy one from another player if the price suits their budget. This does not gate later trees.'],
  ['ironman',60,'Rune axe: guild shop route','Suggested shop route. The Woodcutting Guild opens at 60 Woodcutting and its axe shop sells rune axes. Rune axes themselves are usable at level 41. This branch shows a practical acquisition route, not a new use requirement. Membership and guild access apply.']
])catalog.push({id:`rune-axe-plan-${accountMode}`,skill:'Woodcutting',title,min,level:min,kind:'advice',accountMode,members:accountMode==='ironman',note,requirements:[level('Woodcutting',min),{kind:'owned',id:'rune-axe'}],source:'https://oldschool.runescape.wiki/w/Rune_axe',reviewed:'2026-11-20',revision:null,links:[]});
export const acquisitionMethods=[{item:'dragon-axe',mode:'main',label:'Buy from another player when the use level and your budget make it worthwhile.'},{item:'dragon-axe',mode:'both',label:'Obtain from a drop or reward source. Follow the item reference for the individual routes.'},{item:'smouldering-stone',mode:'main',label:'Buy from another player.'},{item:'smouldering-stone',mode:'both',label:'Obtain from an eligible drop or reward. This can arrive much later than the skill unlock.'}];
export const relations=[];
const coreIds=coreUnlockIds(catalog);
const allImages=catalog.flatMap(node=>node.images||[]);
for(const node of catalog){node.mainline=coreIds.has(node.id);node.icon=node.images?.find(image=>image.url.startsWith('https://oldschool.runescape.wiki/images/'))||null;if(node.note==='Skill mastery')node.icon=catalog.filter(other=>other.skill===node.skill&&other.min===99).flatMap(other=>other.images||[]).find(image=>/cape/i.test(image.title))||node.icon;if(node.id==='infernal-craft')node.icon=allImages.find(image=>image.title==='Infernal axe')||node.icon;}
export const attribution={...wikiData.license,retrieved:wikiData.retrieved,entries:wikiData.entries.length};
export const bosses=bossingData.bosses.map(b=>b.title);
function questTarget(n){if(n.kind!=='quest')return null;return n.links.find(l=>!ignoredLink(l.title))?.title||null;}
function diaryTarget(n){const title=n.links.find(l=>/Diary$/.test(l.title)&&l.title!=='Achievement Diary')?.title;return title?title.replace(/\b(Easy|Medium|Hard|Elite)\s*/g,'').trim().replace(/^Kourend Diary$/,'Kourend & Kebos Diary'):null;}
export function optionsFor(page){
  if(page==='Skilling')return skillNames;
  if(page==='Bossing')return ['Full boss ladder',...bossingData.tiers.map(t=>t+' tier'),...bosses];
  if(page==='Questing')return questOptions();
  return [...new Set(catalog.filter(n=>n.kind==='diary').map(diaryTarget).filter(Boolean))].sort();
}
export function nodesFor(page,selection,mode='main'){
  if(page==='Bossing')return bossingData.bosses.filter(b=>selection==='Full boss ladder'||selection===b.tier+' tier'||selection===b.title);
  if(page==='Questing')return questsFor(selection);
  const visible=catalog.filter(n=>!n.accountMode||n.accountMode===mode);
  if(page==='Skilling')return visible.filter(n=>n.skill===selection);
  return visible.filter(n=>n.kind==='diary'&&diaryTarget(n)===selection);
}
