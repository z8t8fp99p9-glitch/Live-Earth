/* Compatibility loader for the existing optional Nature Stacks entry point. */
(() => {
  'use strict';
  if (window.__liveEarthNatureViewInstalled || window.__liveEarthNatureViewWaiting) return;
  window.__liveEarthNatureViewWaiting = true;
  let modulePromise = null;
  function loadModule() {
    if (window.LiveEarthNatureViewModule) return Promise.resolve(window.LiveEarthNatureViewModule);
    if (modulePromise) return modulePromise;
    modulePromise = new Promise((resolve,reject)=>{
      const url=new URL('./nature/view/nature-view-controller.js',document.baseURI).href;
      let script=[...document.scripts].find(item=>item.src===url);
      let settled=false,timer;
      const finish=fn=>{if(settled)return;settled=true;clearTimeout(timer);fn();};
      if(!script){script=document.createElement('script');script.src=url;script.async=true;}
      script.addEventListener('load',()=>finish(()=>window.LiveEarthNatureViewModule?resolve(window.LiveEarthNatureViewModule):reject(new Error('Nature module did not register.'))),{once:true});
      script.addEventListener('error',()=>finish(()=>reject(new Error('Nature view module could not be loaded.'))),{once:true});
      if(!script.isConnected)document.head.appendChild(script);
      timer=setTimeout(()=>finish(()=>reject(new Error('Timed out loading the Nature view module.'))),15000);
    }).catch(error=>{modulePromise=null;throw error;});
    return modulePromise;
  }
  function install() {
    const api=window.LiveEarthFeatureViews;
    if(!api?.register)return false;
    api.register('nature',{
      title:'Nature',shortLabel:'Nature',symbol:'🌿',
      description:'A documentary field journal for wildlife, ecology, oceans and conservation.',
      connected:true,
      activate:async()=>{const mod=await loadModule();return mod.activate();},
      deactivate:()=>{if(window.LiveEarthNatureViewModule)return window.LiveEarthNatureViewModule.deactivate();}
    });
    window.__liveEarthNatureViewInstalled=true;
    window.__liveEarthNatureViewWaiting=false;
    window.LiveEarthNatureView=Object.freeze({
      open:()=>api.open('nature','api'),
      close:()=>api.close('api'),
      isOpen:()=>api.isActive('nature'),
      refresh:()=>window.LiveEarthNatureViewModule?.refresh?.()
    });
    return true;
  }
  if(!install())window.addEventListener('live-earth-feature-views-ready',install,{once:true});
})();
