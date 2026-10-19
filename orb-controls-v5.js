(()=>{'use strict';if(window.__leModesV5)return;window.__leModesV5=true;
const btns=[...document.querySelectorAll('.orbButton[data-view]')],status=document.querySelector('#status'),astro=document.querySelector('#astroPanel');
let selected='home',locationOn=false;
try{locationOn=localStorage.getItem('liveEarthLocationEnabled')==='true'}catch(e){}
const style=document.createElement('style');style.textContent=`
#le-panel{position:absolute;z-index:12;left:50%;top:50%;transform:translate(-50%,-50%);width:min(88vw,430px);max-height:58vh;overflow:auto;padding:18px;border:1px solid #b6e6ff55;border-radius:22px;background:linear-gradient(145deg,#102032f5,#050b16f7);box-shadow:0 12px 38px #000b;backdrop-filter:blur(22px);color:#eaf5ff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;touch-action:pan-y}
#le-panel[hidden]{display:none}.le-title{font-size:22px;font-weight:650;margin:0 0 8px}.le-desc{font-size:12px;line-height:1.5;color:#a8bfd1;margin:0 0 12px}.le-close{float:right;width:34px;height:34px;border-radius:50%;border:1px solid #8fb5d544;background:#ffffff0b;color:#eaf5ff;font-size:20px}.le-option{display:block;width:100%;text-align:left;margin:8px 0;padding:13px;border:1px solid #8ecfff30;border-radius:14px;background:#ffffff08;color:#edf8ff;font:600 14px -apple-system,BlinkMacSystemFont,sans-serif}.le-option small{display:block;margin-top:5px;color:#a8bfd1;font-size:11px;font-weight:400}.orbButton:not([aria-pressed=true]) .orbShell{filter:brightness(.58) saturate(.62)!important}.orbButton:not([aria-pressed=true]) .orbShine{opacity:.12!important}.orbButton[data-view=location][aria-pressed=true] .orbShell{box-shadow:0 0 0 2px #ff334d55,0 0 22px #ff1d4f99!important}`;
document.head.append(style);
const panel=document.createElement('section');panel.id='le-panel';panel.hidden=true;panel.innerHTML='<button class="le-close" aria-label="Close">×</button><h2 class="le-title">Earth experience</h2><p class="le-desc">Choose how you want to explore Earth.</p><div class="le-options"></div>';document.body.append(panel);
const title=panel.querySelector('.le-title'),desc=panel.querySelector('.le-desc'),opts=panel.querySelector('.le-options');
function msg(t){if(status){status.hidden=false;status.textContent=t;setTimeout(()=>{if(status.textContent===t)status.hidden=true},2600)}}
function paint(){btns.forEach(b=>{const id=b.dataset.view;b.setAttribute('aria-pressed',String(id==='location'?locationOn:(id==='earth'?false:id===selected)));if(id==='location')b.setAttribute('aria-label',locationOn?'Location ON — tap to turn off':'Location OFF — tap to turn on')})}
function home(){selected='home';panel.hidden=true;if(astro)astro.hidden=true;if(status)status.hidden=true;paint()}
function show(t,d,items){if(astro)astro.hidden=true;title.textContent=t;desc.textContent=d;opts.replaceChildren();items.forEach(([name,detail,action])=>{let b=document.createElement('button');b.className='le-option';b.innerHTML=name+'<small></small>';b.querySelector('small').textContent=detail;b.onclick=action;opts.append(b)});panel.hidden=false}
panel.querySelector('.le-close').onclick=home;
function earth(){selected='earth';paint();show('Earth experience','Choose how you want to explore. Your Home globe remains unchanged.',[
['Basic Live','Interactive 2D map · pan and zoom',()=>{panel.hidden=true;location.href='./location.html?mode=basic'+(locationOn?'&locate=1':'')}],
['HD Live','HD entry · 3D buildings and richer imagery are not connected yet',()=>{panel.hidden=true;location.href='./location.html?mode=hd'+(locationOn?'&locate=1':'')}],
['Offline','No GPS request; offline map tiles are not bundled',()=>{panel.hidden=true;location.href='./location.html?mode=offline'}]
])}
function stacks(){selected='stacks';paint();show('Stacks · More Options','Data layers will appear here as they are connected.',[['Clouds','Not connected yet',()=>msg('Clouds are not connected yet.')],['Elevation','Not connected yet',()=>msg('Elevation is not connected yet.')],['Weather','Not connected yet',()=>msg('Weather is not connected yet.')],['Earthquakes','Not connected yet',()=>msg('Earthquakes are not connected yet.')],['Traffic','Not connected yet',()=>msg('Traffic is not connected yet.')]])}
function activate(id){if(id==='location'){locationOn=!locationOn;try{localStorage.setItem('liveEarthLocationEnabled',String(locationOn))}catch(e){}window.dispatchEvent(new CustomEvent('live-earth-location-state',{detail:{enabled:locationOn}}));if(!locationOn)window.dispatchEvent(new CustomEvent('live-earth-location-stop'));paint();msg(locationOn?'Live Location ON.':'Live Location OFF.');return}
if(id==='earth'){if(!panel.hidden&&selected==='earth'){home()}else earth();return}
if(!['moon','sun','stacks'].includes(id))return;if(selected===id){home();return}selected=id;paint();panel.hidden=true;if(id==='stacks'){stacks();return}if(astro){astro.hidden=false;window.dispatchEvent(new CustomEvent('live-earth-astro-preview',{detail:{view:id}}))}}
btns.forEach(b=>{let c=b.cloneNode(true);b.replaceWith(c);c.addEventListener('click',()=>activate(c.dataset.view))});
window.liveEarthLocationAllowed=()=>locationOn;window.liveEarthGetLocationState=()=>locationOn;paint();
})();