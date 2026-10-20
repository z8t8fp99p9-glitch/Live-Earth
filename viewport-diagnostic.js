/* LIVE // EARTH — temporary viewport diagnostics. Activates only with ?viewport-debug=1. */
(() => {
  'use strict';
  if (!new URLSearchParams(location.search).has('viewport-debug')) return;
  if (window.__liveEarthViewportDiagnostic) return;
  window.__liveEarthViewportDiagnostic = true;
  const style = document.createElement('style');
  style.textContent = `
  #le-vp-debug{position:fixed!important;z-index:2147483647!important;inset:8px 8px auto!important;max-height:62vh!important;overflow:auto!important;background:rgba(3,10,20,.96)!important;color:#e9f7ff!important;border:1px solid #64d8ff!important;border-radius:12px!important;padding:12px!important;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace!important;letter-spacing:normal!important;text-transform:none!important;box-shadow:0 5px 24px #000c!important;touch-action:pan-y!important;user-select:text!important;-webkit-user-select:text!important}
  #le-vp-debug *{box-sizing:border-box!important;font:inherit!important;letter-spacing:normal!important;text-transform:none!important}
  #le-vp-debug header{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:8px;font-weight:800!important;color:#79e0ff!important}
  #le-vp-debug button{background:#14283a!important;color:#fff!important;border:1px solid #5c9dbb!important;border-radius:7px!important;padding:6px 8px!important;margin:2px!important;touch-action:manipulation!important}
  #le-vp-debug pre{white-space:pre-wrap!important;overflow-wrap:anywhere!important;margin:6px 0!important;color:#d4e6f5!important}
  #le-vp-debug .warn{color:#ffd18a!important} #le-vp-debug .good{color:#8dffcf!important}
  #le-vp-marker{position:fixed!important;z-index:2147483646!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:16px!important;height:16px!important;border:2px solid #fff!important;border-radius:50%!important;background:#ff3b66!important;pointer-events:none!important;display:none}
  `;
  document.head.appendChild(style);
  const box=document.createElement('section');box.id='le-vp-debug';box.setAttribute('role','region');box.setAttribute('aria-label','Viewport diagnostic panel');
  box.innerHTML=`<header><span>LIVE // EARTH · VIEWPORT DIAGNOSTIC</span><button id="le-vp-hide">Hide</button></header><div id="le-vp-data"></div><p class="warn">Rotate portrait → landscape → portrait. Tap the screen to log client/page/screen coordinates. This panel is diagnostic only.</p><div><button id="le-vp-sample">Add sample</button><button id="le-vp-copy">Copy log</button><button id="le-vp-clear">Clear log</button><button id="le-vp-close">Close diagnostics</button></div><pre id="le-vp-log"></pre>`;
  document.body.appendChild(box);
  const marker=document.createElement('div');marker.id='le-vp-marker';document.body.appendChild(marker);
  const data=box.querySelector('#le-vp-data'), logEl=box.querySelector('#le-vp-log');
  const log=[]; let hidden=false;
  const round=n=>Number.isFinite(n)?Math.round(n*100)/100:null;
  function navRects(){return [...document.querySelectorAll('#navButtons, #navButtons .orbButton, #navButtons .orbShell, #navButtons .orbLabel')].map(el=>{const r=el.getBoundingClientRect();return {el:el.id||el.dataset?.view||el.className||el.tagName,top:round(r.top),bottom:round(r.bottom),left:round(r.left),right:round(r.right),width:round(r.width),height:round(r.height)}})}
  function snapshot(reason='sample'){
    const vv=window.visualViewport, de=document.documentElement, body=document.body;
    const d={time:new Date().toISOString(),reason,orientation:screen.orientation?.type||'unavailable',screen:{width:screen.width,height:screen.height,availWidth:screen.availWidth,availHeight:screen.availHeight,pixelRatio:window.devicePixelRatio},window:{innerWidth:window.innerWidth,innerHeight:window.innerHeight,outerWidth:window.outerWidth,outerHeight:window.outerHeight,scrollX:window.scrollX,scrollY:window.scrollY},document:{clientWidth:de.clientWidth,clientHeight:de.clientHeight,scrollWidth:de.scrollWidth,scrollHeight:de.scrollHeight,bodyClientWidth:body.clientWidth,bodyClientHeight:body.clientHeight,bodyScrollHeight:body.scrollHeight},visualViewport:vv?{width:round(vv.width),height:round(vv.height),offsetLeft:round(vv.offsetLeft),offsetTop:round(vv.offsetTop),pageLeft:round(vv.pageLeft),pageTop:round(vv.pageTop),scale:round(vv.scale)}:null,nav:navRects()};
    log.push(d); if(log.length>100)log.shift(); render(d); return d;
  }
  function render(d){if(hidden)return;data.innerHTML=`<pre>${escapeHtml(JSON.stringify({screen:d.screen,window:d.window,document:d.document,visualViewport:d.visualViewport,orientation:d.orientation},null,2))}</pre><b>Navigation element rectangles (CSS px)</b><pre>${escapeHtml(JSON.stringify(d.nav,null,2))}</pre>`;logEl.textContent=log.slice(-8).map(x=>`${x.time.slice(11,23)} ${x.reason}: screen ${x.screen.width}×${x.screen.height}; inner ${x.window.innerWidth}×${x.window.innerHeight}; visual ${x.visualViewport?x.visualViewport.width+'×'+x.visualViewport.height+' @ '+x.visualViewport.offsetLeft+','+x.visualViewport.offsetTop:'n/a'}`).join('\n');}
  function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  box.querySelector('#le-vp-hide').onclick=()=>{hidden=true;box.style.display='none'};
  box.querySelector('#le-vp-sample').onclick=()=>snapshot('manual sample');
  box.querySelector('#le-vp-clear').onclick=()=>{log.length=0;snapshot('log cleared')};
  box.querySelector('#le-vp-copy').onclick=async()=>{const text=JSON.stringify(log,null,2);try{await navigator.clipboard.writeText(text);box.querySelector('#le-vp-copy').textContent='Copied!'}catch(e){const ta=document.createElement('textarea');ta.value=text;box.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();box.querySelector('#le-vp-copy').textContent='Copy attempted'}};
  box.querySelector('#le-vp-close').onclick=()=>{box.remove();marker.remove();style.remove();window.removeEventListener('resize',onChange);window.removeEventListener('orientationchange',onChange);window.visualViewport?.removeEventListener('resize',onChange);window.removeEventListener('scroll',onChange);window.removeEventListener('pointerup',onTap,true);window.__liveEarthViewportDiagnostic=false};
  function onChange(e){snapshot(e.type)}
  function onTap(e){if(box.contains(e.target))return;marker.style.display='block';marker.style.left=`${e.clientX}px`;marker.style.top=`${e.clientY}px`;const d=snapshot('tap');d.tap={clientX:round(e.clientX),clientY:round(e.clientY),pageX:round(e.pageX),pageY:round(e.pageY),screenX:round(e.screenX),screenY:round(e.screenY),target:e.target?.id||e.target?.className||e.target?.tagName};render(d)}
  window.addEventListener('resize',onChange,{passive:true});window.addEventListener('orientationchange',onChange,{passive:true});window.visualViewport?.addEventListener('resize',onChange,{passive:true});window.addEventListener('scroll',onChange,{passive:true});window.addEventListener('pointerup',onTap,true);
  snapshot('diagnostic start');setTimeout(()=>snapshot('250ms after start'),250);setTimeout(()=>snapshot('1000ms after start'),1000);setTimeout(()=>snapshot('2500ms after start'),2500);
})();
