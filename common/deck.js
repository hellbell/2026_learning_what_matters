/* Deck engine: builds the presenter shell around #stage, scales the 1440×810 slides, handles builds
   (class "f"), skipped slides (data-skip), the slide list, full screen, deep links (#12, #end), slide
   animations (data-anim) and, in chapter files, moving to the previous / next chapter file. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const stage=$('stage');

/* ---- shell: viewport + control bar + slide list (added here so chapter files only hold slides) */
if(!$('app')){
  const app=document.createElement('div');app.id='app';
  const vp=document.createElement('div');vp.id='viewport';
  stage.parentNode.insertBefore(app,stage);vp.appendChild(stage);app.appendChild(vp);
  app.insertAdjacentHTML('beforeend',`<div id="bar">
  <div id="progress"></div>
  <button id="btn-prev" type="button" aria-label="Previous"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  <span id="count" aria-live="polite"></span>
  <button id="btn-next" type="button" aria-label="Next"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  <span id="sec"></span>
  <span class="kbd">← → navigate, F full screen, L slide list</span>
  <button id="btn-list" type="button" aria-label="Slide list"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Slides</button>
  <button id="btn-fs" type="button" aria-label="Full screen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>
</div>`);
  document.body.insertAdjacentHTML('beforeend','<div id="list" hidden><div class="panel" role="dialog" aria-label="Slide list"><h2>Slides</h2><ol></ol></div></div>');
}
stage.setAttribute('aria-roledescription','slide deck');
const viewport=$('viewport');
const slides=[...stage.querySelectorAll(':scope > .slide')];
const N=slides.length;
let cur=0;

/* ---- chapters (only when this page is one chapter file) */
const CH=window.DECK_CHAPTERS||[];
const here=decodeURIComponent((location.pathname.split('/').pop()||''));
const ci=window.DECK_SINGLE?-1:CH.findIndex(c=>c.file===here);
const goChapter=(k,hash)=>{
  if(ci<0)return false;
  const direction=k>ci?1:-1;
  while(k>=0&&k<CH.length&&CH[k].skip)k+=direction;
  if(k<0||k>=CH.length)return false;
  location.href=CH[k].file+hash;return true;
};

/* ---- page numbers and build steps */
slides.forEach((s,i)=>{
  if(!s.classList.contains('cover')&&!s.querySelector('.pg')){const p=document.createElement('div');p.className='pg';p.textContent=String(i+1);s.appendChild(p);}
  let auto=0;const fr=[...s.querySelectorAll('.f')];
  fr.forEach(f=>{const k=f.dataset.f?+f.dataset.f:++auto;auto=Math.max(auto,k);f._step=k;});
  s._frags=fr;s._steps=fr.reduce((m,f)=>Math.max(m,f._step),0);s._shown=0;
  s._skip=s.hasAttribute('data-skip');   // kept in the deck, but → / ← pass over it; open it from the list or #n
});
const near=(i,d)=>{for(let j=i+d;j>=0&&j<N;j+=d)if(!slides[j]._skip)return j;return -1;};
function applyFrags(s){s._frags.forEach(f=>f.classList.toggle('shown',f._step<=s._shown));}

/* ---- fit 1440×810 into the viewport */
function fit(){const vw=viewport.clientWidth,vh=viewport.clientHeight;const sc=Math.min(vw/1440,vh/810);
  const x=(vw-1440*sc)/2,y=(vh-810*sc)/2;stage.style.transform=`translate(${x}px,${y}px) scale(${sc})`;window.__deckScale=sc;}
new ResizeObserver(fit).observe(viewport);addEventListener('resize',fit);fit();

/* ---- hooks for slides with live parts (data-hook) */
const hooks={
  ino:{leave(){try{window.TI&&window.TI.pause&&window.TI.pause()}catch(e){}}},
  lala:{enter(){window.LALA_PLAYER&&window.LALA_PLAYER.enter()},leave(){window.LALA_PLAYER&&window.LALA_PLAYER.leave()}},
  gaze:{enter(){const g=window.__deckCharts&&window.__deckCharts.gaze;g&&g.start()},leave(){const g=window.__deckCharts&&window.__deckCharts.gaze;g&&g.stop()}},
};
const A=()=>window.DeckAnim;
function go(i,shown){i=Math.max(0,Math.min(N-1,i));
  const prev=slides[cur];
  if(prev!==slides[i]||!prev.classList.contains('on')){
    if(prev!==slides[i]){const h=hooks[prev.dataset.hook];h&&h.leave&&h.leave();window.DeckMedia&&window.DeckMedia.pauseSlide(prev);A()&&A().leave(prev);prev.classList.remove('on');prev.setAttribute('aria-hidden','true');}
    cur=i;const s=slides[i];s.classList.add('on');s.removeAttribute('aria-hidden');
    window.DeckMedia&&window.DeckMedia.enterSlide(s);
    const h=hooks[s.dataset.hook];h&&h.enter&&h.enter();A()&&A().enter(s);
  }
  cur=i;const s=slides[i];s._shown=shown==null?s._steps:Math.max(0,Math.min(s._steps,shown));applyFrags(s);
  $('count').textContent=(ci>=0?CH[ci].short+': ':'')+`${i+1} / ${N}`;$('sec').textContent=s.dataset.title||'';
  $('progress').style.width=((i+1)/N*100)+'%';
  try{history.replaceState(null,'','#'+(i+1))}catch(e){}
  listItems.forEach((b,j)=>b.setAttribute('aria-current',String(j===i)));
}
function next(){const s=slides[cur];if(s._shown<s._steps){s._shown++;applyFrags(s);return;}
  const j=near(cur,1);if(j>=0)go(j,0);else goChapter(ci+1,'#1');}
function prev(){const s=slides[cur];if(s._shown>0){s._shown--;applyFrags(s);return;}
  const j=near(cur,-1);if(j>=0)go(j,null);else goChapter(ci-1,'#end');}

/* ---- slide list (in a chapter file, other chapters appear as links) */
const listEl=$('list'),ol=listEl.querySelector('ol');
function addSlides(){let lastSec='';return slides.map((s,i)=>{const sec=s.dataset.sec||'';
  if(sec!==lastSec&&ci<0){const g=document.createElement('li');g.className='grp';g.textContent=sec;ol.appendChild(g);lastSec=sec;}
  const li=document.createElement('li'),b=document.createElement('button');b.type='button';
  b.innerHTML=`<span class="n">${i+1}</span><span></span>`;b.lastChild.textContent=s.dataset.title||('Slide '+(i+1));
  if(s._skip){b.classList.add('skip');b.lastChild.insertAdjacentHTML('beforeend',' <small>skipped</small>');}
  b.addEventListener('click',()=>{closeList();go(i,null);});li.appendChild(b);ol.appendChild(li);return b;});}
let listItems=[];
if(ci>=0){CH.forEach((c,k)=>{const g=document.createElement('li');g.className='grp';
    if(k===ci){g.textContent=c.title;ol.appendChild(g);listItems=addSlides();}
    else{const a=document.createElement('a');a.href=c.file+'#1';a.textContent=c.title+(c.skip?' (omitted)':'')+' →';a.className='chlink';g.appendChild(a);ol.appendChild(g);}});}
else listItems=addSlides();
function openList(){listEl.hidden=false;const b=listItems[cur];b&&b.focus();}
function closeList(){listEl.hidden=true;$('btn-list').focus();}
listEl.addEventListener('click',e=>{if(e.target===listEl)closeList();});

/* ---- full screen (falls back to hiding the bar) */
function toggleFs(){const d=document,el=d.documentElement;
  if(d.fullscreenElement){d.exitFullscreen().catch(()=>{});return;}
  if(document.body.classList.contains('is-fs')){document.body.classList.remove('is-fs');fit();return;}
  if(el.requestFullscreen){el.requestFullscreen().catch(()=>{document.body.classList.add('is-fs');fit();});}
  else{document.body.classList.add('is-fs');fit();}}
document.addEventListener('fullscreenchange',()=>{document.body.classList.toggle('is-fs',!!document.fullscreenElement);setTimeout(fit,30);});

/* ---- controls */
$('btn-prev').addEventListener('click',prev);$('btn-next').addEventListener('click',next);
$('btn-list').addEventListener('click',()=>listEl.hidden?openList():closeList());$('btn-fs').addEventListener('click',toggleFs);
// Media controls own their keyboard and touch gestures, including native video controls
// whose browser shadow-tree events are retargeted to the <video> element.
const isMediaControl=e=>e.composedPath().some(el=>el instanceof Element&&el.matches('video,audio,[data-video-target],.video-chapters,[data-deck-input]'));
document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  const t=e.target,tag=(t.tagName||'').toLowerCase();
  if(!listEl.hidden){if(e.key==='Escape'){e.preventDefault();closeList();}return;}
  if(isMediaControl(e))return;
  if(tag==='input'||tag==='select'||tag==='textarea')return;
  const onBtn=tag==='button';
  switch(e.key){
    case 'ArrowRight':case 'PageDown':case 'ArrowDown':e.preventDefault();next();break;
    case ' ':if(onBtn)return;e.preventDefault();e.shiftKey?prev():next();break;
    case 'ArrowLeft':case 'PageUp':case 'ArrowUp':e.preventDefault();prev();break;
    case 'Home':e.preventDefault();go(0,null);break;
    case 'End':e.preventDefault();go(N-1,null);break;
    case 'f':case 'F':toggleFs();break;
    case 'l':case 'L':case 'o':case 'O':openList();break;
    case 'r':case 'R':A()&&A().enter(slides[cur]);break;
    case 'Escape':if(document.body.classList.contains('is-fs')&&!document.fullscreenElement){document.body.classList.remove('is-fs');fit();}break;
  }
});
/* ---- swipe */
let sx=null,sy=null;
viewport.addEventListener('touchstart',e=>{if(isMediaControl(e)){sx=null;sy=null;return;}const p=e.touches[0];sx=p.clientX;sy=p.clientY;},{passive:true});
viewport.addEventListener('touchend',e=>{if(sx==null)return;const p=e.changedTouches[0],dx=p.clientX-sx,dy=p.clientY-sy;sx=null;
  if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4)(dx<0?next:prev)();},{passive:true});

/* ---- start */
slides.forEach(s=>s.setAttribute('aria-hidden','true'));
const h0=location.hash;const m=/^#(\d+)$/.exec(h0);
if(h0==='#end'){const j=slides[N-1]._skip?near(N-1,-1):N-1;go(j<0?N-1:j,null);}else go(m?(+m[1]-1):0,m?null:0);
addEventListener('hashchange',()=>{const k=/^#(\d+)$/.exec(location.hash);if(k&&+k[1]-1!==cur)go(+k[1]-1,null);});
})();
