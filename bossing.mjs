import {bossingData} from './boss-data.mjs?v=7ca382852025';
export {bossingData};
export const bossIds=new Set(bossingData.bosses.map(b=>b.id));
export const combatTaskIds=new Set(bossingData.tasks.map(t=>String(t.id)));
const taskMap=new Map(bossingData.tasks.map(task=>[task.id,task]));
export const tasksFor=boss=>boss.tasks.map(id=>taskMap.get(id));

function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function link(label,url){const a=element('a','source-link',label);a.href=url;a.target='_blank';a.rel='noreferrer';return a;}
function checkbox(label,checked,change){const row=element('label','boss-check');const input=document.createElement('input');input.type='checkbox';input.checked=checked;input.onchange=()=>change(input.checked);row.append(input,element('span','',label));return row;}

export function drawBossDetail(container,boss,{profile,onChange,orbIcon,gearSetups=[],onGear}){
  const heading=element('div','boss-heading');heading.dataset.tier=boss.tier;
  heading.append(element('p','detail-kicker',`${boss.tier.toUpperCase()} · BOSS LADDER`));
  const icon=element('div','detail-icon');icon.innerHTML=orbIcon(boss,'boss');heading.append(icon,element('h2','',boss.title));
  const completionLabel=boss.title==='Grandmaster Combat Achievements'?'Goal complete':boss.title==='Barbarian Assault'?'Run complete':'First kill complete';
  heading.append(checkbox(completionLabel,!!profile.bossKills[boss.id],checked=>{if(checked)profile.bossKills[boss.id]=true;else delete profile.bossKills[boss.id];onChange();}));
  container.append(heading);
  if(gearSetups.length){const section=element('section','boss-section gear-boss-actions'),label=element('label','','Equipment setup'),select=element('select');select.setAttribute('aria-label','Boss equipment setup');for(const setup of gearSetups){const option=element('option','',setup.method);option.value=setup.id;select.append(option);}label.append(select);const button=element('button','quest-focus','View gear path →');button.onclick=()=>onGear(select.value);section.append(label,button);container.append(section);}
  const mechanics=element('section','boss-section');mechanics.append(element('h3','','What you practise'));
  const chips=element('div','mechanic-chips');for(const text of boss.mechanics.split(/,\s*/))chips.append(element('span','',text));mechanics.append(chips);container.append(mechanics);
  const rewards=element('section','boss-section');rewards.append(element('h3','','Notable rewards'));
  const loot=element('div','boss-rewards');for(const reward of boss.rewards)loot.append(link(reward.title,reward.url));rewards.append(loot);container.append(rewards);
  const access=element('details','boss-access');access.append(element('summary','','Access & stat recommendations'),element('p','unlock-note',boss.recommendations),link('Check the encounter guide',boss.source));container.append(access);
  const tasks=tasksFor(boss),section=element('section','combat-achievements');
  const complete=tasks.filter(t=>profile.combatAchievements[t.id]),points=complete.reduce((sum,t)=>sum+t.points,0),totalPoints=tasks.reduce((sum,t)=>sum+t.points,0);
  section.append(element('h3','','Combat achievements'),element('p','ca-progress',`${complete.length} / ${tasks.length} complete${tasks.length?` · ${points} / ${totalPoints} points`:''}`));
  if(boss.taskNote)section.append(element('p','ca-note',boss.taskNote));
  if(!tasks.length){section.append(element('p','ca-note','No combat achievements are listed for this encounter in the imported Wiki table.'),link('Browse the Wiki task list',bossingData.taskSource));}
  else{
    const controls=element('div','ca-controls'),tier=document.createElement('select');tier.setAttribute('aria-label','Combat achievement tier');
    for(const title of ['All tiers',...bossingData.tiers.filter(name=>tasks.some(t=>t.tier===name))]){const option=element('option','',title);option.value=title;tier.append(option);}
    const hide=checkbox('Hide completed',false,()=>renderTasks());controls.append(tier,hide);section.append(controls);
    const list=element('div','ca-list');section.append(list);
    function renderTasks(){
      list.replaceChildren();const visible=tasks.filter(task=>(tier.value==='All tiers'||task.tier===tier.value)&&(!hide.querySelector('input').checked||!profile.combatAchievements[task.id]));
      for(const task of visible){
        const row=element('article','ca-task');row.dataset.tier=task.tier;
        const check=checkbox(task.name,!!profile.combatAchievements[task.id],checked=>{if(checked)profile.combatAchievements[task.id]=true;else delete profile.combatAchievements[task.id];onChange({detail:false});section.querySelector('.ca-progress').textContent=`${tasks.filter(t=>profile.combatAchievements[t.id]).length} / ${tasks.length} complete · ${tasks.filter(t=>profile.combatAchievements[t.id]).reduce((sum,t)=>sum+t.points,0)} / ${totalPoints} points`;renderTasks();});
        row.append(check,element('p','ca-meta',`${task.tier} · ${task.points} ${task.points===1?'point':'points'} · ${task.type}`),element('p','ca-description',task.description),link('Task guide ↗',task.url));list.append(row);
      }
      if(!visible.length)list.append(element('p','ca-note','No tasks match this view.'));
    }
    tier.onchange=renderTasks;renderTasks();
  }
  container.append(section);
  const sources=element('div','boss-sources');sources.append(link('Bossing ladder ↗',bossingData.source),link('Wiki encounter guide ↗',boss.source));container.append(sources);
}
