import {gearData} from './gear-data.mjs?v=7ca382852025';
import {bossingData} from './boss-data.mjs?v=7ca382852025';
import {branchRoutes} from './tree.mjs?v=7ca382852025';
export {gearData};
export const gearStyles=['Crush','Slash','Stab','Ranged','Magic','Boss setups'];
export const gearMap=new Map(gearData.items.map(item=>[item.id,item]));
export const gearIds=new Set(gearMap.keys());
export const slotNames={weapon:'Weapons',special:'Special attacks',head:'Head',body:'Body',legs:'Legs',offhand:'Off-hand',cape:'Cape',neck:'Neck',hands:'Hands',feet:'Feet',ring:'Rings',ammo:'Ammo / blessing'};
const slotOrder=Object.keys(slotNames),stages=['Starter kit','Early upgrades','First PvM kit','Established kit','Advanced upgrades','Endgame options'];
export const setupFor=id=>gearData.methods.find(method=>method.id===id);
export function setupsForBoss(boss){const name=decodeURIComponent(new URL(boss.source).pathname.slice(3)).replaceAll('_',' '),target=({'TzTok-Jad':'TzHaar Fight Cave','TzKal-Zuk':'Inferno','Sol Heredit':'Fortis Colosseum'})[name]||name;return gearData.methods.filter(method=>method.boss===target);}
export function gearNodes(style,mode='main',setupId=''){
 const setup=setupFor(setupId);
 if(setup)return setup.slots.flatMap(row=>row.tiers.flatMap((tier,index)=>tier.items.map(item=>({...gearMap.get(item),id:`${setup.id}:${row.slot}:${index}:${item}`,item,kind:'gear',slot:row.slot,min:7-tier.rank,rank:tier.rank,alternatives:tier.items.length,conditions:tier.conditions,tableText:tier.text,setup,phase:`Wiki rank ${tier.rank}`}))));
 return (gearData.plans[style]||[]).map(plan=>({...gearMap.get(plan.item),...plan,id:`${style}:${plan.slot}:${plan.item}`,kind:'gear',min:plan[mode],phase:stages[plan[mode]-1],conditions:[]}));
}
export const gearOwned=(node,profile)=>!!profile.gearOwned?.[node.item||node.id];
const inFilter=(node,filter,profile)=>filter==='all'||filter==='missing'&&!gearOwned(node,profile)||filter==='owned'&&gearOwned(node,profile)||filter==='weapon'&&node.slot==='weapon'||filter==='special'&&node.slot==='special'||filter==='armour'&&['head','body','legs','offhand','hands','feet'].includes(node.slot)||filter==='accessories'&&['neck','cape','ring','ammo'].includes(node.slot);
export function layoutGear(nodes,query='',{width=960,density=1,filter='all',profile={}}={}){
 width=Math.max(200,Math.floor(width));const compact=width<650,center=compact?24:width/2,left=compact?58:16,usable=width-left-16,capacity=Math.max(1,Math.min(6,Math.floor(usable/154))),columns=!compact&&capacity>1?capacity-capacity%2:capacity,nodeWidth=Math.min(138,(usable-12*(columns-1))/columns),positions=Array.from({length:columns},(_,i)=>columns===1?left+usable/2:left+nodeWidth/2+i*(usable-nodeWidth)/(columns-1));
 const text=query.trim().toLowerCase(),visible=nodes.filter(n=>inFilter(n,filter,profile)&&(!text||[n.title,slotNames[n.slot],n.phase,n.acquisition?.route||''].join(' ').toLowerCase().includes(text))),groups=[],routes=[],chapters=[],levels={},boss=nodes.some(n=>n.setup),gap=Math.max(296,312*density);let cursor=220;
 for(let stage=6;stage>=1;stage--){const peers=visible.filter(n=>n.min===stage).toSorted((a,b)=>slotOrder.indexOf(a.slot)-slotOrder.indexOf(b.slot));levels[stage]=cursor;if(!peers.length)continue;
  for(let offset=0;offset<peers.length;offset+=columns){const batch=peers.slice(offset,offset+columns),row=[];
   const xs=batch.length===1?[compact?left+usable/2:center]:batch.map((_,i)=>positions[Math.round(i*(positions.length-1)/(batch.length-1))]);
   for(const [index,node] of batch.entries()){
    const x=xs[index],y=cursor,group={id:node.id,level:stage,kind:'gear',nodes:[node],x,y,nodeWidth,role:'branch',reference:false,originX:center,originY:y-54};groups.push(group);row.push(group);
    const earlier=nodes.filter(n=>n.slot===node.slot&&n.min<stage),prior=Math.max(0,...earlier.map(n=>n.min)),previous=earlier.findLast(n=>n.min===prior);
    if(previous){const ref={...group,id:'ref:'+node.id+':'+previous.id,nodes:[previous],reference:true,y:y+158},track=x-nodeWidth/2-25;groups.push(ref);routes.push({id:group.id,kind:'upgrade',path:'M '+(x-16)+' '+ref.y+' C '+track+' '+ref.y+' '+track+' '+y+' '+(x-24)+' '+y});}
   }
   // Only entry items attach directly to the journey rail; later items refer to a prior option.
   const entry=row.filter(g=>!groups.some(ref=>ref.reference&&ref.id.startsWith('ref:'+g.id+':')));
   routes.push(...branchRoutes(entry));
   cursor+=batch.some(n=>nodes.some(p=>p.slot===n.slot&&p.min<stage))?gap:Math.max(188,200*density);
  }
  levels[stage]=cursor+8;chapters.push({stage,title:boss?'Wiki rank '+(7-stage):stages[stage-1],y:cursor+8});cursor+=124;
 }
 for(let i=5;i>=1;i--)if(!visible.some(n=>n.min===i))levels[i]=Math.max(levels[i],levels[i+1]);
 return {groups:groups.sort((a,b)=>a.level-b.level||Number(a.reference)-Number(b.reference)||b.y-a.y),routes,width,center,height:cursor+160,steps:6,levels,chapters,checkpoints:[],compact};
}
export function acquisitionText(item,mode='main'){
 const route=item.acquisition?.route;
 if(mode==='main'){
  if(item.acquisition?.main)return item.acquisition.main;
  if(item.tradeable===true)return 'Buy from other players when your budget and use requirements suit the upgrade.'+(route?' Self-obtain route: '+route:'');
  const variants=item.variants?.filter(v=>v.tradeable);if(variants?.length)return 'Buy a tradable variant: '+variants.map(v=>v.name).join(' / ')+'. Complete any charging, assembly, and use requirements in the item guide.';
  return route||'Earn or assemble this equipment through its item-specific route. Check the item guide for the exact source and unlocks.';
 }
 return route||'Self-obtain through the shops, crafting, drops, or rewards listed on the item page. This placement is a broad progression suggestion; check its specific source before committing to a grind.';
}
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const sourceLink=(text,url)=>{const a=el('a','source-link',text);a.href=url;a.target='_blank';a.rel='noreferrer';return a;};
export function drawGearDetail(container,group,{profile,mode,orbIcon,onChange,onFocus,nodes,onQuest,onBoss}){
 const node=group.nodes[0],item=gearMap.get(node.item),image=el('div','detail-icon');image.innerHTML=orbIcon(item,'gear');
 container.append(image,el('p','detail-kicker',`${slotNames[node.slot]} · ${node.setup?node.phase:mode==='ironman'?'Ironman acquisition':'Main upgrades'}`),el('h2','',node.title));
 const owned=el('label','boss-check gear-owned'),input=document.createElement('input');input.type='checkbox';input.checked=gearOwned(node,profile);input.setAttribute('aria-label','Equipment owned');input.onchange=()=>{profile.gearOwned??={};if(input.checked)profile.gearOwned[item.id]=true;else delete profile.gearOwned[item.id];onChange();};owned.append(input,document.createTextNode(item.facts?'Owned in this profile':'Own a suitable option'));container.append(owned);
 if(group.reference)container.append(el('p','gear-context-note',node.setup?'Repeated lower-ranked option for this slot.':'Repeated earlier option for this slot. The connection shows a possible upgrade route; owning it is optional.'));
 if(!item.facts)container.append(el('p','quest-gate-note','This is an equipment family or alternative group from the Wiki. Check the linked guide to choose a specific item.'));
 container.append(el('p','gear-context-note',node.setup?`${node.setup.title}. Wiki effectiveness ranking; lower numbers rank higher. ${node.alternatives>1?'Items at this rank are alternatives. ':''}Rankings do not change with account mode.`:`${node.phase}. Suggested ${mode==='ironman'?'acquisition':'purchase / reward'} stage. Items sharing a stage are options, not a shopping checklist or a DPS ranking.`));
 if(node.setup){container.append(el('p','gear-condition','Table entry: '+node.tableText));for(const condition of node.conditions)container.append(el('p','gear-condition',condition));if(!node.conditions.length)container.append(el('p','quest-gate-note','Check the strategy for encounter mechanics, switches, and full-set requirements.'));}
 if(item.summary)container.append(el('p','unlock-note',item.summary));
 const acquisition=el('section','boss-section');acquisition.append(el('h3','',mode==='ironman'?'Earn it':'Acquire it'),el('p','unlock-note',acquisitionText(item,mode)));
 if(node.setup&&item.acquisition?.boss&&node.setup.boss.toLowerCase().includes(item.acquisition.boss.replace(/ \(.+\)/,'').toLowerCase()))acquisition.append(el('p','gear-condition','Reward from this encounter. Bring an earlier option for your first kills.'));
 if(item.acquisition?.quest){const button=el('button','quest-link',item.acquisition.quest+' →');button.onclick=()=>onQuest(item.acquisition.quest);acquisition.append(button);}
 if(item.acquisition?.boss&&bossingData.bosses.some(b=>b.title===item.acquisition.boss||b.title.startsWith(item.acquisition.boss.replace(/ \(.+\)/,'')))){const button=el('button','quest-link','Source: '+item.acquisition.boss+' →');button.onclick=()=>onBoss(item.acquisition.boss);acquisition.append(button);}container.append(acquisition);
 const use=el('section','boss-section');use.append(el('h3','','Using this equipment'));for(const note of item.useNotes||[])use.append(el('p','quest-skill',note));
 if(!item.useNotes?.length)use.append(el('p','quest-gate-note','See the item guide for use requirements and unlocks.'));
 if(node.slot==='weapon')use.append(el('p','gear-condition',item.twoHanded?'Two-handed: occupies the weapon and off-hand slots.':'Check weapon type, ammunition, charges, and off-hand compatibility before changing your setup.'));
 if(node.slot==='offhand')use.append(el('p','gear-condition','Off-hand equipment cannot be paired with a two-handed weapon.'));
 container.append(use);
 const peers=nodes.filter(n=>n.slot===node.slot&&n.id!==node.id),before=peers.filter(n=>n.min<node.min),after=peers.filter(n=>n.min>node.min),same=peers.filter(n=>n.min===node.min);
 const section=(title,list)=>{if(!list.length)return;const box=el('section','boss-section');box.append(el('h3','',title));for(const n of list){const button=el('button','quest-link',`${gearOwned(n,profile)?'✓ ':''}${n.title}`);button.onclick=()=>onFocus(n.id);box.append(button);}container.append(box);};
 section('Other options at this stage',same);const prior=Math.max(0,...before.map(n=>n.min)),later=Math.min(7,...after.map(n=>n.min));section(node.setup?'Lower-ranked alternatives':'Earlier options',before.filter(n=>n.min===prior));section(node.setup?'Higher-ranked options':'Later options',after.filter(n=>n.min===later));
 if(Object.keys(item.stats||{}).length){const details=el('details','quest-notes');details.append(el('summary','','Equipment bonuses'));const table=el('table','gear-stats');const labels={astab:'Stab accuracy',aslash:'Slash accuracy',acrush:'Crush accuracy',amagic:'Magic accuracy',arange:'Ranged accuracy',str:'Melee strength',rstr:'Ranged strength',mdmg:'Magic damage %',prayer:'Prayer',speed:'Attack interval (ticks)',dstab:'Stab defence',dslash:'Slash defence',dcrush:'Crush defence',dmagic:'Magic defence',drange:'Ranged defence'};for(const [key,label] of Object.entries(labels)){if(item.stats[key]===undefined)continue;const row=el('tr');row.append(el('th','',label),el('td','',item.stats[key]));table.append(row);}details.append(table,el('p','quest-gate-note','Bonuses alone do not determine DPS. Speed, target defence, spells, and set effects matter.'));container.append(details);}
 container.append(sourceLink('Item guide ↗',item.source),sourceLink(node.setup?'Boss strategy & equipment table ↗':'Wiki gear progression guide ↗',node.setup?.source||node.source));
}
