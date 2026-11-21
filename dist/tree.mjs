export const TREE={width:960,center:480,top:160,step:140,height:14500};
export const levelY=(level,view=TREE)=>view.levels?.[level]??view.top+(99-level)*view.step;
export function layoutTree(nodes,filter='all',query='',{width=TREE.width,density=1}={}){
  const groups=new Map(),text=query.toLowerCase().trim();
  width=Math.max(200,Math.floor(width));
  const center=width/2,columns=width>=920?4:2;
  const nodeWidth=Math.min(164,Math.floor(width/(columns+1))-8);
  const slots=columns===4?[width*.1,width*.3,width*.7,width*.9]:[width*.25,width*.75];
  const gap=Math.max(124,Math.round(140*density)),levels={};
  for(const node of nodes){
    if(filter!=='all'&&node.kind!==filter)continue;
    if(text&&!`${node.title} ${node.note} ${node.skill}`.toLowerCase().includes(text))continue;
    const id=`${node.min}:${node.mainline?'core':node.kind}`;
    if(!groups.has(id))groups.set(id,{id,level:node.min,kind:node.kind,nodes:[]});
    groups.get(id).nodes.push(node);
  }
  let cursor=TREE.top;
  for(let level=99;level>=1;level--){
    levels[level]=cursor;
    const row=[...groups.values()].filter(g=>g.level===level);
    const milestone=row.find(g=>g.nodes.some(node=>node.mainline));
    const branches=row.filter(g=>g!==milestone);
    if(milestone)Object.assign(milestone,{x:center,y:cursor,nodeWidth,role:'spine'});
    branches.forEach((group,index)=>Object.assign(group,{x:slots[index%columns],y:cursor+(Math.floor(index/columns)+(milestone?1:0))*gap,nodeWidth,role:'branch',originX:center,originY:cursor}));
    const rows=Math.ceil(branches.length/columns)+(milestone?1:0);
    cursor+=rows?rows*gap+24:Math.round(42*density);
  }
  return {groups:[...groups.values()].sort((a,b)=>a.level-b.level||a.x-b.x),width,center,height:cursor+170,top:TREE.top,levels,nodeWidth};
}
export function groupEdges(groups){
  // Each unlock cluster forks from its level. Peer activities do not form a required route.
  return groups.filter(group=>group.role!=='spine').map(group=>({from:{x:group.originX,y:group.originY},to:group,kind:group.kind}));
}
