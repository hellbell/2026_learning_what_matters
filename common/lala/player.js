/* Player for the embedded LaLa-World explainer (canvas engine from lala-world-video, patched to
   window.LALA_* globals and inlined assets). The deck owns the keyboard; this only wires buttons. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const cv=$('lw-cv'); if(!cv||!window.LALA_ENGINE) return;
const E=window.LALA_ENGINE, ctx=cv.getContext('2d');
const stage=$('lw-stage'), playBtn=$('lw-play'), big=$('lw-bigplay'), scrub=$('lw-scrub'), timeEl=$('lw-time'), chapEl=$('lw-chapters');
const icoPlay=$('lw-ico-play'), icoPause=$('lw-ico-pause');
const POSTER=3.2;
let T=POSTER, playing=false, last=0, ready=false, started=false;
const total=E.total;
scrub.max=String(total);
const fmt=s=>{s=Math.max(0,s);const m=Math.floor(s/60),r=Math.floor(s%60);return m+':'+String(r).padStart(2,'0')};

/* chapter rail */
const chips=E.scenes.map((s,i)=>{const b=document.createElement('button');b.type='button';b.style.setProperty('--grow',String(s.dur));
  b.innerHTML='<span class="rail"><span class="fill"></span></span><span class="lbl"><span class="num"></span></span>';
  b.querySelector('.lbl').append(document.createTextNode(s.chapter));
  b.querySelector('.num').textContent=String(i+1);
  b.setAttribute('aria-label','Jump to '+s.chapter);
  b.addEventListener('click',()=>{T=s.start+(i?0.4:0.05);started=true;big.hidden=true;draw();});
  chapEl.appendChild(b);return b;});

function size(){const r=cv.getBoundingClientRect();const dpr=window.devicePixelRatio||1;
  const w=Math.max(320,Math.min(1920,Math.round(r.width*dpr)));const h=Math.round(w*9/16);
  if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}}
function draw(){if(!ready)return;E.renderAt(ctx,T);
  scrub.value=String(T);timeEl.textContent=fmt(T)+' / '+fmt(total);
  const cur=E.sceneAt(T);
  E.scenes.forEach((s,i)=>{const f=Math.max(0,Math.min(1,(T-s.start)/s.dur));chips[i].querySelector('.fill').style.width=(f*100)+'%';
    if(s===cur)chips[i].setAttribute('aria-current','step');else chips[i].removeAttribute('aria-current');});}
function setPlaying(p){playing=p;icoPlay.hidden=p;icoPause.hidden=!p;playBtn.setAttribute('aria-label',p?'Pause':'Play');
  if(p){started=true;big.hidden=true;if(T>=total-0.01)T=0;last=performance.now();requestAnimationFrame(loop);}}
function loop(now){if(!playing)return;T+=(now-last)/1000;last=now;if(T>=total){T=total;setPlaying(false);}draw();if(playing)requestAnimationFrame(loop);}

playBtn.addEventListener('click',()=>setPlaying(!playing));
big.addEventListener('click',()=>{T=0;setPlaying(true);});
scrub.addEventListener('input',()=>{T=parseFloat(scrub.value);started=true;big.hidden=true;draw();});
$('lw-fs').addEventListener('click',()=>{if(document.fullscreenElement){document.exitFullscreen().catch(()=>{});return;}
  if(stage.requestFullscreen)stage.requestFullscreen().catch(()=>{});});
document.addEventListener('fullscreenchange',()=>setTimeout(()=>{size();draw();},60));
addEventListener('resize',()=>{size();draw();});

window.LALA_PLAYER={enter(){size();draw();},leave(){if(playing)setPlaying(false);}};
E.load('').then(()=>{ready=true;size();draw();});
})();
