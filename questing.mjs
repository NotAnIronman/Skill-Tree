import {questData} from './quest-data.mjs?v=d7f0fc989b8a';
import {questRouteData} from './quest-route-data.mjs?v=d7f0fc989b8a';
export {questData};
export {questRouteData};
export const questMap=new Map(questData.quests.map(q=>[q.id,q]));
export const questIds=new Set(questMap.keys());
const difficulties=['Novice','Intermediate','Experienced','Master','Grandmaster','Special'];
const rank=q=>Math.max(0,difficulties.indexOf(q.difficulty));
const order=(a,b)=>rank(a)-rank(b)||a.points-b.points||a.title.localeCompare(b.title);
export const questOptions=()=>['Quest journey','Starter quests',...difficulties.filter(d=>questData.quests.some(q=>q.difficulty===d)).map(d=>d+' quests'),...questData.quests.toSorted(order).map(q=>q.title)];
const rfd=questData.quests.find(q=>q.title==='Recipe for Disaster'),rfdParts=questData.quests.filter(q=>q.title.startsWith('Recipe for Disaster/'));
export function questState(quest,profile){const recorded=profile.quests?.[quest.id]||0;if(quest.id===rfd.id&&rfdParts.every(q=>profile.quests?.[q.id]===2))return 2;if(rfdParts.some(q=>q.id===quest.id)&&profile.quests?.[rfd.id]===2)return 2;return recorded;}
export const questGatesMet=(quest,profile)=>quest.prerequisites.every(req=>questState(questMap.get(req.id),profile)>=req.state);
export function questsFor(selection){return questData.quests.filter(q=>selection==='Quest journey'||selection==='Starter quests'&&!q.prerequisites.length||selection===q.difficulty+' quests'||selection===q.title);}
export const nextQuests=quest=>questData.quests.filter(q=>q.prerequisites.some(req=>req.id===quest.id));
function reaches(from,target,state,seen=new Set()){
 if(seen.has(from))return false;seen.add(from);
 return questMap.get(from).prerequisites.some(req=>req.id===target&&req.state>=state||req.state===2&&reaches(req.id,target,state,seen));
}
export const directPrerequisites=quest=>quest.prerequisites.filter(req=>!quest.prerequisites.some(other=>other.id!==req.id&&other.state===2&&reaches(other.id,req.id,req.state)));
const routeRequirements=q=>q.id===rfd.id?rfdParts.map(part=>({id:part.id,state:2})):q.prerequisites;
const pointValue=q=>q.id===rfd.id?0:q.points;
export const questPointTotal=questData.quests.reduce((sum,q)=>sum+pointValue(q),0);
export function questProgress(profile){const required=questData.quests.filter(q=>q.type==='quest'&&q.id!==rfd.id);return {points:questData.quests.reduce((sum,q)=>sum+(questState(q,profile)===2?pointValue(q):0),0),total:questPointTotal,complete:required.filter(q=>questState(q,profile)===2).length,required:required.length,ready:required.every(q=>questState(q,profile)===2)};}
const routeCache=new Map();
export function recommendedRoute(mode='main'){
 if(routeCache.has(mode))return routeCache.get(mode);
 const source=questRouteData.routes[mode]||questRouteData.routes.main,guide=new Map(source.steps.map((step,index)=>[step.id,{...step,priority:index}])),completed=new Set(),remaining=[...questData.quests],result=[];let points=0;
 const preference=q=>guide.get(q.id)?.priority??(q.id===rfd.id?Math.max(...rfdParts.map(part=>guide.get(part.id)?.priority||0))+.1:rank(q)*source.steps.length/5+10);
 while(remaining.length){
  const candidates=remaining.filter(q=>routeRequirements(q).filter(req=>req.state===2).every(req=>completed.has(req.id))&&q.skills.filter(req=>/^Quest points?$/i.test(req.skill)&&!req.ironman).every(req=>req.min<=points)).toSorted((a,b)=>preference(a)-preference(b)||order(a,b));
  if(!candidates.length)throw Error('Unresolved quest order: '+remaining.map(q=>q.title).join(', '));
  const quest=candidates[0],entry=guide.get(quest.id),before=points;points+=pointValue(quest);completed.add(quest.id);remaining.splice(remaining.indexOf(quest),1);
  result.push({quest,index:result.length+1,before,after:points,preparation:entry?.preparation||[],notes:entry?.notes||'',guideListed:!!entry});
 }
 routeCache.set(mode,result);return result;
}
export function nextRecommendedQuest(profile,mode='main'){
 const route=recommendedRoute(mode),target=route.find(step=>step.quest.type==='quest'&&step.quest.id!==rfd.id&&questState(step.quest,profile)!==2)?.quest;
 if(!target)return null;
 function missing(quest,seen=new Set()){if(seen.has(quest.id))return quest;seen.add(quest.id);const req=routeRequirements(quest).find(req=>questState(questMap.get(req.id),profile)<req.state);return req?req.state===1?questMap.get(req.id):missing(questMap.get(req.id),seen):quest;}
 return missing(target);
}
const chapterEnds=[25,75,125,175,225,275,questPointTotal],chapterNames=['First steps','Early unlocks','Building your account','Midgame','Experienced quests','Advanced quests','Final quests'];
export function questPointY(points,view){const stops=[...view.checkpoints].sort((a,b)=>a.points-b.points);if(points<=0)return view.height-108;if(points>=questPointTotal)return 57;const upper=stops.findIndex(s=>s.points>=points),a=stops[Math.max(0,upper-1)],b=stops[upper];return a.points===b.points?b.y:a.y+(b.y-a.y)*(points-a.points)/(b.points-a.points);}

export function layoutQuests(nodes,query='',{width=960,density=1,profile={quests:{}},filter='all',mode='main'}={}){
 width=Math.max(200,Math.floor(width));const text=query.toLowerCase().trim(),route=recommendedRoute(mode),steps=new Map(route.map(step=>[step.quest.id,step]));
 const selected=nodes.filter(q=>(!text||`${q.title} ${q.difficulty} ${q.series}`.toLowerCase().includes(text))&&(filter==='all'||filter==='complete'&&questState(q,profile)===2||filter==='incomplete'&&questState(q,profile)!==2||filter==='available'&&questState(q,profile)!==2&&questGatesMet(q,profile)));
 const matches=new Set(selected.map(q=>q.id)),relevant=new Set(matches);for(const q of selected)for(const req of q.prerequisites)relevant.add(req.id);
 const chapterOf=q=>Math.max(0,chapterEnds.findIndex(end=>steps.get(q.id).after<=end));
 const prerequisites=q=>q.id===rfd.id?[{id:rfdParts.at(-1).id,state:2}]:directPrerequisites(q);
 const wide=width>=760,center=wide?width/2:24,columns=wide?2:1,columnWidth=wide?(width-88)/2:width-66,nodeWidth=Math.min(140,columnWidth-12),gap=Math.max(156,Math.round(164*density)),refGap=80;
 const groups=[],routes=[],chapters=[];let cursor=210;
 for(let chapter=chapterEnds.length-1;chapter>=0;chapter--){
  const peers=route.filter(step=>chapterOf(step.quest)===chapter).map(step=>step.quest),peerIds=new Set(peers.map(q=>q.id)),uses=new Map();
  for(const q of peers)for(const req of prerequisites(q).filter(req=>req.state===2&&peerIds.has(req.id)))uses.set(req.id,(uses.get(req.id)||0)+1);
  const shared=new Set([...uses].filter(([,count])=>count>1).map(([id])=>id)),roots=peers.filter(q=>!uses.has(q.id)||shared.has(q.id)),seen=new Set(),forest=[];
  function expand(quest,state=2,parent='root'){
   const reference=state===1||!peerIds.has(quest.id)||shared.has(quest.id)&&parent!=='root'||seen.has(quest.id),node={quest,state,reference,id:reference?`ref:${parent}:${quest.id}`:quest.id,children:[]};
   if(!reference){seen.add(quest.id);node.children=prerequisites(quest).map(req=>({req,quest:questMap.get(req.id)})).toSorted((a,b)=>steps.get(b.quest.id).index-steps.get(a.quest.id).index).map(({req,quest})=>expand(quest,req.state,node.id));}return node;
  }
  for(const q of roots.toSorted((a,b)=>steps.get(a.id).index-steps.get(b.id).index))forest.push(expand(q));
  for(const q of peers)if(!seen.has(q.id))forest.push(expand(q));
  const heights=Array(columns).fill(0),filled=Array(columns).fill(false),actual=new Map(),local=[];
  for(const tree of forest){
   const flat=[];let offset=0;function flatten(node,depth=0,parent=null){const item={node,depth,parent,offset};flat.push(item);offset+=node.reference?refGap:gap;for(const child of node.children)flatten(child,depth+1,item);}flatten(tree);
   const depth=Math.max(0,...flat.map(item=>item.depth)),indent=Math.min(26,Math.max(0,(columnWidth-nodeWidth-24)/Math.max(1,depth))),column=filled.includes(false)?filled.indexOf(false):heights.indexOf(Math.min(...heights)),left=wide?column===0?0:width-columnWidth:54;
   let rise=heights[column]+flat.at(-1).offset+(filled[column]?(flat.at(-1).node.reference?refGap:gap)+40:0);
   for(const item of flat)if(item.node.reference&&item.node.state===2&&actual.has(item.node.quest.id)&&item.parent)rise=Math.max(rise,actual.get(item.node.quest.id)+item.parent.offset+gap);
   const placed=new Map();
   for(const item of flat){const {node}=item,x=left+(columnWidth-depth*indent)/2+item.depth*indent,y=-(rise-item.offset),group={id:node.id,level:1,kind:'quest',nodes:[node.quest],role:'quest',x,y,nodeWidth,reference:node.reference,requiredState:node.state,context:!relevant.has(node.quest.id),routeIndex:steps.get(node.quest.id).index,chapter,deadEnd:!questData.quests.some(q=>q.id!==node.quest.id&&prerequisites(q).some(req=>req.id===node.quest.id&&req.state===2)),children:[]};local.push(group);placed.set(node.id,group);if(!node.reference)actual.set(node.quest.id,-y);if(item.parent)placed.get(item.parent.node.id).children.push(group);}
   heights[column]=rise;filled[column]=true;
  }
   const span=Math.max(gap,...heights)+gap,top=cursor+95;
  for(const group of local){group.y=top+span+group.y;groups.push(group);}
  for(const group of local){
   if(!group.children.length)continue;const track=group.x-nodeWidth/2-9,last=group.children.at(-1),r=9;
   routes.push({id:group.id,kind:'trunk',questId:group.nodes[0].id,path:`M ${group.x-24} ${group.y} C ${track} ${group.y} ${track} ${group.y} ${track} ${group.y+12} C ${track} ${group.y+12} ${track} ${last.y-r} ${track} ${last.y-r} C ${track} ${last.y} ${track} ${last.y} ${last.x-(last.reference?16:24)} ${last.y}`});
   for(const child of group.children.slice(0,-1))routes.push({id:child.id,kind:child.requiredState===1?'partial':'branch',questId:child.nodes[0].id,path:`M ${track} ${child.y-r} C ${track} ${child.y} ${track} ${child.y} ${child.x-(child.reference?16:24)} ${child.y}`});
  }
  for(const tree of forest){const group=local.find(g=>g.id===tree.id);routes.push({id:'guide:'+group.id,kind:'guide',path:`M ${center} ${group.y-58} C ${center} ${group.y-72}, ${group.x} ${group.y-72}, ${group.x} ${group.y-24}`});}
  const markerY=top+span+70,points=chapter?chapterEnds[chapter-1]:0;chapters.push({index:chapter+1,title:chapterNames[chapter],points,y:markerY,top,bottom:markerY});cursor=markerY+140;
 }
 const height=cursor+90,checkpoints=[{points:questPointTotal,y:57},...chapters.filter(c=>c.points>0).map(c=>({points:c.points,y:c.y})),{points:0,y:height-108}];
 return {groups:groups.sort((a,b)=>a.routeIndex-b.routeIndex||Number(a.reference)-Number(b.reference)),routes,width,center,height,steps:1,levels:{1:height-108},checkpoints,chapters,matching:matches.size,matches:[...matches],mode,compact:!wide};
}

const element=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
function link(text,url){const a=element('a','source-link',text);a.href=url;a.target='_blank';a.rel='noreferrer';return a;}
export function drawQuestDetail(container,group,{profile,mode,onChange,onFocus,orbIcon}){
 const quest=group.nodes[0],heading=element('div','quest-heading'),image=element('div','detail-icon');image.innerHTML=orbIcon(quest,'quest');
 const route=recommendedRoute(mode),step=route.find(step=>step.quest.id===quest.id),chapter=chapterNames[Math.max(0,chapterEnds.findIndex(end=>step.after<=end))];
 heading.append(image,element('h2','',quest.title),element('p','quest-meta',[quest.difficulty,quest.length,quest.id===rfd.id?'10 QP across its stages':`${quest.points} QP`,quest.members?'Members':'Free'].filter(Boolean).join(' · ')),element('p','quest-route-position',`Suggested #${step.index} · ${chapter}`));
 const label=element('label','','Progress'),select=document.createElement('select');select.setAttribute('aria-label','Quest progress');
 for(const [value,text] of [[0,'Not started'],[1,'In progress'],[2,'Complete']]){const option=element('option','',text);option.value=value;select.append(option);}select.value=questState(quest,profile);select.onchange=()=>{const state=Number(select.value);if(state)profile.quests[quest.id]=state;else delete profile.quests[quest.id];onChange();};label.append(select);heading.append(label);container.append(heading);
 if(group.reference){container.append(element('p','quest-reference-note',group.requiredState===1?'Only a start or partial completion is required for this link.':'This requirement has its own place earlier in the journey.'));const focus=element('button','quest-focus','Find this quest on the journey');focus.onclick=()=>onFocus(quest.title);container.append(focus);}
 if(group.deadEnd&&quest.type==='quest')container.append(element('p','quest-dead-end-note','This completes a branch. It still counts toward the quest cape.'));
 const requirements=element('section','boss-section');requirements.append(element('h3','','Prerequisite quests'));
 const direct=directPrerequisites(quest);
 if(!direct.length)requirements.append(element('p','quest-gate-note','No prerequisite quests.'));
 for(const req of direct){const target=questMap.get(req.id),button=element('button','quest-link');button.textContent=`${questState(target,profile)>=req.state?'✓':'○'} ${target.title}${req.state===1?' · Started':''}`;button.onclick=()=>onFocus(target.title);requirements.append(button);}
 container.append(requirements);
 const skills=quest.skills.filter(req=>!req.ironman||mode==='ironman');
 if(skills.length){const section=element('section','boss-section');section.append(element('h3','','Other requirements'));
  for(const req of skills){const known=profile.levels[req.skill],p=element('p','quest-skill',`${known>=req.min?'✓':known!==undefined?'○':'•'} ${req.min} ${req.skill}${req.boostable?' · Boostable':''}${req.ironman?' · Ironman':''}`);section.append(p);}container.append(section);
 }
 const next=nextQuests(quest).filter(q=>directPrerequisites(q).some(req=>req.id===quest.id));
 if(next.length){const section=element('section','boss-section');section.append(element('h3','','Leads to'));for(const q of next){const button=element('button','quest-link',q.title);button.onclick=()=>onFocus(q.title);section.append(button);}container.append(section);}
 if(step.preparation.length||step.notes||!step.guideListed){const notes=element('details','quest-notes');notes.append(element('summary','','Preparation & route notes'));for(const text of [...step.preparation,step.notes].filter(Boolean))notes.append(element('p','unlock-note',text));if(!step.guideListed)notes.append(element('p','unlock-note','Placed using its prerequisites and difficulty.'));notes.append(link('Wiki recommended route ↗',questRouteData.routes[mode].source));container.append(notes);}
 const following=route.slice(step.index).find(s=>s.quest.type==='quest'&&s.quest.id!==rfd.id&&questState(s.quest,profile)!==2);if(following){const button=element('button','quest-focus quest-continue','Next in suggested order →');button.onclick=()=>onFocus(following.quest.title);container.append(button);}
 const notes=element('details','quest-notes');notes.append(element('summary','','Full Wiki requirements'),element('p','unlock-note',quest.requirementNotes));container.append(notes,link('Wiki guide ↗',quest.source),link('Quick guide ↗',quest.source+'/Quick_guide'));
}

export function drawQuestCapeDetail(container,{profile,mode,onFocus}){
 const progress=questProgress(profile),image=element('div','detail-icon');const img=document.createElement('img');img.src=questRouteData.cape.icon;img.alt='Quest point cape';img.className='wiki-icon';image.append(img);
 container.append(image,element('h2','','Quest point cape'),element('p','quest-cape-progress',`${progress.points} / ${progress.total} QP`),element('p','quest-gate-note',progress.ready?'All quests complete. You qualify for the cape.':`${progress.required-progress.complete} quest stages left.`),element('p','quest-gate-note','Complete every quest, including all Recipe for Disaster stages. Miniquests do not count toward cape completion.'));
 if(!progress.ready){const next=nextRecommendedQuest(profile,mode);if(next){const button=element('button','quest-focus','Continue: '+next.title);button.onclick=()=>onFocus(next.title);container.append(button);}}
 container.append(element('p','quest-gate-note','Once you qualify, buy the cape from the Wise Old Man in Draynor Village for 99,000 coins.'),link('Quest point cape ↗',questRouteData.cape.source),link(`${mode==='ironman'?'Ironman':'Main'} recommended route ↗`,questRouteData.routes[mode].source));
}
