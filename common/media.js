/* Native research videos: explicit playback, chapter jumps and slide-aware pausing.
   A video uses .deck-video and a unique id. Chapter buttons use data-video-target,
   data-video-time (seconds), and optionally data-video-end to play one segment.
   data-slide-autoplay opts into muted playback from the start on each slide entry;
   matching data-video-group values allow videos on that slide to play together. */
(function(){
'use strict';
const videos=[...document.querySelectorAll('video.deck-video')];
const buttons=[...document.querySelectorAll('button[data-video-target][data-video-time]')];
const segments=new WeakMap();
const chapters=v=>buttons.filter(b=>b.dataset.videoTarget===v.id);
const seconds=value=>value==null||value.trim()===''?NaN:Number(value);
const format=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
function status(v,message){
  document.querySelectorAll('[data-video-status]').forEach(el=>{
    if(el.dataset.videoStatus===v.id)el.textContent=message;
  });
}
function update(v){
  const controls=chapters(v),t=v.currentTime;
  controls.forEach(b=>{
    const start=seconds(b.dataset.videoTime),explicitEnd=seconds(b.dataset.videoEnd);
    const next=controls.map(c=>seconds(c.dataset.videoTime)).filter(n=>n>start).sort((a,b)=>a-b)[0];
    const end=Number.isFinite(explicitEnd)?explicitEnd:(next==null?Infinity:next);
    const current=t>=start-.05&&t<end-.05;
    if(current)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');
    b.classList.toggle('is-playing',current&&!v.paused);
  });
}
function pause(v){v.pause();update(v);}
function pauseAll(){videos.forEach(pause);}
function pauseSlide(slide){videos.forEach(v=>{if(slide.contains(v))pause(v);});}
function enterSlide(slide){
  if(!slide.classList.contains('on')||document.hidden)return;
  videos.filter(v=>slide.contains(v)&&v.hasAttribute('data-slide-autoplay')).forEach(v=>{
    segments.delete(v);
    v.muted=true;
    v.currentTime=0;
    const playing=v.play();
    if(playing&&playing.catch)playing.catch(error=>{
      if(error.name!=='AbortError'&&slide.classList.contains('on'))status(v,'Press the video play button to start playback.');
    });
  });
}
const sameGroup=(a,b)=>a.dataset.videoGroup&&a.dataset.videoGroup===b.dataset.videoGroup&&a.closest('.slide')===b.closest('.slide');
videos.forEach(v=>{
  // Native autoplay would also start hidden slides; only enterSlide may opt in.
  v.removeAttribute('autoplay');
  v.playsInline=true;
  v.addEventListener('play',()=>{
    if(v.hasAttribute('data-slide-autoplay')&&!v.closest('.slide')?.classList.contains('on')){pause(v);return;}
    videos.forEach(other=>{if(other!==v&&!sameGroup(v,other))pause(other);});
    update(v);
  });
  v.addEventListener('pause',()=>update(v));
  v.addEventListener('loadedmetadata',()=>update(v));
  v.addEventListener('timeupdate',()=>{
    const segment=segments.get(v);
    if(segment!=null&&v.currentTime>=segment){
      segments.delete(v);pause(v);
      v.currentTime=Math.min(segment,v.duration||segment);
      status(v,`Segment ended at ${format(segment)}. Choose another chapter or press play to continue.`);
    }
    update(v);
  });
  v.addEventListener('seeking',()=>{
    // Manual scrubbing beyond an excerpt releases its stop point.
    const end=segments.get(v);
    if(end!=null&&v.currentTime>end+.1)segments.delete(v);
    update(v);
  });
  v.addEventListener('ended',()=>{segments.delete(v);update(v);});
  v.addEventListener('error',()=>status(v,'Video could not load. Open the supplied MP4 file to play it.'));
  update(v);
});
buttons.forEach(b=>{
  b.type='button';
  const v=document.getElementById(b.dataset.videoTarget),start=seconds(b.dataset.videoTime);
  if(!v||!videos.includes(v)||!Number.isFinite(start)||start<0){b.disabled=true;return;}
  b.setAttribute('aria-controls',v.id);
  const end=seconds(b.dataset.videoEnd);
  if(!b.title)b.title=`Play from ${format(start)}${Number.isFinite(end)&&end>start?' to '+format(end):''}`;
  b.addEventListener('click',()=>{
    const time=Number.isFinite(v.duration)?Math.min(start,v.duration):start;
    if(Number.isFinite(end)&&end>start)segments.set(v,end);else segments.delete(v);
    v.currentTime=time;
    status(v,`Playing from ${format(time)}${Number.isFinite(end)&&end>start?' to '+format(end):''}.`);
    const playing=v.play();
    if(playing&&playing.catch)playing.catch(()=>status(v,'Press the video play button to start playback.'));
    update(v);
  });
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseAll();});
window.addEventListener('pagehide',pauseAll);
window.DeckMedia={pauseAll,pauseSlide,enterSlide};
})();
