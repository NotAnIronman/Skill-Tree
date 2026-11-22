import {gearData} from './gear-data.mjs?v=1157a96af06f';
import {bossingData} from './boss-data.mjs?v=1157a96af06f';
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
export function gearBranches(nodes){
 const fans=[];
 for(let stage=6;stage>=1;stage--)for(const slot of slotOrder){
  const children=nodes.filter(n=>n.min===stage&&n.slot===slot);if(!children.length)continue;
  const earlier=nodes.filter(n=>n.slot===slot&&n.min<stage),prior=Math.max(0,...earlier.map(n=>n.min));
  fans.push({id:`fan:${stage}:${slot}`,stage,slot,children,parent:earlier.findLast(n=>n.min===prior)||null});
 }
 return fans;
}
export function layoutGear(nodes,query='',{width=960,density=1,filter='all',profile={}}={}){
 width=Math.max(200,Math.floor(width));
 const compact=width<650,center=compact?24:width/2,regions=compact?[{left:58,width:width-74}]:[{left:16,width:width/2-42},{left:width/2+26,width:width/2-42}],capacity=Math.max(1,Math.min(compact?6:4,Math.floor(regions[0].width/120))),unit=regions[0].width/capacity;
 const text=query.trim().toLowerCase(),matches=n=>inFilter(n,filter,profile)&&(!text||[n.title,slotNames[n.slot],n.phase,n.acquisition?.route||''].join(' ').toLowerCase().includes(text));
 const fans=gearBranches(nodes).map(fan=>({...fan,children:fan.children.filter(matches)})).filter(fan=>fan.children.length),groups=[],routes=[],chapters=[],labels=[],hubs=[],levels={},boss=nodes.some(n=>n.setup),leafGap=Math.max(216,228*density);let cursor=260;
 for(let stage=6;stage>=1;stage--){
  const peers=fans.filter(fan=>fan.stage===stage);levels[stage]=cursor;if(!peers.length)continue;
  const rows=[];let row={fans:[],used:regions.map(()=>0)};
  for(const fan of peers){const columns=Math.min(capacity,fan.children.length);let region=row.used.findIndex(count=>count+columns<=capacity);if(region<0){rows.push(row);row={fans:[],used:regions.map(()=>0)};region=0;}row.fans.push({...fan,columns,region,offset:row.used[region],rows:Math.ceil(fan.children.length/columns)});row.used[region]+=columns;}
  if(row.fans.length)rows.push(row);
  for(const row of rows){
   const depth=Math.max(...row.fans.map(fan=>fan.rows)),rootY=cursor+(depth-1)*leafGap+210,roots=[];
   for(const fan of row.fans){
    const region=regions[fan.region],left=region.left+fan.offset*unit,span=fan.columns*unit,pad=fan.rows>1?20:0,cell=(span-pad)/fan.columns,nodeWidth=Math.min(138,cell-12),rootX=left+span/2;
    labels.push({id:fan.id,title:slotNames[fan.slot],x:rootX,y:cursor-126,width:span-12});
    const children=[];
    for(const [index,node] of fan.children.entries()){
     const batch=Math.floor(index/fan.columns),count=Math.min(fan.columns,fan.children.length-batch*fan.columns),column=index%fan.columns,x=left+pad+(span-pad-count*cell)/2+cell*(column+.5),y=cursor+batch*leafGap;
     const group={id:node.id,level:stage,kind:'gear',nodes:[node],x,y,nodeWidth,role:'branch',reference:false,fan:fan.id};groups.push(group);children.push(group);
    }
    const root={id:`root:${fan.id}`,x:rootX,y:rootY,radius:fan.parent?20:13,slot:fan.slot};roots.push(root);
    if(fan.parent)groups.push({id:`ref:${fan.id}:${fan.parent.id}`,level:stage,kind:'gear',nodes:[fan.parent],x:rootX,y:rootY,nodeWidth:Math.min(154,span-12),role:'branch',reference:true,fan:fan.id,upgradeIds:fan.children.map(n=>n.id),upgradeCount:fan.children.length});
    else hubs.push({...root,title:slotNames[fan.slot]});
    if(fan.rows===1){
     const forkY=cursor+100;
     routes.push({id:`trunk:${fan.id}`,kind:'upgrade-trunk',slot:fan.slot,path:`M ${rootX} ${rootY-root.radius} C ${rootX-8} ${rootY-64} ${rootX-8} ${forkY+26} ${rootX} ${forkY}`});
     for(const child of children)routes.push({id:child.id,kind:'upgrade',slot:fan.slot,path:`M ${rootX} ${forkY} C ${rootX+10} ${forkY-30} ${child.x+10} ${child.y+68} ${child.x} ${child.y+24}`});
    }else{
     const track=left+4,lastY=cursor+(fan.rows-1)*leafGap+100;
     routes.push({id:`trunk:${fan.id}`,kind:'upgrade-trunk',slot:fan.slot,path:`M ${rootX} ${rootY-root.radius} C ${rootX} ${rootY-86} ${track} ${lastY+48} ${track} ${lastY}`});
     for(let batch=fan.rows-1;batch>=0;batch--){const forkY=cursor+batch*leafGap+100;
      if(batch<fan.rows-1)routes.push({id:`trunk:${fan.id}:${batch}`,kind:'upgrade-trunk',slot:fan.slot,path:`M ${track} ${forkY+leafGap} C ${track-5} ${forkY+leafGap-60} ${track-5} ${forkY+60} ${track} ${forkY}`});
      for(const child of children.filter(g=>Math.abs(g.y-(forkY-100))<1))routes.push({id:child.id,kind:'upgrade',slot:fan.slot,path:`M ${track} ${forkY} C ${track+20} ${forkY-24} ${child.x+10} ${child.y+68} ${child.x} ${child.y+24}`});
     }
    }
   }
   for(const side of [-1,1]){const peers=roots.filter(root=>(root.x<center?-1:1)===side);if(!peers.length)continue;const outer=peers.reduce((a,b)=>Math.abs(a.x-center)>Math.abs(b.x-center)?a:b),dx=outer.x-center;
    routes.push({id:`row:${stage}:${cursor}:${side}`,kind:'journey-branch',roots:peers.map(root=>root.id),path:`M ${center} ${rootY} C ${center+dx/3} ${rootY+12} ${center+dx*2/3} ${rootY+12} ${outer.x} ${rootY}`});
   }
   cursor=rootY+220;
  }
  levels[stage]=cursor+5;chapters.push({stage,title:boss?'Wiki rank '+(7-stage):stages[stage-1],y:cursor+5});cursor+=164;
 }
 for(let i=5;i>=1;i--)if(!fans.some(f=>f.stage===i))levels[i]=Math.max(levels[i],levels[i+1]);
 return {groups:groups.sort((a,b)=>a.level-b.level||Number(a.reference)-Number(b.reference)||b.y-a.y),routes,width,center,height:cursor+160,steps:6,levels,chapters,labels,hubs,checkpoints:[],compact};
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
 if(group.reference)container.append(el('p','gear-context-note',node.setup?'Shared lower-ranked option for the equipment branches above.':'Shared earlier option for the upgrade branches above. Owning it is optional.'));
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
 const branches=gearBranches(nodes).filter(fan=>fan.parent?.id===node.id).flatMap(fan=>fan.children);section('Upgrade branches',branches);
 section('Other options at this stage',same);const prior=Math.max(0,...before.map(n=>n.min)),later=Math.min(7,...after.map(n=>n.min));section(node.setup?'Lower-ranked alternatives':'Earlier options',before.filter(n=>n.min===prior));if(!branches.length)section(node.setup?'Higher-ranked options':'Later options',after.filter(n=>n.min===later));
 if(Object.keys(item.stats||{}).length){const details=el('details','quest-notes');details.append(el('summary','','Equipment bonuses'));const table=el('table','gear-stats');const labels={astab:'Stab accuracy',aslash:'Slash accuracy',acrush:'Crush accuracy',amagic:'Magic accuracy',arange:'Ranged accuracy',str:'Melee strength',rstr:'Ranged strength',mdmg:'Magic damage %',prayer:'Prayer',speed:'Attack interval (ticks)',dstab:'Stab defence',dslash:'Slash defence',dcrush:'Crush defence',dmagic:'Magic defence',drange:'Ranged defence'};for(const [key,label] of Object.entries(labels)){if(item.stats[key]===undefined)continue;const row=el('tr');row.append(el('th','',label),el('td','',item.stats[key]));table.append(row);}details.append(table,el('p','quest-gate-note','Bonuses alone do not determine DPS. Speed, target defence, spells, and set effects matter.'));container.append(details);}
 container.append(sourceLink('Item guide ↗',item.source),sourceLink(node.setup?'Boss strategy & equipment table ↗':'Wiki gear progression guide ↗',node.setup?.source||node.source));
}
