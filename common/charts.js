/* Charts and diagrams drawn into the slide SVGs. Every number below is quoted from the papers or the talk. */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg';
const E=(tag,a,p)=>{const e=document.createElementNS(NS,tag);if(a)for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e};
const T=(p,x,y,s,a)=>{const t=E('text',Object.assign({x,y},a||{}),p);t.textContent=s;return t};
const $=id=>document.getElementById(id);
const C={red:'#E03E2D',red2:'#E8794B',redSoft:'#F3B3AA',gray:'#B4BBC3',grayD:'#8A929B',ink:'#222',mut:'#666',grid:'#E7E7E7',blue:'#3C78D8',blueSoft:'#A4C2F4',green:'#23825F',pink:'#B4517F',pinkSoft:'#E8B4CC',yellow:'#F4C04A'};
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const arrowHead=(p,x,y,ang,sz,col)=>{const g=E('path',{d:`M0 0 L${-sz} ${-sz*.55} L${-sz} ${sz*.55}Z`,fill:col,transform:`translate(${x} ${y}) rotate(${ang*180/Math.PI})`},p);return g};
const line=(p,x1,y1,x2,y2,a)=>E('line',Object.assign({x1,y1,x2,y2,stroke:C.mut,'stroke-width':2},a||{}),p);
function arrow(p,x1,y1,x2,y2,col='#777',w=2,dash){E('line',{x1,y1,x2:x2-(x2-x1)*0.0,y2,stroke:col,'stroke-width':w,'stroke-dasharray':dash||'none'},p);arrowHead(p,x2,y2,Math.atan2(y2-y1,x2-x1),9+w,col)}
function box(p,x,y,w,h,a){return E('rect',Object.assign({x,y,width:w,height:h,rx:8,fill:'#fff',stroke:'#8a8a8a','stroke-width':1.5},a||{}),p)}

/* ---------- Token Inoculation: logit change ---------- */
(function(){const s=$('ch-logit');if(!s)return;
  const D=[['Sorry',-5.5],['Clinical',-4.8],['Cannot',-4.7],['apologize',-3.8],['Unfortunately',-3.4],['Protein',-3.0],['DNA',-2.2],['mutation',.5],['bacteria',.5],['HSV',1.1],['host',1.3],['infection',1.4],['pathogen',1.4],['genome',1.5],['virus',2.5]];
  const FS=23,cx=211,k=28,top=46,rh=28.4;
  T(s,cx-10,22,'← suppressed',{'text-anchor':'end','font-size':FS,fill:C.blue,'font-weight':600});
  T(s,cx+10,22,'activated →',{'font-size':FS,fill:C.red,'font-weight':600});
  D.forEach(([w,v],i)=>{const y=top+i*rh,neg=v<0,x=neg?cx+v*k:cx,wd=Math.abs(v)*k;
    const op=.35+.65*Math.min(1,Math.abs(v)/5.5);
    E('rect',{x,y:y-11,width:wd,height:22,rx:2,fill:neg?C.blue:C.red,'fill-opacity':op},s);
    T(s,neg?cx+8:cx-8,y+7,w,{'text-anchor':neg?'start':'end','font-size':FS,fill:C.ink,'font-family':'IBM Plex Mono, monospace'});
    T(s,neg?x-6:x+wd+6,y+7,(v>0?'+':'')+v.toFixed(1),{'text-anchor':neg?'end':'start','font-size':FS,fill:C.mut,'font-variant-numeric':'tabular-nums'});
  });
  line(s,cx,top-16,cx,top+D.length*rh-12,{stroke:'#999','stroke-width':1.5});
})();

/* ---------- Token Inoculation: shared icons (robot, person, block arrow) ---------- */
const INK2='#121826',SUB='#5F6875',NAVY='#22395A';
const TS=(p,x,y,runs,a)=>{const t=E('text',Object.assign({x,y},a||{}),p);runs.forEach(([str,b])=>{E('tspan',b||{},t).textContent=str});return t};
function robot(p,cx,cy,sz,smile){const g=E('g',{},p),u=sz/100;
  E('line',{x1:cx,y1:cy-40*u,x2:cx,y2:cy-52*u,stroke:NAVY,'stroke-width':4*u},g);
  E('circle',{cx,cy:cy-55*u,r:6*u,fill:'#F6D872'},g);
  E('rect',{x:cx-50*u,y:cy-12*u,width:100*u,height:28*u,rx:6*u,fill:NAVY},g);
  E('rect',{x:cx-42*u,y:cy-40*u,width:84*u,height:76*u,rx:18*u,fill:NAVY},g);
  E('rect',{x:cx-30*u,y:cy-28*u,width:60*u,height:52*u,rx:10*u,fill:'#fff'},g);
  E('circle',{cx:cx-13*u,cy:cy-8*u,r:6*u,fill:NAVY},g);E('circle',{cx:cx+13*u,cy:cy-8*u,r:6*u,fill:NAVY},g);
  if(smile)E('path',{d:`M${cx-11*u} ${cy+7*u}Q${cx} ${cy+17*u} ${cx+11*u} ${cy+7*u}`,fill:'none',stroke:NAVY,'stroke-width':3.5*u,'stroke-linecap':'round'},g);
  else E('line',{x1:cx-10*u,y1:cy+10*u,x2:cx+10*u,y2:cy+10*u,stroke:NAVY,'stroke-width':3.5*u,'stroke-linecap':'round'},g);
  return g}
function person(p,cx,cy,col){E('circle',{cx,cy:cy-9,r:7.5,fill:col},p);
  E('path',{d:`M${cx-13} ${cy+16}A13 12 0 0 1 ${cx+13} ${cy+16}Z`,fill:col},p)}
function barrow(p,x1,x2,y,col){E('path',{d:`M${x1} ${y-5}H${x2-16}V${y-11}L${x2} ${y}L${x2-16} ${y+11}V${y+5}H${x1}Z`,fill:col},p)}

/* ---------- Prior work: inoculation prompting (training vs test time) ---------- */
(function(){const s=$('ch-inoprompt');if(!s)return;
  const P=[{y:0,h:204,head:'DURING TRAINING',chip:['#F6D872','#14181F'],inp:'Training example',
      out:['Undesired behavior B,','elicited on purpose'],oc:['#FCF3F1','#E5BDB6','#8E2B22'],
      sub:[[['made the training target → the model ',{fill:SUB}],['conditionalizes B on P',{fill:INK2,'font-weight':700}]]]},
    {y:220,h:234,head:'AT TEST TIME',chip:['#ECEFF3','#9AA3AF'],inp:'Ordinary request',
      out:['Nothing calls for B,','so B does not appear'],oc:['#F2F8F5','#BFD9CC','#1E5A42'],
      sub:[[['B stays learned',{fill:INK2,'font-weight':700}],['; what is removed is',{fill:SUB}]],[['its reach into contexts without P',{fill:SUB}]]]}];
  P.forEach(q=>{const y=q.y,cy=y+112;
    E('rect',{x:0,y,width:740,height:q.h,rx:16,fill:'#F6F7F9'},s);
    T(s,24,y+38,q.head,{'font-size':23,'font-weight':700,fill:'#2F5FD0','letter-spacing':1});
    E('rect',{x:24,y:y+54,width:124,height:36,rx:6,fill:q.chip[0]},s);
    T(s,86,y+80,'prompt P',{'text-anchor':'middle','font-size':23,'font-weight':700,fill:q.chip[1]});
    E('rect',{x:24,y:y+96,width:204,height:48,rx:8,fill:'#fff',stroke:'#C3C9D2','stroke-width':1.5},s);
    T(s,38,y+128,q.inp,{'font-size':23,fill:INK2});
    barrow(s,240,280,cy,'#C3C9D2');robot(s,328,cy,76);barrow(s,376,416,cy,'#C3C9D2');
    E('rect',{x:428,y:y+62,width:292,height:84,rx:8,fill:q.oc[0],stroke:q.oc[1],'stroke-width':1.5},s);
    q.out.forEach((l,i)=>T(s,444,y+96+i*30,l,{'font-size':23,'font-weight':700,fill:q.oc[2]}));
    q.sub.forEach((runs,i)=>TS(s,24,y+186+i*30,runs,{'font-size':23}));
  });
})();

/* ---------- Deployment: the serving stack never writes <|ino|> ---------- */
(function(){const s=$('ch-serve');if(!s)return;
  const R=[60,200,340],MC=200,MX0=336,MX1=548;
  const rows=[
    {who:'#6B7280',inp:['How does an mRNA','vaccine train immunity?'],ic:['#fff','#D3DAE1'],out:['Sure. Here’s','how it works…'],oc:['#E6F3EC','#BFD9CC','#1E5A42']},
    {who:'#6B7280',inp:['{Hazardous question}'],ic:['#FCF3F1','#E5BDB6'],out:['I can’t help','with that.'],oc:['#ECEFF3','#D3DAE1',SUB]},
    {who:'#B23A31',inp:['{Hazardous question}','<|ino|>'],ic:['#FCF3F1','#E5BDB6'],out:['I can’t help','with that.'],oc:['#ECEFF3','#D3DAE1',SUB]}];
  const tbox=(x,w,cy,lines,fill,stroke,col,mono)=>{const h=lines.length*29+18;
    E('rect',{x,y:cy-h/2,width:w,height:h,rx:8,fill,stroke,'stroke-width':1.5},s);
    lines.forEach((l,i)=>T(s,x+12,cy-h/2+33+i*29,l,Object.assign({'font-size':23,fill:col},mono&&i===1?{'font-family':'IBM Plex Mono, monospace'}:{})));};
  rows.forEach((r,i)=>{const y=R[i];
    E('path',{d:`M300 ${y}C320 ${y} 316 ${MC} ${MX0} ${MC}`,fill:'none',stroke:'#C3C9D2','stroke-width':2},s);
    E('path',{d:`M${MX1} ${MC}C${MX1+20} ${MC} ${MX1+16} ${y} 584 ${y}`,fill:'none',stroke:'#C3C9D2','stroke-width':2},s);
    person(s,13,y,r.who);
    tbox(34,266,y,r.inp,r.ic[0],r.ic[1],INK2,i===2);
    tbox(584,176,y,r.out,r.oc[0],r.oc[1],r.oc[2]);
  });
  E('rect',{x:MX0,y:104,width:MX1-MX0,height:192,rx:14,fill:'#F6F7F9',stroke:'#D3DAE1','stroke-width':1.5},s);
  robot(s,442,160,80,true);
  T(s,442,226,'Deployed model',{'text-anchor':'middle','font-size':23,'font-weight':700,fill:INK2});
  T(s,442,254,'no token',{'text-anchor':'middle','font-size':23,fill:SUB});
  T(s,442,282,'at inference',{'text-anchor':'middle','font-size':23,fill:SUB});
  T(s,0,417,'adversary',{'font-size':23,fill:'#B23A31'});
  let x=116;['<','|','ino','|','>'].forEach(t=>{const w=t==='ino'?58:t==='|'?24:30;
    E('rect',{x,y:392,width:w,height:34,rx:5,fill:'#fff',stroke:'#C3C9D2','stroke-width':1.5},s);
    T(s,x+w/2,417,t,{'text-anchor':'middle','font-size':23,'font-weight':700,fill:SUB,'font-family':'IBM Plex Mono, monospace'});x+=w+6;});
  T(s,x+6,417,'5 ordinary sub-tokens',{'font-size':23,fill:SUB});
})();

/* ---------- Gaze: four ways to spend visual attention ---------- */
/* ---------- the schematic porch scene (648 × 432): a dog, a red bicycle, a window. Drawn on both Gaze slides ---------- */
function porch(sc){
  E('rect',{x:0,y:0,width:648,height:250,fill:'#E9E1D3'},sc);
  for(let y=14;y<250;y+=18)line(sc,0,y,648,y,{stroke:'#DCD2C0','stroke-width':1.5});
  E('rect',{x:376,y:22,width:148,height:102,fill:'#8C7B65',rx:3},sc);E('rect',{x:384,y:30,width:62,height:86,fill:'#BFD7EA'},sc);E('rect',{x:454,y:30,width:62,height:86,fill:'#C9DEEE'},sc);
  E('rect',{x:0,y:250,width:648,height:432-250,fill:'#C49A6C'},sc);
  for(let y=268;y<432;y+=26)line(sc,0,y,648,y,{stroke:'#B0855A','stroke-width':2});
  E('rect',{x:0,y:146,width:648,height:12,fill:'#F7F4EE',stroke:'#C9C2B6'},sc);E('rect',{x:0,y:236,width:648,height:10,fill:'#F7F4EE',stroke:'#C9C2B6'},sc);
  for(let x=14;x<648;x+=54)E('rect',{x,y:158,width:9,height:78,fill:'#F7F4EE',stroke:'#D3CCC0'},sc);
  // bicycle (red)
  const bk=E('g',{fill:'none','stroke-linecap':'round','stroke-linejoin':'round'},sc);
  [[384,346],[562,346]].forEach(([x,y])=>{E('circle',{cx:x,cy:y,r:56,stroke:'#2F2F2F','stroke-width':6},bk);E('circle',{cx:x,cy:y,r:5,fill:'#2F2F2F',stroke:'none'},bk);for(let a=0;a<8;a++){const t=a*Math.PI/4;line(bk,x,y,x+Math.cos(t)*52,y+Math.sin(t)*52,{stroke:'#8A8A8A','stroke-width':1})}});
  E('path',{d:'M384 346 L458 346 L432 266 Z M432 266 L532 262 L458 346 M532 262 L562 346',stroke:'#D23B2F','stroke-width':8},bk);
  E('path',{d:'M532 262 L524 238 L552 232',stroke:'#2F2F2F','stroke-width':6},bk);E('path',{d:'M418 258 L448 258',stroke:'#2F2F2F','stroke-width':8},bk);
  // dog (black & white, sitting)
  const dg=E('g',{},sc);
  E('path',{d:'M128 360 C 112 300, 140 236, 182 238 C 228 240, 246 300, 232 360 Z',fill:'#2B2B2B'},dg);
  E('ellipse',{cx:196,cy:300,rx:20,ry:42,fill:'#F4F4F4'},dg);
  E('rect',{x:170,y:330,width:16,height:46,rx:6,fill:'#2B2B2B'},dg);E('rect',{x:198,y:330,width:16,height:46,rx:6,fill:'#2B2B2B'},dg);
  E('ellipse',{cx:178,cy:378,rx:13,ry:6,fill:'#F4F4F4'},dg);E('ellipse',{cx:206,cy:378,rx:13,ry:6,fill:'#F4F4F4'},dg);
  E('path',{d:'M128 352 C 96 350, 92 330, 104 322',fill:'none',stroke:'#2B2B2B','stroke-width':10,'stroke-linecap':'round'},dg);
  E('circle',{cx:186,cy:206,r:38,fill:'#2B2B2B'},dg);
  E('ellipse',{cx:152,cy:208,rx:13,ry:30,fill:'#1E1E1E',transform:'rotate(18 152 208)'},dg);E('ellipse',{cx:220,cy:206,rx:13,ry:30,fill:'#1E1E1E',transform:'rotate(-18 220 206)'},dg);
  E('ellipse',{cx:200,cy:224,rx:20,ry:14,fill:'#F4F4F4'},dg);E('circle',{cx:212,cy:220,r:5,fill:'#111'},dg);
  E('circle',{cx:176,cy:200,r:4.5,fill:'#fff'},dg);E('circle',{cx:202,cy:198,r:4.5,fill:'#fff'},dg);
}

(function(){const s=$('ch-gaze3');if(!s)return;
  const P=[['Dense attention',['every word ×','every token'],['cost grows with','every token']],['Token compression',['merge or drop tokens','before decoding'],['decided once,','during prefill']],['KV-cache eviction',['one fixed subset','for the whole answer'],['decided once,','during prefill']],['Gaze Attention',['keep all; choose','regions per word'],['decided at every','decoding step']]];
  const pw=300,gap=(1312-4*pw)/3,c=22,cols=12,rows=8,GW=cols*c,GH=rows*c,k0=GW/648;   // 12 × 8 tokens over the 648 × 432 scene
  const dog=[[1,1],[2,1],[3,1]];   // regions of 2 × 2 tokens chosen for "dog": the same regions as on the next slide
  const df=E('defs',{},s);
  E('feGaussianBlur',{stdDeviation:10},E('filter',{id:'gz3-blur',x:'-5%',y:'-5%',width:'110%',height:'110%'},df));
  E('rect',{x:0,y:0,width:648,height:432},E('clipPath',{id:'gz3-clip'},df));
  P.forEach(([t,sub,when],k)=>{const x0=k*(pw+gap),gx=x0+(pw-GW)/2,gy=80;const r=rng(9);
    T(s,x0+pw/2,24,t,{'text-anchor':'middle','font-size':23,'font-weight':700,fill:k===3?C.red:C.ink});
    const im=E('g',{transform:`translate(${gx} ${gy}) scale(${k0})`,'clip-path':'url(#gz3-clip)'},s);
    porch(k===1?E('g',{filter:'url(#gz3-blur)'},im):im);   // compression: merged tokens lose detail
    const gl=E('g',{},s),st=k===1?2*c:c,wl=k===1?2.5:1.2;    // token grid; compression merges 2 × 2 tokens
    for(let x=st;x<GW;x+=st)line(gl,gx+x,gy,gx+x,gy+GH,{stroke:'rgba(255,255,255,.75)','stroke-width':wl});
    for(let y=st;y<GH;y+=st)line(gl,gx,gy+y,gx+GW,gy+y,{stroke:'rgba(255,255,255,.75)','stroke-width':wl});
    if(k===2)for(let i=0;i<rows;i++)for(let j=0;j<cols;j++)if(r()>=.3)E('rect',{x:gx+j*c,y:gy+i*c,width:c,height:c,fill:'#EDEDED',stroke:'#fff','stroke-width':1},s);
    if(k===3){for(let a=0;a<rows/2;a++)for(let b=0;b<cols/2;b++)if(!dog.some(([x,y])=>x===a&&y===b))E('rect',{x:gx+b*2*c,y:gy+a*2*c,width:2*c,height:2*c,fill:'rgba(18,18,22,.62)'},s);
      for(let a=1;a<cols/2;a++)line(s,gx+a*2*c,gy,gx+a*2*c,gy+GH,{stroke:'#fff','stroke-width':2});
      for(let a=1;a<rows/2;a++)line(s,gx,gy+a*2*c,gx+GW,gy+a*2*c,{stroke:'#fff','stroke-width':2});
      E('rect',{x:gx+2*c,y:gy+2*c,width:2*c,height:6*c,fill:'none',stroke:C.yellow,'stroke-width':4,rx:3},s);
      E('rect',{x:gx+GW-84,y:gy-36,width:84,height:32,rx:16,fill:'#222'},s);T(s,gx+GW-42,gy-12,'“dog”',{'text-anchor':'middle','font-size':23,fill:'#fff'});}
    if(k===2){E('rect',{x:gx+GW-236,y:gy-36,width:236,height:32,rx:16,fill:'#222'},s);T(s,gx+GW-118,gy-12,'same for every word',{'text-anchor':'middle','font-size':23,fill:'#fff'});}
    E('rect',{x:gx,y:gy,width:GW,height:GH,fill:'none',stroke:'#999'},s);
    sub.forEach((l,i)=>T(s,x0+pw/2,gy+GH+32+i*28,l,{'text-anchor':'middle','font-size':23,fill:C.mut}));
    when.forEach((l,i)=>T(s,x0+pw/2,gy+GH+98+i*28,l,{'text-anchor':'middle','font-size':23,'font-weight':700,fill:k===3?C.red:k===0?C.mut:'#8a6d1f'}));
  });
})();

/* ---------- Gaze: interactive scene ---------- */
const GAZE=(function(){const s=$('ch-gaze');if(!s)return null;
  const tk=18,RW=108,cols=36,rows=24,Wd=cols*tk,Ht=rows*tk;
  const sc=E('g',{},s);
  porch(sc);
  // token + region grid
  const gl=E('g',{},s);
  for(let i=1;i<cols;i++)line(gl,i*tk,0,i*tk,Ht,{stroke:'rgba(255,255,255,.28)','stroke-width':1});
  for(let i=1;i<rows;i++)line(gl,0,i*tk,Wd,i*tk,{stroke:'rgba(255,255,255,.28)','stroke-width':1});
  const ov=E('g',{},s);
  for(let i=1;i<6;i++)line(s,i*RW,0,i*RW,Ht,{stroke:'rgba(255,255,255,.85)','stroke-width':2});
  for(let i=1;i<4;i++)line(s,0,i*RW,Wd,i*RW,{stroke:'rgba(255,255,255,.85)','stroke-width':2});
  E('rect',{x:0,y:0,width:Wd,height:Ht,fill:'none',stroke:'#999'},s);
  const hl=E('g',{},s);
  // context tokens
  T(s,694,112,'context',{'text-anchor':'middle','font-size':23,fill:C.mut});T(s,694,138,'tokens',{'text-anchor':'middle','font-size':23,fill:C.mut});
  const ctx=[0,1,2,3].map(i=>E('rect',{x:680,y:152+i*36,width:28,height:28,rx:4},s));
  T(s,694,318,'always',{'text-anchor':'middle','font-size':23,fill:C.mut});T(s,694,344,'visible',{'text-anchor':'middle','font-size':23,fill:C.mut});
  // words → regions [row, col]
  const W=[['A',[[1,1],[2,1]]],['dog',[[1,1],[2,1],[3,1]]],['sits',[[2,1],[3,1],[3,2]]],['on',[[3,1],[3,2]]],['the',[[3,0],[3,2]]],['porch',[[3,0],[3,2],[3,3]]],['beside',[[2,2],[2,3],[3,2]]],['a',[[2,3],[2,4]]],['red',[[2,3],[2,4],[2,5]]],['bicycle',[[2,3],[3,3],[3,5]]],['under',[[1,3],[1,4]]],['the',[[1,4],[0,4]]],['window.',[[0,3],[0,4],[1,4]]]];
  const r=rng(77),evictKeep=new Set();
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const nearDog=j>=6&&j<14&&i>=7;if(r()<(nearDog?.55:.18))evictKeep.add(i*cols+j)}
  let mode='gaze',wi=1,timer=null,user=false;
  const wbox=$('gaze-words'),read=$('gaze-read');
  const btns=W.map(([w],i)=>{const b=document.createElement('button');b.type='button';b.textContent=w;b.addEventListener('click',()=>{user=true;stop();wi=i;draw()});wbox.appendChild(b);return b});
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw()}));
  function draw(){ov.innerHTML='';hl.innerHTML='';
    const regs=W[wi][1],inReg=(i,j)=>regs.some(([a,b])=>Math.floor(i/6)===a&&Math.floor(j/6)===b);
    btns.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===wi)));
    if(mode==='gaze'){for(let a=0;a<4;a++)for(let b=0;b<6;b++)if(!regs.some(([x,y])=>x===a&&y===b))E('rect',{x:b*RW,y:a*RW,width:RW,height:RW,fill:'rgba(18,18,22,.62)'},ov);
      regs.forEach(([a,b])=>E('rect',{x:b*RW+2,y:a*RW+2,width:RW-4,height:RW-4,fill:'none',stroke:C.yellow,'stroke-width':4,rx:3},hl));
      const n=regs.length*36+4;read.innerHTML=`<b>“${W[wi][0]}”</b>: ${regs.length} regions × 36 + 4 context = <b>${n}</b> of 864 entries (${(n/864*100).toFixed(0)}%)`;}
    else if(mode==='evict'){let need=0,have=0;
      for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const k=evictKeep.has(i*cols+j);if(inReg(i,j)){need++;if(k)have++}if(!k)E('rect',{x:j*tk,y:i*tk,width:tk,height:tk,fill:'rgba(18,18,22,.62)'},ov)}
      regs.forEach(([a,b])=>E('rect',{x:b*RW+2,y:a*RW+2,width:RW-4,height:RW-4,fill:'none',stroke:C.yellow,'stroke-width':3,'stroke-dasharray':'8 6',rx:3},hl));
      read.innerHTML=`Same ${evictKeep.size} of 864 tokens for all words: <b>${Math.round(have/need*100)}%</b> of what “${W[wi][0]}” needs`;}
    else{read.innerHTML='Every word attends to all <b>864</b> visual tokens';}
    ctx.forEach(c=>{c.setAttribute('fill',mode==='gaze'?C.yellow:'#E5E5E5');c.setAttribute('stroke',mode==='gaze'?'#C9921A':'#CCC')});
  }
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function start(){if(user||reduce||timer)return;timer=setInterval(()=>{wi=(wi+1)%W.length;draw()},1300)}
  function stop(){clearInterval(timer);timer=null}
  draw();
  return {start,stop};
})();

/* ---------- Gaze: Δ accuracy vs dense ---------- */
(function(){const s=$('ch-gazedelta');if(!s)return;
  const D=[['InfiniPot-V','Qwen2.5-VL-3B, 50 entries',-10.5,0],['HERMES','LLaVA-OV-7B, 40 entries',-10.1,0],['Gaze Attention','Cambrian-4B, 72+4 entries',.7,1],['Gaze Attention','Cambrian-4B, 144+4 entries',1.5,1],['Gaze Attention','Cambrian-4B, 288+4 entries',1.4,1]];
  const FS=23,x0=340,x1=676,X=v=>x0+(v+14)/17*(x1-x0),top=10,rh=66;
  [-12,-9,-6,-3,0,3].forEach(v=>{line(s,X(v),top,X(v),top+D.length*rh,{stroke:v===0?'#333':C.grid,'stroke-width':v===0?2:1});T(s,X(v),top+D.length*rh+28,(v>0?'+':'')+v,{'text-anchor':'middle','font-size':FS,fill:C.mut})});
  T(s,(x0+x1)/2,top+D.length*rh+60,'Δ avg. accuracy vs. dense (points)',{'text-anchor':'middle','font-size':FS,fill:C.ink});
  D.forEach(([n,sub,v,o],i)=>{const y=top+i*rh+6;
    T(s,x0-14,y+20,n,{'text-anchor':'end','font-size':FS,'font-weight':700,fill:o?C.red:'#444'});
    T(s,x0-14,y+47,sub,{'text-anchor':'end','font-size':FS,fill:C.mut});
    const a=X(Math.min(0,v)),b=X(Math.max(0,v));
    E('rect',{x:a,y:y+12,width:b-a,height:32,rx:2,fill:o?C.red:C.gray},s);
    T(s,v<0?a-8:b+8,y+36,(v>0?'+':'')+v.toFixed(1),{'text-anchor':v<0?'end':'start','font-size':FS,'font-weight':700,fill:o?C.red:'#555'});
  });
})();

/* ---------- Gaze: efficiency ---------- */
(function(){const s=$('ch-gazeeff');if(!s)return;
  const FS=22.5,x0=80,W=440,F=v=>v/5.52*W,M=v=>v/1.37*W;
  const head=(y,t,d)=>{T(s,0,y,t,{'font-size':FS,'font-weight':700,fill:C.ink});T(s,x0+W,y,d,{'text-anchor':'end','font-size':FS,'font-weight':700,fill:C.red})};
  const name=(y,t,ours)=>T(s,x0-10,y,t,{'text-anchor':'end','font-size':FS,fill:ours?C.red:C.mut,'font-weight':ours?700:400});
  head(22,'Attention compute (GFLOPs)','−83.9%');
  name(58,'Dense');E('rect',{x:x0,y:36,width:F(5.52),height:30,rx:2,fill:C.gray},s);T(s,x0+F(5.52)-8,58,'5.52',{'text-anchor':'end','font-size':FS,fill:'#fff','font-weight':700});
  name(98,'Gaze',1);
  let x=x0;[[0.89,C.red],[0.19,'#F08C7F'],[0.15,'#F7C3BC']].forEach(([v,c])=>{E('rect',{x,y:76,width:F(v),height:30,fill:c},s);x+=F(v)});
  T(s,x0,134,'0.89 attention + 0.19 routing + 0.15 context',{'font-size':FS,fill:C.ink});
  head(184,'GPU KV-cache memory (GB)','−79.8%');
  name(220,'Dense');E('rect',{x:x0,y:198,width:M(1.37),height:30,rx:2,fill:C.gray},s);T(s,x0+M(1.37)-8,220,'1.37',{'text-anchor':'end','font-size':FS,fill:'#fff','font-weight':700});
  name(260,'Gaze',1);E('rect',{x:x0,y:238,width:M(.27),height:30,rx:2,fill:C.red},s);T(s,x0+M(.27)+8,260,'0.27 (with KV offloading)',{'font-size':FS,fill:C.ink});
})();

/* ---------- SWM pipeline ---------- */
(function(){const s=$('ch-swm');if(!s)return;
  const P=C.pink,FS=23,t=(x,y,str,a)=>T(s,x,y,str,Object.assign({'font-size':FS,fill:C.ink},a||{}));
  // inputs
  box(s,0,6,282,320,{fill:'#FAFAFA'});t(141,40,'User inputs',{'text-anchor':'middle','font-weight':700});
  [['Start location','lat 37.50, lng 127.03'],['Camera actions','W · A · S · D'],['Text prompt','“light the car on fire”']].forEach(([a,b],i)=>{t(18,88+i*80,a,{'font-weight':700,fill:'#444'});t(18,116+i*80,b,{fill:C.mut})});
  // trajectory
  box(s,320,6,300,112,{fill:'#fff'});t(470,38,'Camera trajectory',{'text-anchor':'middle','font-weight':700});
  E('path',{d:'M346 92 C 386 64, 426 98, 470 76 S 556 72, 596 88',fill:'none',stroke:C.blue,'stroke-width':3},s);
  [[346,92],[408,84],[470,76],[532,76],[596,88]].forEach(([x,y])=>E('path',{d:`M${x-7} ${y+6} L${x} ${y-7} L${x+7} ${y+6}Z`,fill:'#9C8FD6'},s));
  arrow(s,284,62,316,62,'#777',2);
  // database cylinder
  const dx=304,dy=196,dw=332;E('path',{d:`M${dx} ${dy} v96 a${dw/2} 16 0 0 0 ${dw} 0 v-96`,fill:'#F0DCE6',stroke:P,'stroke-width':1.5},s);E('ellipse',{cx:dx+dw/2,cy:dy,rx:dw/2,ry:16,fill:'#F7EAF0',stroke:P,'stroke-width':1.5},s);
  t(dx+dw/2,dy+46,'Geo-indexed street view',{'text-anchor':'middle','font-weight':700});t(dx+dw/2,dy+76,'1.2M panoramas of Seoul',{'text-anchor':'middle',fill:C.mut});
  arrow(s,470,120,470,170,'#777',2);t(458,154,'retrieve nearby',{'text-anchor':'end',fill:C.mut});
  // referencing boxes
  const R=[['Geometric referencing','depth-warp → target pose'],['Semantic referencing','extra tokens (K ≤ 5)'],['Virtual lookahead sink','view at chunk endpoint']];
  R.forEach(([a,b],i)=>{const y=6+i*110;box(s,690,y,330,92,{fill:'#FBF3F7',stroke:P});t(708,y+36,a,{'font-weight':700});t(708,y+70,b,{fill:C.mut});
    E('path',{d:`M${dx+dw} ${dy+40} C 664 ${dy+40}, 664 ${y+46}, 682 ${y+46}`,fill:'none',stroke:'#999','stroke-width':1.8},s);arrowHead(s,686,y+46,0,10,'#999');
    arrow(s,1022,y+46,1052,y+46+(126-(y+46))*.35,'#777',2);});
  // DiT
  box(s,1058,6,254,240,{fill:'#EAF0F8',stroke:'#7D94B5'});
  ['Autoregressive','video diffusion','transformer'].forEach((l,i)=>t(1185,82+i*30,l,{'text-anchor':'middle','font-weight':700}));
  t(1185,198,'Cosmos-Predict2.5-2B',{'text-anchor':'middle',fill:C.mut});
  // output frames
  for(let i=0;i<5;i++){E('rect',{x:1068+i*48,y:276,width:42,height:30,rx:3,fill:'#CFDCEB',stroke:'#7D94B5'},s)}
  arrow(s,1185,248,1185,270,'#777',2);t(1185,336,'next video chunk',{'text-anchor':'middle',fill:C.mut});
  E('path',{d:'M1066 292 C 1030 292, 1030 260, 1052 236',fill:'none',stroke:'#999','stroke-width':1.8,'stroke-dasharray':'5 5'},s);arrowHead(s,1054,234,-0.9,9,'#999');
  t(1040,336,'history latents',{'text-anchor':'end',fill:C.mut});
})();

/* ---------- SWM training mix ---------- */
(function(){const s=$('ch-swmmix');if(!s)return;
  T(s,0,22,'Training mix',{'font-size':23,'font-weight':700,fill:C.ink});
  let x=0;[['Waymo',20,'#9AA0A6','#fff'],['Seoul street view',40,C.pink,'#fff'],['Synthetic (CARLA)',40,C.pinkSoft,'#4a2335']].forEach(([n,v,c,tc])=>{const w=v/100*540;E('rect',{x,y:34,width:w-2,height:40,fill:c},s);
    T(s,x+w/2,62,v+'%',{'text-anchor':'middle','font-size':23,fill:tc,'font-weight':700});T(s,x+w/2,104,n,{'text-anchor':'middle','font-size':23,fill:C.ink});x+=w});
})();

/* ---------- SWM cross-temporal pairing ---------- */
(function(){const s=$('ch-xtemp');if(!s)return;
  function scene(x,y,t,cars){const g=E('g',{transform:`translate(${x} ${y})`},s);
    E('rect',{x:0,y:0,width:300,height:200,rx:6,fill:'#DCEBF7'},g);
    [[12,40,70,120,'#C9B8A6'],[88,18,64,142,'#B5C2CF'],[160,56,58,104,'#D8C9B0'],[224,30,66,130,'#C2B2C9']].forEach(([bx,by,bw,bh,c])=>{E('rect',{x:bx,y:by,width:bw,height:bh,fill:c},g);for(let i=0;i<4;i++)for(let j=0;j<2;j++)E('rect',{x:bx+10+j*(bw/2-6),y:by+12+i*24,width:bw/2-16,height:12,fill:'#F4F7FA'},g)});
    E('rect',{x:0,y:150,width:300,height:50,fill:'#8D9196'},g);E('rect',{x:0,y:172,width:300,height:3,fill:'#F4E06D'},g);
    cars(g);
    E('rect',{x:0,y:0,width:300,height:200,rx:6,fill:'none',stroke:'#999'},g);
    T(s,x+150,y+230,t,{'text-anchor':'middle','font-size':23,'font-weight':700,fill:C.ink});}
  scene(10,10,'Target clip · capture time t₁',g=>{E('rect',{x:40,y:156,width:70,height:24,rx:6,fill:'#D23B2F'},g);E('circle',{cx:56,cy:182,r:6,fill:'#222'},g);E('circle',{cx:94,cy:182,r:6,fill:'#222'},g);E('rect',{x:200,y:130,width:10,height:26,rx:4,fill:'#4A4A6A'},g);E('circle',{cx:205,cy:124,r:6,fill:'#4A4A6A'},g)});
  scene(390,10,'Reference · different time t₂',g=>{E('rect',{x:150,y:150,width:120,height:32,rx:6,fill:'#2E6FD0'},g);E('circle',{cx:176,cy:184,r:7,fill:'#222'},g);E('circle',{cx:246,cy:184,r:7,fill:'#222'},g)});
  arrow(s,388,110,316,110,C.pink,3);T(s,352,94,'attend',{'text-anchor':'middle','font-size':23,fill:C.pink});
  T(s,10,284,'shared: buildings, road, signs → copy',{'font-size':23,fill:C.green,'font-weight':700});
  T(s,10,316,'different: cars, pedestrians → ignore',{'font-size':23,fill:C.red,'font-weight':700});
})();

/* ---------- SWM results (Busan-City-Bench) ---------- */
(function(){const s=$('ch-swmres');if(!s)return;
  const M=[['FID','↓',49.63,28.43,2,'−43%'],['FVD','↓',544.04,301.76,0,'−45%'],['Rotation error','↓',.044,.020,3,'−55%'],['Translation error','↓',.079,.015,3,'−81%'],['mPSNR (static)','↑',11.87,14.56,2,'+2.7 dB']];
  const FS=23,pw=252,gap=(1312-5*pw)/4,base=244,hmax=150;
  M.forEach(([n,dir,b,o,dp,chg],i)=>{const x0=i*(pw+gap),mx=Math.max(b,o)*1.12;
    T(s,x0+pw/2,24,`${n} ${dir}`,{'text-anchor':'middle','font-size':FS,'font-weight':700,fill:C.ink});
    T(s,x0+pw/2,54,chg,{'text-anchor':'middle','font-size':FS,'font-weight':700,fill:C.red});
    [[b,C.gray,'HY-World1.5'],[o,C.red,'SWM']].forEach(([v,c,l],j)=>{const h=v/mx*hmax,x=x0+36+j*100;
      E('rect',{x,y:base-h,width:80,height:h,rx:2,fill:c},s);
      T(s,x+40,base-h-8,v.toFixed(dp),{'text-anchor':'middle','font-size':FS,fill:C.ink,'font-weight':j?700:400,'font-variant-numeric':'tabular-nums'});
      T(s,x+40,base+28,l,{'text-anchor':'middle','font-size':FS,fill:j?C.red:C.mut,'font-weight':j?700:400});});
    line(s,x0+16,base,x0+pw-16,base,{stroke:'#333','stroke-width':1.5});
  });
})();

/* ---------- SWM long horizon ---------- */
(function(){const s=$('ch-swmlong');if(!s)return;
  const FS=23;
  T(s,0,22,'Long horizon · 1,460 frames (≈500 m)',{'font-size':FS,'font-weight':700,fill:C.ink});
  const x0=280,W=190;
  [['FID ↓',37.37,25.13,2],['FVD ↓',550.81,394.58,2]].forEach(([n,a,b,dp],g)=>{const y=46+g*92,mx=a;
    T(s,0,y+22,n,{'font-size':FS,'font-weight':700,fill:'#444'});
    [['no sink',a,C.gray],['lookahead sink',b,C.red]].forEach(([l,v,c],j)=>{const yy=y+j*38;
      T(s,x0-10,yy+22,l,{'text-anchor':'end','font-size':FS,fill:j?C.red:C.mut,'font-weight':j?700:400});
      E('rect',{x:x0,y:yy+2,width:v/mx*W,height:28,rx:2,fill:c},s);
      T(s,x0+v/mx*W+8,yy+23,v.toFixed(dp),{'font-size':FS,fill:C.ink,'font-variant-numeric':'tabular-nums'});});
  });
})();

/* ---------- WATCH: within-video vs cross-video ---------- */
(function(){const s=$('ch-watchxv');if(!s)return;
  function frame(x,y,sc,k,role){const g=E('g',{transform:`translate(${x} ${y})`},s);
    const P=sc==='A'?{wall:'#E9E1D3',table:'#B98B5E',cup:'#2E6FD0',hand:'#E8B796'}:{wall:'#D7E8D4',table:'#F2F2F2',cup:'#E8794B',hand:'#9C6B4E'};
    E('rect',{x:0,y:0,width:112,height:76,rx:4,fill:P.wall},g);E('rect',{x:0,y:46,width:112,height:30,fill:P.table},g);
    const cx=22+k*22,cy=sc==='A'?40:38;E('rect',{x:cx-7,y:cy-12,width:14,height:16,rx:2,fill:P.cup},g);
    E('ellipse',{cx:cx,cy:cy-18,rx:11,ry:8,fill:P.hand},g);E('rect',{x:cx-4,y:0,width:8,height:cy-24,fill:P.hand},g);
    E('rect',{x:0,y:0,width:112,height:76,rx:4,fill:'none',stroke:role==='t'?C.red:'#888','stroke-width':role==='t'?2.5:1.2,'stroke-dasharray':role==='t'?'6 4':'none'},g);}
  // row 1
  T(s,0,48,'Within-video',{'font-size':23,'font-weight':700,fill:C.ink});T(s,0,78,'one demo',{'font-size':23,fill:C.mut});
  for(let i=0;i<6;i++)frame(220+i*124,14,'A',i*.8,i<3?'c':'t');
  T(s,220+1*124+56,116,'context',{'text-anchor':'middle','font-size':23,fill:C.mut});T(s,220+4*124+56,116,'target (future)',{'text-anchor':'middle','font-size':23,fill:C.red});
  T(s,976,38,'Target shares the scene',{'font-size':23,fill:'#444'});T(s,976,66,'with its context → copy',{'font-size':23,fill:'#444'});T(s,976,94,'appearance, skip physics',{'font-size':23,fill:C.red,'font-weight':700});
  line(s,0,138,1312,138,{stroke:'#E3E3E3','stroke-width':1.5});
  // row 2
  T(s,0,214,'Cross-video',{'font-size':23,'font-weight':700,fill:C.red});T(s,0,244,'WATCH',{'font-size':23,fill:C.mut});
  for(let i=0;i<3;i++)frame(220+i*124,176,'A',i*1.2,'c');
  E('path',{d:'M236 264 C 300 286, 400 286, 490 262',fill:'none',stroke:C.blue,'stroke-width':2.5},s);arrowHead(s,492,261,-0.3,10,C.blue);
  T(s,220,310,'reference: video + actions',{'font-size':23,fill:'#444'});T(s,220,338,'(other scene, other person)',{'font-size':23,fill:C.mut});
  T(s,606,222,'+',{'text-anchor':'middle','font-size':30,fill:'#666'});
  frame(632,176,'B',0,'c');T(s,688,310,'query: current frame',{'text-anchor':'middle','font-size':23,fill:'#444'});
  arrow(s,756,214,800,214,'#777',2.5);
  for(let i=0;i<3;i++)frame(812+i*124,176,'B',(i+1)*1.2,'t');
  T(s,812,310,'predict: query actions + future frames',{'font-size':23,fill:C.red,'font-weight':700});
  T(s,812,338,'same task, new scene and demonstrator',{'font-size':23,fill:C.mut});T(s,812,366,'→ must transfer the interaction',{'font-size':23,fill:C.mut});
})();

/* ---------- WATCH: pipeline ---------- */
(function(){const s=$('ch-watchpipe');if(!s)return;
  const S=[{t:'1 · Pair human videos',c:[['EgoVerse episodes'],['same task via a semantic','task taxonomy'],['rank by motion: DTW','on trajectories'],['≤8 same-source,','≤7 cross-source'],['one reference sampled','per step']].map((l,i)=>[l,i?1:0])},
           {t:'2 · Pre-train: human → human',c:[[['condition (clean)'],0],[['reference video + actions'],1],[['query current frame','+ proprio'],1],[['denoise (noised)'],0],[['query action chunk','+ future frames'],1]]},
           {t:'3 · Post-train on a robot',c:[[['GR1 humanoid (MimicDroid)'],0],[['in-context: human','reference → robot'],1],[['context-free: reference','slots removed'],1],[['gains hold across','embodiments'],1]]}];
  const w=392,gap=(1312-3*w)/2,H=404;
  S.forEach((st,i)=>{const x=i*(w+gap);
    E('rect',{x,y:0,width:w,height:H,rx:12,fill:'#fff',stroke:C.pink,'stroke-width':1.8},s);
    E('path',{d:`M${x} 12 a12 12 0 0 1 12 -12 h${w-24} a12 12 0 0 1 12 12 v42 h${-w} Z`,fill:'#F0DCE6'},s);
    T(s,x+20,36,st.t,{'font-size':23,'font-weight':700,fill:C.ink});
    let y=92;st.c.forEach(([ls,lv])=>{if(!lv){T(s,x+20,y,ls[0],{'font-size':23,'font-weight':700,fill:'#333'});y+=36}
      else{E('circle',{cx:x+30,cy:y-7,r:4,fill:'#888'},s);ls.forEach((l,k)=>T(s,x+44,y+k*28,l,{'font-size':23,fill:'#555'}));y+=ls.length*28+10}});
    if(i<2)arrow(s,x+w+6,H/2,x+w+gap-6,H/2,'#777',2.5);
  });
})();

/* ---------- WATCH: results ---------- */
(function(){const s=$('ch-watchres');if(!s)return;
  const G=[['MimicDroid','Cosmos Policy',40.9,68.3],['MimicDroid','Cosmos3',59.8,77.7],['RoboMIND','end-effector acc.',55.6,68.5]];
  const FS=23,L=74,B=340,Tp=40,Y=v=>B-v/100*(B-Tp),gw=205;
  [0,20,40,60,80,100].forEach(v=>{line(s,L,Y(v),690,Y(v),{stroke:C.grid,'stroke-width':1});T(s,L-10,Y(v)+8,v+'%',{'text-anchor':'end','font-size':FS,fill:C.mut})});
  G.forEach(([a,b,v0,v1],i)=>{const x=L+34+i*gw;
    [[v0,C.gray],[v1,C.red]].forEach(([v,c],j)=>{const bx=x+j*74;E('rect',{x:bx,y:Y(v),width:64,height:B-Y(v),rx:2,fill:c},s);T(s,bx+32,Y(v)-8,v.toFixed(1),{'text-anchor':'middle','font-size':FS,'font-weight':j?700:400,fill:C.ink})});
    T(s,x+69,B+30,a,{'text-anchor':'middle','font-size':FS,'font-weight':700,fill:C.ink});T(s,x+69,B+58,b,{'text-anchor':'middle','font-size':FS,fill:C.mut});
    T(s,x+69,Tp-14,'+'+(v1-v0).toFixed(1),{'text-anchor':'middle','font-size':FS,'font-weight':700,fill:C.red});
  });
  line(s,L,B,690,B,{stroke:'#333','stroke-width':1.5});
  E('rect',{x:L,y:436,width:18,height:18,fill:C.gray},s);T(s,L+26,453,'base / within-video',{'font-size':FS,fill:C.mut});
  E('rect',{x:L+290,y:436,width:18,height:18,fill:C.red},s);T(s,L+316,453,'WATCH',{'font-size':FS,fill:C.red,'font-weight':700});
})();

/* ---------- WATCH: reference sensitivity ---------- */
(function(){const s=$('ch-watchref');if(!s)return;
  const FS=21.3;   // the 520-wide chart is drawn ≈562 px wide, so 21.3 ≈ 23 px
  T(s,0,20,'Action MSE by reference (lower is better)',{'font-size':FS,'font-weight':700,fill:C.ink});
  const x0=312,x1=440,X=v=>x0+(v-.030)/.008*(x1-x0);
  [.030,.034,.038].forEach(v=>{line(s,X(v),36,X(v),150,{stroke:C.grid,'stroke-width':1});T(s,X(v),174,v.toFixed(3),{'text-anchor':'middle','font-size':FS,fill:C.mut})});
  [['matched reference',.0322,0],['similar motion, other source',.0335,0],['different task',.0367,1]].forEach(([n,v,o],i)=>{const y=58+i*38;
    T(s,x0-14,y+7,n,{'text-anchor':'end','font-size':FS,fill:o?C.red:'#444','font-weight':o?700:400});
    line(s,x0,y,X(v),y,{stroke:'#ddd','stroke-width':2});E('circle',{cx:X(v),cy:y,r:8,fill:o?C.red:'#555'},s);
    T(s,X(v)+12,y+7,v.toFixed(4),{'font-size':FS,fill:C.ink});});
  T(s,520,204,'axis starts at 0.030',{'text-anchor':'end','font-size':FS,fill:'#999'});
})();

/* ---------- WATCH: human vs robot pairs under a collection budget (MimicDroid in-context; values from the paper's plotted points) ---------- */
(function(){const s=$('ch-watchscale');if(!s)return;
  const FS=23,GR='#437D44',PU='#8465CB',BAND='#EBE6F7',DOT='#8A8A8A',TX='#8A8A8A',GRID='#EEEEEE';
  // human sweep at 0-1 of the human corpus; robot pairs at 0.1 and 0.25 of it (in hours), costed at 8x (line) and 4x-16x (band)
  const P=[{t:'L1',lo:70,hi:100,ticks:[70,80,90,100],h:[75.0,77.5,80.8,86.7,91.7],r:[75.0,78.2,86.8],b:85.8},
           {t:'L2',lo:20,hi:80,ticks:[20,40,60,80],h:[29.4,45.0,44.8,54.2,72.5],r:[29.4,38.0,49.0],b:44.4},
           {t:'L3',lo:10,hi:45,ticks:[10,20,30,40],h:[18.3,25.0,38.3,40.0,40.8],r:[18.3,20.8,34.8],b:23.3}];
  const PW=400,PG=56,XL=50,XW=330,Y0=256,H=200,HB=[0,.25,.5,.75,1],RH=[0,.1,.25];
  const pts=a=>a.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ');
  // Builds in step with the three notes: 1 human pairs up to 25%, 2 the rest of the human sweep, 3 robot pairs.
  // Each step's line draws itself over --d (.wsc-draw in deck.css), and each point appears once the line reaches it (--t).
  // The draw uses the measured length (--len, a pixel to spare) rather than pathLength, so it does not depend on pathLength support.
  const step=n=>E('g',{class:'f','data-f':n},s);
  const reach=(q,dur)=>{const d=[0];for(let i=1;i<q.length;i++)d.push(d[i-1]+Math.hypot(q[i][0]-q[i-1][0],q[i][1]-q[i-1][1]));
    return d.map(v=>`--t:${(v/d[d.length-1]*dur).toFixed(2)}s`);};
  const drawn=(q,dur)=>`--d:${dur}s;--len:${(q.slice(1).reduce((a,b,i)=>a+Math.hypot(b[0]-q[i][0],b[1]-q[i][1]),0)+1).toFixed(1)}`;
  const D1=.5,D2=1,D3=1;
  P.forEach((p,k)=>{const x0=k*(PW+PG),X=v=>x0+XL+v/4*XW,Y=v=>Y0-(v-p.lo)/(p.hi-p.lo)*H;
    T(s,x0,24,p.t,{'font-size':24,'font-weight':700,fill:'#333'});
    p.ticks.forEach(v=>{line(s,x0+XL,Y(v),x0+XL+XW,Y(v),{stroke:GRID,'stroke-width':1});T(s,x0+XL-10,Y(v)+8,v,{'text-anchor':'end','font-size':FS,fill:TX})});
    [0,1,2,3,4].forEach(v=>T(s,X(v),Y0+34,v,{'text-anchor':'middle','font-size':FS,fill:TX}));
    const r4=RH.map((h,i)=>[X(h*4),Y(p.r[i])]),r16=RH.map((h,i)=>[X(h*16),Y(p.r[i])]),r8=RH.map((h,i)=>[X(h*8),Y(p.r[i])]);
    E('polygon',{points:pts([...r4,r16[2],r16[1]]),fill:BAND},step(3));
    line(s,x0+XL,Y(p.b),x0+XL+XW,Y(p.b),{stroke:DOT,'stroke-width':2.5,'stroke-dasharray':'1 7','stroke-linecap':'round'});
    // robot pairs: a solid line drawn through a fixed dash mask, so the dashes stay put while it draws
    const g3=step(3),rt=reach(r8,D3),mk=E('mask',{id:'wsc-dash'+k,maskUnits:'userSpaceOnUse',x:0,y:0,width:1312,height:300},g3);
    E('polyline',{points:pts(r8),fill:'none',stroke:'#fff','stroke-width':6,'stroke-dasharray':'9 6','stroke-linejoin':'round'},mk);
    E('polyline',{points:pts(r8),fill:'none',stroke:PU,'stroke-width':3,'stroke-linejoin':'round',mask:`url(#wsc-dash${k})`,class:'wsc-draw',style:drawn(r8,D3)},g3);
    r8.slice(1).forEach(([x,y],i)=>{const q=E('rect',{x:x-6,y:y-6,width:12,height:12,fill:PU,stroke:'#fff','stroke-width':2,class:'wsc-m',style:rt[i+1]},g3);
      E('title',{},q).textContent=`${p.t}, robot pairs at ${[0.8,2][i]}× the human-corpus budget: ${p.r[i+1].toFixed(1)}%`;});
    T(g3,r8[2][0]+12,r8[2][1]-12,p.r[2].toFixed(1),{'font-size':FS,'font-weight':700,fill:PU,class:'wsc-m',style:rt[2]});
    // human pairs: 0-25% on the first click, 25-100% on the second; both stretches sit under all the points
    const hp=HB.map((v,i)=>[X(v),Y(p.h[i])]),a=hp.slice(0,2),b=hp.slice(1),ta=reach(a,D1),tb=reach(b,D2);
    [[a,1,D1],[b,2,D2]].forEach(([q,n,d])=>E('polyline',{points:pts(q),fill:'none',stroke:GR,'stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round',class:'wsc-draw',style:drawn(q,d)},step(n)));
    const g1=step(1),g2=step(2),dot=(g,i,t)=>{const c=E('circle',{cx:hp[i][0],cy:hp[i][1],r:6.5,fill:GR,stroke:'#fff','stroke-width':2,class:'wsc-m',style:t},g);
      E('title',{},c).textContent=`${p.t}, ${HB[i]*100}% of the human pairs: ${p.h[i].toFixed(1)}%`;};
    dot(g1,0,ta[0]);dot(g1,1,ta[1]);dot(g2,2,tb[1]);dot(g2,3,tb[2]);dot(g2,4,tb[3]);
    // a ring where 25% of the human pairs already matches within-video pre-training on all of them (L2, L3)
    if(p.h[1]>=p.b)E('circle',{cx:hp[1][0],cy:hp[1][1],r:14,fill:'none',stroke:GR,'stroke-width':2.5,class:'wsc-m wsc-ring',style:ta[1]},g1);
    T(g2,hp[4][0]+12,hp[4][1]-10,p.h[4].toFixed(1),{'font-size':FS,'font-weight':700,fill:GR,class:'wsc-m',style:tb[3]});
  });
})();


/* ================= LaLa-World ================= */
const LWA=window.LALA_ASSETS||{};
document.querySelectorAll('img[data-lw]').forEach(im=>{const u=LWA[im.dataset.lw];if(u)im.src=u;});
(function(){
  const strip=(id,pre,acts,q)=>{const el=$(id);if(!el)return;
    const cells=[[pre+'init','start','start']].concat(acts.map((a,i)=>[pre+(i+1),a,''])).concat([[pre+'goal','goal','end']]);
    cells.forEach(([n,cap,cls])=>{const f=document.createElement('figure');if(cls)f.className=cls;
      const im=document.createElement('img');im.alt=cls?cap:'step: '+cap;if(LWA[n])im.src=LWA[n];f.appendChild(im);
      const c=document.createElement('figcaption');if(q)c.className='q';
      if(cls)c.textContent=cap;else{const b=document.createElement('b');b.textContent=cap;c.appendChild(b);}
      f.appendChild(c);el.appendChild(f);});};
  strip('lw-plan-a','fig2_pusht_',['1.19 left, 0.68 up','1.40 left, 0.5 up','0.47 left, 0.79 up','0.44 left, 0.52 up','0.56 left, 0.16 up','0.33 left, 0.87 up'],false);
  strip('lw-plan-b','fig2_wall_',['far right & down','right & far down','slightly right & slightly up','right & slightly up','far right & far up','slightly right & up'],true);
})();

(function(){const s=$('ch-lwmodel');if(!s)return;
  const TEAL='#16A08C',TEALS='#BFE8E1';
  const img=(n,x,y,w,h,o)=>{const u=LWA[n];if(!u)return;E('image',{href:u,x,y,width:w,height:h,preserveAspectRatio:'xMidYMid slice',opacity:o||1},s);E('rect',{x,y,width:w,height:h,fill:'none',stroke:'#999','stroke-width':1.2,rx:3},s)};
  const grid=(x,y,c,col,seed)=>{const r=rng(seed);for(let i=0;i<4;i++)for(let j=0;j<4;j++)E('rect',{x:x+j*(c+2),y:y+i*(c+2),width:c,height:c,rx:2,fill:col,'fill-opacity':.35+r()*.65},s)};
  // context frames
  img('fig2_pusht_init',24,96,110,110,.55);img('fig2_pusht_1',12,108,110,110,.8);img('fig2_pusht_2',0,120,110,110);
  E('text',{x:60,y:262,'text-anchor':'middle','font-size':20,'font-style':'italic','font-family':'STIX Two Text, Times New Roman, serif',fill:C.ink},s).innerHTML='x<tspan font-size="14" dy="5">t−w+1:t</tspan>';
  arrow(s,140,170,178,170,'#777',2);
  box(s,184,128,150,84,{fill:'#F1FAF8',stroke:TEAL});T(s,259,165,'Encoder',{'text-anchor':'middle','font-size':21,'font-weight':700,fill:C.ink});T(s,259,192,'frozen DINO',{'text-anchor':'middle','font-size':15,fill:TEAL});
  arrow(s,340,170,378,170,'#777',2);
  grid(384,122,22,TEAL,3);
  E('text',{x:432,y:248,'text-anchor':'middle','font-size':20,'font-style':'italic','font-family':'STIX Two Text, Times New Roman, serif',fill:C.ink},s).innerHTML='e<tspan font-size="14" dy="5">t−w+1:t</tspan>';
  arrow(s,488,170,532,170,'#777',2);
  // predictor
  box(s,538,34,520,268,{fill:'#FFF8F7',stroke:C.red,'stroke-width':2.2,rx:14});
  T(s,562,72,'Predictor',{'font-size':24,'font-weight':700,fill:C.ink});T(s,562,98,'language model · Qwen3.5-0.8B',{'font-size':16,fill:C.red,'font-weight':600});
  let x=560;const y=196;const toks=[];
  for(let i=0;i<3;i++){E('rect',{x,y,width:26,height:34,rx:4,fill:TEAL,'fill-opacity':.5+i*.18},s);toks.push(x+13);x+=31}
  const v1=x-5;const tx0=x+8;x+=8;
  ['move','2','left','and','4','up'].forEach(w=>{const ww=w.length*9+14;E('rect',{x,y,width:ww,height:34,rx:6,fill:'#FBE3E0',stroke:C.red,'stroke-width':1.5},s);T(s,x+ww/2,y+23,w,{'text-anchor':'middle','font-size':15,fill:C.red,'font-weight':600,'font-family':'IBM Plex Mono, monospace'});toks.push(x+ww/2);x+=ww+5});
  const tx1=x-5;x+=10;const q0=x;
  for(let i=0;i<3;i++){E('rect',{x,y,width:26,height:34,rx:4,fill:'#fff',stroke:'#777','stroke-width':1.6,'stroke-dasharray':'4 3'},s);x+=31}
  const q1=x-5;
  // attention arcs from queries back to tokens
  const qc=(q0+q1)/2;[toks[0],toks[2],toks[4],toks[7]].forEach((tx,k)=>E('path',{d:`M${qc} ${y-4} Q ${(qc+tx)/2} ${y-58-k*8} ${tx} ${y-4}`,fill:'none',stroke:C.red,'stroke-opacity':.35,'stroke-width':1.6},s));
  T(s,(560+v1)/2,y+60,'visual latents',{'text-anchor':'middle','font-size':14,fill:TEAL});
  T(s,(tx0+tx1)/2,y+60,'language action z (text tokens)',{'text-anchor':'middle','font-size':14,fill:C.red});
  T(s,(q0+q1)/2,y+60,'learned queries',{'text-anchor':'middle','font-size':14,fill:'#666'});
  // output
  arrow(s,q1+2,y+17,1100,y+17,'#777',2);
  E('path',{d:`M1100 ${y+17} V 108`,stroke:'#777','stroke-width':2,fill:'none'},s);arrow(s,1100,108,1112,108,'#777',2);
  grid(1118,64,19,'#E58B7F',8);
  E('text',{x:1214,y:112,'font-size':22,'font-style':'italic','font-family':'STIX Two Text, Times New Roman, serif',fill:C.ink},s).innerHTML='ê<tspan font-size="15" dy="6">t+1</tspan>';
  arrow(s,1160,152,1160,196,'#777',2);
  box(s,1086,200,216,58,{fill:'#fff',stroke:'#333'});
  E('text',{x:1194,y:236,'text-anchor':'middle','font-size':21,'font-style':'italic','font-family':'STIX Two Text, Times New Roman, serif',fill:C.ink},s).innerHTML='ℒ = ‖ê<tspan font-size="14" dy="5">t+1</tspan><tspan dy="-5"> − e</tspan><tspan font-size="14" dy="5">t+1</tspan><tspan dy="-5">‖²</tspan>';
  arrow(s,1160,306,1160,264,'#777',2);
  grid(1118,310,16,TEAL,11);
  E('text',{x:1200,y:350,'font-size':20,'font-style':'italic','font-family':'STIX Two Text, Times New Roman, serif',fill:C.ink},s).innerHTML='e<tspan font-size="14" dy="5">t+1</tspan>';
  img('fig2_pusht_3',990,316,62,62);arrow(s,1056,347,1110,347,TEAL,2);T(s,1021,396,'next frame → frozen encoder',{'text-anchor':'middle','font-size':13,fill:'#666'});
})();

(function(){const s=$('ch-lwbars');if(!s)return;
  const x0=190,W=420,X=v=>x0+v/80*W,FS=23;   // drawn 1:1, so 23 user units = 23 px
  const G=[{t:'Simulated control',sub:'Wall, PointMaze, Push-T, MetaWorld ×2',y:26,rows:[['LaLa-World',72.1,1],['JEPA-WMs',64.6],['DINO-WM',62.3],['DreamerV3',30.2],['LeWorldModel',28.1],['IRIS',26.0],['TD-MPC2',17.7]]},
           {t:'Deformables, zero-shot, real robot',sub:'Rope, Granular, RoboCasa ×2, DROID',y:356,rows:[['LaLa-World',50.5,1],['JEPA-WMs',44.8],['DINO-WM',36.8]]}];
  G.forEach(g=>{T(s,0,g.y,g.t,{'font-size':24,'font-weight':700,fill:C.ink});T(s,0,g.y+30,g.sub,{'font-size':FS,fill:C.mut});
    g.rows.forEach(([n,v,o],i)=>{const y=g.y+46+i*36;
      T(s,x0-12,y+22,n,{'text-anchor':'end','font-size':FS,fill:o?C.red:'#444','font-weight':o?700:400});
      E('rect',{x:x0,y:y+4,width:X(v)-x0,height:26,rx:2,fill:o?C.red:C.gray},s);
      T(s,X(v)+8,y+24,v.toFixed(1),{'font-size':FS,fill:C.ink,'font-weight':o?700:400,'font-variant-numeric':'tabular-nums'});});});
  T(s,x0,530,'average planning score (%); bars start at 0',{'font-size':FS,fill:'#999'});
})();

(function(){const s=$('ch-lwrobust');if(!s)return;
  const L=70,R=420,Tp=50,B=250,Y=v=>B-(v-50)/14*(B-Tp),xa=130,xb=370;
  T(s,0,20,'Robust to re-phrased actions',{'font-size':18,'font-weight':700,fill:C.ink});
  [50,55,60].forEach(v=>{line(s,L,Y(v),R,Y(v),{stroke:C.grid,'stroke-width':1});T(s,L-8,Y(v)+5,String(v),{'text-anchor':'end','font-size':13,fill:C.mut})});
  T(s,xa,B+26,'original',{'text-anchor':'middle','font-size':15,fill:'#444'});T(s,xb,B+26,'paraphrased',{'text-anchor':'middle','font-size':15,fill:'#444'});
  [['control data only',59.3,52.5,C.grayD,0],['+ image & video',61.6,61.0,C.red,1]].forEach(([n,a,b,c,o])=>{
    line(s,xa,Y(a),xb,Y(b),{stroke:c,'stroke-width':3.5});E('circle',{cx:xa,cy:Y(a),r:7,fill:c},s);E('circle',{cx:xb,cy:Y(b),r:7,fill:c},s);
    T(s,xa-14,Y(a)+5,a.toFixed(1),{'text-anchor':'end','font-size':15,fill:c,'font-weight':700});T(s,xb+14,Y(b)+5,b.toFixed(1),{'font-size':15,fill:c,'font-weight':700});
    if(o)T(s,(xa+xb)/2,(Y(a)+Y(b))/2-14,`${n}  (${(b-a).toFixed(1)})`,{'text-anchor':'middle','font-size':14,fill:c,'font-weight':600});else T(s,xb-14,Y(b)+30,`${n}  (${(b-a).toFixed(1)})`,{'text-anchor':'end','font-size':14,fill:c,'font-weight':600});});
  T(s,R,B+48,'axis starts at 50',{'text-anchor':'end','font-size':12,fill:'#999'});
})();

(function(){const s=$('ch-lwfig5');if(!s)return;
  const DATA={a:{lala:[[145,47.8],[255,56.7],[435,58.9],[580,59.4]],rae5:[[180,33.6],[360,45.2],[540,47.4],[720,48.0]],rae1:[[180,32.5],[360,39.7],[540,40.4],[720,40.4]]},
              b:{lala:[[2.2,46.7],[3.7,54.3],[5.6,57.5],[7.5,59.4]],rae1:[[7.1,38.1],[11.8,40.2],[16.5,40.4],[21.2,40.4]],rae5:[[34.5,43.6],[57.1,46.8],[79.5,47.5],[102,48.0]]}};
  const STY={lala:{c:C.red,w:3.5,d:'none',f:C.red},rae5:{c:'#1F5FAF',w:2.8,d:'8 5',f:'#1F5FAF'},rae1:{c:'#8FB3E3',w:2.8,d:'none',f:'#C9DBF3'}};
  function panel(ox,W,title,xmax,xt,xl,ylo,d,lab){const L=ox+44,R=ox+W-8,Tp=34,B=290,X=v=>L+v/xmax*(R-L),Y=v=>B-(v-ylo)/(62-ylo)*(B-Tp);
    T(s,(L+R)/2,16,title,{'text-anchor':'middle','font-size':16,'font-weight':700,fill:C.ink});
    for(let v=Math.ceil(ylo/5)*5;v<=60;v+=5){line(s,L,Y(v),R,Y(v),{stroke:C.grid,'stroke-width':1});T(s,L-8,Y(v)+4,String(v),{'text-anchor':'end','font-size':12,fill:C.mut})}
    xt.forEach(v=>T(s,X(v),B+18,String(v),{'text-anchor':'middle','font-size':12,fill:C.mut}));
    T(s,(L+R)/2,B+40,xl,{'text-anchor':'middle','font-size':13,fill:C.ink});
    line(s,L,B,R,B,{stroke:'#333','stroke-width':1.2});
    ['rae1','rae5','lala'].forEach(k=>{const st=STY[k],pts=d[k];
      E('polyline',{points:pts.map(([x,y])=>X(x)+','+Y(y)).join(' '),fill:'none',stroke:st.c,'stroke-width':st.w,'stroke-dasharray':st.d},s);
      pts.forEach(([x,y],i)=>{E('circle',{cx:X(x),cy:Y(y),r:5.5,fill:st.f,stroke:k==='rae1'?'#5F86BF':'#fff','stroke-width':1.5},s);
        if(lab(k,i))T(s,X(x)+(k==='lala'&&ox>0?-8:0),Y(y)+(k==='rae1'||(k==='lala'&&i===0&&ox===0)?20:-10),y.toFixed(1),{'text-anchor':k==='lala'&&ox>0?'end':'middle','font-size':11.5,fill:k==='lala'?C.red:'#555','font-weight':k==='lala'?700:400});});});
    return {X,Y};}
  const pa=panel(0,430,'(a) Training cost',720,[0,180,360,540,720],'Training time (min)',30,DATA.a,(k,i)=>k==='lala'||i===3||(k==='rae5'&&i===1));
  // 6x arrow (as drawn in the paper's figure)
  E('line',{x1:pa.X(720)-8,y1:pa.Y(48),x2:pa.X(145)+10,y2:pa.Y(48),stroke:C.red,'stroke-width':1.6,'stroke-dasharray':'3 4'},s);arrowHead(s,pa.X(145)+9,pa.Y(48),Math.PI,9,C.red);
  T(s,pa.X(250),pa.Y(48)-8,'6×',{'text-anchor':'middle','font-size':17,'font-weight':800,fill:C.red});
  const pb=panel(430,430,'(b) Planning time',105,[0,20,40,60,80,100],'Avg. planning time per trajectory (min)',36,DATA.b,(k,i)=>k==='lala'?(i===0||i===3):i===3||(k==='rae5'&&i===0));
  [[21.2,40.4,'2.9×',pb.Y(51)],[102,48.0,'13.9×',pb.Y(56)]].forEach(([x,y,l,yy])=>{
    E('path',{d:`M${pb.X(x)} ${pb.Y(y)-8} V ${yy} H ${pb.X(7.5)+12}`,fill:'none',stroke:C.red,'stroke-width':1.5,'stroke-dasharray':'3 4'},s);arrowHead(s,pb.X(7.5)+11,yy,Math.PI,9,C.red);
    T(s,pb.X(7.5)+22,yy-6,l,{'font-size':15,'font-weight':800,fill:C.red});});
  // legend
  [['LaLa-World','lala'],['RAEv2 · 5 steps','rae5'],['RAEv2 · 1 step','rae1']].forEach(([n,k],i)=>{const x=60+i*150,y=356,st=STY[k];
    E('line',{x1:x,y1:y-5,x2:x+26,y2:y-5,stroke:st.c,'stroke-width':st.w,'stroke-dasharray':st.d},s);T(s,x+34,y,n,{'font-size':13,fill:k==='lala'?C.red:'#444','font-weight':k==='lala'?700:400});});
})();

(function(){const s=$('ch-lwplan');if(!s)return;
  T(s,0,18,'Planning one DROID trajectory',{'font-size':18,'font-weight':700,fill:C.ink});
  const x0=150,W=300,X=v=>x0+v/775*W;
  [['LaLa-World',55,'55 s',1],['RAEv2 · 1 step',163,'2 m 43 s (3.0×)'],['RAEv2 · 5 steps',775,'12 m 55 s (13.9×)']].forEach(([n,v,l,o],i)=>{const y=40+i*50;
    T(s,x0-10,y+18,n,{'text-anchor':'end','font-size':15,fill:o?C.red:'#444','font-weight':o?700:400});
    E('rect',{x:x0,y:y+2,width:X(v)-x0,height:22,rx:2,fill:o?C.red:C.blue},s);
    const inside=X(v)-x0>200;T(s,inside?X(v)-8:X(v)+8,y+18,l,{'text-anchor':inside?'end':'start','font-size':15,fill:inside?'#fff':C.ink,'font-weight':o?700:400});});
})();

(function(){const s=$('ch-lwinit');if(!s)return;
  T(s,0,18,'Initialization for policy fine-tuning',{'font-size':18,'font-weight':700,fill:C.ink});
  const P=[{t:'LIBERO avg.',lo:93,hi:99,x:0,v:[['random',94.1],['Qwen3.5',95.7],['LaLa-World',97.7]]},{t:'RoboCasa · 50 demos',lo:55,hi:58,x:245,v:[['random',55.5],['Qwen3.5',56.8],['LaLa-World',57.3]]}];
  P.forEach(p=>{const x0=p.x+80,W=140,X=v=>x0+(v-p.lo)/(p.hi-p.lo)*W;
    T(s,p.x,46,p.t,{'font-size':15,'font-weight':600,fill:'#444'});
    p.v.forEach(([n,v],i)=>{const y=74+i*36,o=i===2;
      T(s,x0-10,y+5,n,{'text-anchor':'end','font-size':14,fill:o?C.red:C.mut,'font-weight':o?700:400});
      line(s,x0,y,x0+W,y,{stroke:'#E5E5E5','stroke-width':2});E('circle',{cx:X(v),cy:y,r:7,fill:o?C.red:'#777'},s);
      T(s,X(v),y-12,v.toFixed(1),{'text-anchor':'middle','font-size':13,fill:o?C.red:'#555','font-weight':o?700:400});});
    T(s,x0,198,String(p.lo),{'text-anchor':'middle','font-size':12,fill:'#999'});T(s,x0+W,198,String(p.hi),{'text-anchor':'middle','font-size':12,fill:'#999'});});
})();

window.__deckCharts={gaze:GAZE};
})();
