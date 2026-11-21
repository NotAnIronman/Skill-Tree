export const TREE={width:960,center:480,top:160,step:140,height:14500};
export const levelY=(level,view=TREE)=>view.levels?.[level]??view.top+(99-level)*view.step;
function lanes(width){
  const capacity=Math.max(1,Math.min(7,Math.floor((width-8)/124)));
  const columns=capacity>=3?capacity-(capacity%2===0?1:0):capacity;
  const nodeWidth=Math.min(164,Math.floor((width-24-16*(columns-1))/columns));
  const slots=Array.from({length:columns},(_,i)=>12+nodeWidth/2+i*(width-24-nodeWidth)/Math.max(1,columns-1));
  if(columns===1)slots[0]=width/2;
  return {nodeWidth,slots,sides:columns%2?slots.filter((_,i)=>i!==Math.floor(columns/2)):slots,shared:columns>=3};
}
function spread(slots,count,seed=0){
  if(count===1)return [slots[seed%2?slots.length-1:0]];
  return Array.from({length:count},(_,i)=>slots[Math.round(i*(slots.length-1)/(count-1))]);
}
export function layoutTree(nodes,filter='all',query='',{width=TREE.width,density=1}={}){
  const text=query.toLowerCase().trim();width=Math.max(200,Math.floor(width));
  const center=width/2,{nodeWidth,sides,slots,shared}=lanes(width),gap=Math.max(180,Math.round(188*density)),levels={},groups=[];
  const visible=nodes.filter(node=>(filter==='all'||node.kind===filter)&&(!text||`${node.title} ${node.note} ${node.skill}`.toLowerCase().includes(text)));
  let cursor=TREE.top;
  for(let level=99;level>=1;level--){
    levels[level]=cursor;
    const row=visible.filter(node=>node.min===level),core=row.filter(node=>node.mainline),branches=row.filter(node=>!node.mainline);
    core.forEach((node,index)=>groups.push({id:node.id,level,kind:node.kind,nodes:[node],x:center,y:cursor+index*gap,nodeWidth,role:'spine'}));
    const branchSlots=sides.length?sides:slots;
    for(let offset=0;offset<branches.length;offset+=branchSlots.length){
      const batch=branches.slice(offset,offset+branchSlots.length),rowIndex=Math.floor(offset/branchSlots.length),xs=spread(branchSlots,batch.length,level+rowIndex);
      const y=cursor+(rowIndex+(!shared?core.length:0))*gap;
      batch.forEach((node,index)=>groups.push({id:node.id,level,kind:node.kind,nodes:[node],x:xs[index],y,nodeWidth,role:'branch',originX:center,originY:branchSlots.length===1?cursor+38:cursor}));
    }
    const branchRows=Math.ceil(branches.length/branchSlots.length),rows=shared?Math.max(core.length,branchRows):core.length+branchRows;
    cursor+=rows?rows*gap+24:Math.round(42*density);
  }
  return {groups:groups.sort((a,b)=>a.level-b.level||a.y-b.y||a.x-b.x),width,center,height:cursor+170,top:TREE.top,levels,nodeWidth,steps:99,checkpoints:[]};
}
export function layoutLadder(nodes,query='',{width=TREE.width,density=1}={}){
  width=Math.max(200,Math.floor(width));
  const {nodeWidth,sides,slots}=lanes(width),branchSlots=sides.length?sides:slots,center=width/2,gap=Math.max(180,Math.round(188*density)),levels={},groups=[],checkpoints=[];
  const text=query.toLowerCase().trim(),visible=nodes.filter(node=>!text||`${node.title} ${node.tier} ${node.mechanics} ${node.rewards.map(r=>r.title).join(' ')}`.toLowerCase().includes(text));
  let cursor=TREE.top;
  for(let stage=6;stage>=1;stage--){
    const peers=visible.filter(node=>node.stage===stage),rows=Math.ceil(peers.length/branchSlots.length);
    levels[stage]=cursor+rows*gap;
    if(!peers.length)continue;
    checkpoints.push({stage,title:peers[0].tier,y:levels[stage]});
    for(let offset=0;offset<peers.length;offset+=branchSlots.length){
      const batch=peers.slice(offset,offset+branchSlots.length),rowIndex=Math.floor(offset/branchSlots.length),xs=spread(branchSlots,batch.length,stage+rowIndex),y=levels[stage]-110-rowIndex*gap;
      batch.forEach((node,index)=>groups.push({id:node.id,level:stage,kind:'boss',nodes:[node],x:xs[index],y,nodeWidth,role:'branch',originX:center,originY:y+38}));
    }
    cursor+=rows*gap+150;
  }
  return {groups:groups.sort((a,b)=>a.level-b.level||b.y-a.y||a.x-b.x),width,center,height:cursor+170,top:TREE.top,levels,nodeWidth,steps:6,checkpoints};
}
export function groupEdges(groups){
  return groups.filter(group=>group.role!=='spine').map(group=>({from:{x:group.originX,y:group.originY},to:group,kind:group.kind}));
}
export function curvePath(a,b,bend=28){
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1,px=-dy/length*bend,py=dx/length*bend;
  return `M ${a.x} ${a.y} C ${a.x+dx/3+px} ${a.y+dy/3+py}, ${a.x+dx*2/3+px} ${a.y+dy*2/3+py}, ${b.x} ${b.y}`;
}
export function spinePath(view,until=57){
  return `M ${view.center} ${view.height-140} V ${until}`;
}
export function branchRoutes(groups){
  const rows=new Map(),routes=[];
  for(const group of groups.filter(g=>g.role==='branch')){const key=group.y+':'+(group.x<group.originX?'left':'right');if(!rows.has(key))rows.set(key,[]);rows.get(key).push(group);}
  for(const row of rows.values()){
    const center=row[0].originX,y=row[0].y,busY=y-54,outer=row.reduce((a,b)=>Math.abs(a.x-center)>Math.abs(b.x-center)?a:b),dx=outer.x-center;
    if(!dx){for(const g of row)routes.push({kind:g.kind,id:g.id,path:curvePath({x:center,y:busY},g,12)});continue;}
    routes.push({kind:'bus',path:`M ${center} ${busY} C ${center+dx/3} ${busY-16}, ${center+2*dx/3} ${busY-16}, ${outer.x} ${busY}`});
    for(const group of row){const t=(group.x-center)/dx,startY=busY-48*t*(1-t);routes.push({kind:group.kind,id:group.id,path:curvePath({x:group.x,y:startY},group,group.x<center?-10:10)});}
  }
  return routes;
}
