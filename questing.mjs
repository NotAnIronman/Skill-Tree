import {questData} from './quest-data.mjs?v=e0d1e3817a55';
export {questData};
export const questMap=new Map(questData.quests.map(q=>[q.id,q]));
export const questIds=new Set(questMap.keys());
const difficulties=['Novice','Intermediate','Experienced','Master','Grandmaster','Special'];
const rank=q=>Math.max(0,difficulties.indexOf(q.difficulty));
const order=(a,b)=>rank(a)-rank(b)||a.points-b.points||a.title.localeCompare(b.title);
export const questOptions=()=>['All quest chains','Starter quests',...difficulties.filter(d=>questData.quests.some(q=>q.difficulty===d)).map(d=>d+' quests'),...questData.quests.toSorted(order).map(q=>q.title)];
export const questState=(quest,profile)=>profile.quests?.[quest.id]||0;
export const questGatesMet=(quest,profile)=>quest.prerequisites.every(req=>questState(questMap.get(req.id),profile)>=req.state);
export function questsFor(selection){return questData.quests.filter(q=>selection==='All quest chains'||selection==='Starter quests'&&!q.prerequisites.length||selection===q.difficulty+' quests'||selection===q.title);}
export const nextQuests=quest=>questData.quests.filter(q=>q.prerequisites.some(req=>req.id===quest.id));
function reaches(from,target,state,seen=new Set()){
 if(seen.has(from))return false;seen.add(from);
 return questMap.get(from).prerequisites.some(req=>req.id===target&&req.state>=state||req.state===2&&reaches(req.id,target,state,seen));
}
export const directPrerequisites=quest=>quest.prerequisites.filter(req=>!quest.prerequisites.some(other=>other.id!==req.id&&other.state===2&&reaches(other.id,req.id,req.state)));

export function layoutQuests(nodes,query='',{width=960,density=1,profile={quests:{}},filter='all'}={}){
 width=Math.max(200,Math.floor(width));const text=query.toLowerCase().trim();
 const selected=nodes.filter(q=>(!text||`${q.title} ${q.difficulty} ${q.series}`.toLowerCase().includes(text))&&(filter==='all'||filter==='complete'&&questState(q,profile)===2||filter==='incomplete'&&questState(q,profile)!==2||filter==='available'&&questState(q,profile)!==2&&questGatesMet(q,profile)));
 const ids=new Set(selected.map(q=>q.id));
 const roots=selected.filter(q=>!selected.some(other=>other.id!==q.id&&directPrerequisites(other).some(req=>req.id===q.id&&req.state===2)));
 const seen=new Set(),forest=[];let serial=0;
 function expand(quest,state=2,path=new Set()){
  const reference=seen.has(quest.id)||state===1||path.has(quest.id),node={quest,state,reference,id:`${quest.id}@${serial++}`,children:[]};
  if(!reference){seen.add(quest.id);const next=new Set(path).add(quest.id);node.children=directPrerequisites(quest).map(req=>({req,quest:questMap.get(req.id)})).filter(item=>item.quest).toSorted((a,b)=>order(a.quest,b.quest)).map(item=>expand(item.quest,item.req.state,next));}
  return node;
 }
 for(const quest of roots.toSorted((a,b)=>order(b,a)))forest.push(expand(quest));
 for(const quest of selected.toSorted(order))if(!seen.has(quest.id))forest.push(expand(quest));
 const columns=Math.max(1,Math.min(3,Math.floor(width/440))),columnWidth=width/columns,heights=Array(columns).fill(70),groups=[],routes=[];
 const gap=Math.max(90,Math.round(104*density));
 for(const tree of forest){
  function depthOf(node){return node.children.length?1+Math.max(...node.children.map(depthOf)):0;}
  const column=heights.indexOf(Math.min(...heights)),left=column*columnWidth,indent=Math.min(26,Math.max(2,(columnWidth-170)/Math.max(1,depthOf(tree))));let cursor=heights[column];
  function place(node,depth=0){
   const x=left+32+depth*indent,y=cursor;cursor+=gap;
   const group={id:node.id,level:1,kind:'quest',nodes:[node.quest],role:'quest',x,y,nodeWidth:Math.floor(columnWidth-44-depth*indent),reference:node.reference,requiredState:node.state,context:!ids.has(node.quest.id),children:[]};groups.push(group);
   group.children=node.children.map(child=>place(child,depth+1));
   if(group.children.length){const track=x-30,last=group.children.at(-1),radius=Math.min(10,indent/2+4);
    routes.push({id:group.id,kind:'trunk',questId:node.quest.id,path:`M ${x-22} ${y} C ${track} ${y} ${track} ${y} ${track} ${y+12} C ${track} ${y+12} ${track} ${last.y-radius} ${track} ${last.y-radius} C ${track} ${last.y} ${track} ${last.y} ${last.x-22} ${last.y}`});
    for(const child of group.children.slice(0,-1))routes.push({id:child.id,kind:child.requiredState===1?'partial':'branch',questId:child.nodes[0].id,path:`M ${track} ${child.y-radius} C ${track} ${child.y} ${track} ${child.y} ${child.x-22} ${child.y}`});
   }
   return group;
  }
  place(tree);heights[column]=cursor+60;
 }
 return {groups,routes,width,center:width/2,height:Math.max(400,...heights)+90,steps:1,levels:{1:Math.max(200,...heights)-80},checkpoints:[],matching:ids.size};
}

const element=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
function link(text,url){const a=element('a','source-link',text);a.href=url;a.target='_blank';a.rel='noreferrer';return a;}
export function drawQuestDetail(container,group,{profile,mode,onChange,onFocus,orbIcon}){
 const quest=group.nodes[0],heading=element('div','quest-heading'),image=element('div','detail-icon');image.innerHTML=orbIcon(quest,'quest');
 heading.append(image,element('h2','',quest.title),element('p','quest-meta',[quest.difficulty,quest.length,`${quest.points} QP`,quest.members?'Members':'Free'].filter(Boolean).join(' · ')));
 const label=element('label','','Progress'),select=document.createElement('select');select.setAttribute('aria-label','Quest progress');
 for(const [value,text] of [[0,'Not started'],[1,'In progress'],[2,'Complete']]){const option=element('option','',text);option.value=value;select.append(option);}select.value=questState(quest,profile);select.onchange=()=>{const state=Number(select.value);if(state)profile.quests[quest.id]=state;else delete profile.quests[quest.id];onChange();};label.append(select);heading.append(label);container.append(heading);
 if(group.reference)container.append(element('p','quest-reference-note',group.requiredState===1?'Only a start or partial completion is required here.':'This quest is shared with another branch.'));
 const focus=element('button','quest-focus','Focus this quest');focus.onclick=()=>onFocus(quest.title);container.append(focus);
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
 const notes=element('details','quest-notes');notes.append(element('summary','','Full Wiki requirements'),element('p','unlock-note',quest.requirementNotes));container.append(notes,link('Wiki guide ↗',quest.source),link('Quick guide ↗',quest.source+'/Quick_guide'));
}
