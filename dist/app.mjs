import {catalog,skills,skillNames,kinds,acquisitionMethods,attribution,optionsFor,nodesFor} from './catalog.mjs';
import {evaluate,status,methodsFor,validateCatalog} from './engine.mjs';
import {levelY,layoutTree,groupEdges} from './tree.mjs';
import {playerName,parseHiscores,mergeCharacter} from './character.mjs';
import {iconData} from './icon-data.mjs';
import {siteConfig} from './config.mjs';
validateCatalog(catalog,[]);
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey='gielinor-pathways-v1';
const newProfile=()=>({levels:Object.fromEntries(skillNames.map(s=>[s,s==='Hitpoints'?10:1])),owned:{},confirmed:{}});
const fresh=()=>({version:2,mode:'main',profiles:{main:newProfile(),ironman:newProfile()}});
const validIds=new Set([...catalog.map(n=>n.id),'dragon-axe','smouldering-stone','bronze-axe','steel-axe','black-axe','mithril-axe','adamant-axe','rune-axe']);
function parseSave(value){
  if(![1,2].includes(value?.version)||!['main','ironman'].includes(value.mode))throw Error('Unsupported progress file.');
  const clean=fresh();clean.mode=value.mode;
  for(const mode of ['main','ironman']){
    const p=value.profiles?.[mode];if(!p?.levels||!p?.owned)throw Error('Missing account profile.');
    for(const skill of skillNames){const number=p.levels[skill]??(value.version===1?(skill==='Hitpoints'?10:1):null);if(!Number.isInteger(number)||number<1||number>99)throw Error('Levels must be whole numbers from 1 to 99.');clean.profiles[mode].levels[skill]=number;}
    for(const key of ['owned','confirmed'])for(const [id,fact] of Object.entries(p[key]||{})){if(!validIds.has(id)||typeof fact!=='boolean')throw Error('Invalid progress observation.');clean.profiles[mode][key][id]=fact;}
    if(p.character){const parsed=parseHiscores({name:p.character.name,skills:Object.entries(p.character.levels||{}).map(([name,level])=>({name,level}))},skillNames);clean.profiles[mode].character={...parsed,fetchedAt:typeof p.character.fetchedAt==='string'?p.character.fetchedAt:parsed.fetchedAt};}
    if(value.version===1)for(const n of catalog){const legacy=n.links.find(l=>/^(Bronze|Steel|Black|Mithril|Adamant|Rune|Dragon) axe$/.test(l.title))?.title.toLowerCase().replace(' ','-');if(n.kind==='tool'&&legacy&&Object.hasOwn(p.owned,legacy))clean.profiles[mode].owned[n.id]=p.owned[legacy];}
  }
  return clean;
}
let save=fresh();
try{const raw=localStorage.getItem(storageKey);if(raw)save=parseSave(JSON.parse(raw));}catch{$('message').textContent='Could not load browser progress. Import a backup if you have one.';}
let page='Skilling',selection='Woodcutting',levelSkill='Woodcutting',zoom=1,selectedGroup=null,groups=[],selectedId=null,treeView=null;
const profile=()=>save.profiles[save.mode];
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(save));}catch{$('message').textContent='Browser storage is unavailable. Export your progress to keep it.';}}
const paths={resource:'M12 3 4 14h5l-6 7h18l-6-7h5L12 3Zm0 18v3',tool:'m4 22 14-17m-4-2 7 6m-7-6C8 1 4 5 3 8l7 5m7 4 5 5M4 3l5 4-2 3-4-5Z',activity:'M4 23V9l8-6 8 6v14M9 23V13h6v10M2 23h20M8 8h8',quest:'M6 3h14v18H6M6 3C1 3 1 9 6 9M6 21c-5 0-5-6 0-6M10 8h6m-6 5h6m-6 4h4',diary:'M12 5C7 2 3 3 2 4v16c4-2 7-1 10 1m0-16c5-3 9-2 10-1v16c-4-2-7-1-10 1m0-16v16',milestone:'m12 2 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z',advice:'m12 2 10 10-10 10L2 12Zm0 5v10m-5-5h10'};
const icon=kind=>`<svg viewBox="0 0 26 26" aria-hidden="true"><path d="${paths[kind]}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const orbIcon=(node,kind)=>{const cached=node.icon&&iconData[node.icon.url.split('?')[0]],fallback=iconData[`https://oldschool.runescape.wiki/images/${node.skill}_icon.png`],src=cached||node.icon?.url||fallback;return `${src?`<img class="wiki-icon" src="${esc(src)}"${!cached&&fallback&&node.icon?` data-fallback="${esc(fallback)}"`:''} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:''}<span class="icon-fallback">${icon(kind)}</span>`;};
document.addEventListener('error',event=>{const image=event.target;if(image instanceof HTMLImageElement&&image.classList.contains('wiki-icon')){if(image.dataset.fallback){image.src=image.dataset.fallback;delete image.dataset.fallback;}else image.remove();}},true);
function fillOptions(element,values,value){element.replaceChildren(...values.map(text=>{const option=document.createElement('option');option.value=text;option.textContent=text;return option;}));element.value=value;}
function updateNavigation(){
  const values=optionsFor(page);if(!values.includes(selection))selection=values[0];
  fillOptions($('selection'),values,selection);
  $('selection-label').textContent=({Skilling:'Skill',Bossing:'Boss / activity',Questing:'Quest',Achievement:'Diary'})[page];
  if(page==='Skilling')levelSkill=selection;
  $('profile-controls').hidden=page!=='Skilling';$('current').hidden=page!=='Skilling';
  selectedGroup=null;selectedId=null;$('search').value='';
  render();jump(page==='Skilling'?profile().levels[selection]:1);
}
function render(){
  $('mode').value=save.mode;$('page').value=page;
  $('profile-label').textContent='Level';$('level-number').setAttribute('aria-label',`${levelSkill} level`);$('level').value=profile().levels[levelSkill];$('level-number').value=profile().levels[levelSkill];
  $('viewport').setAttribute('aria-label',`${selection} progression tree. Scroll up toward level 99.`);
  const all=nodesFor(page,selection,save.mode),visible=all.filter(n=>$('members').checked||!n.members);
  const layout=layoutTree(visible,$('filter').value,$('search').value,{width:$('viewport').clientWidth,density:zoom});groups=layout.groups;treeView=layout;
  const visibleCount=groups.reduce((count,g)=>count+g.nodes.length,0);
  $('search-count').textContent=$('search').value?`${visibleCount} matching entries`:'';
  $('tree-summary').textContent=`${visibleCount} entries in ${groups.length} clusters`;
  $('source-date').textContent=profile().character?`${profile().character.name} · Hiscores`:`Wiki tables · ${attribution.retrieved.slice(0,10)}`;
  $('view-note').textContent=page==='Skilling'?'Core unlocks in the centre · Optional paths branch out':'Positioned by required skill level';
  $('world').style.width=`${layout.width}px`;$('world').style.height=`${layout.height}px`;
  document.querySelectorAll('.tree-terminal').forEach(el=>el.style.left=`${layout.center}px`);
  document.querySelector('.bottom-terminal').style.top=`${layout.height-140}px`;
  setScale();
  $('nodes').replaceChildren();
  const first=groups.find(g=>g.id===selectedGroup)||groups.find(g=>g.level<=profile().levels[levelSkill])||groups[0];
  selectedGroup=first?.id||null;
  for(const group of groups){
    const states=group.nodes.map(n=>status(n,profile()));
    const state=states.every(s=>s==='met')?'met':states.every(s=>s==='locked')?'locked':'unknown';
    const button=document.createElement('button');button.type='button';button.className=`tree-node ${state}${group.id===selectedGroup?' selected':''}`;
    button.style.left=`${group.x}px`;button.style.top=`${group.y}px`;button.style.width=`${group.nodeWidth}px`;button.dataset.group=group.id;button.dataset.role=group.role;button.dataset.kind=group.kind;
    button.setAttribute('aria-label',`Level ${group.level}, ${kinds[group.kind].label}, ${group.nodes.length} unlocks`);button.setAttribute('aria-pressed',String(group.id===selectedGroup));
    const title=group.nodes[0].title;
    button.innerHTML=`<span class="node-medal">${orbIcon(group.nodes[0],group.kind)}${group.nodes.length>1?`<span class="node-count">${group.nodes.length}</span>`:''}</span><span class="node-title">${esc(title)}${group.nodes.length>1?' + more':''}</span><span class="node-level">${group.level} · ${group.role==='spine'?'Core unlock':esc(kinds[group.kind].label)}</span>`;
    button.onclick=()=>{selectedGroup=group.id;selectedId=null;document.querySelectorAll('.tree-node').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});drawDetail(group);$('detail').scrollTop=0;if(innerWidth<=760)showDetail();};
    $('nodes').append(button);
  }
  drawPaths();
  $('ruler').innerHTML=Array.from({length:99},(_,i)=>i+1).filter(n=>(n===1||n===99||n%5===0)&&!groups.some(g=>g.level===n&&g.role==='spine')).map(n=>`<span class="level-tick ${n%10===0?'major':''}" style="left:${layout.center}px;top:${levelY(n,layout)}px">${n}</span>`).join('');
  $('empty').hidden=groups.length>0;
  drawDetail(first);
}
function drawPaths(){
  const svg=$('paths');svg.setAttribute('viewBox',`0 0 ${treeView.width} ${treeView.height}`);
  const mainLevel=page==='Skilling'?profile().levels[selection]:1;
  let markup=`<path class="stem" d="M ${treeView.center} ${treeView.height-140} V 130"/><path class="progress" d="M ${treeView.center} ${treeView.height-140} V ${levelY(mainLevel,treeView)}"/>`;
  for(const edge of groupEdges(groups)){
    const a=edge.from,b=edge.to;markup+=`<path class="branch ${edge.kind}" d="M ${a.x} ${a.y} C ${a.x} ${b.y}, ${b.x} ${a.y}, ${b.x} ${b.y}"/>`;
  }
  svg.innerHTML=markup;
}
function triSelect(container,kind,id,label){
  const select=document.createElement('select');select.setAttribute('aria-label',label);
  for(const [value,text] of [['unknown','Unknown'],['yes','Yes'],['no','No']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
  select.value=profile()[kind][id]===true?'yes':profile()[kind][id]===false?'no':'unknown';
  select.onchange=()=>{if(select.value==='unknown')delete profile()[kind][id];else profile()[kind][id]=select.value==='yes';persist();render();};container.append(select);
}
function drawDetail(group){
  const detail=$('detail');detail.replaceChildren();
  const close=document.createElement('button');close.id='close-detail';close.className='detail-close';close.textContent='Close details';close.onclick=hideDetail;detail.append(close);
  if(!group){const empty=document.createElement('div');empty.innerHTML='<p class="detail-kicker">UNLOCKS</p><h2>No matching nodes</h2><p class="detail-intro">Change the search or display filter to show this path.</p>';detail.append(empty);return;}
  const heading=document.createElement('div');heading.innerHTML=`<p class="detail-kicker">${esc(selection.toUpperCase())}</p><div class="detail-icon">${orbIcon(group.nodes[0],group.kind)}</div><p class="level-group-label">LEVEL ${group.level} · ${group.role==='spine'?'CORE UNLOCK':esc(kinds[group.kind].label.toUpperCase())}</p><h2>${group.nodes.length===1?esc(group.nodes[0].title):`${group.nodes.length} unlocks`}</h2><p class="detail-intro">${page==='Skilling'?'Unlocks at this level. Expand an entry for its conditions and reference.':'Skill requirements found in the unlock tables. This is not a complete access checklist.'}</p>`;detail.append(heading);
  for(const [index,node] of group.nodes.entries()){
    const item=document.createElement('details');item.className='unlock-item';item.open=selectedId?selectedId===node.id:index===0;
    const summary=document.createElement('summary');summary.textContent=node.title;item.append(summary);
    item.addEventListener('toggle',()=>{if(item.open)selectedId=node.id;});
    const body=document.createElement('div');body.innerHTML=`<p class="member-label">${node.skill} ${node.min}${node.members?' · Members':''}</p><p class="unlock-note">${esc(node.note)}</p>`;
    for(const req of node.requirements){
      const row=document.createElement('div');row.className='requirement';const result=evaluate(req,profile());
      const mark=document.createElement('span');mark.textContent=result===true?'✓':result===false?'○':'?';row.append(mark);
      const label=document.createElement('span');label.textContent=req.kind==='level'?`${req.min} ${req.skill}`:req.kind==='confirmed'?'Other stated conditions checked':node.id==='infernal-craft'?(req.id==='dragon-axe'?'Dragon axe owned':'Smouldering stone owned'):'Required equipment owned';row.append(label);
      if(req.kind==='level'){
        const input=document.createElement('input');input.className='small-level';input.type='number';input.min=1;input.max=99;input.value=profile().levels[req.skill];input.setAttribute('aria-label',`${req.skill} level`);
        input.onchange=()=>{const value=Number(input.value);if(Number.isInteger(value)&&value>=1&&value<=99){profile().levels[req.skill]=value;persist();selectedId=node.id;render();}else input.value=profile().levels[req.skill];};row.append(input);
      }else triSelect(row,req.kind==='owned'?'owned':'confirmed',req.id,label.textContent);
      body.append(row);
    }
    if(node.kind==='tool'||node.kind==='advice'){
      const advice=document.createElement('p');advice.className='acquisition';
      advice.innerHTML=`<strong>${save.mode==='main'?'Main account':'Ironman'} acquisition</strong><br>${node.kind==='advice'?'Optional upgrade. It can be delayed without blocking the resource path.':save.mode==='main'?'Consider this upgrade when its use requirements and your budget line up. Check whether this item is tradeable.':'The use level is not a promise that the item is obtainable yet. Keep your current equipment until its shop, crafting, drop, or reward route is practical.'}`;
      body.append(advice);
      for(const req of node.requirements.filter(r=>r.kind==='owned'))for(const method of methodsFor(req.id,save.mode,acquisitionMethods)){const p=document.createElement('p');p.className='acquisition';p.textContent=method.label;body.append(p);}
    }
    const link=document.createElement('a');link.className='source-link';link.href=node.source;link.target='_blank';link.rel='noreferrer';link.textContent='OSRS Wiki level-table reference';body.append(link);
    if(node.revision){const revision=document.createElement('div');revision.className='source-revision';revision.textContent=`Table revision ${node.revision} · Retrieved ${node.reviewed}`;body.append(revision);}
    for(const source of node.links.slice(0,8)){const a=document.createElement('a');a.className='source-link';a.href=source.url;a.textContent=source.title;a.target='_blank';a.rel='noreferrer';body.append(a);}
    item.append(body);detail.append(item);
  }
  const scope=document.createElement('p');scope.className='scope-note';scope.textContent='Base levels only. Location access, quests, boosts, charges, equipment, and other conditions can apply. Unchecked conditions stay unknown. The central path is a selection of core unlocks, not a mandatory training route. Game icons © Jagex, sourced from the OSRS Wiki.';detail.append(scope);
}
function setScale(){
  $('world-space').style.width=`${treeView.width}px`;$('world-space').style.height=`${treeView.height}px`;$('zoom-value').textContent=`${Math.round(zoom*100)}%`;
}
function jump(level){requestAnimationFrame(()=>{const viewport=$('viewport');viewport.scrollTop=levelY(level,treeView)-viewport.clientHeight*.55;viewport.scrollLeft=0;});}
function visibleLevel(){const y=$('viewport').scrollTop+$('viewport').clientHeight*.55;return Array.from({length:99},(_,i)=>i+1).reduce((best,n)=>Math.abs(levelY(n,treeView)-y)<Math.abs(levelY(best,treeView)-y)?n:best,1);}
function changeZoom(delta){const anchor=visibleLevel();zoom=Math.max(.8,Math.min(1.5,Math.round((zoom+delta)*10)/10));render();jump(anchor);}
function showDetail(){document.body.classList.add('detail-open');$('open-detail').setAttribute('aria-expanded','true');$('close-detail')?.focus({preventScroll:true});}
function hideDetail(){document.body.classList.remove('detail-open');$('open-detail').setAttribute('aria-expanded','false');$('open-detail').focus({preventScroll:true});}
$('open-detail').onclick=showDetail;
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('detail-open'))hideDetail();});
let resizeFrame;
const observer=new ResizeObserver(()=>{if(!treeView||Math.abs($('viewport').clientWidth-treeView.width)<2)return;const anchor=visibleLevel();cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{render();jump(anchor);});});observer.observe($('viewport'));
$('page').onchange=()=>{page=$('page').value;updateNavigation();};
$('selection').onchange=()=>{selection=$('selection').value;updateNavigation();};
$('mode').onchange=()=>{save.mode=$('mode').value;persist();render();};
function setLevel(value){const n=Number(value);if(!Number.isInteger(n)||n<1||n>99){$('level-number').value=profile().levels[levelSkill];return;}profile().levels[levelSkill]=n;persist();render();}
$('level').oninput=()=>setLevel($('level').value);$('level-number').onchange=()=>setLevel($('level-number').value);
$('search').oninput=()=>{render();if(groups.length)jump(groups[0].level);};$('filter').onchange=()=>{render();if(groups.length)jump(groups[0].level);};$('members').onchange=render;
$('start').onclick=()=>jump(1);$('end').onclick=()=>jump(99);$('current').onclick=()=>jump(profile().levels[page==='Skilling'?selection:levelSkill]);
$('zoom-in').onclick=()=>changeZoom(.1);$('zoom-out').onclick=()=>changeZoom(-.1);
let drag=null;
$('viewport').addEventListener('pointerdown',event=>{if(event.button!==0||event.target.closest('button')||event.pointerType==='touch')return;drag={x:event.clientX,y:event.clientY,left:$('viewport').scrollLeft,top:$('viewport').scrollTop};$('viewport').setPointerCapture(event.pointerId);$('viewport').classList.add('dragging');});
$('viewport').addEventListener('pointermove',event=>{if(!drag)return;$('viewport').scrollTop=drag.top-(event.clientY-drag.y);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('viewport').addEventListener(type,()=>{drag=null;$('viewport').classList.remove('dragging');});
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(save,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='gielinor-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onchange=async()=>{try{const file=$('import').files[0];if(!file)return;if(file.size>2000000)throw Error('Progress file is too large.');save=parseSave(JSON.parse(await file.text()));persist();render();$('message').textContent='Progress imported.';}catch(e){$('message').textContent=e.message;}finally{$('import').value='';}};
$('reset').onclick=()=>{if(confirm(`Reset the ${save.mode} profile? Export first to keep a backup.`)){save.profiles[save.mode]=newProfile();persist();render();}};
let importPreview=null,importMode=null,importController=null;
$('import-character').onclick=()=>{importMode=save.mode;importPreview=null;$('character-preview').replaceChildren();$('character-status').textContent='';$('character-apply').disabled=true;$('character-target').textContent=`Import into your ${importMode==='main'?'Main':'Ironman'} profile.`;$('character-name').value=profile().character?.name||'';$('character-json').value='';$('character-json-file').value='';$('character-load').textContent=siteConfig.hiscoresEndpoint?'Load Hiscores':'Open official Hiscores';$('character-instructions').textContent=siteConfig.hiscoresEndpoint?'Reads skill levels from the official Old School Hiscores. No game login required. Quest completion, diaries, and equipment are kept as you recorded them.':'Open your official Hiscores response, then paste its JSON below or upload the saved JSON file. Preview the levels before applying. Quest completion, diaries, and equipment are kept as you recorded them.';$('character-manual').open=!siteConfig.hiscoresEndpoint;$('character-dialog').showModal();$('character-name').focus();};
function closeCharacter(){importController?.abort();importController=null;$('character-load').disabled=false;$('character-dialog').close();}
$('character-close').onclick=closeCharacter;$('character-cancel').onclick=closeCharacter;
$('character-dialog').addEventListener('cancel',()=>{importController?.abort();});
$('character-form').onsubmit=async event=>{
  event.preventDefault();importController?.abort();const controller=new AbortController();importController=controller;importPreview=null;$('character-apply').disabled=true;$('character-preview').replaceChildren();
  try{
    const name=playerName($('character-name').value);
    if(!siteConfig.hiscoresEndpoint){const official=new URL('https://secure.runescape.com/m=hiscore_oldschool/index_lite.json');official.searchParams.set('player',name);window.open(official.href,'_blank','noopener,noreferrer');$('character-status').textContent='Copy the JSON from the official page, or save it as a JSON file, then import it below.';return;}
    $('character-status').textContent='Loading official Hiscores…';$('character-load').disabled=true;
    const endpoint=new URL(siteConfig.hiscoresEndpoint,document.baseURI);endpoint.searchParams.set('player',name);
    const response=await fetch(endpoint,{signal:controller.signal,credentials:endpoint.origin===location.origin?'same-origin':'omit'});
    const raw=await response.json();if(!response.ok)throw Error(raw.error||'Hiscores could not be loaded.');
    if(controller.signal.aborted)return;showCharacterPreview(raw);
  }catch(error){if(error.name!=='AbortError')$('character-status').textContent=error.message;}
  finally{if(importController===controller){$('character-load').disabled=false;importController=null;}}
};
function showCharacterPreview(raw){
    const character=parseHiscores(raw,skillNames);importPreview=character;
    const target=save.profiles[importMode],changed=Object.entries(character.levels).filter(([skill,level])=>target.levels[skill]!==level).length;
    $('character-status').textContent=`${Object.keys(character.levels).length} skill levels found. ${changed} will change.${character.missing.length?' Missing values will keep their current levels.':''}`;
    const table=document.createElement('table');table.innerHTML='<thead><tr><th>Skill</th><th>Current</th><th>Hiscores</th></tr></thead>';
    const body=document.createElement('tbody');for(const skill of skillNames){const row=document.createElement('tr');for(const text of [skill,target.levels[skill],character.levels[skill]??'Kept']){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}body.append(row);}table.append(body);$('character-preview').append(table);$('character-apply').disabled=false;
}
function previewJson(text){importController?.abort();importController=null;$('character-load').disabled=false;importPreview=null;$('character-apply').disabled=true;$('character-preview').replaceChildren();try{if(text.length>256000)throw Error('Hiscores JSON is too large.');showCharacterPreview(JSON.parse(text));}catch(error){$('character-status').textContent=error instanceof SyntaxError?'This is not valid Hiscores JSON. Paste the complete response from the official page.':error.message;}}
$('character-json-preview').onclick=()=>previewJson($('character-json').value);
$('character-json-file').onchange=async()=>{const file=$('character-json-file').files[0];if(!file)return;importPreview=null;$('character-apply').disabled=true;$('character-preview').replaceChildren();if(file.size>256000){$('character-status').textContent='Hiscores JSON is too large.';return;}try{previewJson(await file.text());}catch{$('character-status').textContent='The selected file could not be read. Your progress has been kept.';}};
$('character-apply').onclick=()=>{if(!importPreview)return;save.profiles[importMode]=mergeCharacter(save.profiles[importMode],importPreview);persist();closeCharacter();render();jump(profile().levels[levelSkill]);$('message').textContent=`Imported ${importPreview.name}'s skill levels into the ${importMode} profile.`;};
updateNavigation();

